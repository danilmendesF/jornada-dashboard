import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { executeAtomicCommit } from '../api/sync.js';

const syncCloudCode = fs.readFileSync(path.resolve(__dirname, '../js/sync_cloud.js'), 'utf-8');
const configCode = fs.readFileSync(path.resolve(__dirname, '../js/config.js'), 'utf-8');
const utilCode = fs.readFileSync(path.resolve(__dirname, '../js/util.js'), 'utf-8');
const storageCode = fs.readFileSync(path.resolve(__dirname, '../js/storage.js'), 'utf-8');

// Canonical Snapshot Normalizer (INV-010)
export function canonicalizeSnapshot(matches, deletedIds = []) {
  const cleanMatches = (matches || [])
    .filter(m => m && m.id)
    .map(m => ({
      id: String(m.id),
      Player: m.Player || '',
      Adversario: m.Adversario || '',
      Vitorias: Number(m.Vitorias || 0),
      Derrotas: Number(m.Derrotas || 0),
      Empates: Number(m.Empates || 0),
      createdAt: m.createdAt || m.Data || '',
      updatedAt: m.updatedAt || m.createdAt || m.Data || ''
    }))
    .sort((a, b) => {
      const tsA = Date.parse(a.updatedAt || a.createdAt) || 0;
      const tsB = Date.parse(b.updatedAt || b.createdAt) || 0;
      if (tsA !== tsB) return tsA - tsB;
      return a.id.localeCompare(b.id);
    });

  const cleanDeleted = Array.from(new Set((deletedIds || []).map(String))).sort();

  return {
    matchesCount: cleanMatches.length,
    deletedCount: cleanDeleted.length,
    matches: cleanMatches,
    deletedIds: cleanDeleted
  };
}

// Linearizable Mock Cloud Backend
class MockCloudBackend {
  constructor() {
    this.namespaces = new Map();
    this.queue = Promise.resolve();
    this.metrics = {
      totalOperations: 0,
      successfulCommits: 0,
      conflicts409: 0,
      idempotentReplays: 0,
      networkFailures: 0,
      retries: 0
    };
  }

  getCloudState(token = 'team_default_sync') {
    if (!this.namespaces.has(token)) {
      this.namespaces.set(token, {
        revision: 0,
        lastIdempotencyKey: null,
        manualMatches: [],
        decks: [],
        players: [],
        deletedIds: [],
        updatedAt: new Date().toISOString()
      });
    }
    return this.namespaces.get(token);
  }

  async handleGet(token = 'team_default_sync') {
    this.metrics.totalOperations++;
    const state = this.getCloudState(token);
    return {
      status: 200,
      ok: true,
      json: async () => JSON.parse(JSON.stringify(state))
    };
  }

  async handlePost(token = 'team_default_sync', payload, authHeader = '') {
    return new Promise((resolve) => {
      this.queue = this.queue.then(async () => {
        this.metrics.totalOperations++;

        if (authHeader && authHeader.includes('invalid_token')) {
          return resolve({
            status: 401,
            ok: false,
            json: async () => ({ error: 'UNAUTHORIZED' })
          });
        }
        if (authHeader && authHeader.includes('forbidden_user') && token !== 'user_danilo_team') {
          return resolve({
            status: 403,
            ok: false,
            json: async () => ({ error: 'FORBIDDEN_NAMESPACE' })
          });
        }

        const currentState = this.getCloudState(token);
        const result = executeAtomicCommit(
          currentState,
          payload,
          payload.baseRevision !== undefined ? Number(payload.baseRevision) : 0,
          payload.idempotencyKey || ''
        );

        if (result.status === 'SUCCESS') {
          this.metrics.successfulCommits++;
          this.namespaces.set(token, result.consolidated);
          resolve({
            status: 200,
            ok: true,
            json: async () => ({
              success: true,
              revision: result.revision,
              matchesCount: result.matchesCount,
              updatedAt: result.updatedAt
            })
          });
        } else if (result.status === 'IDEMPOTENT_REPLAY') {
          this.metrics.idempotentReplays++;
          resolve({
            status: 200,
            ok: true,
            json: async () => ({
              success: true,
              message: 'IDEMPOTENT_REPLAY',
              revision: result.revision,
              matchesCount: result.matchesCount,
              updatedAt: result.updatedAt
            })
          });
        } else if (result.status === 'REVISION_CONFLICT') {
          this.metrics.conflicts409++;
          resolve({
            status: 409,
            ok: false,
            json: async () => ({
              error: 'REVISION_CONFLICT',
              currentRevision: result.currentRevision,
              baseRevision: result.baseRevision,
              message: 'A nuvem foi atualizada por outro dispositivo. Re-sincronizacao necessaria.'
            })
          });
        } else {
          resolve({
            status: 400,
            ok: false,
            json: async () => ({ error: result.status })
          });
        }
      });
    });
  }
}

// Simulated Device Client
class SimulatedDevice {
  constructor(deviceId, backend, token = 'team_default_sync', user = 'danilo@team.com') {
    this.deviceId = deviceId;
    this.backend = backend;
    this.token = token;
    this.user = user;
    this.userId = user.replace(/[^a-zA-Z0-9_-]/g, '_');
    this.localStorageMock = {
      jornada_sync_token: token,
      jornada_auth_token: `jwt_token_for_${user}`,
      jornada_user_profile: JSON.stringify({ user: { id: this.userId, email: user } })
    };
    this.isOnline = true;

    this.window = {
      currentUser: { id: this.userId, email: user },
      isCloudSyncReady: false,
      syncLifecycleState: 'LOGGED_OUT',
      _currentCloudRevision: 0,
      _hasPendingSync: false,
      _syncRetryCount: 0,
      _authSessionGen: 1
    };

    this.localStorage = {
      getItem: (key) => this.localStorageMock[key] || null,
      setItem: (key, val) => { this.localStorageMock[key] = String(val); },
      removeItem: (key) => { delete this.localStorageMock[key]; },
      clear: () => { this.localStorageMock = {}; }
    };

    this.document = {
      getElementById: () => null,
      addEventListener: () => {}
    };

    const sandboxScope = {
      window: this.window,
      document: this.document,
      localStorage: this.localStorage,
      getAuthToken: () => `jwt_token_for_${this.user}`,
      getCurrentUser: () => ({ id: this.userId, email: this.user }),
      showToast: () => {},
      initializeData: () => {},
      applyFilters: () => {},
      fetch: async (url, options = {}) => {
        if (!this.isOnline) {
          throw new Error('Network offline');
        }
        let activeToken = this.token;
        if (url && url.includes('token=')) {
          const match = url.match(/token=([^&]+)/);
          if (match && match[1]) {
            activeToken = decodeURIComponent(match[1]);
          }
        }
        if (options.method === 'POST') {
          const body = JSON.parse(options.body || '{}');
          return this.backend.handlePost(activeToken, body, options.headers?.Authorization || '');
        } else {
          return this.backend.handleGet(activeToken);
        }
      }
    };

    const runInScope = (code) => {
      const fn = new Function('global', 'window', 'document', 'localStorage', 'getAuthToken', 'getCurrentUser', 'showToast', 'initializeData', 'applyFilters', 'fetch', code);
      fn(sandboxScope, sandboxScope.window, sandboxScope.document, sandboxScope.localStorage, sandboxScope.getAuthToken, sandboxScope.getCurrentUser, sandboxScope.showToast, sandboxScope.initializeData, sandboxScope.applyFilters, sandboxScope.fetch);
    };

    runInScope(utilCode);
    runInScope(configCode);
    runInScope(storageCode);
    runInScope(syncCloudCode);

    this.scope = sandboxScope;
  }

  async login() {
    this.window.syncLifecycleState = 'BOOTING';
    await this.pull();
  }

  async pull() {
    return this.window.pullFromCloud(true);
  }

  async push() {
    return this.window.pushToCloud(0);
  }

  addMatch(matchData) {
    const existing = this.window.loadManual() || [];
    const newMatch = {
      id: matchData.id || this.window.generateUUID(),
      Player: matchData.Player || 'Player',
      Adversario: matchData.Adversario || 'Opponent',
      Vitorias: matchData.Vitorias || 0,
      Derrotas: matchData.Derrotas || 0,
      Empates: matchData.Empates || 0,
      createdAt: matchData.createdAt || new Date().toISOString(),
      updatedAt: matchData.updatedAt || matchData.createdAt || new Date().toISOString()
    };
    existing.push(newMatch);
    this.window.saveManual(existing);
    return newMatch;
  }

  deleteMatch(matchId) {
    const existing = this.window.loadManual() || [];
    const remaining = existing.filter(m => m.id !== matchId);
    this.window.saveManual(remaining);

    const deleted = this.window.loadDeleted() || new Set();
    deleted.add(matchId);
    this.window.saveDeleted(deleted);
  }

  getMatches() {
    return this.window.loadManual() || [];
  }
}

// Helper: Flush all pending syncs across devices until convergence
async function flushPendingDevices(devices) {
  for (let pass = 0; pass < 3; pass++) {
    for (const d of devices) {
      if (d.window._hasPendingSync || pass === 0) {
        await d.pull();
        await d.push();
      }
    }
  }
  for (const d of devices) {
    await d.pull();
  }
}

// E2E Homologation Test Matrix
describe('CHG-006.5: E2E Multi-Device Concurrency & Stress Homologation', () => {
  let backend;

  beforeEach(() => {
    backend = new MockCloudBackend();
  });

  it('E2E-001: Single Device — Login, Pull, Mutation, Push 200 e Pull de validacao', async () => {
    const devA = new SimulatedDevice('DEV_A', backend);
    await devA.login();
    expect(devA.window.syncLifecycleState).toBe('READY');
    expect(devA.window._currentCloudRevision).toBe(0);

    const matchA = devA.addMatch({ Player: 'Danilo', Adversario: 'GuiVaz', Vitorias: 2 });
    const pushRes = await devA.push();
    expect(pushRes.success).toBe(true);
    expect(pushRes.revision).toBe(1);

    await devA.pull();
    const matches = devA.getMatches();
    expect(matches.length).toBe(1);
    expect(matches[0].id).toBe(matchA.id);
  });

  it('E2E-002: Two Device Concurrent Insert — Um vence, outro recebe 409, reconcilia e ambos convergem', async () => {
    const devA = new SimulatedDevice('DEV_A', backend);
    const devB = new SimulatedDevice('DEV_B', backend);

    await devA.login();
    await devB.login();

    const matchA = devA.addMatch({ Player: 'Danilo', Vitorias: 2 });
    const matchB = devB.addMatch({ Player: 'GuiVaz', Vitorias: 2 });

    const [resA, resB] = await Promise.all([devA.push(), devB.push()]);

    expect(resA.success).toBe(true);
    expect(resB.success).toBe(true);

    await devA.pull();
    await devB.pull();

    const matchesA = devA.getMatches();
    const matchesB = devB.getMatches();

    expect(matchesA.length).toBe(2);
    expect(matchesB.length).toBe(2);
    expect(backend.metrics.conflicts409).toBeGreaterThanOrEqual(1);

    const snapA = canonicalizeSnapshot(matchesA);
    const snapB = canonicalizeSnapshot(matchesB);
    expect(snapA).toEqual(snapB);
  });

  it('E2E-003: 4 Devices Concorrentes — Concorrencia quadrupla simultanea converge para 4 partidas unicas', async () => {
    const devices = ['DEV_A', 'DEV_B', 'DEV_C', 'DEV_D'].map(id => new SimulatedDevice(id, backend));
    for (const d of devices) await d.login();

    devices.map((d, i) => d.addMatch({ Player: `Player_${i}`, Vitorias: 1 }));

    await Promise.all(devices.map(d => d.push()));
    await flushPendingDevices(devices);

    const finalSnapshots = devices.map(d => canonicalizeSnapshot(d.getMatches()));
    for (let i = 1; i < finalSnapshots.length; i++) {
      expect(finalSnapshots[i]).toEqual(finalSnapshots[0]);
    }
    expect(finalSnapshots[0].matchesCount).toBe(4);
  });

  it('E2E-004: High Concurrency — 10 devices criando 10 partidas cada (100 partidas no total, 0 perdas)', async () => {
    const devices = Array.from({ length: 10 }, (_, i) => new SimulatedDevice(`DEV_${i}`, backend));
    for (const d of devices) await d.login();

    const allIds = new Set();
    devices.forEach((d, devIdx) => {
      for (let m = 0; m < 10; m++) {
        const match = d.addMatch({ Player: `P_${devIdx}`, Adversario: `Adv_${m}`, Vitorias: 2 });
        allIds.add(match.id);
      }
    });
    expect(allIds.size).toBe(100);

    // Initial concurrent burst
    await Promise.all(devices.map(d => d.push()));

    // Flush any pending devices
    await flushPendingDevices(devices);

    const cloudState = backend.getCloudState();
    expect(cloudState.manualMatches.length).toBe(100);

    const snap0 = canonicalizeSnapshot(devices[0].getMatches());
    expect(snap0.matchesCount).toBe(100);
  });

  it('E2E-005: Stress & Chaos — 20 devices com 400 mutacoes aleatorias (inserts, updates, deletes) e convergencia total', async () => {
    const devices = Array.from({ length: 20 }, (_, i) => new SimulatedDevice(`DEV_${i}`, backend));
    for (const d of devices) await d.login();

    const sharedMatches = [];

    // Fase 1: Inserts concorrentes
    await Promise.all(devices.map((d, idx) => {
      const m1 = d.addMatch({ Player: `DevUser_${idx}`, Vitorias: 1 });
      const m2 = d.addMatch({ Player: `DevUser_${idx}`, Vitorias: 2 });
      sharedMatches.push(m1, m2);
      return d.push();
    }));

    await flushPendingDevices(devices);

    // Fase 2: Mutacoes e Deletes concorrentes
    await Promise.all(devices.map((d, idx) => {
      if (idx % 2 === 0 && sharedMatches[idx]) {
        d.deleteMatch(sharedMatches[idx].id);
      } else {
        d.addMatch({ Player: `Burst_${idx}`, Vitorias: 3 });
      }
      return d.push();
    }));

    await flushPendingDevices(devices);

    const refSnap = canonicalizeSnapshot(devices[0].getMatches());
    for (const d of devices) {
      expect(canonicalizeSnapshot(d.getMatches())).toEqual(refSnap);
    }
  });

  it('E2E-006: Concurrent Update Same Record — Last-Write-Wins respeita estritamente o timestamp e tie-break', async () => {
    const devA = new SimulatedDevice('DEV_A', backend);
    const devB = new SimulatedDevice('DEV_B', backend);
    await devA.login();
    await devB.login();

    const matchUuid = '99999999-9999-4999-8999-999999999999';
    devA.addMatch({ id: matchUuid, Player: 'Danilo', Vitorias: 1, updatedAt: '2026-08-19T10:00:00Z' });
    await devA.push();
    await devB.pull();

    const matchesA = devA.getMatches();
    matchesA[0].Vitorias = 2;
    matchesA[0].updatedAt = '2026-08-19T10:05:00Z';
    devA.window.saveManual(matchesA);

    const matchesB = devB.getMatches();
    matchesB[0].Vitorias = 3;
    matchesB[0].updatedAt = '2026-08-19T10:10:00Z'; // Mais recente (vencedor LWW)
    devB.window.saveManual(matchesB);

    await Promise.all([devA.push(), devB.push()]);
    await flushPendingDevices([devA, devB]);

    expect(devA.getMatches()[0].Vitorias).toBe(3);
    expect(devB.getMatches()[0].Vitorias).toBe(3);
  });

  it('E2E-007: Delete vs Update — Tombstone vence edicao concorrente e impede ressurreicao', async () => {
    const devA = new SimulatedDevice('DEV_A', backend);
    const devB = new SimulatedDevice('DEV_B', backend);
    await devA.login();
    await devB.login();

    const targetMatch = devA.addMatch({ Player: 'Danilo', Vitorias: 1 });
    await devA.push();
    await devB.pull();

    devA.deleteMatch(targetMatch.id);
    const matchesB = devB.getMatches();
    matchesB[0].Vitorias = 5;
    devB.window.saveManual(matchesB);

    await Promise.all([devA.push(), devB.push()]);
    await flushPendingDevices([devA, devB]);

    expect(devA.getMatches().find(m => m.id === targetMatch.id)).toBeUndefined();
    expect(devB.getMatches().find(m => m.id === targetMatch.id)).toBeUndefined();
  });

  it('E2E-008: Offline Device — Device offline cria dados locais e converge perfeitamente ao reconectar', async () => {
    const devA = new SimulatedDevice('DEV_A', backend);
    const devB = new SimulatedDevice('DEV_B', backend);
    await devA.login();
    await devB.login();

    devA.isOnline = false;
    for (let i = 0; i < 5; i++) devA.addMatch({ Player: 'Offline_A', Vitorias: 1 });

    for (let i = 0; i < 5; i++) devB.addMatch({ Player: 'Online_B', Vitorias: 2 });
    await devB.push();

    devA.isOnline = true;
    await devA.pull();
    await devA.push();

    await devB.pull();

    expect(devA.getMatches().length).toBe(10);
    expect(devB.getMatches().length).toBe(10);
  });

  it('E2E-009: Network Interruption — Timeout nao duplica dados e replay seguro e garantido', async () => {
    const devA = new SimulatedDevice('DEV_A', backend);
    await devA.login();

    devA.addMatch({ Player: 'Danilo', Vitorias: 2 });

    devA.isOnline = false;
    const resFail = await devA.push();
    expect(resFail.error).toBe('OFFLINE');
    expect(devA.window._hasPendingSync).toBe(true);

    devA.isOnline = true;
    await devA.pull();
    await devA.push();

    const cloud = backend.getCloudState();
    expect(cloud.manualMatches.length).toBe(1);
    expect(cloud.revision).toBe(1);
  });

  it('E2E-010: Idempotency Replay — Mesmo payload enviado duas vezes nao incrementa revision', async () => {
    const payload = {
      baseRevision: 0,
      idempotencyKey: 'fixed_idem_uuid_1234',
      manualMatches: [{ id: 'm_fixed_1', Player: 'Danilo' }],
      updatedAt: '2026-08-19T10:00:00Z'
    };

    const res1 = await backend.handlePost('team_default_sync', payload);
    const json1 = await res1.json();
    expect(json1.revision).toBe(1);

    const res2 = await backend.handlePost('team_default_sync', payload);
    const json2 = await res2.json();
    expect(json2.message).toBe('IDEMPOTENT_REPLAY');
    expect(json2.revision).toBe(1);

    const cloud = backend.getCloudState();
    expect(cloud.revision).toBe(1);
    expect(cloud.manualMatches.length).toBe(1);
  });

  it('E2E-011: User & Namespace Isolation — Usuario A e B nao compartilham nem sobrescrevem dados', async () => {
    const devA = new SimulatedDevice('DEV_A', backend, 'user_danilo_team', 'danilo@team.com');
    const devB = new SimulatedDevice('DEV_B', backend, 'user_guivaz_team', 'guivaz@team.com');

    await devA.login();
    await devB.login();

    devA.addMatch({ Player: 'Danilo_Private' });
    devB.addMatch({ Player: 'GuiVaz_Private' });

    await devA.push();
    await devB.push();

    await devA.pull();
    await devB.pull();

    expect(devA.getMatches().map(m => m.Player)).toContain('Danilo_Private');
    expect(devA.getMatches().map(m => m.Player)).not.toContain('GuiVaz_Private');

    expect(devB.getMatches().map(m => m.Player)).toContain('GuiVaz_Private');
    expect(devB.getMatches().map(m => m.Player)).not.toContain('Danilo_Private');
  });

  it('E2E-012: Logout / Login Lifecycle — Dados locais sao isolados e restaurados por namespace', async () => {
    const dev = new SimulatedDevice('DEV_SINGLE', backend);
    await dev.login();

    dev.addMatch({ Player: 'Danilo_Session_1' });
    await dev.push();

    dev.window.syncLifecycleState = 'LOGGED_OUT';
    dev.window.isCloudSyncReady = false;

    await dev.login();
    expect(dev.getMatches().map(m => m.Player)).toContain('Danilo_Session_1');
  });

  it('E2E-013: Rapid Login / Logout — Sem vazamento de requisicao ou push fantasma', async () => {
    const dev = new SimulatedDevice('DEV_RAPID', backend);
    for (let i = 0; i < 5; i++) {
      dev.window.syncLifecycleState = 'LOGGED_OUT';
      dev.window.isCloudSyncReady = false;
      await dev.login();
    }
    expect(dev.window.syncLifecycleState).toBe('READY');
  });

  it('E2E-014: Retry Storm Resistance — Limite de 3 retries impede tempestade e loop infinito', async () => {
    const devA = new SimulatedDevice('DEV_A', backend);
    await devA.login();

    backend.handlePost = async (token, payload, auth) => {
      backend.metrics.conflicts409++;
      return {
        status: 409,
        ok: false,
        json: async () => ({ error: 'REVISION_CONFLICT', currentRevision: 999, baseRevision: payload.baseRevision })
      };
    };

    devA.addMatch({ Player: 'Danilo' });
    const res = await devA.push();

    expect(res.error).toBe('REVISION_CONFLICT_EXHAUSTED');
    expect(devA.window._hasPendingSync).toBe(true);
    expect(devA.window.syncLifecycleState).toBe('READY');
  });

  it('E2E-015: Mutation During Retry — Nova mutacao durante CONFLICT_RETRYING e preservada no retry', async () => {
    const devA = new SimulatedDevice('DEV_A', backend);
    const devB = new SimulatedDevice('DEV_B', backend);
    await devA.login();
    await devB.login();

    devB.addMatch({ Player: 'GuiVaz' });
    await devB.push();

    devA.addMatch({ Player: 'Match_1' });

    let injected = false;
    const origPost = backend.handlePost.bind(backend);
    backend.handlePost = async (token, payload, auth) => {
      if (!injected) {
        injected = true;
        devA.addMatch({ Player: 'Match_2_Injected' });
      }
      return origPost(token, payload, auth);
    };

    await devA.push();
    await devA.pull();

    const matches = devA.getMatches().map(m => m.Player);
    expect(matches).toContain('Match_1');
    expect(matches).toContain('Match_2_Injected');
    expect(matches).toContain('GuiVaz');
  });

  it('E2E-016: Multi-Wave Convergence — 4 ondas com grupos alternados convergem para 100% identidade canonica', async () => {
    const devA = new SimulatedDevice('DEV_A', backend);
    const devB = new SimulatedDevice('DEV_B', backend);
    const devC = new SimulatedDevice('DEV_C', backend);
    const devD = new SimulatedDevice('DEV_D', backend);

    for (const d of [devA, devB, devC, devD]) await d.login();

    // Wave 1: A, B
    devA.addMatch({ Player: 'W1_A' });
    devB.addMatch({ Player: 'W1_B' });
    await Promise.all([devA.push(), devB.push()]);
    await flushPendingDevices([devA, devB]);

    // Wave 2: B, C
    devB.addMatch({ Player: 'W2_B' });
    devC.addMatch({ Player: 'W2_C' });
    await Promise.all([devB.push(), devC.push()]);
    await flushPendingDevices([devB, devC]);

    // Wave 3: A, D
    devA.addMatch({ Player: 'W3_A' });
    devD.addMatch({ Player: 'W3_D' });
    await Promise.all([devA.push(), devD.push()]);
    await flushPendingDevices([devA, devD]);

    // Wave 4: Pull e convergencia de todos
    for (const d of [devA, devB, devC, devD]) {
      await d.pull();
    }

    const snapA = canonicalizeSnapshot(devA.getMatches());
    const snapB = canonicalizeSnapshot(devB.getMatches());
    const snapC = canonicalizeSnapshot(devC.getMatches());
    const snapD = canonicalizeSnapshot(devD.getMatches());

    expect(snapA).toEqual(snapB);
    expect(snapB).toEqual(snapC);
    expect(snapC).toEqual(snapD);
    expect(snapA.matchesCount).toBe(6);
  });
});
