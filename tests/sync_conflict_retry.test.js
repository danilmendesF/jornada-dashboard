import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

const syncCloudCode = fs.readFileSync(path.resolve(__dirname, '../js/sync_cloud.js'), 'utf-8');
const configCode = fs.readFileSync(path.resolve(__dirname, '../js/config.js'), 'utf-8');
const utilCode = fs.readFileSync(path.resolve(__dirname, '../js/util.js'), 'utf-8');
const storageCode = fs.readFileSync(path.resolve(__dirname, '../js/storage.js'), 'utf-8');

describe('CHG-006.4: Final Production Release — Zero Data Loss & Multi-Device Convergence', () => {
  let localStorageMock = {};
  let env = {};

  beforeEach(() => {
    localStorageMock = {};
    const defaultMatches = [{ id: '11111111-1111-4111-8111-111111111111', Player: 'Danilo', updatedAt: '2026-08-19T10:00:00Z' }];
    localStorageMock['jornada_u_user_danilo_matches'] = JSON.stringify(defaultMatches);
    localStorageMock['jornada_manual_matches'] = JSON.stringify(defaultMatches);

    env = {
      localStorage: {
        getItem: vi.fn(key => localStorageMock[key] || null),
        setItem: vi.fn((key, val) => { localStorageMock[key] = String(val); }),
        removeItem: vi.fn(key => { delete localStorageMock[key]; }),
        clear: vi.fn(() => { localStorageMock = {}; })
      },
      document: {
        getElementById: vi.fn(() => null),
        addEventListener: vi.fn()
      },
      window: {
        isCloudSyncReady: true,
        syncLifecycleState: 'READY',
        _currentCloudRevision: 10,
        _hasPendingSync: false,
        _syncRetryCount: 0,
        currentUser: { id: 'user_danilo', name: 'Danilo', email: 'danilo@team.com' }
      },
      fetch: vi.fn()
    };

    global.localStorage = env.localStorage;
    global.document = env.document;
    global.window = env.window;
    global.fetch = env.fetch;
    global.getAuthToken = () => 'test_jwt_token';
    global.showToast = vi.fn();
    global.initializeData = vi.fn();
    global.applyFilters = vi.fn();

    new Function(utilCode)();
    new Function(configCode)();
    new Function(storageCode)();
    new Function(syncCloudCode)();

    global.window.isCloudSyncReady = true;
    global.window.syncLifecycleState = 'READY';
    global.window._currentCloudRevision = 10;
  });

  it('TEST-001: Local 30 / Cloud 20 -> resultado 30 (preservação total do conjunto local maior)', async () => {
    const kMatches = global.window.KEY_MATCHES;
    const local30 = Array.from({ length: 30 }, (_, i) => ({
      id: `11111111-1111-4111-8111-${String(i + 1).padStart(12, '0')}`,
      Player: 'Danilo',
      updatedAt: `2026-08-19T10:${String(i).padStart(2, '0')}:00Z`
    }));
    localStorageMock[kMatches] = JSON.stringify(local30);

    const cloud20 = local30.slice(0, 20);

    global.fetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ revision: 15, manualMatches: cloud20 })
    });

    await global.window.pullFromCloud(true);

    const result = JSON.parse(localStorageMock[kMatches]);
    expect(result.length).toBe(30);
    expect(result.map(m => m.id)).toEqual(local30.map(m => m.id));
  });

  it('TEST-002: Local 20 / Cloud 30 -> resultado 30 (preservação total do conjunto remoto maior)', async () => {
    const kMatches = global.window.KEY_MATCHES;
    const cloud30 = Array.from({ length: 30 }, (_, i) => ({
      id: `22222222-2222-4222-8222-${String(i + 1).padStart(12, '0')}`,
      Player: 'Thales',
      updatedAt: `2026-08-19T10:${String(i).padStart(2, '0')}:00Z`
    }));

    const local20 = cloud30.slice(0, 20);
    localStorageMock[kMatches] = JSON.stringify(local20);

    global.fetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ revision: 20, manualMatches: cloud30 })
    });

    await global.window.pullFromCloud(true);

    const result = JSON.parse(localStorageMock[kMatches]);
    expect(result.length).toBe(30);
    expect(result.map(m => m.id)).toEqual(cloud30.map(m => m.id));
  });

  it('TEST-003: Local 30 / Cloud 30 -> resultado 30 (mesmo conjunto deduplicado sem sobreposição)', async () => {
    const kMatches = global.window.KEY_MATCHES;
    const matches30 = Array.from({ length: 30 }, (_, i) => ({
      id: `33333333-3333-4333-8333-${String(i + 1).padStart(12, '0')}`,
      Player: 'Danilo',
      updatedAt: `2026-08-19T10:${String(i).padStart(2, '0')}:00Z`
    }));
    localStorageMock[kMatches] = JSON.stringify(matches30);

    global.fetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ revision: 25, manualMatches: matches30 })
    });

    await global.window.pullFromCloud(true);

    const result = JSON.parse(localStorageMock[kMatches]);
    expect(result.length).toBe(30);
  });

  it('TEST-004: HTTP 409 -> PULL -> MERGE -> RETRY -> SUCCESS (fluxo completo de convergência)', async () => {
    global.fetch
      .mockResolvedValueOnce({
        status: 409,
        ok: false,
        json: async () => ({ error: 'REVISION_CONFLICT', currentRevision: 11, baseRevision: 10 })
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          revision: 11,
          manualMatches: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001', Player: 'Thales', updatedAt: '2026-08-19T10:05:00Z' }]
        })
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ success: true, revision: 12 })
      });

    const res = await global.window.pushToCloud(0);
    expect(res.success).toBe(true);
    expect(res.revision).toBe(12);
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.window.syncLifecycleState).toBe('READY');
  });

  it('TEST-005: HTTP 409 no retry -> STOP SEGURO -> dados locais preservados e pendingSync = true', async () => {
    global.fetch
      .mockResolvedValueOnce({
        status: 409,
        ok: false,
        json: async () => ({ error: 'REVISION_CONFLICT', currentRevision: 15, baseRevision: 10 })
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ revision: 15, manualMatches: [] })
      })
      .mockResolvedValueOnce({
        status: 409,
        ok: false,
        json: async () => ({ error: 'REVISION_CONFLICT', currentRevision: 16, baseRevision: 15 })
      });

    const res = await global.window.pushToCloud(0);
    expect(res.error).toBe('REVISION_CONFLICT_EXHAUSTED');
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.window._hasPendingSync).toBe(true);
    expect(global.window.syncLifecycleState).toBe('READY');
    expect(global.window._syncRetryCount).toBe(0);
  });

  it('TEST-006: Cloud indisponível -> dados locais preservados e usuário continua registrando partidas', async () => {
    const kMatches = global.window.KEY_MATCHES;
    const initialMatches = [{ id: '11111111-1111-4111-8111-111111111111', Player: 'Danilo', updatedAt: '2026-08-19T10:00:00Z' }];
    localStorageMock[kMatches] = JSON.stringify(initialMatches);

    // Falha de rede no push
    global.fetch.mockRejectedValueOnce(new Error('Network offline'));

    const pushRes = await global.window.pushToCloud(0);
    expect(pushRes.error).toBe('OFFLINE');
    expect(global.window._hasPendingSync).toBe(true);

    // O jogador registra uma nova partida mesmo offline
    const updatedMatches = [
      ...initialMatches,
      { id: '22222222-2222-4222-8222-222222222222', Player: 'Danilo', updatedAt: '2026-08-19T10:10:00Z' }
    ];
    global.window.saveManual(updatedMatches);

    const stored = JSON.parse(localStorageMock[kMatches]);
    expect(stored.length).toBe(2);
    expect(stored.map(m => m.id)).toContain('22222222-2222-4222-8222-222222222222');
  });

  it('TEST-007: Snapshot vazio local contra Cloud populada -> Cloud preservada e Local populado', async () => {
    const kMatches = global.window.KEY_MATCHES;
    localStorageMock[kMatches] = JSON.stringify([]); // Local primário vazio
    // Limpar também a chave legada para não ativar o fallback chain (cenário: local realmente vazio)
    delete localStorageMock['jornada_manual_matches'];
    delete localStorageMock['jornada_u_user_danilo_matches'];

    const cloudData = [
      { id: '11111111-1111-4111-8111-000000000001', Player: 'Danilo', updatedAt: '2026-08-19T10:00:00Z' },
      { id: '22222222-2222-4222-8222-000000000002', Player: 'Thales', updatedAt: '2026-08-19T10:05:00Z' }
    ];

    global.fetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ revision: 5, manualMatches: cloudData })
    });

    await global.window.pullFromCloud(true);

    const savedLocal = JSON.parse(localStorageMock[kMatches]);
    expect(savedLocal.length).toBe(2);
    expect(savedLocal.map(m => m.id)).toEqual(cloudData.map(m => m.id));
  });

  it('TEST-008: Dois dispositivos com IDs exclusivos -> união determinística (A ∪ B)', async () => {
    const kMatches = global.window.KEY_MATCHES;
    const thalesMatch = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001', Player: 'Thales', updatedAt: '2026-08-19T10:00:00Z' };
    const daniloMatch = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001', Player: 'Danilo', updatedAt: '2026-08-19T10:05:00Z' };

    localStorageMock[kMatches] = JSON.stringify([daniloMatch]);

    global.fetch
      .mockResolvedValueOnce({
        status: 409,
        ok: false,
        json: async () => ({ error: 'REVISION_CONFLICT', currentRevision: 11, baseRevision: 10 })
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ revision: 11, manualMatches: [thalesMatch] })
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ success: true, revision: 12 })
      });

    await global.window.pushToCloud(0);

    const saved = JSON.parse(localStorageMock[kMatches]);
    expect(saved.length).toBe(2);
    expect(saved.map(m => m.id)).toContain(thalesMatch.id);
    expect(saved.map(m => m.id)).toContain(daniloMatch.id);
  });

  it('TEST-009: Mesmo ID em ambos -> LWW determinístico seleciona a versão mais recente', () => {
    const mergeFn = global.window.deterministicMergeMatches;
    const oldVersion = [{ id: '11111111-1111-4111-8111-000000000001', Player: 'Danilo', Resultado: 'Derrota', updatedAt: '2026-08-19T10:00:00Z' }];
    const newVersion = [{ id: '11111111-1111-4111-8111-000000000001', Player: 'Danilo', Resultado: 'Vitória', updatedAt: '2026-08-19T10:05:00Z' }];

    const merged = mergeFn(oldVersion, newVersion);
    expect(merged.length).toBe(1);
    expect(merged[0].Resultado).toBe('Vitória');
  });

  it('TEST-010: Retry e Idempotency -> nova idempotencyKey no retry reconciliado', async () => {
    global.fetch
      .mockResolvedValueOnce({
        status: 409,
        ok: false,
        json: async () => ({ error: 'REVISION_CONFLICT', currentRevision: 50, baseRevision: 10 })
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ revision: 50, manualMatches: [] })
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ success: true, revision: 51 })
      });

    await global.window.pushToCloud(0);

    const firstPayload = JSON.parse(global.fetch.mock.calls[0][1].body);
    const retryPayload = JSON.parse(global.fetch.mock.calls[2][1].body);

    expect(firstPayload.baseRevision).toBe(10);
    expect(retryPayload.baseRevision).toBe(50);
    expect(firstPayload.idempotencyKey).not.toBe(retryPayload.idempotencyKey);
  });

  it('TEST-011: Boot -> PULL obrigatório antes de autorizar qualquer PUSH local', async () => {
    global.window.isCloudSyncReady = false;
    global.window.syncLifecycleState = 'BOOTING';

    const pushRes = await global.window.pushToCloud(0);
    expect(pushRes).toBeUndefined();
    expect(global.window._hasPendingSync).toBe(true);

    global.fetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ revision: 10, manualMatches: [] })
    });

    await global.window.pullFromCloud(true);
    expect(global.window.isCloudSyncReady).toBe(true);
    expect(global.window.syncLifecycleState).toBe('READY');
  });

  it('TEST-012: Login -> PULL obrigatório antes de liberar sincronização', async () => {
    global.fetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({
        revision: 10,
        manualMatches: [{ id: '11111111-1111-4111-8111-000000000001', Player: 'Danilo', updatedAt: '2026-08-19T10:00:00Z' }]
      })
    });

    await global.window.pullFromCloud(false);
    expect(global.window.syncLifecycleState).toBe('READY');
    expect(global.window.isCloudSyncReady).toBe(true);
  });

  it('TEST-013: PULL -> LocalStorage atualizado -> allData atualizado -> UI atualizada', async () => {
    const remoteMatches = [
      { id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001', Player: 'Thales', updatedAt: '2026-08-19T10:00:00Z' }
    ];

    global.fetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ revision: 10, manualMatches: remoteMatches })
    });

    await global.window.pullFromCloud(true);

    expect(global.initializeData).toHaveBeenCalled();
    expect(global.applyFilters).toHaveBeenCalled();
  });

  it('TEST-014: Usuários diferentes -> namespaces locais isolados no navegador', async () => {
    global.window.currentUser = { id: 'user_thales', name: 'Thales', email: 'thales@team.com' };
    const kThales = global.window.KEY_MATCHES;
    expect(kThales).toBe('jornada_u_user_thales_matches');

    const thalesMatches = [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001', Player: 'Thales', updatedAt: '2026-08-19T10:00:00Z' }];
    localStorageMock[kThales] = JSON.stringify(thalesMatches);

    const kDanilo = 'jornada_u_user_danilo_matches';
    expect(localStorageMock[kDanilo]).toBeDefined();

    global.fetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ success: true, revision: 12 })
    });

    await global.window.pushToCloud(0);

    expect(JSON.parse(localStorageMock[kDanilo]).length).toBe(1);
    expect(JSON.parse(localStorageMock[kThales]).length).toBe(1);
  });

  it('TEST-015: Convergência repetida -> idempotência estrita (Merge(A, A) = A)', () => {
    const mergeFn = global.window.deterministicMergeMatches;
    const dataset = [
      { id: '11111111-1111-4111-8111-000000000001', Player: 'Danilo', updatedAt: '2026-08-19T10:00:00Z' },
      { id: '22222222-2222-4222-8222-000000000002', Player: 'Thales', updatedAt: '2026-08-19T10:05:00Z' }
    ];

    const pass1 = mergeFn(dataset, dataset);
    const pass2 = mergeFn(pass1, dataset);
    const pass3 = mergeFn(pass2, pass1);

    expect(pass1.length).toBe(2);
    expect(pass2.length).toBe(2);
    expect(pass3.length).toBe(2);
    expect(pass3.map(m => m.id)).toEqual(dataset.map(m => m.id));
  });
});
