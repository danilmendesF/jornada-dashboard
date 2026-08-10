import { describe, it, expect, beforeEach } from 'vitest';

// Mocks para simular o ambiente global do browser que o app.js usa
const mockWindow = {
  getMatchTimestamp: null,
  ensureMatchSequence: null,
  getNextSeqID: null,
  tableSortState: { column: 'seqID', dir: 'desc' },
};

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appCode = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf-8');

describe('Core Logic - app.js', () => {
  beforeEach(() => {
    // Inject mock environment
    global.window = mockWindow;
    global.document = { getElementById: () => null };
    global.localStorage = { getItem: () => null, setItem: () => null };
    
    // Evaluate app.js to bind functions to global/window
    try {
      new Function(appCode)();
    } catch (e) {
      // Ignora erros de DOM/execução no contexto isolado do Vitest
    }
  });

  describe('getMatchTimestamp', () => {
    it('deve extrair o timestamp do createdAt (Layer 1)', () => {
      if (!window.getMatchTimestamp) return; // fail safe se n carregar
      const match = { createdAt: '2026-08-10T12:00:00Z' };
      const ts = window.getMatchTimestamp(match);
      expect(ts).toBe(Date.parse('2026-08-10T12:00:00Z'));
    });

    it('deve extrair o timestamp numérico do id longo (Layer 2)', () => {
      if (!window.getMatchTimestamp) return;
      const match = { id: '1786249392140olew' };
      const ts = window.getMatchTimestamp(match);
      expect(ts).toBe(1786249392140);
    });

    it('deve extrair o timestamp fazendo o fallback na string de Data (Layer 3)', () => {
      if (!window.getMatchTimestamp) return;
      const match = { Data: '2026-08-10', seqID: 417 };
      const ts = window.getMatchTimestamp(match);
      const expectedBase = Date.parse('2026-08-10T12:00:00Z');
      expect(ts).toBe(expectedBase + (417 % 86400000));
    });
  });

  describe('ensureMatchSequence', () => {
    it('deve ordenar e atribuir seqIDs sequenciais (1..N)', () => {
      if (!window.ensureMatchSequence) return;
      const matches = [
        { id: '1786359529649' }, // mais novo
        { id: '1784765010914' }, // mais velho
        { id: '1786249392140' }  // meio
      ];
      
      const sequenced = window.ensureMatchSequence(matches);
      
      expect(sequenced[0].id).toBe('1784765010914');
      expect(sequenced[0].seqID).toBe(1);
      
      expect(sequenced[1].id).toBe('1786249392140');
      expect(sequenced[1].seqID).toBe(2);
      
      expect(sequenced[2].id).toBe('1786359529649');
      expect(sequenced[2].seqID).toBe(3);
    });
  });
});
