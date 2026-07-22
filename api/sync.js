// Vercel Serverless Function: api/sync.js
// Stores and retrieves the dashboard JSON database using Vercel KV (Redis) REST API.

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

  const url = process.env.KV_REST_API_URL;
  const auth = process.env.KV_REST_API_TOKEN;

  // Sanitized key
  const key = `jornada_sync_${token.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  // If Vercel KV is not configured, fallback to proxying keyvalue.xyz
  if (!url || !auth) {
    try {
      if (req.method === 'GET') {
        const proxyRes = await fetch(`https://keyvalue.xyz/v1/${key}`);
        if (proxyRes.status === 404) {
          return res.status(404).json({ error: 'Not found' });
        }
        if (!proxyRes.ok) throw new Error('Proxy GET failed');
        const data = await proxyRes.json();
        return res.status(200).json(data);
      }
      if (req.method === 'POST') {
        const proxyRes = await fetch(`https://keyvalue.xyz/v1/${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body)
        });
        if (!proxyRes.ok) throw new Error('Proxy POST failed');
        return res.status(200).json({ success: true });
      }
    } catch (proxyErr) {
      console.error('Proxy Error:', proxyErr);
      return res.status(500).json({ error: 'Sync fallback proxy error: ' + proxyErr.message });
    }
    return;
  }

  try {
    if (req.method === 'GET') {
      const kvRes = await fetch(`${url}/get/${key}`, {
        headers: { Authorization: `Bearer ${auth}` }
      });
      
      if (!kvRes.ok) throw new Error('Failed to fetch from Vercel KV');
      const kvData = await kvRes.json();
      
      // Upstash returns { result: "stringified_value" }
      if (!kvData || kvData.result === null) {
        return res.status(404).json({ error: 'Not found' });
      }
      
      const payload = JSON.parse(kvData.result);
      return res.status(200).json(payload);
    }

    if (req.method === 'POST') {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ error: 'Invalid payload' });
      }

      const kvRes = await fetch(`${url}/set/${key}`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(JSON.stringify(payload))
      });
      
      if (!kvRes.ok) throw new Error('Failed to save to Vercel KV');
      const kvData = await kvRes.json();
      
      return res.status(200).json({ success: true, result: kvData.result });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API Sync Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
