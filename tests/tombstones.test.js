import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const syncCloudCode = fs.readFileSync(path.resolve(__dirname, '../js/sync_cloud.js'), 'utf-8');

describe('Tombstone Retention & Resurrection Prevention (GAP-NEW-003)', () => {
  beforeEach(() => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
    global.window = dom.window;
    global.document = dom.window.document;

    new Function(syncCloudCode)();
  });

  it('deve garantir que tombstone previne ressurreição de partidas deletadas', () => {
    const localMatches = [
      { id: 'm_active_1', Data: '2026-08-01', Player: 'Danilo' },
      { id: 'm_deleted_2', Data: '2026-08-02', Player: 'Victor' }
    ];
    const incomingRemoteMatches = [
      { id: 'm_deleted_2', Data: '2026-08-02', Player: 'Victor' },
      { id: 'm_active_3', Data: '2026-08-03', Player: 'GuiVaz' }
    ];

    const deletedIds = new Set(['m_deleted_2']);

    const merged = window.deterministicMergeMatches(localMatches, incomingRemoteMatches, deletedIds);

    expect(merged.length).toBe(2);
    expect(merged.some(m => m.id === 'm_deleted_2')).toBe(false);
    expect(merged.map(m => m.id)).toEqual(['m_active_1', 'm_active_3']);
  });
});
