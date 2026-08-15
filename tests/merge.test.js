import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const syncCloudCode = fs.readFileSync(path.resolve(__dirname, '../js/sync_cloud.js'), 'utf-8');
const appCode = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf-8');

describe('Domain Logic - Deterministic Match Merge (GAP-P2)', () => {
  let dom;

  beforeEach(() => {
    dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;

    try {
      new Function(appCode)();
    } catch (e) {}

    try {
      new Function(syncCloudCode)();
    } catch (e) {}
  });

  it('deve realizar merge comutativo: merge(A, B) === merge(B, A)', () => {
    const listA = [
      { id: '100', Data: '2026-08-01', Player: 'Danilo', Resultado: 'Vitória' },
      { id: '200', Data: '2026-08-02', Player: 'GuiVaz', Resultado: 'Derrota' }
    ];

    const listB = [
      { id: '100', Data: '2026-08-01', Player: 'Danilo', Resultado: 'Vitória' },
      { id: '300', Data: '2026-08-03', Player: 'Victor', Resultado: 'Vitória' }
    ];

    const mergeAB = window.deterministicMergeMatches(listA, listB);
    const mergeBA = window.deterministicMergeMatches(listB, listA);

    expect(mergeAB.length).toBe(3);
    expect(mergeBA.length).toBe(3);

    const idsAB = mergeAB.map(m => m.id);
    const idsBA = mergeBA.map(m => m.id);
    expect(idsAB).toEqual(idsBA);
  });

  it('deve preservar a versão com timestamp de edição mais recente', () => {
    const local = [
      { id: '100', Data: '2026-08-01', Player: 'Danilo', Deck: 'Charizard ex antigo', updatedAt: '2026-08-01T10:00:00Z' }
    ];
    const remote = [
      { id: '100', Data: '2026-08-01', Player: 'Danilo', Deck: 'Charizard ex atualizado', updatedAt: '2026-08-01T12:00:00Z' }
    ];

    const merged = window.deterministicMergeMatches(local, remote);
    expect(merged.length).toBe(1);
    expect(merged[0].Deck).toBe('Charizard ex atualizado');
  });

  it('deve ignorar registros que constam em deletedIds', () => {
    const local = [
      { id: '100', Data: '2026-08-01', Player: 'Danilo' },
      { id: '200', Data: '2026-08-02', Player: 'GuiVaz' }
    ];
    const remote = [
      { id: '300', Data: '2026-08-03', Player: 'Victor' }
    ];
    const deletedIds = new Set(['200']);

    const merged = window.deterministicMergeMatches(local, remote, deletedIds);
    expect(merged.length).toBe(2);
    expect(merged.some(m => m.id === '200')).toBe(false);
  });
});
