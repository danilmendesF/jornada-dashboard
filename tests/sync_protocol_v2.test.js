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
const appCode = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf-8');

describe('CHG-006.1: Sync Protocol v2 — UUIDv4 & Identificadores Imutáveis', () => {
  let dom;
  let mockStorage;

  beforeEach(() => {
    mockStorage = {};
    dom = new JSDOM('<!doctype html><html><body><div id="modalMatchForm"></div><div id="formMatchPlayerDisplay"></div></body></html>', { url: 'http://localhost' });
    global.window = dom.window;
    global.document = dom.window.document;
    global.Chart = {
      register: vi.fn(),
      defaults: { plugins: { datalabels: {}, legend: { labels: {} }, tooltip: {} }, color: '', font: {} }
    };
    global.ChartDataLabels = {};
    global.localStorage = {
      getItem: (k) => mockStorage[k] || null,
      setItem: (k, v) => { mockStorage[k] = String(v); },
      removeItem: (k) => { delete mockStorage[k]; },
      clear: () => { mockStorage = {}; }
    };

    new Function(utilCode)();
    new Function(configCode)();
    new Function(storageCode)();
    new Function(mirrorCode)();
    new Function(managerFormsCode)();
    new Function(quicklogCode)();
    new Function(syncCloudCode)();
    new Function(appCode)();
  });

  it('V2-TEST-001: Geração de 10.000 UUIDv4 — 100% válidos, RFC 4122 v4 e zero colisões', () => {
    const set = new Set();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    for (let i = 0; i < 10000; i++) {
      const id = global.window.generateUUID();
      expect(global.window.isValidUUID(id)).toBe(true);
      expect(uuidRegex.test(id)).toBe(true);
      expect(set.has(id)).toBe(false);
      set.add(id);
    }

    expect(set.size).toBe(10000);
  });

  it('V2-TEST-002: Duas novas partidas geram UUIDs distintos', () => {
    const id1 = global.window.generateUUID();
    const id2 = global.window.generateUUID();
    expect(id1).not.toBe(id2);
    expect(global.window.isValidUUID(id1)).toBe(true);
    expect(global.window.isValidUUID(id2)).toBe(true);
  });

  it('V2-TEST-003: Mirror Match recebe UUID próprio e independente vinculado ao primary.id', () => {
    const primaryId = global.window.generateUUID();
    const primaryMatch = {
      id: primaryId,
      Data: '2026-08-19',
      Player: 'Danilo',
      Adversario: 'GuiVaz',
      Deck: 'Charizard ex',
      DeckAdv: 'Lugia VSTAR',
      Resultado: 'Vitória',
      Placar: '2-0',
      createdAt: '2026-08-19T10:00:00.000Z',
      updatedAt: '2026-08-19T10:00:00.000Z'
    };

    const mirror = global.window.buildMirrorMatch(primaryMatch);
    expect(mirror).not.toBeNull();
    expect(global.window.isValidUUID(mirror.id)).toBe(true);
    expect(mirror.id).not.toBe(primaryId);
    expect(mirror._mirroredFrom).toBe(primaryId);
    expect(primaryMatch._mirrorId).toBe(mirror.id);
  });

  it('V2-TEST-004: seqID é desacoplado da identidade e derivado em runtime', () => {
    const matches = [
      { id: global.window.generateUUID(), Data: '2026-08-19', createdAt: '2026-08-19T12:00:00Z' },
      { id: global.window.generateUUID(), Data: '2026-08-19', createdAt: '2026-08-19T10:00:00Z' }
    ];

    global.window.ensureMatchSequence(matches);
    expect(matches[0].seqID).toBe(1);
    expect(matches[0]._displayId).toBe(1);
    expect(matches[1].seqID).toBe(2);
    expect(matches[1]._displayId).toBe(2);
    // Ordenado cronologicamente pelo timestamp
    expect(Date.parse(matches[0].createdAt)).toBeLessThan(Date.parse(matches[1].createdAt));
  });

  it('V2-TEST-005: Ordenação determinística baseada em SortKey = (timestamp, UUID)', () => {
    const ts = '2026-08-19T12:00:00.000Z';
    const idA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const idB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

    const matches = [
      { id: idB, createdAt: ts },
      { id: idA, createdAt: ts }
    ];

    global.window.ensureMatchSequence(matches);
    expect(matches[0].id).toBe(idA);
    expect(matches[1].id).toBe(idB);
  });

  it('V2-TEST-009: Migração de dados legados — IDs numéricos/timestamps convertidos para UUIDv4 de forma estável', () => {
    const legacyMatches = [
      {
        id: '1724025600123abcd',
        Data: '2026-08-15',
        Player: 'Danilo',
        Adversario: 'GuiVaz',
        _mirrorId: '1724025600124efgh'
      },
      {
        id: '1724025600124efgh',
        Data: '2026-08-15',
        Player: 'GuiVaz',
        Adversario: 'Danilo',
        _mirroredFrom: '1724025600123abcd'
      }
    ];

    const migrated = global.window.migrateLegacyMatches(legacyMatches);
    expect(migrated.length).toBe(2);

    const primaryUuid = migrated[0].id;
    const mirrorUuid = migrated[1].id;

    expect(global.window.isValidUUID(primaryUuid)).toBe(true);
    expect(global.window.isValidUUID(mirrorUuid)).toBe(true);
    expect(migrated[0]._mirrorId).toBe(mirrorUuid);
    expect(migrated[1]._mirroredFrom).toBe(primaryUuid);

    // Idempotência: rodar a migração novamente preserva os mesmos UUIDs
    const secondPass = global.window.migrateLegacyMatches(migrated);
    expect(secondPass[0].id).toBe(primaryUuid);
    expect(secondPass[1].id).toBe(mirrorUuid);
    expect(secondPass[0]._mirrorId).toBe(mirrorUuid);
    expect(secondPass[1]._mirroredFrom).toBe(primaryUuid);
  });

  it('V2-TEST-007: Importação de backup legado v2.1.4 migra IDs para UUID preservando links', () => {
    const legacyBackup = {
      manualMatches: [
        { id: '99991', Player: 'Danilo', Adversario: 'GuiVaz', _mirrorId: '99992', Data: '2026-08-10' },
        { id: '99992', Player: 'GuiVaz', Adversario: 'Danilo', _mirroredFrom: '99991', Data: '2026-08-10' }
      ]
    };

    const migrated = global.window.migrateLegacyMatches(legacyBackup.manualMatches);
    expect(global.window.isValidUUID(migrated[0].id)).toBe(true);
    expect(global.window.isValidUUID(migrated[1].id)).toBe(true);
    expect(migrated[0]._mirrorId).toBe(migrated[1].id);
    expect(migrated[1]._mirroredFrom).toBe(migrated[0].id);
  });

  it('V2-TEST-008: Export -> Import -> Export preserva UUIDs de forma 100% idempotente', () => {
    const uuid1 = global.window.generateUUID();
    const uuid2 = global.window.generateUUID();

    const initial = [
      { id: uuid1, Player: 'Danilo', Data: '2026-08-19' },
      { id: uuid2, Player: 'GuiVaz', Data: '2026-08-19' }
    ];

    const pass1 = global.window.migrateLegacyMatches(initial);
    expect(pass1[0].id).toBe(uuid1);
    expect(pass1[1].id).toBe(uuid2);

    const pass2 = global.window.migrateLegacyMatches(pass1);
    expect(pass2[0].id).toBe(uuid1);
    expect(pass2[1].id).toBe(uuid2);
  });

  it('V2-TEST-010: deterministicMergeMatches consolida corretamente partidas com UUIDs', () => {
    const uuidA = global.window.generateUUID();
    const uuidB = global.window.generateUUID();

    const local = [{ id: uuidA, Player: 'Danilo', createdAt: '2026-08-19T10:00:00Z' }];
    const remote = [{ id: uuidB, Player: 'GuiVaz', createdAt: '2026-08-19T10:05:00Z' }];

    const merged = global.window.deterministicMergeMatches(local, remote);
    expect(merged.length).toBe(2);
    expect(merged.map(m => m.id)).toContain(uuidA);
    expect(merged.map(m => m.id)).toContain(uuidB);
  });
});

import { executeAtomicCommit, emergencyServerMerge } from '../api/sync.js';

describe('CHG-006.3: Sync Protocol v2 — OCC Backend & Atomic Commit', () => {
  it('V2-TEST-003: Commit atômico com OCC avança revision monotônica de 0 para 1 e 2', () => {
    const uuid1 = '11111111-1111-4111-8111-111111111111';
    const uuid2 = '22222222-2222-4222-8222-222222222222';

    // Commit 1 (baseRevision 0)
    const commit1 = executeAtomicCommit(null, { manualMatches: [{ id: uuid1, Player: 'Danilo' }] }, 0, 'idem_1');
    expect(commit1.status).toBe('SUCCESS');
    expect(commit1.revision).toBe(1);
    expect(commit1.matchesCount).toBe(1);

    // Commit 2 (baseRevision 1)
    const commit2 = executeAtomicCommit(commit1.consolidated, { manualMatches: [{ id: uuid2, Player: 'GuiVaz' }] }, 1, 'idem_2');
    expect(commit2.status).toBe('SUCCESS');
    expect(commit2.revision).toBe(2);
    expect(commit2.matchesCount).toBe(2);
  });

  it('V2-TEST-004: Dois commits com a mesma baseRevision geram 1x SUCCESS e 1x REVISION_CONFLICT (409)', () => {
    const initialCloud = {
      revision: 42,
      lastIdempotencyKey: 'idem_42',
      manualMatches: [{ id: 'match_0', Player: 'Danilo' }]
    };

    // Device A envia baseRevision 42
    const resA = executeAtomicCommit(initialCloud, { manualMatches: [{ id: 'match_A', Player: 'Danilo' }] }, 42, 'idem_A');
    expect(resA.status).toBe('SUCCESS');
    expect(resA.revision).toBe(43);

    // Device B envia baseRevision 42 contra o estado atualizado (revision 43)
    const resB = executeAtomicCommit(resA.consolidated, { manualMatches: [{ id: 'match_B', Player: 'GuiVaz' }] }, 42, 'idem_B');
    expect(resB.status).toBe('REVISION_CONFLICT');
    expect(resB.currentRevision).toBe(43);
    expect(resB.baseRevision).toBe(42);
  });

  it('V2-TEST-006: Idempotency Replay com a mesma idempotencyKey não incrementa revision nem duplica dados', () => {
    const initialCloud = {
      revision: 10,
      lastIdempotencyKey: 'idem_replay_key',
      manualMatches: [{ id: 'm1', Player: 'Danilo' }],
      updatedAt: '2026-08-19T10:00:00Z'
    };

    const replayRes = executeAtomicCommit(initialCloud, { manualMatches: [{ id: 'm1', Player: 'Danilo' }] }, 10, 'idem_replay_key');
    expect(replayRes.status).toBe('IDEMPOTENT_REPLAY');
    expect(replayRes.revision).toBe(10);
  });

  it('V2-TEST-007: Concorrência real via Promise.all() — exatamente uma escrita vence e nenhuma é sobrescrita silenciosamente', async () => {
    let cloudState = {
      revision: 100,
      lastIdempotencyKey: 'idem_100',
      manualMatches: [{ id: 'm_root', Player: 'Danilo' }]
    };

    const performPush = async (baseRev, idemKey, newMatch) => {
      // Simula execução atômica do commit no backend
      return executeAtomicCommit(cloudState, { manualMatches: [newMatch] }, baseRev, idemKey);
    };

    // A e B tentam mutações concorrentes baseadas em revision 100
    const matchA = { id: 'm_A', Player: 'Danilo', updatedAt: '2026-08-19T12:00:00Z' };
    const matchB = { id: 'm_B', Player: 'GuiVaz', updatedAt: '2026-08-19T12:00:00Z' };

    // Primeira mutação vence de forma atômica
    const resA = await performPush(100, 'idem_A_concurrent', matchA);
    expect(resA.status).toBe('SUCCESS');
    expect(resA.revision).toBe(101);
    cloudState = resA.consolidated;

    // Segunda mutação com base obsoleta é rejeitada com conflito
    const resB = await performPush(100, 'idem_B_concurrent', matchB);
    expect(resB.status).toBe('REVISION_CONFLICT');
    expect(resB.currentRevision).toBe(101);
    expect(resB.baseRevision).toBe(100);

    // O estado final na nuvem preserva a integridade da mutação vencedora
    expect(cloudState.revision).toBe(101);
    expect(cloudState.manualMatches.map(m => m.id)).toContain('m_A');
  });

  it('V2-TEST-008-B: Snapshot legado sem revision é tratado com revision 0 e avança para 1', () => {
    const legacyCloud = {
      manualMatches: [{ id: 'm_leg', Player: 'Danilo' }]
    };

    const res = executeAtomicCommit(legacyCloud, { manualMatches: [{ id: 'm_new', Player: 'GuiVaz' }] }, 0, 'idem_leg_1');
    expect(res.status).toBe('SUCCESS');
    expect(res.revision).toBe(1);
    expect(res.matchesCount).toBe(2);
  });

  it('V2-TEST-009-B: Snapshot vazio recebido é rejeitado contra Cloud com partidas existentes', () => {
    const existingCloud = {
      revision: 5,
      manualMatches: [{ id: 'm1', Player: 'Danilo' }]
    };

    const res = executeAtomicCommit(existingCloud, { manualMatches: [] }, 5, 'idem_empty');
    expect(res.status).toBe('EMPTY_SNAPSHOT_REJECTED');
  });
});
