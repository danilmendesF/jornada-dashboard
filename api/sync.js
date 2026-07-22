// Vercel Serverless Function: api/sync.js
// Connects to Redis on every request to avoid stale TCP sockets (serverless best practice).

import { createClient } from 'redis';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Prevent caching on Vercel Edge / browser
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  const redisUrl = process.env.REDIS_URL;
  const key = `jornada_sync_${token.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  console.log(`[Serverless Sync] ${req.method} | Key: ${key}`);

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
        console.log('[Serverless Sync] Proxy GET: OK');
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
          console.error(`[Serverless Sync] Proxy POST failed (${proxyRes.status}): ${errText}`);
          throw new Error(`Proxy POST failed with status ${proxyRes.status}: ${errText}`);
        }
        console.log('[Serverless Sync] Proxy POST: OK');
        return res.status(200).json({ success: true });
      }
    } catch (proxyErr) {
      console.error('[Serverless Sync] Proxy Error:', proxyErr.message);
      return res.status(500).json({ error: proxyErr.message });
    }
    return;
  }

  // ── REDIS MODE: Connect per-request to avoid stale sockets ─────────────────
  // In serverless environments the process can be frozen/resumed between requests.
  // A long-lived global socket will be closed by the Redis server on idle timeout,
  // causing "Socket closed" errors on the next invocation. Creating and destroying
  // the client per-request is safe and recommended for Vercel Functions.
  const redis = createClient({ url: redisUrl });
  redis.on('error', (err) => console.error('[Serverless Sync] Redis client error:', err.message));

  try {
    await redis.connect();
    console.log('[Serverless Sync] Redis connected.');

    if (req.method === 'GET') {
      const value = await redis.get(key);
      if (!value) {
        console.log('[Serverless Sync] Redis GET: Key not found (404)');
        return res.status(404).json({ error: 'Not found' });
      }
      console.log('[Serverless Sync] Redis GET: OK');
      return res.status(200).json(JSON.parse(value));
    }

    if (req.method === 'POST') {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ error: 'Invalid payload' });
      }
      console.log('[Serverless Sync] Redis POST: Saving...', {
        matches: payload.manualMatches?.length,
        decks: payload.decks?.length,
        players: payload.players?.length,
        deleted: payload.deletedIds?.length
      });
      await redis.set(key, JSON.stringify(payload));
      console.log('[Serverless Sync] Redis POST: OK — data persisted.');
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('[Serverless Sync] Redis Error:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    // Always disconnect to release the TCP socket immediately after the response.
    if (redis.isOpen) {
      await redis.disconnect();
      console.log('[Serverless Sync] Redis disconnected cleanly.');
    }
  }
}
