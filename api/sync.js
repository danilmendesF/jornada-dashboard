import { createClient } from 'redis';
import crypto from 'crypto';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'jornada-sync',
      level: 'error',
      message: '[Serverless Sync] FATAL: JWT_SECRET environment variable is missing or empty.'
    }));
    return null;
  }
  return secret.trim();
}

export function getRequestId(req) {
  const incoming = req?.headers?.['x-request-id'] || req?.headers?.['x-correlation-id'];
  if (incoming && typeof incoming === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(incoming)) {
    return incoming;
  }
  return crypto.randomUUID();
}

function log(level, message, context = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    service: 'jornada-sync',
    level,
    message,
    ...context
  };
  if (level === 'error') console.error(JSON.stringify(payload));
  else console.log(JSON.stringify(payload));
}

export function createJwt(payload, expiresInSeconds = 30 * 24 * 60 * 60) {
  const secret = getJwtSecret();
  if (!secret) return null;
  const now = Math.floor(Date.now() / 1000);
  const exp = payload.exp || (now + expiresInSeconds);
  const fullPayload = { ...payload, iat: payload.iat || now, exp };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyJwt(token) {
  const secret = getJwtSecret();
  if (!secret || !token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, bodyB64, signature] = parts;

  try {
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    if (!header || header.alg !== 'HS256') return null;
  } catch (e) {
    return null;
  }

  const expected = crypto.createHmac('sha256', secret).update(`${headerB64}.${bodyB64}`).digest('base64url');
  if (signature !== expected) return null;

  try {
    const payload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8'));
    if (payload.exp && typeof payload.exp === 'number') {
      const now = Math.floor(Date.now() / 1000);
      if (now > payload.exp + 60) {
        return null;
      }
    }
    return payload;
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  const REDIS_URL = process.env.REDIS_URL;
  const requestId = getRequestId(req);
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const activeToken = req.query.token || 'team_default_sync';
  const syncKey = `jornada_sync_${activeToken}`;

  // Enforce JWT Authentication for Mutations
  if (req.method === 'POST') {
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      log('warn', 'POST /api/sync unauthenticated attempt rejected', { requestId, activeToken });
      return res.status(401).json({
        error: 'Autenticação obrigatória. Faça login no dashboard para sincronizar os dados do time com a nuvem.'
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const userPayload = verifyJwt(token);

    if (!userPayload) {
      log('warn', 'POST /api/sync invalid JWT rejected', { requestId, activeToken });
      return res.status(403).json({
        error: 'Token JWT inválido ou expirado. Faça login novamente para continuar.'
      });
    }

    // Enforce Authorization (BOLA/IDOR Prevention)
    const isTeamMember = Array.isArray(userPayload.allowedSyncTokens) && userPayload.allowedSyncTokens.includes(activeToken);
    const isDefaultTeam = (activeToken === 'team_default_sync');
    const isAdmin = (userPayload.role === 'admin');

    if (!isTeamMember && !isDefaultTeam && !isAdmin) {
      log('warn', 'Unauthorized namespace mutation attempt blocked', { requestId, user: userPayload.email, targetToken: activeToken });
      return res.status(403).json({
        error: `Acesso negado: você não tem autorização para modificar este time/namespace (${activeToken}).`
      });
    }

    // Active User Check in Redis (ADR 0009: Session Revocation / Deleted Account Rejection)
    if (REDIS_URL && userPayload.email) {
      let verifyClient = null;
      try {
        verifyClient = createClient({ url: REDIS_URL });
        await verifyClient.connect();
        const userRecord = await verifyClient.get(`user_${userPayload.email.toLowerCase().trim()}`);
        if (!userRecord && !isAdmin) {
          log('warn', 'POST /api/sync rejected: user account is deleted/revoked in Redis', { requestId, user: userPayload.email });
          return res.status(401).json({
            error: 'Sessão revogada ou conta inexistente. Faça login novamente.'
          });
        }
      } catch (e) {
        log('warn', 'Redis user active check fallback mode', { requestId, error: e.message });
      } finally {
        if (verifyClient && verifyClient.isOpen) {
          await verifyClient.disconnect();
        }
      }
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || (!Array.isArray(body.manualMatches) && !Array.isArray(body.decks))) {
      return res.status(400).json({ error: 'Estrutura de payload inválida para sincronização.' });
    }
  }

    if (!REDIS_URL) {
    if (req.method === 'GET') {
      return res.status(200).json({
        message: 'Modo Offline: REDIS_URL não configurado na Vercel.',
        manualMatches: []
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Modo Offline: Dados mantidos localmente no navegador.'
    });
  }

  let client = null;
  try {
    client = createClient({ url: REDIS_URL });
    await client.connect();

    if (req.method === 'GET') {
      const data = await client.get(syncKey);
      if (!data) {
        return res.status(200).json({ manualMatches: [] });
      }
      return res.status(200).json(JSON.parse(data));
    }

    if (req.method === 'POST') {
      const body = req.body;
      if (!body || typeof body !== 'object' || (!Array.isArray(body.manualMatches) && !Array.isArray(body.decks))) {
        return res.status(400).json({ error: 'Estrutura de payload inválida para sincronização.' });
      }

      await client.set(syncKey, JSON.stringify(body));
      log('info', 'Synced payload saved to Redis', { requestId, activeToken, matchesCount: body.manualMatches?.length || 0 });

      return res.status(200).json({
        success: true,
        message: 'Dados sincronizados na nuvem com sucesso!',
        updatedAt: new Date().toISOString()
      });
    }

    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    log('error', 'Sync handler exception', { requestId, activeToken, error: error.message });
    return res.status(500).json({ error: 'Falha interna ao processar sincronização na nuvem.' });
  } finally {
    if (client && client.isOpen) {
      await client.disconnect();
    }
  }
}
