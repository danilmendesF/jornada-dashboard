import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const statsCode = fs.readFileSync(path.resolve(__dirname, '../js/stats.js'), 'utf-8');

describe('Domain Logic - stats.js', () => {
  beforeEach(() => {
    global.window = {};
    new Function(statsCode)();
  });

  it('deve calcular porcentagem com segurança contra divisão por zero', () => {
    expect(window.pct(10, 20)).toBe(50);
    expect(window.pct(0, 0)).toBe(0);
    expect(window.pct(1, 3)).toBe(33);
  });

  it('deve calcular média numérica de um array', () => {
    expect(window.avg([10, 20, 30])).toBe('20.0');
    expect(window.avg([])).toBe(0);
  });

  it('deve formatar o nome do deck e subtipo corretamente', () => {
    expect(window.getMatchDeck({ Arquetipo: 'Charizard ex', Subtipo: 'Pidgeot' })).toBe('Charizard ex (Pidgeot)');
    expect(window.getMatchDeck({ Arquetipo: 'Miraidon ex' })).toBe('Miraidon ex');
    expect(window.getMatchDeck({ Deck: 'Lugia VSTAR' })).toBe('Lugia VSTAR');
    expect(window.getMatchDeck(null)).toBe('Desconhecido');
  });

  it('deve detectar condição de brick em partidas simples e MD3', () => {
    expect(window.isBricked({ Brick: 'Sim' })).toBe(true);
    expect(window.isBricked({ Brick: 'Não' })).toBe(false);
    expect(window.isBricked({ GamesDetail: [{ game: 1, brick: 'Não' }, { game: 2, brick: 'Sim' }] })).toBe(true);
    expect(window.isBricked({ GamesDetail: [{ game: 1, brick: 'Não' }, { game: 2, brick: 'Não' }] })).toBe(false);
  });

  it('deve calcular estatísticas agregadas (Winrate, Bricks, Totais)', () => {
    const matches = [
      { Resultado: 'Vitória', Brick: 'Não' },
      { Resultado: 'Vitória', Brick: 'Sim' },
      { Resultado: 'Derrota', Brick: 'Sim' },
      { Resultado: 'Empate', Brick: 'Não' }
    ];
    const stats = window.calculateStats(matches);
    expect(stats.total).toBe(4);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
    expect(stats.draws).toBe(1);
    expect(stats.wr).toBe(50);
    expect(stats.totalBricks).toBe(2);
    expect(stats.brickWins).toBe(1);
  });
});
