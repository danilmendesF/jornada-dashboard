// Vercel Serverless Function: api/sync.js
// Connects to Redis per request with JWT Authentication and Fallback support.

import { createClient } from 'redis';
import crypto from 'crypto';


function log(level, message, context = {}) {
  const payload = { timestamp: new Date().toISOString(), level, message, ...context };
  if (level === 'error') console.error(JSON.stringify(payload));
  else console.log(JSON.stringify(payload));
}
export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
    log('error', '[Serverless Sync] FATAL: JWT_SECRET environment variable is missing or empty.');
    return null;
  }
  return secret.trim();
}

export function createJwt(payload) {
  const secret = getJwtSecret();
  if (!secret) return null;
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyJwt(token) {
  const secret = getJwtSecret();
  if (!secret || !token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
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
  const queryToken = req.query?.token;

  let userPayload = null;
  if (bearerToken) {
    userPayload = verifyJwt(bearerToken);
  }

  let activeToken = queryToken || 'team_default_sync';

  // ── SECURITY & AUTHORIZATION GATE ──────────────────────────────────────────
  if (req.method === 'POST') {
    if (!bearerToken) {
      log('warn', '[Serverless Sync] Rejected POST without Authorization Bearer header');
      return res.status(401).json({ error: 'Autenticação obrigatória (Token Bearer ausente).' });
    }
    if (!userPayload) {
      log('warn', '[Serverless Sync] Rejected POST with invalid/expired JWT');
      return res.status(403).json({ error: 'Token JWT inválido ou expirado. Faça login novamente.' });
    }

    // Authorization Policy: Check if user has permission to mutate activeToken namespace
    const allowedTokens = userPayload.allowedSyncTokens || (userPayload.teamId ? [userPayload.teamId] : ['team_default_sync']);
    const isAdmin = userPayload.role === 'admin';
    const isDefaultTeam = activeToken === 'team_default_sync';

    if (!isAdmin && !isDefaultTeam && !allowedTokens.includes(activeToken)) {
      log('warn', '[Serverless Sync] Unauthorized mutation attempt for foreign sync namespace', {
        user: userPayload.email || userPayload.name,
        attemptedToken: activeToken
      });
      return res.status(403).json({ error: 'Acesso negado: você não tem autorização para modificar este time/namespace.' });
    }

    // Payload size and schema sanity check
    const rawBody = JSON.stringify(req.body || {});
    if (rawBody.length > 2097152) { // 2MB limit
      return res.status(413).json({ error: 'Payload excede o limite de tamanho permitido (2MB).' });
    }
    if (!req.body || typeof req.body !== 'object' || (req.body.manualMatches && !Array.isArray(req.body.manualMatches))) {
      return res.status(400).json({ error: 'Estrutura de payload inválida.' });
    }
  }

  const redisUrl = process.env.REDIS_URL;
  const key = `jornada_sync_${activeToken.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  log('info', `[Serverless Sync] ${req.method} | Authorized Request`, { user: userPayload?.username || userPayload?.name || 'viewer' });

  // ── FALLBACK: No Redis URL configured → proxy to keyvalue.xyz ───────────────
  if (!redisUrl) {
    log('info', '[Serverless Sync] REDIS_URL not found. Falling back to keyvalue.xyz proxy...');
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
      log('error', '[Serverless Sync] Proxy Error:', { error: proxyErr.message });
      return res.status(500).json({ error: proxyErr.message });
    }
    return;
  }

  // ── REDIS MODE: Connect per-request ────────────────────────────────────────
  const redis = createClient({ url: redisUrl });
  redis.on('error', (err) => log('error', '[Serverless Sync] Redis client error:', { error: err.message }));

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
    log('error', '[Serverless Sync] Redis Error:', { error: err.message });
    return res.status(500).json({ error: err.message });
  } finally {
    if (redis && redis.isOpen) {
      await redis.disconnect();
    }
  }
}
