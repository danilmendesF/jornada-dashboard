// Vercel Serverless Function: api/sync.js
// Connects to Redis per request with JWT Authentication and Fallback support.

import { createClient } from 'redis';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'jornada_tcg_jwt_secret_2026_key';

function verifyJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  if (signature !== expected) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Prevent caching on Vercel Edge / browser
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.replace('Bearer ', '').trim();
  const queryToken = req.query.token;

  let activeToken = bearerToken || queryToken;
  let userPayload = null;

  if (bearerToken) {
    userPayload = verifyJwt(bearerToken);
    if (userPayload && userPayload.email) {
      activeToken = `user_${userPayload.email.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    }
  }

  if (!activeToken) {
    return res.status(401).json({ error: 'Autenticação necessária (Token JWT ou Sync Token ausente).' });
  }

  const redisUrl = process.env.REDIS_URL;
  const key = `jornada_sync_${activeToken.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  console.log(`[Serverless Sync] ${req.method} | Authorized Request`);

  // ── FALLBACK: No Redis URL configured → proxy to keyvalue.xyz ───────────────
  if (!redisUrl) {
    console.log('[Serverless Sync] REDIS_URL not found. Falling back to keyvalue.xyz proxy...');
    try {
      if (req.method === 'GET') {
        const proxyRes = await fetch(`https://keyvalue.xyz/v1/${key}`);
        if (proxyRes.status === 404) {
          return res.status(404).json({ error: 'Not found' });
        }
        if (!proxyRes.ok) throw new Error(`Proxy GET failed (${proxyRes.status})`);
        const data = await proxyRes.json();
        return res.status(200).json(data);
      }
      if (req.method === 'POST') {
        const proxyRes = await fetch(`https://keyvalue.xyz/v1/${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body)
        });
        if (!proxyRes.ok) {
          const errText = await proxyRes.text();
          throw new Error(`Proxy POST failed with status ${proxyRes.status}: ${errText}`);
        }
        return res.status(200).json({ success: true });
      }
    } catch (proxyErr) {
      console.error('[Serverless Sync] Proxy Error:', proxyErr.message);
      return res.status(500).json({ error: proxyErr.message });
    }
    return;
  }

  // ── REDIS MODE: Connect per-request ────────────────────────────────────────
  const redis = createClient({ url: redisUrl });
  redis.on('error', (err) => console.error('[Serverless Sync] Redis client error:', err.message));

  try {
    await redis.connect();

    if (req.method === 'GET') {
      const value = await redis.get(key);
      if (!value) {
        return res.status(404).json({ error: 'Not found' });
      }
      return res.status(200).json(JSON.parse(value));
    }

    if (req.method === 'POST') {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ error: 'Invalid payload' });
      }
      await redis.set(key, JSON.stringify(payload));
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('[Serverless Sync] Redis Error:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    if (redis && redis.isOpen) {
      await redis.disconnect();
    }
  }
}
