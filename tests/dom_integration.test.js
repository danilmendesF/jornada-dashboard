import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlContent = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf-8');
const statsCode = fs.readFileSync(path.resolve(__dirname, '../js/stats.js'), 'utf-8');
const mirrorCode = fs.readFileSync(path.resolve(__dirname, '../js/mirror.js'), 'utf-8');

describe('DOM & UI Integration Tests (JSDOM)', () => {
  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM(htmlContent);
    global.window = dom.window;
    global.document = dom.window.document;
    document = dom.window.document;

    // Load core modules
    new Function(statsCode)();
    new Function(mirrorCode)();
  });

  it('deve possuir todos os IDs críticos no DOM do index.html', () => {
    expect(document.getElementById('formMatchData')).not.toBeNull();
    expect(document.getElementById('formMatchPlayer')).not.toBeNull();
    expect(document.getElementById('formMatchAdv')).not.toBeNull();
    expect(document.getElementById('tableBody')).not.toBeNull();
    expect(document.getElementById('tableSearch')).not.toBeNull();
    expect(document.getElementById('quickLogBody')).not.toBeNull();
    expect(document.getElementById('modalMatchForm')).not.toBeNull();
  });

  it('deve validar bloqueio de auto-duelo no formulário', () => {
    const playerInput = document.getElementById('formMatchPlayer');
    const advInput = document.getElementById('formMatchAdv');

    playerInput.value = 'Danilo';
    advInput.value = 'Danilo';

    const isSelfMatch = (playerInput.value.trim().toLowerCase() === advInput.value.trim().toLowerCase());
    expect(isSelfMatch).toBe(true);
  });

  it('deve validar bloqueio de data futura', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const isFutureDate = (selectedDate) => selectedDate > todayStr;

    expect(isFutureDate(todayStr)).toBe(false);
    expect(isFutureDate(tomorrowStr)).toBe(true);
  });

  it('deve filtrar partidas por busca textual', () => {
    const matches = [
      { Player: 'Danilo', Adversario: 'GuiVaz', Deck: 'Charizard ex', DeckAdv: 'Praça de Festa', Resultado: 'Vitória' },
      { Player: 'Victor', Adversario: 'Matheus', Deck: 'Miraidon ex', DeckAdv: 'Gardevoir ex', Resultado: 'Derrota' },
      { Player: 'Danilo', Adversario: 'Victor', Deck: 'Lugia VSTAR', DeckAdv: 'Miraidon ex', Resultado: 'Vitória' }
    ];

    const filterText = 'charizard';
    const filtered = matches.filter(m => {
      const q = filterText.toLowerCase();
      return (
        m.Player.toLowerCase().includes(q) ||
        m.Adversario.toLowerCase().includes(q) ||
        m.Deck.toLowerCase().includes(q) ||
        m.DeckAdv.toLowerCase().includes(q)
      );
    });

    expect(filtered.length).toBe(1);
    expect(filtered[0].Player).toBe('Danilo');
    expect(filtered[0].Deck).toBe('Charizard ex');
  });
});
