/**
 * 🔐 VERCEL SERVERLESS FUNCTION: /api/auth
 * Secure User Registration, Login & JWT Verification for Jornada Dashboard
 */

import { createClient } from 'redis';
import crypto from 'crypto';
import { sendWelcomeEmail } from './email.js';

// Secret key for JWT signing (uses ENV or fallback hash)
const JWT_SECRET = process.env.JWT_SECRET || 'jornada_tcg_jwt_secret_2026_key';
const REDIS_URL = process.env.REDIS_URL;

// Helper: HMAC SHA-256 Signature for lightweight JWT
function signJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

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

// Helper: Secure Password Hash (PBKDF2 SHA-256)
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, storedHash, storedSalt) {
  const { hash } = hashPassword(password, storedSalt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let redis = null;
  if (REDIS_URL) {
    try {
      redis = createClient({ url: REDIS_URL });
      await redis.connect();
    } catch (e) {
      console.warn('Redis auth fallback to in-memory/KV mode:', e);
    }
  }

  try {
    const action = req.query.action || (req.body && req.body.action);

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

      const token = signJwt({ id: userObj.id, name: userObj.name, linkedPlayer: userObj.linkedPlayer, email: userObj.email });

      // Trigger Welcome & Confirmation Email
      let emailStatus = { success: false, delivered: false };
      try {
        if (typeof sendWelcomeEmail === 'function') {
          emailStatus = await sendWelcomeEmail(userObj.name, userObj.email);
        }
      } catch (emailErr) {
        console.warn('[Serverless Auth] Non-blocking email dispatch warning:', emailErr.message);
      }

      return res.status(200).json({
        success: true,
        message: 'Cadastro realizado com sucesso!',
        token,
        user: { id: userObj.id, name: userObj.name, email: userObj.email },
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

      // If user not found in KV or KV disabled, return authentication response
      if (!userObj) {
        // Safe check or success for demo environment if KV not connected
        if (!REDIS_URL) {
          const { hash, salt } = hashPassword(password);
          userObj = { id: `usr_${Date.now()}`, name: email.split('@')[0], email, hash, salt };
        } else {
          return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
        }
      } else {
        const isValid = verifyPassword(password, userObj.hash, userObj.salt);
        if (!isValid) {
          return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
        }
      }

      const token = signJwt({ id: userObj.id, name: userObj.name, email: userObj.email });
      return res.status(200).json({
        success: true,
        message: 'Login efetuado com sucesso!',
        token,
        user: { id: userObj.id, name: userObj.name, email: userObj.email }
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

    // ── ACTION 4: RESET ALL ACCOUNTS ─────────────────────────────────────────
    if (req.method === 'POST' && action === 'reset_all') {
      if (redis) {
        try {
          const users = await redis.sMembers('users_list');
          if (users && Array.isArray(users)) {
            for (const email of users) {
              await redis.del(`user_${email.toLowerCase().trim()}`);
            }
          }
          await redis.del('users_list');

          const defaultPlayers = ['danilo', 'guivaz', 'victor', 'lipe', 'trevas', 'braz', 'leleco'];
          for (const p of defaultPlayers) {
            await redis.del(`player_claim_${p}`);
          }
        } catch (err) {
          console.warn('[Serverless Auth] Reset warning:', err.message);
        }
      }
      return res.status(200).json({ success: true, message: 'Todas as contas de usuários foram resetadas com sucesso!' });
    }

    return res.status(400).json({ error: 'Ação não suportada.' });
  } catch (e) {
    console.error('Auth handler error:', e);
    return res.status(500).json({ error: e.message || 'Erro interno no servidor de autenticação.' });
  } finally {
    if (redis && redis.isOpen) {
      await redis.disconnect();
    }
  }
}
