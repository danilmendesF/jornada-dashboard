import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mirrorCode = fs.readFileSync(path.resolve(__dirname, '../js/mirror.js'), 'utf-8');

describe('Domain Logic - mirror.js', () => {
  beforeEach(() => {
    global.window = {
      players: ['Danilo', 'GuiVaz', 'Victor', 'Matheus']
    };
    new Function(mirrorCode)();
  });

  it('deve inverter o placar corretamente', () => {
    expect(window.invertPlacar('2-0')).toBe('0-2');
    expect(window.invertPlacar('2-1')).toBe('1-2');
    expect(window.invertPlacar('1-1')).toBe('1-1');
    expect(window.invertPlacar('invalid')).toBe('invalid');
  });

  it('deve construir a partida espelho correta quando adversário é membro do time', () => {
    const primary = {
      id: '1786249392140',
      Data: '2026-08-10',
      Player: 'Danilo',
      Adversario: 'GuiVaz',
      Deck: 'Charizard ex',
      DeckAdv: 'Praça de Festa',
      Resultado: 'Vitória',
      Placar: '2-1',
      Start: '1º',
      Brick: 'Não',
      BrickOp: 'Sim'
    };

    const mirror = window.buildMirrorMatch(primary);
    expect(mirror).not.toBeNull();
    expect(mirror.Player).toBe('GuiVaz');
    expect(mirror.Adversario).toBe('Danilo');
    expect(mirror.Deck).toBe('Praça de Festa');
    expect(mirror.DeckAdv).toBe('Charizard ex');
    expect(mirror.Resultado).toBe('Derrota');
    expect(mirror.Pontos).toBe(0);
    expect(mirror.Placar).toBe('1-2');
    expect(mirror.Start).toBe('2º');
    expect(mirror.Brick).toBe('Sim');
    expect(mirror.BrickOp).toBe('Não');
  });

  it('não deve gerar espelho se o adversário não for do time ou for o próprio jogador', () => {
    const external = {
      id: '100',
      Player: 'Danilo',
      Adversario: 'OponenteAleatorio'
    };
    expect(window.buildMirrorMatch(external)).toBeNull();

    const selfMatch = {
      id: '101',
      Player: 'Danilo',
      Adversario: 'Danilo'
    };
    expect(window.buildMirrorMatch(selfMatch)).toBeNull();
  });
});
