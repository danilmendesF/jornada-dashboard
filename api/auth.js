import { createClient } from 'redis';
import crypto from 'crypto';
import { sendWelcomeEmail } from './email.js';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'jornada-auth',
      level: 'error',
      message: '[Serverless Auth] FATAL: JWT_SECRET environment variable is missing or empty.'
    }));
    return null;
  }
  return secret.trim();
}

const REDIS_URL = process.env.REDIS_URL;

// Helper: Correlation & Request ID
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
    service: 'jornada-auth',
    level,
    message,
    ...context
  };
  if (level === 'error') console.error(JSON.stringify(payload));
  else console.log(JSON.stringify(payload));
}

// Helper: HMAC SHA-256 Signature for JWT with finite expiration (exp)
export function signJwt(payload, expiresInSeconds = 30 * 24 * 60 * 60) {
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

  // Validate algorithm
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
    // Enforce finite lifetime expiration (with 60s clock skew tolerance)
    if (payload.exp && typeof payload.exp === 'number') {
      const now = Math.floor(Date.now() / 1000);
      if (now > payload.exp + 60) {
        return null; // Expired token
      }
    }
    return payload;
  } catch (e) {
    return null;
  }
}

// Helper: Secure Password Hash (PBKDF2 SHA-256)
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, storedHash, storedSalt) {
  const { hash } = hashPassword(password, storedSalt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

// Helper: Distributed Redis Rate Limiter (ADR 0005: Fail-Open on Redis Error)
export async function checkRateLimit(redis, clientIp, email, action, ipLimit = 10, accountLimit = 5, windowSec = 900) {
  if (!redis) return { allowed: true, remaining: ipLimit };

  // 1. IP-based Rate Limiting (ADR 0005)
  if (clientIp) {
    const ipKey = `ratelimit_auth_ip_${clientIp.replace(/[^a-zA-Z0-9:._-]/g, '')}_${action}`;
    try {
      const currentIp = await redis.incr(ipKey);
      if (currentIp === 1) {
        await redis.expire(ipKey, windowSec);
      }
      if (currentIp > ipLimit) {
        return { allowed: false, remaining: 0, retryAfter: windowSec, reason: 'ip' };
      }
    } catch (err) {
      log('warn', 'Redis IP rate limit fail-open exception', { error: err.message });
      return { allowed: true, remaining: ipLimit };
    }
  }

  // 2. Account/Email-based Rate Limiting (ADR 0008)
  if (email && typeof email === 'string') {
    const normalizedEmail = email.toLowerCase().trim();
    const emailHash = crypto.createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 32);
    const accKey = `ratelimit_auth_acc_${emailHash}_${action}`;
    try {
      const currentAcc = await redis.incr(accKey);
      if (currentAcc === 1) {
        await redis.expire(accKey, windowSec);
      }
      if (currentAcc > accountLimit) {
        return { allowed: false, remaining: 0, retryAfter: windowSec, reason: 'account' };
      }
    } catch (err) {
      log('warn', 'Redis Account rate limit fail-open exception', { error: err.message });
      return { allowed: true, remaining: accountLimit };
    }
  }

  return { allowed: true, remaining: ipLimit };
}

export default async function handler(req, res) {
  const requestId = getRequestId(req);
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').split(',')[0].trim();
  let redis = null;
  if (REDIS_URL) {
    try {
      redis = createClient({ url: REDIS_URL });
      await redis.connect();
    } catch (e) {
      log('warn', 'Redis connection fallback mode', { requestId, error: e.message });
    }
  }

  try {
    const action = req.query.action || (req.body && req.body.action);

    // Rate Limiting on sensitive actions (register & login)
    if (req.method === 'POST' && (action === 'register' || action === 'login')) {
      const rateResult = await checkRateLimit(redis, clientIp, req.body?.email, action, 10, 5, 900);
      if (!rateResult.allowed) {
        log('warn', 'Rate limit exceeded for auth endpoint', { requestId, clientIp, action });
        res.setHeader('Retry-After', String(rateResult.retryAfter || 900));
        return res.status(429).json({
          error: 'Muitas tentativas consecutivas. Aguarde alguns minutos antes de tentar novamente.',
          retryAfter: rateResult.retryAfter || 900
        });
      }
    }

    // ── ACTION 1: REGISTER ──────────────────────────────────────────────────
    if (req.method === 'POST' && action === 'register') {
      const { name, email, password } = req.body || {};
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Preencha nome, e-mail e senha.' });
      }

      const userKey = `user_${email.toLowerCase().trim()}`;
      const nameKey = `player_claim_${name.toLowerCase().trim()}`;
      
      if (redis) {
        const existingUser = await redis.get(userKey);
        if (existingUser) {
          return res.status(400).json({ error: 'E-mail já cadastrado.' });
        }
        const existingClaim = await redis.get(nameKey);
        if (existingClaim) {
          return res.status(400).json({ error: `⚠️ O jogador "${name}" já possui uma conta cadastrada. Faça login com a conta existente ou selecione outro perfil.` });
        }
      }

      const { hash, salt } = hashPassword(password);
      const userObj = {
        id: `usr_${Date.now()}`,
        name: name.trim(),
        linkedPlayer: name.trim(),
        email: email.toLowerCase().trim(),
        teamId: 'team_default_sync',
        allowedSyncTokens: ['team_default_sync'],
        role: 'player',
        hash,
        salt,
        createdAt: new Date().toISOString()
      };

      if (redis) {
        await redis.set(userKey, JSON.stringify(userObj));
        await redis.set(nameKey, userObj.email);
        await redis.sAdd('users_list', userObj.email);
        if (userObj.name) await redis.sAdd('claimed_players', userObj.name);
        if (userObj.linkedPlayer) await redis.sAdd('claimed_players', userObj.linkedPlayer);
      }

      const token = signJwt({
        id: userObj.id,
        name: userObj.name,
        linkedPlayer: userObj.linkedPlayer,
        email: userObj.email,
        teamId: userObj.teamId,
        allowedSyncTokens: userObj.allowedSyncTokens,
        role: userObj.role
      });

      log('info', 'User registered successfully', { requestId, userId: userObj.id, email: userObj.email });

      // Trigger Welcome Email non-blocking
      let emailStatus = { success: false, delivered: false };
      try {
        if (typeof sendWelcomeEmail === 'function') {
          emailStatus = await sendWelcomeEmail(userObj.name, userObj.email);
        }
      } catch (emailErr) {
        log('warn', 'Welcome email non-blocking dispatch warning', { requestId, error: emailErr.message });
      }

      return res.status(200).json({
        success: true,
        message: 'Cadastro realizado com sucesso!',
        token,
        user: { id: userObj.id, name: userObj.name, email: userObj.email, role: userObj.role },
        emailStatus
      });
    }

    // ── ACTION 2: LOGIN ─────────────────────────────────────────────────────
    if (req.method === 'POST' && action === 'login') {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Preencha e-mail e senha.' });
      }

      const userKey = `user_${email.toLowerCase().trim()}`;
      let userObj = null;

      if (redis) {
        const raw = await redis.get(userKey);
        if (raw) userObj = JSON.parse(raw);
      }

      if (!userObj) {
        if (!REDIS_URL) {
          const { hash, salt } = hashPassword(password);
          userObj = {
            id: `usr_${Date.now()}`,
            name: email.split('@')[0],
            email,
            teamId: 'team_default_sync',
            allowedSyncTokens: ['team_default_sync'],
            role: 'player',
            hash,
            salt
          };
        } else {
          return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
        }
      } else {
        const isValid = verifyPassword(password, userObj.hash, userObj.salt);
        if (!isValid) {
          return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
        }
      }

      const token = signJwt({
        id: userObj.id,
        name: userObj.name,
        linkedPlayer: userObj.linkedPlayer || userObj.name,
        email: userObj.email,
        teamId: userObj.teamId || 'team_default_sync',
        allowedSyncTokens: userObj.allowedSyncTokens || ['team_default_sync'],
        role: userObj.role || 'player'
      });

      log('info', 'User login successful', { requestId, userId: userObj.id, email: userObj.email });

      return res.status(200).json({
        success: true,
        message: 'Login efetuado com sucesso!',
        token,
        user: {
          id: userObj.id,
          name: userObj.name,
          linkedPlayer: userObj.linkedPlayer || userObj.name,
          email: userObj.email,
          role: userObj.role || 'player'
        }
      });
    }

    // ── ACTION 3: VERIFY TOKEN OR GET CLAIMED ─────────────────────────────
    if (action === 'claimed' || req.query.action === 'claimed') {
      let claimedList = [];
      if (redis) {
        try {
          const members = await redis.sMembers('claimed_players');
          if (Array.isArray(members)) claimedList = members;
        } catch (e) {}
      }
      return res.status(200).json({ claimed: claimedList });
    }

    if (req.method === 'GET' || action === 'verify') {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '').trim() || req.query.token;
      const verified = verifyJwt(token);

      if (!verified) {
        return res.status(401).json({ valid: false, error: 'Token inválido ou expirado.' });
      }

      return res.status(200).json({ valid: true, user: verified });
    }

    // ── ACTION 4: ADMIN USER DATA DELETION / RIGHT TO BE FORGOTTEN (PRIV-001) ──
    if (req.method === 'POST' && (action === 'admin_delete_user_data' || action === 'reset_single')) {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '').trim();
      const verifiedAdmin = verifyJwt(token);

      if (!verifiedAdmin || verifiedAdmin.role !== 'admin') {
        log('warn', 'Unauthorized admin delete attempt blocked', { requestId });
        return res.status(403).json({ error: 'Operação administrativa restrita. Permissão negada.' });
      }

      const { targetEmail, playerName } = req.body || {};
      const emailToDelete = targetEmail || (playerName ? null : null);

      if (redis) {
        try {
          if (emailToDelete) {
            const userKey = `user_${emailToDelete.toLowerCase().trim()}`;
            const rawUser = await redis.get(userKey);
            if (rawUser) {
              const parsed = JSON.parse(rawUser);
              if (parsed.name) {
                await redis.del(`player_claim_${parsed.name.toLowerCase().trim()}`);
                await redis.sRem('claimed_players', parsed.name.trim());
              }
            }
            await redis.del(userKey);
            await redis.sRem('users_list', emailToDelete.toLowerCase().trim());
          } else if (playerName) {
            const nameKey = `player_claim_${playerName.toLowerCase().trim()}`;
            const linkedEmail = await redis.get(nameKey);
            if (linkedEmail) {
              await redis.del(`user_${linkedEmail.toLowerCase().trim()}`);
              await redis.sRem('users_list', linkedEmail);
            }
            await redis.del(nameKey);
            await redis.sRem('claimed_players', playerName.trim());
          }
          log('info', 'Admin deleted user account/PII', { requestId, admin: verifiedAdmin.email, target: emailToDelete || playerName });
        } catch (e) {
          log('error', 'Admin deletion failure', { requestId, error: e.message });
        }
      }
      return res.status(200).json({ success: true, message: 'Dados e conta do usuário expurgados com sucesso.' });
    }

    // ── ACTION 5: ADMIN RESET ALL ACCOUNTS ──────────────────────────────────
    if (req.method === 'POST' && action === 'reset_all') {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '').trim();
      const verifiedAdmin = verifyJwt(token);

      if (!verifiedAdmin || verifiedAdmin.role !== 'admin') {
        log('warn', 'Unauthorized admin reset_all attempt blocked', { requestId });
        return res.status(403).json({ error: 'Operação administrativa restrita. Permissão negada.' });
      }

      if (redis) {
        try {
          const users = await redis.sMembers('users_list');
          if (users && Array.isArray(users)) {
            for (const email of users) {
              await redis.del(`user_${email.toLowerCase().trim()}`);
            }
          }
          await redis.del('users_list');
          await redis.del('claimed_players');

          const keys = await redis.keys('player_claim_*');
          if (keys && keys.length > 0) {
            for (const key of keys) {
              await redis.del(key);
            }
          }
          log('info', 'Admin executed reset_all', { requestId, admin: verifiedAdmin.email });
        } catch (err) {
          log('warn', 'Reset all warning', { requestId, error: err.message });
        }
      }
      return res.status(200).json({ success: true, message: 'Todas as contas de usuários foram resetadas com sucesso!' });
    }

    return res.status(400).json({ error: 'Ação não suportada.' });
  } catch (e) {
    log('error', 'Auth handler unhandled exception', { requestId, error: e.message });
    return res.status(500).json({ error: e.message || 'Erro interno no servidor de autenticação.' });
  } finally {
    if (redis && redis.isOpen) {
      await redis.disconnect();
    }
  }
}
