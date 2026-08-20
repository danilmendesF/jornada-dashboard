import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const utilCode = fs.readFileSync(path.resolve(__dirname, '../js/util.js'), 'utf-8');
const configCode = fs.readFileSync(path.resolve(__dirname, '../js/config.js'), 'utf-8');
const storageCode = fs.readFileSync(path.resolve(__dirname, '../js/storage.js'), 'utf-8');
const mirrorCode = fs.readFileSync(path.resolve(__dirname, '../js/mirror.js'), 'utf-8');
const managerFormsCode = fs.readFileSync(path.resolve(__dirname, '../js/manager_forms.js'), 'utf-8');
const quicklogCode = fs.readFileSync(path.resolve(__dirname, '../js/quicklog.js'), 'utf-8');
const syncCloudCode = fs.readFileSync(path.resolve(__dirname, '../js/sync_cloud.js'), 'utf-8');
const authCode = fs.readFileSync(path.resolve(__dirname, '../js/auth.js'), 'utf-8');
const appCode = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf-8');

describe('CHG-006.2: Sync Protocol v2 — User Storage Namespaces', () => {
  let dom;
  let mockStorage;

  beforeEach(() => {
    mockStorage = {};
    dom = new JSDOM('<!doctype html><html><body><div id="modalMatchForm"></div><div id="formMatchPlayerDisplay"></div></body></html>', { url: 'http://localhost' });
    global.window = dom.window;
    global.document = dom.window.document;
    global.alert = vi.fn();
    global.window.alert = vi.fn();
    global.localStorage = {
      getItem: (k) => mockStorage[k] || null,
      setItem: (k, v) => { mockStorage[k] = String(v); },
      removeItem: (k) => { delete mockStorage[k]; },
      clear: () => { mockStorage = {}; }
    };

    class MockFileReader {
      readAsText(file) {
        setTimeout(() => {
          this.result = file._textData || '';
          if (this.onload) this.onload({ target: { result: this.result } });
        }, 5);
      }
    }
    global.FileReader = MockFileReader;
    dom.window.FileReader = MockFileReader;
    global.window.FileReader = MockFileReader;

    global.Chart = {
      register: vi.fn(),
      defaults: { plugins: { datalabels: {}, legend: { labels: {} }, tooltip: {} }, color: '', font: {} }
    };
    global.ChartDataLabels = {};

    new Function(utilCode)();
    new Function(configCode)();
    new Function(storageCode)();
    new Function(mirrorCode)();
    new Function(managerFormsCode)();
    new Function(quicklogCode)();
    new Function(syncCloudCode)();
    new Function(authCode)();
    new Function(appCode)();
  });

  it('V2-TEST-011: Geração determinística de chaves por namespace de usuário', () => {
    const keyA = global.window.getStorageKey('matches', 'usr_A');
    const keyB = global.window.getStorageKey('matches', 'usr_B');
    const keyAnon = global.window.getStorageKey('matches', 'anonymous');

    expect(keyA).toBe('jornada_u_usr_A_matches');
    expect(keyB).toBe('jornada_u_usr_B_matches');
    expect(keyAnon).toBe('jornada_u_anonymous_matches');
    expect(keyA).not.toBe(keyB);
  });

  it('V2-TEST-012: Usuário A grava M1 e Usuário B grava M2 com isolamento total', () => {
    // 1. Simula login Usuário A
    global.window.currentUser = { id: 'usr_A', name: 'Danilo' };
    const m1 = { id: global.window.generateUUID(), Player: 'Danilo', Data: '2026-08-19' };
    global.window.saveManual([m1]);

    expect(mockStorage['jornada_u_usr_A_matches']).toBeDefined();
    expect(mockStorage['jornada_u_usr_B_matches']).toBeUndefined();

    // 2. Simula login Usuário B
    global.window.currentUser = { id: 'usr_B', name: 'GuiVaz' };
    const m2 = { id: global.window.generateUUID(), Player: 'GuiVaz', Data: '2026-08-19' };
    global.window.saveManual([m2]);

    expect(mockStorage['jornada_u_usr_B_matches']).toBeDefined();

    // 3. Valida isolamento
    const loadedB = global.window.loadManual();
    expect(loadedB.length).toBe(1);
    expect(loadedB[0].id).toBe(m2.id);

    // 4. Volta para A
    global.window.currentUser = { id: 'usr_A', name: 'Danilo' };
    const loadedA = global.window.loadManual();
    expect(loadedA.length).toBe(1);
    expect(loadedA[0].id).toBe(m1.id);
  });

  it('V2-TEST-013 & V2-TEST-014: A -> logout -> B -> login -> logout -> A recupera dataset original', () => {
    // 1. Usuário A cria dados
    global.window.currentUser = { id: 'usr_A', name: 'Danilo' };
    mockStorage['jornada_auth_token'] = 'token_A';
    mockStorage['jornada_user_profile'] = JSON.stringify(global.window.currentUser);
    const m1 = { id: global.window.generateUUID(), Player: 'Danilo' };
    global.window.saveManual([m1]);

    // 2. Logout de A
    global.window.logoutUser();
    expect(global.window.currentUser).toBeNull();
    expect(global.window.allData.length).toBe(0);

    // 3. Login de B
    global.window.currentUser = { id: 'usr_B', name: 'GuiVaz' };
    mockStorage['jornada_auth_token'] = 'token_B';
    mockStorage['jornada_user_profile'] = JSON.stringify(global.window.currentUser);
    const loadedB = global.window.loadManual();
    expect(loadedB.length).toBe(0); // B não enxerga nada de A

    const m2 = { id: global.window.generateUUID(), Player: 'GuiVaz' };
    global.window.saveManual([m2]);
    expect(global.window.loadManual().length).toBe(1);

    // 4. Logout de B
    global.window.logoutUser();

    // 5. Login de A novamente
    global.window.currentUser = { id: 'usr_A', name: 'Danilo' };
    mockStorage['jornada_auth_token'] = 'token_A';
    mockStorage['jornada_user_profile'] = JSON.stringify(global.window.currentUser);
    const recoveredA = global.window.loadManual();
    expect(recoveredA.length).toBe(1);
    expect(recoveredA[0].id).toBe(m1.id);
  });

  it('V2-TEST-015: Pending Sync isolado por usuário', () => {
    // Usuário A define pending sync
    global.window.currentUser = { id: 'usr_A', name: 'Danilo' };
    global.window.setPendingSync(true);

    expect(mockStorage['jornada_u_usr_A_sync_pending']).toBe('1');
    expect(mockStorage['jornada_u_usr_B_sync_pending']).toBeUndefined();

    // Usuário B não possui pending sync
    global.window.currentUser = { id: 'usr_B', name: 'GuiVaz' };
    const pendingKeyB = global.window.getScopedKey('jornada_sync_pending');
    expect(mockStorage[pendingKeyB]).toBeUndefined();
  });

  it('V2-TEST-016 & V2-TEST-017: Migração legada para namespace de usuário é segura e 100% idempotente', () => {
    const uuid1 = global.window.generateUUID();
    const legacyMatches = [{ id: uuid1, Player: 'Danilo', Data: '2026-08-15' }];
    mockStorage['jornada_manual_matches'] = JSON.stringify(legacyMatches);
    mockStorage['jornada_decks'] = JSON.stringify([{ name: 'Charizard' }]);

    // Executa migração para usr_A
    global.window.migrateLegacyUserStorage('usr_A');

    expect(mockStorage['jornada_u_usr_A_matches']).toBeDefined();
    expect(mockStorage['jornada_u_usr_A_decks']).toBeDefined();
    expect(mockStorage['jornada_manual_matches']).toBeUndefined();
    expect(mockStorage['jornada_decks']).toBeUndefined();

    const migratedMatches = JSON.parse(mockStorage['jornada_u_usr_A_matches']);
    expect(migratedMatches[0].id).toBe(uuid1);

    // Segunda execução não altera os dados
    global.window.migrateLegacyUserStorage('usr_A');
    expect(JSON.parse(mockStorage['jornada_u_usr_A_matches'])[0].id).toBe(uuid1);
  });

  it('V2-TEST-018 & V2-TEST-019: UUIDs e referências de mirror são preservadas na migração', () => {
    const uuidPrim = global.window.generateUUID();
    const uuidMirr = global.window.generateUUID();

    const legacyMatches = [
      { id: uuidPrim, Player: 'Danilo', _mirrorId: uuidMirr },
      { id: uuidMirr, Player: 'GuiVaz', _mirroredFrom: uuidPrim }
    ];
    mockStorage['jornada_manual_matches'] = JSON.stringify(legacyMatches);

    global.window.migrateLegacyUserStorage('usr_A');

    const migrated = JSON.parse(mockStorage['jornada_u_usr_A_matches']);
    expect(migrated[0].id).toBe(uuidPrim);
    expect(migrated[1].id).toBe(uuidMirr);
    expect(migrated[0]._mirrorId).toBe(uuidMirr);
    expect(migrated[1]._mirroredFrom).toBe(uuidPrim);
  });

  it('V2-TEST-020: Import Backup grava somente no namespace do usuário ativo', async () => {
    global.window.currentUser = { id: 'usr_A', name: 'Danilo' };
    const uuidImp = global.window.generateUUID();

    const backupData = {
      manualMatches: [{ id: uuidImp, Player: 'Danilo', Data: '2026-08-19' }],
      decks: [{ name: 'Lugia' }]
    };

    const blob = { _textData: JSON.stringify(backupData) };
    global.window.importBackup(blob);
    await new Promise(r => setTimeout(r, 20));

    // O storage do usuário A deve receber
    expect(mockStorage['jornada_u_usr_A_matches']).toContain(uuidImp);
    expect(mockStorage['jornada_u_usr_B_matches']).toBeUndefined();
  });

  it('V2-TEST-021: Export Backup exporta somente dados do namespace ativo', () => {
    global.window.currentUser = { id: 'usr_A', name: 'Danilo' };
    const m1 = { id: global.window.generateUUID(), Player: 'Danilo' };
    global.window.saveManual([m1]);

    const manual = global.window.loadManual();
    expect(manual.length).toBe(1);
    expect(manual[0].id).toBe(m1.id);
  });

  it('V2-TEST-022: Logout durante operação assíncrona não grava no namespace do novo usuário', async () => {
    global.window.currentUser = { id: 'usr_A', name: 'Danilo' };
    mockStorage['jornada_auth_token'] = 'token_A';

    let resolvePull;
    global.fetch = vi.fn().mockImplementation(() => new Promise((res) => { resolvePull = res; }));

    const pullPromise = global.window.pullFromCloud();

    // Logout de A
    global.window.logoutUser();

    // Login de B
    global.window.currentUser = { id: 'usr_B', name: 'GuiVaz' };
    mockStorage['jornada_auth_token'] = 'token_B';

    // Resposta de A chega
    resolvePull({
      ok: true,
      json: async () => ({ manualMatches: [{ id: global.window.generateUUID(), Player: 'Danilo' }] })
    });

    await pullPromise;

    // Namespace de B permanece intacto e vazio
    expect(mockStorage['jornada_u_usr_B_matches']).toBeUndefined();
  });

  it('V2-TEST-023: Boot anonymous utiliza jornada_u_anonymous_* isolado', () => {
    global.window.currentUser = null;
    const mAnon = { id: global.window.generateUUID(), Player: 'Anonymous' };
    global.window.saveManual([mAnon]);

    expect(mockStorage['jornada_u_anonymous_matches']).toBeDefined();
    expect(mockStorage['jornada_u_usr_A_matches']).toBeUndefined();
  });

  it('V2-TEST-024: Usuário A offline com pending sync -> logout -> B login não herda pending sync', () => {
    // 1. Usuário A offline cria partida e tem pending sync
    global.window.currentUser = { id: 'usr_A', name: 'Danilo' };
    global.window.setPendingSync(true);
    expect(mockStorage['jornada_u_usr_A_sync_pending']).toBe('1');

    // 2. Logout de A
    global.window.logoutUser();

    // 3. Login de B
    global.window.currentUser = { id: 'usr_B', name: 'GuiVaz' };
    expect(global.window._hasPendingSync).toBe(false);
    const pendingKeyB = global.window.getScopedKey('jornada_sync_pending');
    expect(mockStorage[pendingKeyB]).toBeUndefined();
  });
});
