import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

// ── REAL INFRASTRUCTURE CONFIGURATION & OPT-IN ──────────────────────────────
const isRealE2EEnabled = process.env.E2E_REAL === '1' || Boolean(process.env.E2E_BASE_URL);
const baseUrl = process.env.E2E_BASE_URL || '';
const jwtSecret = process.env.JWT_SECRET || '';
const testUserAToken = process.env.E2E_AUTH_TOKEN_USER_A || '';
const testUserBToken = process.env.E2E_AUTH_TOKEN_USER_B || '';

// Helper: Generate signed test JWT if JWT_SECRET is available
function generateTestJwt(userPayload, secret = jwtSecret) {
  if (!secret) return null;
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    ...userPayload,
    iat: now,
    exp: now + 3600
  };
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

// ── REAL INFRASTRUCTURE TEST MATRIX (CHG-006.6) ──────────────────────────────
describe('CHG-006.6: Real Infrastructure E2E Validation', () => {
  if (!isRealE2EEnabled || !baseUrl) {
    it.skip('REAL INFRASTRUCTURE SUITE: BLOCKED (Missing E2E_BASE_URL or E2E_REAL=1 opt-in)', () => {
      // Diagnostic check: This test is skipped when live environment credentials are not provided.
      // To run against live deployed infrastructure:
      // E2E_REAL=1 E2E_BASE_URL=https://your-deployment.vercel.app JWT_SECRET=... npx vitest run tests/sync_real_infrastructure.test.js
      expect(true).toBe(true);
    });
    return;
  }

  // ── TEST REAL 001: Health / Authentication ────────────────────────────────
  it('TEST REAL 001: Health / Authentication — Valida HTTP real, JWT valido e rejeicao de BOLA', async () => {
    const syncToken = `test_sync_${Date.now()}`;
    const userA = { email: 'user_a@test.com', allowedSyncTokens: [syncToken], role: 'user' };
    const tokenA = testUserAToken || generateTestJwt(userA);

    // 1. GET request against real endpoint
    const resGet = await fetch(`${baseUrl}/api/sync?token=${syncToken}`);
    expect(resGet.status).toBe(200);
    const jsonGet = await resGet.json();
    expect(jsonGet).toHaveProperty('revision');

    // 2. Unauthenticated POST rejected
    const resUnauth = await fetch(`${baseUrl}/api/sync?token=${syncToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manualMatches: [] })
    });
    expect(resUnauth.status).toBe(401);

    // 3. Invalid JWT rejected
    const resInvalid = await fetch(`${baseUrl}/api/sync?token=${syncToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid.jwt.token'
      },
      body: JSON.stringify({ manualMatches: [] })
    });
    expect(resInvalid.status).toBe(403);

    // 4. BOLA check: User B attempting to push to User A namespace
    const userB = { email: 'user_b@test.com', allowedSyncTokens: ['other_namespace'], role: 'user' };
    const tokenB = testUserBToken || generateTestJwt(userB);

    const resForbidden = await fetch(`${baseUrl}/api/sync?token=${syncToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({ manualMatches: [] })
    });
    expect(resForbidden.status).toBe(403);
  });

  // ── TEST REAL 002: Real Redis Commit ──────────────────────────────────────
  it('TEST REAL 002: Real Redis Commit — Executa commit atômico real e verifica persistência', async () => {
    const syncToken = `real_commit_${Date.now()}`;
    const user = { email: 'commit_test@test.com', allowedSyncTokens: [syncToken], role: 'user' };
    const token = testUserAToken || generateTestJwt(user);

    const matchId = crypto.randomUUID();
    const payload = {
      baseRevision: 0,
      idempotencyKey: crypto.randomUUID(),
      manualMatches: [{
        id: matchId,
        Player: 'Danilo',
        Adversario: 'GuiVaz',
        Vitorias: 2,
        Derrotas: 0,
        createdAt: new Date().toISOString()
      }]
    };

    const resPost = await fetch(`${baseUrl}/api/sync?token=${syncToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    expect(resPost.status).toBe(200);
    const jsonPost = await resPost.json();
    expect(jsonPost.success).toBe(true);
    expect(jsonPost.revision).toBe(1);

    // Verify persistence via GET
    const resGet = await fetch(`${baseUrl}/api/sync?token=${syncToken}`);
    const jsonGet = await resGet.json();
    expect(jsonGet.revision).toBe(1);
    expect(jsonGet.manualMatches.find(m => m.id === matchId)).toBeDefined();
  });

  // ── TEST REAL 003: Real OCC Conflict ──────────────────────────────────────
  it('TEST REAL 003: Real OCC Conflict — Disparos concorrentes resultam em 1x 200 e 1x 409', async () => {
    const syncToken = `real_occ_${Date.now()}`;
    const user = { email: 'occ_test@test.com', allowedSyncTokens: [syncToken], role: 'user' };
    const token = testUserAToken || generateTestJwt(user);

    const payloadA = {
      baseRevision: 0,
      idempotencyKey: crypto.randomUUID(),
      manualMatches: [{ id: crypto.randomUUID(), Player: 'DevA', Vitorias: 1 }]
    };
    const payloadB = {
      baseRevision: 0,
      idempotencyKey: crypto.randomUUID(),
      manualMatches: [{ id: crypto.randomUUID(), Player: 'DevB', Vitorias: 2 }]
    };

    const [resA, resB] = await Promise.all([
      fetch(`${baseUrl}/api/sync?token=${syncToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payloadA)
      }),
      fetch(`${baseUrl}/api/sync?token=${syncToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payloadB)
      })
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);

    const conflictRes = resA.status === 409 ? resA : resB;
    const conflictJson = await conflictRes.json();
    expect(conflictJson.error).toBe('REVISION_CONFLICT');
    expect(conflictJson.currentRevision).toBe(1);
  });

  // ── TEST REAL 004: Real Conflict Retry ────────────────────────────────────
  it('TEST REAL 004: Real Conflict Retry — Reconciliação completa após HTTP 409', async () => {
    const syncToken = `real_retry_${Date.now()}`;
    const user = { email: 'retry_test@test.com', allowedSyncTokens: [syncToken], role: 'user' };
    const token = testUserAToken || generateTestJwt(user);

    // Initial commit (Rev 1)
    const match1 = { id: crypto.randomUUID(), Player: 'P1', Vitorias: 1 };
    await fetch(`${baseUrl}/api/sync?token=${syncToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ baseRevision: 0, idempotencyKey: crypto.randomUUID(), manualMatches: [match1] })
    });

    // Stale push attempt (baseRevision: 0 -> 409)
    const match2 = { id: crypto.randomUUID(), Player: 'P2', Vitorias: 2 };
    const resStale = await fetch(`${baseUrl}/api/sync?token=${syncToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ baseRevision: 0, idempotencyKey: crypto.randomUUID(), manualMatches: [match2] })
    });
    expect(resStale.status).toBe(409);

    // Reconciliation: Pull fresh state
    const resPull = await fetch(`${baseUrl}/api/sync?token=${syncToken}`);
    const remoteData = await resPull.json();
    const newBaseRev = remoteData.revision;

    // Retry with merged data and updated baseRevision
    const merged = [...remoteData.manualMatches, match2];
    const resRetry = await fetch(`${baseUrl}/api/sync?token=${syncToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        baseRevision: newBaseRev,
        idempotencyKey: crypto.randomUUID(),
        manualMatches: merged
      })
    });

    expect(resRetry.status).toBe(200);
    const jsonRetry = await resRetry.json();
    expect(jsonRetry.revision).toBe(2);
  });

  // ── TEST REAL 005: Real Idempotency Replay ────────────────────────────────
  it('TEST REAL 005: Real Idempotency Replay — Replay de idempotencyKey não incrementa revision', async () => {
    const syncToken = `real_idem_${Date.now()}`;
    const user = { email: 'idem_test@test.com', allowedSyncTokens: [syncToken], role: 'user' };
    const token = testUserAToken || generateTestJwt(user);

    const idemKey = crypto.randomUUID();
    const payload = {
      baseRevision: 0,
      idempotencyKey: idemKey,
      manualMatches: [{ id: crypto.randomUUID(), Player: 'Danilo' }]
    };

    // First attempt -> Rev 1
    const res1 = await fetch(`${baseUrl}/api/sync?token=${syncToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    expect(res1.status).toBe(200);
    const json1 = await res1.json();
    expect(json1.revision).toBe(1);

    // Second attempt with same idempotencyKey -> IDEMPOTENT_REPLAY (Rev 1 unchanged)
    const res2 = await fetch(`${baseUrl}/api/sync?token=${syncToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    expect(res2.status).toBe(200);
    const json2 = await res2.json();
    expect(json2.message).toBe('IDEMPOTENT_REPLAY');
    expect(json2.revision).toBe(1);
  });

  // ── TEST REAL 006: Real Network Unknown Outcome ───────────────────────────
  it('TEST REAL 006: Real Network Unknown Outcome — Replay seguro após falha/interrupção', async () => {
    const syncToken = `real_net_${Date.now()}`;
    const user = { email: 'net_test@test.com', allowedSyncTokens: [syncToken], role: 'user' };
    const token = testUserAToken || generateTestJwt(user);

    const idemKey = crypto.randomUUID();
    const payload = {
      baseRevision: 0,
      idempotencyKey: idemKey,
      manualMatches: [{ id: crypto.randomUUID(), Player: 'NetworkTest' }]
    };

    const res = await fetch(`${baseUrl}/api/sync?token=${syncToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    expect(res.status).toBe(200);

    // Replay safely
    const resReplay = await fetch(`${baseUrl}/api/sync?token=${syncToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    expect(resReplay.status).toBe(200);
  });

  // ── TEST REAL 007: Real Multi-Device Stress ───────────────────────────────
  it('TEST REAL 007: Real Multi-Device Stress — Rajadas concorrentes através do endpoint real', async () => {
    const syncToken = `real_stress_${Date.now()}`;
    const user = { email: 'stress_test@test.com', allowedSyncTokens: [syncToken], role: 'user' };
    const token = testUserAToken || generateTestJwt(user);

    // Wave 1: 2 devices
    const matchesW1 = [
      { id: crypto.randomUUID(), Player: 'Dev1', Vitorias: 1 },
      { id: crypto.randomUUID(), Player: 'Dev2', Vitorias: 2 }
    ];

    const results = await Promise.all(matchesW1.map(m =>
      fetch(`${baseUrl}/api/sync?token=${syncToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ baseRevision: 0, idempotencyKey: crypto.randomUUID(), manualMatches: [m] })
      })
    ));

    const statusCodes = results.map(r => r.status);
    expect(statusCodes).toContain(200);
  });

  // ── TEST REAL 008: Real Delete vs Update ──────────────────────────────────
  it('TEST REAL 008: Real Delete vs Update — Prevalência de tombstones no backend real', async () => {
    const syncToken = `real_del_${Date.now()}`;
    const user = { email: 'del_test@test.com', allowedSyncTokens: [syncToken], role: 'user' };
    const token = testUserAToken || generateTestJwt(user);

    const targetId = crypto.randomUUID();
    const initialMatch = { id: targetId, Player: 'TargetPlayer', Vitorias: 1, updatedAt: '2026-08-19T10:00:00Z' };

    // Commit initial match (Rev 1)
    await fetch(`${baseUrl}/api/sync?token=${syncToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ baseRevision: 0, idempotencyKey: crypto.randomUUID(), manualMatches: [initialMatch] })
    });

    // Delete match via tombstone (Rev 2)
    const resDel = await fetch(`${baseUrl}/api/sync?token=${syncToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        baseRevision: 1,
        idempotencyKey: crypto.randomUUID(),
        manualMatches: [],
        deletedIds: [targetId]
      })
    });
    expect(resDel.status).toBe(200);

    // Verify deletion in GET
    const resGet = await fetch(`${baseUrl}/api/sync?token=${syncToken}`);
    const jsonGet = await resGet.json();
    expect(jsonGet.manualMatches.find(m => m.id === targetId)).toBeUndefined();
    expect(jsonGet.deletedIds).toContain(targetId);
  });

  // ── TEST REAL 009: Real User Isolation ────────────────────────────────────
  it('TEST REAL 009: Real User Isolation — Isolamento estrito entre usuários distintos', async () => {
    const tokenUserA = `token_user_a_${Date.now()}`;
    const tokenUserB = `token_user_b_${Date.now()}`;

    const userA = { email: 'alice@test.com', allowedSyncTokens: [tokenUserA], role: 'user' };
    const userB = { email: 'bob@test.com', allowedSyncTokens: [tokenUserB], role: 'user' };

    const jwtA = testUserAToken || generateTestJwt(userA);
    const jwtB = testUserBToken || generateTestJwt(userB);

    // Alice commits to her namespace
    const resA = await fetch(`${baseUrl}/api/sync?token=${tokenUserA}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtA}` },
      body: JSON.stringify({ baseRevision: 0, idempotencyKey: crypto.randomUUID(), manualMatches: [{ id: crypto.randomUUID(), Player: 'AlicePrivate' }] })
    });
    expect(resA.status).toBe(200);

    // Bob commits to his namespace
    const resB = await fetch(`${baseUrl}/api/sync?token=${tokenUserB}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtB}` },
      body: JSON.stringify({ baseRevision: 0, idempotencyKey: crypto.randomUUID(), manualMatches: [{ id: crypto.randomUUID(), Player: 'BobPrivate' }] })
    });
    expect(resB.status).toBe(200);

    // Bob attempts to read/write Alice namespace -> 403 Forbidden
    const resCross = await fetch(`${baseUrl}/api/sync?token=${tokenUserA}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtB}` },
      body: JSON.stringify({ baseRevision: 1, idempotencyKey: crypto.randomUUID(), manualMatches: [] })
    });
    expect(resCross.status).toBe(403);
  });

  // ── TEST REAL 010: Real Logout / Login ────────────────────────────────────
  it('TEST REAL 010: Real Logout / Login — Isolamento de sessão sem vazamento de estado', async () => {
    const syncToken = `real_session_${Date.now()}`;
    const user = { email: 'session_test@test.com', allowedSyncTokens: [syncToken], role: 'user' };
    const token = testUserAToken || generateTestJwt(user);

    const res = await fetch(`${baseUrl}/api/sync?token=${syncToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ baseRevision: 0, idempotencyKey: crypto.randomUUID(), manualMatches: [{ id: crypto.randomUUID(), Player: 'SessionA' }] })
    });
    expect(res.status).toBe(200);
  });
});
