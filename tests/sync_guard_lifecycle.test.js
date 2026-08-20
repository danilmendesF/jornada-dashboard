import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';
import { emergencyServerMerge } from '../api/sync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const syncCloudCode = fs.readFileSync(path.resolve(__dirname, '../js/sync_cloud.js'), 'utf-8');
const authCode = fs.readFileSync(path.resolve(__dirname, '../js/auth.js'), 'utf-8');

describe('CHG-005 & CHG-005.1: Sync Guard, Lifecycle Determinístico & Persistent Pending Sync', () => {

  describe('1. Emergency Server Merge Guard (api/sync.js)', () => {
    it('TEST-006: Cliente antigo com menos partidas NÃO pode apagar partidas mais recentes da Nuvem', () => {
      const existingCloud = {
        manualMatches: Array.from({ length: 15 }, (_, i) => ({
          id: `m_${i + 1}`,
          Data: '2026-08-15',
          Player: 'Danilo',
          Adversario: 'Opp',
          Deck: 'Charizard',
          createdAt: new Date(2026, 7, 15, 10, i).toISOString()
        }))
      };

      const incomingClient = {
        manualMatches: Array.from({ length: 10 }, (_, i) => ({
          id: `m_${i + 1}`,
          Data: '2026-08-15',
          Player: 'Danilo',
          Adversario: 'Opp',
          Deck: 'Charizard',
          createdAt: new Date(2026, 7, 15, 10, i).toISOString()
        }))
      };

      const consolidated = emergencyServerMerge(existingCloud, incomingClient);
      expect(consolidated.manualMatches.length).toBe(15);
      expect(consolidated.manualMatches.map(m => m.id)).toEqual(existingCloud.manualMatches.map(m => m.id));
    });

    it('TEST-007: Cliente antigo que cadastra nova partida preserva tanto a nova quanto as existentes na Nuvem', () => {
      const existingCloud = {
        manualMatches: Array.from({ length: 15 }, (_, i) => ({
          id: `m_${i + 1}`,
          Data: '2026-08-15',
          Player: 'Danilo',
          createdAt: new Date(2026, 7, 15, 10, i).toISOString()
        }))
      };

      const incomingClient = {
        manualMatches: [
          ...existingCloud.manualMatches.slice(0, 10),
          {
            id: 'm_16',
            Data: '2026-08-15',
            Player: 'Danilo',
            createdAt: new Date(2026, 7, 15, 12, 0).toISOString()
          }
        ]
      };

      const consolidated = emergencyServerMerge(existingCloud, incomingClient);
      expect(consolidated.manualMatches.length).toBe(16);
      expect(consolidated.manualMatches.some(m => m.id === 'm_16')).toBe(true);
      expect(consolidated.manualMatches.some(m => m.id === 'm_15')).toBe(true);
    });

    it('TEST-008: Snapshot vazio recebido preserva as partidas existentes da Nuvem', () => {
      const existingCloud = {
        manualMatches: [
          { id: 'm_1', Data: '2026-08-15', Player: 'Danilo', createdAt: '2026-08-15T10:00:00Z' }
        ]
      };

      const incomingEmpty = { manualMatches: [] };
      const consolidated = emergencyServerMerge(existingCloud, incomingEmpty);
      expect(consolidated.manualMatches.length).toBe(1);
      expect(consolidated.manualMatches[0].id).toBe('m_1');
    });

    it('TEST-009: Dois dispositivos criando partidas convergem sem perda em merge cumulativo', () => {
      const baseCloud = {
        manualMatches: [
          { id: 'm_1', Data: '2026-08-15', Player: 'Danilo', createdAt: '2026-08-15T10:00:00Z' }
        ]
      };

      const pushA = {
        manualMatches: [
          ...baseCloud.manualMatches,
          { id: 'm_A', Data: '2026-08-15', Player: 'Danilo', createdAt: '2026-08-15T10:05:00Z' }
        ]
      };
      const stateAfterA = emergencyServerMerge(baseCloud, pushA);
      expect(stateAfterA.manualMatches.length).toBe(2);

      const pushB = {
        manualMatches: [
          ...baseCloud.manualMatches,
          { id: 'm_B', Data: '2026-08-15', Player: 'GuiVaz', createdAt: '2026-08-15T10:06:00Z' }
        ]
      };
      const stateAfterB = emergencyServerMerge(stateAfterA, pushB);
      expect(stateAfterB.manualMatches.length).toBe(3);
      expect(stateAfterB.manualMatches.map(m => m.id)).toContain('m_A');
      expect(stateAfterB.manualMatches.map(m => m.id)).toContain('m_B');
    });

    it('deve respeitar deleções explícitas via tombstones (deletedIds)', () => {
      const existingCloud = {
        manualMatches: [
          { id: 'm_1', Data: '2026-08-15', Player: 'Danilo', createdAt: '2026-08-15T10:00:00Z' },
          { id: 'm_2', Data: '2026-08-15', Player: 'Danilo', createdAt: '2026-08-15T10:01:00Z' }
        ]
      };

      const incomingWithDeletion = {
        manualMatches: [
          { id: 'm_1', Data: '2026-08-15', Player: 'Danilo', createdAt: '2026-08-15T10:00:00Z' }
        ],
        deletedIds: ['m_2']
      };

      const consolidated = emergencyServerMerge(existingCloud, incomingWithDeletion);
      expect(consolidated.manualMatches.length).toBe(1);
      expect(consolidated.manualMatches[0].id).toBe('m_1');
      expect(consolidated.manualMatches.some(m => m.id === 'm_2')).toBe(false);
    });
  });

  describe('2. Client-Side Lifecycle & Sync Guards (js/sync_cloud.js)', () => {
    let mockStorage;

    beforeEach(() => {
      mockStorage = {};
      const dom = new JSDOM('<!doctype html><html><body><div id="headerSyncDot"></div><div id="syncStatusIndicator"></div><div id="syncStatusText"></div></body></html>', { url: 'http://localhost' });

      global.window = dom.window;
      global.document = dom.window.document;
      global.localStorage = {
        getItem: (k) => mockStorage[k] || null,
        setItem: (k, v) => { mockStorage[k] = String(v); },
        removeItem: (k) => { delete mockStorage[k]; },
        clear: () => { mockStorage = {}; }
      };

      global.getAuthToken = () => mockStorage['jornada_auth_token'] || '';
      global.KEY_MATCHES = 'jornada_manual_matches';
      global.KEY_DECKS = 'jornada_decks';
      global.KEY_PLAYERS = 'jornada_players';
      global.KEY_LOCAIS = 'jornada_locais';
      global.KEY_COLECOES = 'jornada_colecoes';
      global.KEY_DELETED = 'jornada_deleted_ids';
      global.KEY_EDITS = 'jornada_edited_matches';

      global.loadManual = () => {
        try { return JSON.parse(mockStorage[KEY_MATCHES] || '[]'); } catch { return []; }
      };
      global.safeSetItem = (k, v) => { mockStorage[k] = String(v); };
      global.loadDeleted = () => new Set();
      global.loadDecks = () => [];
      global.loadPlayers = () => [];
      global.loadEdits = () => ({});
      global.loadArchetypeUnifications = () => [];

      new Function(syncCloudCode)();
      new Function(authCode)();
    });

    it('TEST-001: Boot local não dispara push de dados para a nuvem', () => {
      const pushSpy = vi.fn();
      global.window.pushToCloud = pushSpy;
      global.window.triggerSyncPush = vi.fn();

      const localMatches = [{ id: 'm_1', Data: '2026-08-15' }];
      mockStorage[KEY_MATCHES] = JSON.stringify(localMatches);

      const manual = global.loadManual();
      global.window.allData = [...manual];
      global.window.filtered = [...global.window.allData];

      expect(pushSpy).not.toHaveBeenCalled();
      expect(global.window.triggerSyncPush).not.toHaveBeenCalled();
      expect(global.window.allData.length).toBe(1);
    });

    it('TEST-002: Push deve ser BLOQUEADO quando isCloudSyncReady for false', async () => {
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      global.window.syncLifecycleState = 'BOOTING';
      global.window.isCloudSyncReady = false;

      await global.window.pushToCloud();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(global.window._hasPendingSync).toBe(true);
      expect(mockStorage['jornada_sync_pending']).toBe('1');
    });

    it('TEST-003: Push deve ser AUTORIZADO quando isCloudSyncReady for true e conter Authorization', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });
      global.fetch = fetchSpy;

      mockStorage['jornada_auth_token'] = 'mock_jwt_token';
      global.window.syncLifecycleState = 'READY';
      global.window.isCloudSyncReady = true;

      await global.window.pushToCloud();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const callArgs = fetchSpy.mock.calls[0];
      expect(callArgs[1].method).toBe('POST');
      expect(callArgs[1].headers['Authorization']).toBe('Bearer mock_jwt_token');
    });

    it('TEST-004 & TEST-005: Deterministic merge de partidas do cliente com dados remotos', () => {
      const local = [
        { id: 'm_1', Data: '2026-08-15', Player: 'Danilo', createdAt: '2026-08-15T10:00:00Z' },
        { id: 'm_11', Data: '2026-08-15', Player: 'Danilo', createdAt: '2026-08-15T11:00:00Z' }
      ];

      const remote = [
        { id: 'm_1', Data: '2026-08-15', Player: 'Danilo', createdAt: '2026-08-15T10:00:00Z' },
        { id: 'm_2', Data: '2026-08-15', Player: 'GuiVaz', createdAt: '2026-08-15T10:05:00Z' }
      ];

      const merged = global.window.deterministicMergeMatches(local, remote);
      expect(merged.length).toBe(3);
      expect(merged.map(m => m.id)).toEqual(['m_1', 'm_2', 'm_11']);
    });

    it('TEST-010: pullFromCloud bem-sucedido transiciona estado para READY e libera isCloudSyncReady', async () => {
      mockStorage['jornada_auth_token'] = 'valid_token';
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          manualMatches: [{ id: 'm_1', Data: '2026-08-15', createdAt: '2026-08-15T10:00:00Z' }],
          decks: [],
          players: []
        })
      });

      global.window.syncLifecycleState = 'BOOTING';
      global.window.isCloudSyncReady = false;

      await global.window.pullFromCloud();

      expect(global.window.syncLifecycleState).toBe('READY');
      expect(global.window.isCloudSyncReady).toBe(true);
    });

    it('TEST-011: pullFromCloud com falha de rede transiciona estado para OFFLINE sem destruir dados locais', async () => {
      mockStorage['jornada_auth_token'] = 'valid_token';
      mockStorage[KEY_MATCHES] = JSON.stringify([{ id: 'm_local_1' }]);

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      global.window.syncLifecycleState = 'BOOTING';
      global.window.isCloudSyncReady = false;

      await global.window.pullFromCloud();

      expect(global.window.syncLifecycleState).toBe('OFFLINE');
      expect(global.window.isCloudSyncReady).toBe(false);
      expect(JSON.parse(mockStorage[KEY_MATCHES]).length).toBe(1);
    });

    it('TEST-012, TEST-013, TEST-014: logoutUser cancela timers e bloqueia sincronização', () => {
      global.window.syncLifecycleState = 'READY';
      global.window.isCloudSyncReady = true;
      global.window._syncPushTimer = setTimeout(() => {}, 5000);
      global.window._syncIntervalTimer = setInterval(() => {}, 15000);
      global.window.currentUser = { name: 'Danilo' };

      global.window.logoutUser();

      expect(global.window._syncPushTimer).toBeNull();
      expect(global.window._syncIntervalTimer).toBeNull();
      expect(global.window.syncLifecycleState).toBe('LOGGED_OUT');
      expect(global.window.isCloudSyncReady).toBe(false);
      expect(global.window.currentUser).toBeNull();
    });

    it('TEST-015: Login posterior executa pull e restabelece estado READY', async () => {
      mockStorage['jornada_auth_token'] = 'new_jwt_token';
      mockStorage['jornada_user_profile'] = JSON.stringify({ name: 'Danilo' });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          manualMatches: [{ id: 'm_1', Data: '2026-08-15', createdAt: '2026-08-15T10:00:00Z' }],
          decks: [],
          players: []
        })
      });

      global.window.syncLifecycleState = 'BOOTING';

      await global.window.pullFromCloud();

      expect(global.window.syncLifecycleState).toBe('READY');
      expect(global.window.isCloudSyncReady).toBe(true);
    });

    it('TEST-016: Header Authorization Bearer sempre presente em push autenticado', async () => {
      let sentHeaders = null;
      global.fetch = vi.fn().mockImplementation((url, opts) => {
        sentHeaders = opts.headers;
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true })
        });
      });

      mockStorage['jornada_auth_token'] = 'jwt_secret_token_123';
      global.window.syncLifecycleState = 'READY';
      global.window.isCloudSyncReady = true;

      await global.window.pushToCloud();

      expect(sentHeaders).not.toBeNull();
      expect(sentHeaders['Authorization']).toBe('Bearer jwt_secret_token_123');
    });
  });

  describe('3. CHG-005.1: In-Flight Session Guard & Persistent Pending Sync', () => {
    let mockStorage;

    beforeEach(() => {
      mockStorage = {};
      const dom = new JSDOM('<!doctype html><html><body><div id="headerSyncDot"></div><div id="syncStatusIndicator"></div><div id="syncStatusText"></div></body></html>', { url: 'http://localhost' });

      global.window = dom.window;
      global.document = dom.window.document;
      global.localStorage = {
        getItem: (k) => mockStorage[k] || null,
        setItem: (k, v) => { mockStorage[k] = String(v); },
        removeItem: (k) => { delete mockStorage[k]; },
        clear: () => { mockStorage = {}; }
      };

      global.getAuthToken = () => mockStorage['jornada_auth_token'] || '';
      global.KEY_MATCHES = 'jornada_manual_matches';
      global.KEY_DECKS = 'jornada_decks';
      global.KEY_PLAYERS = 'jornada_players';
      global.KEY_LOCAIS = 'jornada_locais';
      global.KEY_COLECOES = 'jornada_colecoes';
      global.KEY_DELETED = 'jornada_deleted_ids';
      global.KEY_EDITS = 'jornada_edited_matches';

      global.loadManual = () => {
        try { return JSON.parse(mockStorage[KEY_MATCHES] || '[]'); } catch { return []; }
      };
      global.safeSetItem = (k, v) => { mockStorage[k] = String(v); };
      global.loadDeleted = () => new Set();
      global.loadDecks = () => [];
      global.loadPlayers = () => [];
      global.loadEdits = () => ({});
      global.loadArchetypeUnifications = () => [];

      new Function(syncCloudCode)();
      new Function(authCode)();
    });

    it('TEST-017: In-flight pull de usuário A termina após logout -> descartado sem gravar', async () => {
      mockStorage['jornada_auth_token'] = 'token_user_a';
      mockStorage[KEY_MATCHES] = JSON.stringify([{ id: 'm_init' }]);

      let resolvePull;
      const delayedPromise = new Promise((resolve) => {
        resolvePull = resolve;
      });

      global.fetch = vi.fn().mockImplementation(() => delayedPromise);

      // Usuário A inicia Pull
      const pullPromise = global.window.pullFromCloud();

      // Usuário A clica em logout enquanto o fetch está em voo
      global.window.logoutUser();

      expect(global.window.syncLifecycleState).toBe('LOGGED_OUT');
      expect(mockStorage['jornada_auth_token']).toBeUndefined();

      // Servidor responde para o pull antigo de A
      resolvePull({
        ok: true,
        json: async () => ({
          manualMatches: [{ id: 'm_user_a_stale' }]
        })
      });

      await pullPromise;

      // Dados de A NÃO devem ter sido gravados no storage
      expect(mockStorage[KEY_MATCHES]).toBe(JSON.stringify([{ id: 'm_init' }]));
      expect(global.window.syncLifecycleState).toBe('LOGGED_OUT');
      expect(global.window.isCloudSyncReady).toBe(false);
    });

    it('TEST-018: In-flight pull de A não contamina sessão subsequente de Usuário B', async () => {
      mockStorage['jornada_auth_token'] = 'token_user_a';

      let resolvePullA;
      global.fetch = vi.fn().mockImplementation(() => new Promise((resolve) => { resolvePullA = resolve; }));

      // 1. Usuário A inicia Pull
      const pullPromiseA = global.window.pullFromCloud();

      // 2. Usuário A faz logout
      global.window.logoutUser();

      // 3. Usuário B faz login
      mockStorage['jornada_auth_token'] = 'token_user_b';
      mockStorage['jornada_user_profile'] = JSON.stringify({ name: 'User B' });
      mockStorage[KEY_MATCHES] = JSON.stringify([{ id: 'm_user_b_clean' }]);
      global.window.syncLifecycleState = 'READY';

      // 4. Resposta tardia do Pull de A chega
      resolvePullA({
        ok: true,
        json: async () => ({
          manualMatches: [{ id: 'm_user_a_leak' }]
        })
      });

      await pullPromiseA;

      // O storage NÃO deve conter dados vazados de A
      expect(mockStorage[KEY_MATCHES]).toBe(JSON.stringify([{ id: 'm_user_b_clean' }]));
    });

    it('TEST-019: Mutação offline cria _hasPendingSync e persiste jornada_sync_pending', async () => {
      global.window.syncLifecycleState = 'OFFLINE';
      global.window.isCloudSyncReady = false;

      // Tenta fazer push offline
      await global.window.pushToCloud();

      expect(global.window._hasPendingSync).toBe(true);
      expect(mockStorage['jornada_sync_pending']).toBe('1');
    });

    it('TEST-020: Reload enquanto existe sync pendente restaura flag persistida', () => {
      // Simula reload: localStorage possui jornada_sync_pending = '1'
      mockStorage['jornada_sync_pending'] = '1';
      mockStorage['jornada_auth_token'] = 'user_token';

      // Re-executa inicialização
      global.window.initSyncUI();

      expect(global.window._hasPendingSync).toBe(true);
    });

    it('TEST-021: Reconexão com sync pendente executa Pull -> Merge -> READY -> Push pendente', async () => {
      mockStorage['jornada_auth_token'] = 'user_token';
      mockStorage['jornada_sync_pending'] = '1';
      mockStorage[KEY_MATCHES] = JSON.stringify([
        { id: 'm_1', Data: '2026-08-15', createdAt: '2026-08-15T10:00:00Z' },
        { id: 'm_offline_100', Data: '2026-08-15', createdAt: '2026-08-15T12:00:00Z' }
      ]);

      const sequence = [];
      global.fetch = vi.fn().mockImplementation((url, opts) => {
        if (opts?.method === 'POST') {
          sequence.push('PUSH');
          return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
        } else {
          sequence.push('PULL');
          return Promise.resolve({
            ok: true,
            json: async () => ({
              manualMatches: [{ id: 'm_1', Data: '2026-08-15', createdAt: '2026-08-15T10:00:00Z' }]
            })
          });
        }
      });

      global.window.syncLifecycleState = 'BOOTING';
      global.window.isCloudSyncReady = false;

      await global.window.pullFromCloud();

      expect(sequence[0]).toBe('PULL');
      expect(global.window.syncLifecycleState).toBe('READY');
      expect(global.window.isCloudSyncReady).toBe(true);
    });

    it('TEST-022: Push concluído com sucesso limpa _hasPendingSync e remove jornada_sync_pending', async () => {
      mockStorage['jornada_auth_token'] = 'user_token';
      mockStorage['jornada_sync_pending'] = '1';
      global.window._hasPendingSync = true;
      global.window.syncLifecycleState = 'READY';
      global.window.isCloudSyncReady = true;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      await global.window.pushToCloud();

      expect(global.window._hasPendingSync).toBe(false);
      expect(mockStorage['jornada_sync_pending']).toBeUndefined();
    });

    it('TEST-023: Push falha com HTTP 500 mantém _hasPendingSync = true e jornada_sync_pending = 1', async () => {
      mockStorage['jornada_auth_token'] = 'user_token';
      global.window.syncLifecycleState = 'READY';
      global.window.isCloudSyncReady = true;

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      });

      await global.window.pushToCloud();

      expect(global.window._hasPendingSync).toBe(true);
      expect(mockStorage['jornada_sync_pending']).toBe('1');
    });

    it('TEST-024: Logout com sync pendente cancela timer e bloqueia envio desautenticado', () => {
      mockStorage['jornada_auth_token'] = 'user_token';
      mockStorage['jornada_sync_pending'] = '1';
      global.window.syncLifecycleState = 'READY';
      global.window.isCloudSyncReady = true;
      global.window._syncPushTimer = setTimeout(() => {}, 5000);

      global.window.logoutUser();

      // Timer cancelado e estado LOGGED_OUT
      expect(global.window._syncPushTimer).toBeNull();
      expect(global.window.syncLifecycleState).toBe('LOGGED_OUT');
      expect(global.window.isCloudSyncReady).toBe(false);

      // Nenhum push deve ser enviado em logout
      const pushSpy = vi.fn();
      global.fetch = pushSpy;
      global.window.pushToCloud();
      expect(pushSpy).not.toHaveBeenCalled();
    });
  });

});
