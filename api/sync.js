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

// ── REDIS LUA SCRIPT (ATOMIC OCC COMMIT) ─────────────────────────────────────
export const LUA_SYNC_COMMIT = `
local key = KEYS[1]
local incomingJson = ARGV[1]
local baseRevision = tonumber(ARGV[2])
local idempotencyKey = ARGV[3]

local currentRaw = redis.call('GET', key)
local currentData = nil
local currentRevision = 0

if currentRaw then
    local status, parsed = pcall(cjson.decode, currentRaw)
    if status and parsed and type(parsed) == 'table' then
        currentData = parsed
        if currentData.revision and type(currentData.revision) == 'number' then
            currentRevision = currentData.revision
        else
            currentRevision = 0
        end
    end
end

-- 1. Check Idempotency Replay
if currentData and currentData.lastIdempotencyKey and idempotencyKey and currentData.lastIdempotencyKey == idempotencyKey then
    return cjson.encode({
        status = 'IDEMPOTENT_REPLAY',
        revision = currentRevision,
        matchesCount = (currentData.manualMatches and #currentData.manualMatches) or 0,
        updatedAt = currentData.updatedAt
    })
end

-- 2. Validate Base Revision (OCC)
if baseRevision ~= nil and baseRevision ~= currentRevision then
    return cjson.encode({
        status = 'REVISION_CONFLICT',
        currentRevision = currentRevision,
        baseRevision = baseRevision
    })
end

-- 3. Parse Incoming Payload
local incomingStatus, incomingData = pcall(cjson.decode, incomingJson)
if not incomingStatus or not incomingData or type(incomingData) ~= 'table' then
    return cjson.encode({
        status = 'INVALID_PAYLOAD',
        message = 'Invalid incoming JSON payload'
    })
end

local existingMatches = (currentData and currentData.manualMatches) or {}
local incomingMatches = incomingData.manualMatches or {}

-- Protect against empty snapshot replacing non-empty dataset
if #existingMatches > 0 and #incomingMatches == 0 then
    return cjson.encode({
        status = 'EMPTY_SNAPSHOT_REJECTED',
        existingCount = #existingMatches
    })
end

-- 4. Server-Side Merge
local deletedSet = {}
if incomingData.deletedIds and type(incomingData.deletedIds) == 'table' then
    for _, delId in ipairs(incomingData.deletedIds) do
        deletedSet[tostring(delId)] = true
    end
end

local matchMap = {}
local matchOrder = {}

if currentData and currentData.manualMatches and type(currentData.manualMatches) == 'table' then
    for _, m in ipairs(currentData.manualMatches) do
        if m and m.id and not deletedSet[tostring(m.id)] then
            local mid = tostring(m.id)
            matchMap[mid] = m
            table.insert(matchOrder, mid)
        end
    end
end

if incomingData.manualMatches and type(incomingData.manualMatches) == 'table' then
    for _, m in ipairs(incomingData.manualMatches) do
        if m and m.id and not deletedSet[tostring(m.id)] then
            local mid = tostring(m.id)
            if not matchMap[mid] then
                matchMap[mid] = m
                table.insert(matchOrder, mid)
            else
                local existing = matchMap[mid]
                local tsIn = m.updatedAt or m.createdAt or ''
                local tsEx = existing.updatedAt or existing.createdAt or ''
                if tsIn >= tsEx then
                    matchMap[mid] = m
                end
            end
        end
    end
end

local mergedMatches = {}
local seen = {}
for _, mid in ipairs(matchOrder) do
    if not seen[mid] and matchMap[mid] then
        seen[mid] = true
        table.insert(mergedMatches, matchMap[mid])
    end
end

-- 5. Cumulative Tombstones & New Consolidated State
local combinedDeleted = {}
local delSeen = {}
if currentData and currentData.deletedIds and type(currentData.deletedIds) == 'table' then
    for _, delId in ipairs(currentData.deletedIds) do
        local sid = tostring(delId)
        if not delSeen[sid] then
            delSeen[sid] = true
            table.insert(combinedDeleted, sid)
        end
    end
end
if incomingData and incomingData.deletedIds and type(incomingData.deletedIds) == 'table' then
    for _, delId in ipairs(incomingData.deletedIds) do
        local sid = tostring(delId)
        if not delSeen[sid] then
            delSeen[sid] = true
            table.insert(combinedDeleted, sid)
        end
    end
end

local newRevision = currentRevision + 1
local consolidated = {
    revision = newRevision,
    lastIdempotencyKey = idempotencyKey,
    updatedAt = incomingData.updatedAt or (currentData and currentData.updatedAt) or '',
    manualMatches = mergedMatches,
    decks = incomingData.decks or (currentData and currentData.decks) or {},
    players = incomingData.players or (currentData and currentData.players) or {},
    locais = incomingData.locais or (currentData and currentData.locais) or {},
    colecoes = incomingData.colecoes or (currentData and currentData.colecoes) or {},
    deletedIds = combinedDeleted,
    editedMatches = incomingData.editedMatches or (currentData and currentData.editedMatches) or {}
}

local finalJson = cjson.encode(consolidated)
redis.call('SET', key, finalJson)

return cjson.encode({
    status = 'SUCCESS',
    revision = newRevision,
    matchesCount = #mergedMatches,
    updatedAt = consolidated.updatedAt
})
`;

// Pure JS fallback of Lua atomic commit (for in-memory / offline test execution)
export function executeAtomicCommit(existingData, incomingBody, baseRevision, idempotencyKey) {
  const currentRevision = (existingData && typeof existingData.revision === 'number') ? existingData.revision : 0;

  // 1. Idempotency check
  if (existingData && existingData.lastIdempotencyKey && idempotencyKey && existingData.lastIdempotencyKey === idempotencyKey) {
    return {
      status: 'IDEMPOTENT_REPLAY',
      revision: currentRevision,
      matchesCount: (existingData.manualMatches && existingData.manualMatches.length) || 0,
      updatedAt: existingData.updatedAt
    };
  }

  // 2. OCC Check
  if (baseRevision !== undefined && baseRevision !== null && Number(baseRevision) !== currentRevision) {
    return {
      status: 'REVISION_CONFLICT',
      currentRevision,
      baseRevision: Number(baseRevision)
    };
  }

  const existingMatches = (existingData && Array.isArray(existingData.manualMatches)) ? existingData.manualMatches : [];
  const incomingMatches = (incomingBody && Array.isArray(incomingBody.manualMatches)) ? incomingBody.manualMatches : [];
  const deletedSet = new Set(Array.isArray(incomingBody?.deletedIds) ? incomingBody.deletedIds.map(String) : []);

  if (existingMatches.length > 0 && incomingMatches.length === 0) {
    return {
      status: 'EMPTY_SNAPSHOT_REJECTED',
      existingCount: existingMatches.length
    };
  }

  const matchMap = new Map();
  existingMatches.forEach(m => {
    if (m && m.id && !deletedSet.has(String(m.id))) {
      matchMap.set(String(m.id), m);
    }
  });

  incomingMatches.forEach(m => {
    if (!m || !m.id || deletedSet.has(String(m.id))) return;
    const mid = String(m.id);
    if (!matchMap.has(mid)) {
      matchMap.set(mid, m);
    } else {
      const existing = matchMap.get(mid);
      const tsIncoming = Date.parse(m.updatedAt || m.createdAt) || 0;
      const tsExisting = Date.parse(existing.updatedAt || existing.createdAt) || 0;
      if (tsIncoming >= tsExisting) {
        matchMap.set(mid, m);
      }
    }
  });

  const mergedMatches = Array.from(matchMap.values());
  const combinedDeleted = Array.from(new Set([
    ...((existingData && Array.isArray(existingData.deletedIds)) ? existingData.deletedIds.map(String) : []),
    ...((incomingBody && Array.isArray(incomingBody.deletedIds)) ? incomingBody.deletedIds.map(String) : [])
  ])).slice(-500);

  const newRevision = currentRevision + 1;
  const consolidated = {
    ...incomingBody,
    revision: newRevision,
    lastIdempotencyKey: idempotencyKey,
    manualMatches: mergedMatches,
    deletedIds: combinedDeleted,
    updatedAt: incomingBody?.updatedAt || new Date().toISOString()
  };

  return {
    status: 'SUCCESS',
    revision: newRevision,
    matchesCount: mergedMatches.length,
    updatedAt: consolidated.updatedAt,
    consolidated
  };
}

export function emergencyServerMerge(existingData, incomingBody) {
  const existingMatches = (existingData && Array.isArray(existingData.manualMatches)) ? existingData.manualMatches : [];
  const incomingMatches = (incomingBody && Array.isArray(incomingBody.manualMatches)) ? incomingBody.manualMatches : [];
  const deletedSet = new Set(Array.isArray(incomingBody?.deletedIds) ? incomingBody.deletedIds.map(String) : []);

  const matchMap = new Map();
  existingMatches.forEach(m => {
    if (m && m.id && !deletedSet.has(String(m.id))) {
      matchMap.set(String(m.id), m);
    }
  });

  incomingMatches.forEach(m => {
    if (!m || !m.id || deletedSet.has(String(m.id))) return;
    const mid = String(m.id);
    if (!matchMap.has(mid)) {
      matchMap.set(mid, m);
    } else {
      const existing = matchMap.get(mid);
      const tsIncoming = Date.parse(m.updatedAt || m.createdAt) || 0;
      const tsExisting = Date.parse(existing.updatedAt || existing.createdAt) || 0;
      if (tsIncoming >= tsExisting) {
        matchMap.set(mid, m);
      }
    }
  });

  const mergedMatches = Array.from(matchMap.values());
  return {
    ...incomingBody,
    manualMatches: mergedMatches,
    updatedAt: incomingBody?.updatedAt || new Date().toISOString()
  };
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

    // Active User Check in Redis (ADR 0009)
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
        revision: 0,
        message: 'Modo Offline: REDIS_URL não configurado na Vercel.',
        manualMatches: []
      });
    }
    const body = req.body || {};
    const baseRev = body.baseRevision !== undefined ? body.baseRevision : 0;
    const idemKey = body.idempotencyKey || `idem_${Date.now()}`;
    const result = executeAtomicCommit(null, body, baseRev, idemKey);

    return res.status(200).json({
      success: true,
      revision: result.revision || 1,
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
        return res.status(200).json({ revision: 0, manualMatches: [] });
      }
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed.revision !== 'number') {
        parsed.revision = 0;
      }
      return res.status(200).json(parsed);
    }

    if (req.method === 'POST') {
      const body = req.body;
      const baseRevision = body.baseRevision !== undefined ? String(body.baseRevision) : null;
      const idempotencyKey = body.idempotencyKey || '';

      // Execute Lua Atomic Commit on Redis
      let luaResultRaw;
      try {
        luaResultRaw = await client.eval(LUA_SYNC_COMMIT, {
          keys: [syncKey],
          arguments: [JSON.stringify(body), baseRevision !== null ? baseRevision : '0', idempotencyKey]
        });
      } catch (luaErr) {
        log('error', 'Redis Lua execution failed, running atomic fallback', { requestId, error: luaErr.message });
        const rawCurrent = await client.get(syncKey);
        const existingData = rawCurrent ? JSON.parse(rawCurrent) : null;
        const fallbackRes = executeAtomicCommit(existingData, body, baseRevision !== null ? Number(baseRevision) : undefined, idempotencyKey);
        if (fallbackRes.status === 'SUCCESS') {
          await client.set(syncKey, JSON.stringify(fallbackRes.consolidated));
          return res.status(200).json({
            success: true,
            revision: fallbackRes.revision,
            matchesCount: fallbackRes.matchesCount,
            updatedAt: fallbackRes.updatedAt
          });
        } else if (fallbackRes.status === 'REVISION_CONFLICT') {
          return res.status(409).json({
            error: 'REVISION_CONFLICT',
            currentRevision: fallbackRes.currentRevision,
            baseRevision: fallbackRes.baseRevision,
            message: 'A nuvem foi atualizada por outro dispositivo. Re-sincronização necessária.'
          });
        }
      }

      const result = typeof luaResultRaw === 'string' ? JSON.parse(luaResultRaw) : (luaResultRaw || {});

      if (result.status === 'SUCCESS') {
        log('info', 'Atomic OCC Commit Success', { requestId, activeToken, newRevision: result.revision });
        return res.status(200).json({
          success: true,
          message: 'Dados sincronizados na nuvem com sucesso!',
          revision: result.revision,
          matchesCount: result.matchesCount,
          updatedAt: result.updatedAt
        });
      }

      if (result.status === 'IDEMPOTENT_REPLAY') {
        log('info', 'Idempotent Replay Accepted', { requestId, activeToken, revision: result.revision });
        return res.status(200).json({
          success: true,
          message: 'IDEMPOTENT_REPLAY',
          revision: result.revision,
          matchesCount: result.matchesCount,
          updatedAt: result.updatedAt
        });
      }

      if (result.status === 'REVISION_CONFLICT') {
        log('warn', 'OCC Revision Conflict', {
          requestId,
          activeToken,
          currentRevision: result.currentRevision,
          baseRevision: result.baseRevision
        });
        return res.status(409).json({
          error: 'REVISION_CONFLICT',
          currentRevision: result.currentRevision,
          baseRevision: result.baseRevision,
          message: 'A nuvem foi atualizada por outro dispositivo. Re-sincronização necessária.'
        });
      }

      if (result.status === 'EMPTY_SNAPSHOT_REJECTED') {
        log('warn', 'Rejected empty matches push against non-empty cloud dataset', { requestId, activeToken });
        return res.status(400).json({
          error: 'Payload vazio rejeitado para proteger integridade da nuvem.'
        });
      }

      return res.status(400).json({ error: result.message || 'Falha ao processar sincronização.' });
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
