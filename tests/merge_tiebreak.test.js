import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const syncCloudCode = fs.readFileSync(path.resolve(__dirname, '../js/sync_cloud.js'), 'utf-8');

describe('Deterministic Merge - Identical Timestamp Tie-Breaker (GAP-NEW-001)', () => {
  beforeEach(() => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
    global.window = dom.window;
    global.document = dom.window.document;

    new Function(syncCloudCode)();
  });

  it('deve ser 100% comutativo mesmo quando updatedAt for IDÊNTICO e payloads divergirem', () => {
    const setA = [
      { id: 'match_100', Data: '2026-08-01', Deck: 'Charizard ex (Versão Alpha)', updatedAt: '2026-08-01T10:00:00.000Z' }
    ];
    const setB = [
      { id: 'match_100', Data: '2026-08-01', Deck: 'Charizard ex (Versão Beta)', updatedAt: '2026-08-01T10:00:00.000Z' }
    ];

    const mergeAB = window.deterministicMergeMatches(setA, setB);
    const mergeBA = window.deterministicMergeMatches(setB, setA);

    expect(mergeAB).toEqual(mergeBA);
    expect(mergeAB[0].id).toBe('match_100');
    // Winner is canonically deterministic
    expect(mergeAB[0].Deck).toBe(mergeBA[0].Deck);
  });

  it('deve ser 100% comutativo quando updatedAt estiver ausente em ambos os registros', () => {
    const setA = [
      { id: 'match_200', Data: '2026-08-02', Deck: 'Lugia VSTAR' }
    ];
    const setB = [
      { id: 'match_200', Data: '2026-08-02', Deck: 'Miraidon ex' }
    ];

    const mergeAB = window.deterministicMergeMatches(setA, setB);
    const mergeBA = window.deterministicMergeMatches(setB, setA);

    expect(mergeAB).toEqual(mergeBA);
    expect(mergeAB[0].Deck).toBe(mergeBA[0].Deck);
  });
});
