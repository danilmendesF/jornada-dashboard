// Vercel Serverless Function: api/sync.js
// Stores and retrieves the dashboard JSON database using Redis TCP (via REDIS_URL) or keyvalue.xyz fallback.

import { createClient } from 'redis';

let client = null;

async function getRedisClient() {
  if (!client) {
    console.log('[Serverless Sync] Initializing Redis Client...');
    client = createClient({
      url: process.env.REDIS_URL
    });
    client.on('error', (err) => console.error('[Serverless Sync] Redis Client Error:', err));
    await client.connect();
  }
  return client;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Prevent Caching on Vercel Edge / Browser
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

  console.log(`[Serverless Sync] Method: ${req.method} | Key: ${key}`);

  // FALLBACK PROXY: If REDIS_URL env var is not found, fallback to keyvalue.xyz
  if (!redisUrl) {
    console.log(`[Serverless Sync] REDIS_URL not found. Falling back to keyvalue.xyz proxy...`);
    try {
      if (req.method === 'GET') {
        const proxyRes = await fetch(`https://keyvalue.xyz/v1/${key}`);
        if (proxyRes.status === 404) {
          console.log(`[Serverless Sync] Proxy GET: Key not found (404)`);
          return res.status(404).json({ error: 'Not found' });
        }
        if (!proxyRes.ok) throw new Error('Proxy GET failed');
        const data = await proxyRes.json();
        console.log(`[Serverless Sync] Proxy GET: Successful data retrieve`);
        return res.status(200).json(data);
      }
      if (req.method === 'POST') {
        console.log(`[Serverless Sync] Proxy POST payload type: ${typeof req.body}`);
        const proxyRes = await fetch(`https://keyvalue.xyz/v1/${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body)
        });
        if (!proxyRes.ok) {
          const errText = await proxyRes.text();
          console.error(`[Serverless Sync] Proxy POST failed. Status: ${proxyRes.status} | Body: ${errText}`);
          throw new Error(`Proxy POST failed with status ${proxyRes.status}: ${errText}`);
        }
        console.log(`[Serverless Sync] Proxy POST: Successful data save`);
        return res.status(200).json({ success: true });
      }
    } catch (proxyErr) {
      console.error('[Serverless Sync] Proxy Error:', proxyErr);
      return res.status(500).json({ error: 'Sync fallback proxy error: ' + proxyErr.message });
    }
    return;
  }

  // REDIS MODE
  try {
    const redis = await getRedisClient();

    if (req.method === 'GET') {
      console.log(`[Serverless Sync] Redis GET: Fetching key...`);
      const value = await redis.get(key);
      if (!value) {
        console.log(`[Serverless Sync] Redis GET: Key not found (404)`);
        return res.status(404).json({ error: 'Not found' });
      }
      console.log(`[Serverless Sync] Redis GET: Successfully retrieved data`);
      return res.status(200).json(JSON.parse(value));
    }

    if (req.method === 'POST') {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ error: 'Invalid payload' });
      }

      console.log(`[Serverless Sync] Redis POST: Saving data...`, {
        decksCount: payload.decks?.length,
        matchesCount: payload.manualMatches?.length,
        playersCount: payload.players?.length
      });

      await redis.set(key, JSON.stringify(payload));
      console.log(`[Serverless Sync] Redis POST: Successfully saved data.`);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[Serverless Sync] Redis Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
