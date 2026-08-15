import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const md3Code = fs.readFileSync(path.resolve(__dirname, '../js/md3.js'), 'utf-8');

describe('Domain Logic - md3.js', () => {
  beforeEach(() => {
    global.window = {};
    new Function(md3Code)();
  });

  it('deve determinar a quantidade de games com base no formato e placar', () => {
    expect(window.getGameCountFromPlacar('MD1', '1-0')).toBe(1);
    expect(window.getGameCountFromPlacar('MD3', '2-0')).toBe(2);
    expect(window.getGameCountFromPlacar('MD3', '0-2')).toBe(2);
    expect(window.getGameCountFromPlacar('MD3', '2-1')).toBe(3);
    expect(window.getGameCountFromPlacar('MD3', '1-2')).toBe(3);
    expect(window.getGameCountFromPlacar('MD3', '1-1')).toBe(2);
  });

  it('deve respeitar override manual do usuário para placares como 1-0 ou 1-1', () => {
    expect(window.getGameCountFromPlacar('MD3', '1-0', 2)).toBe(2);
    expect(window.getGameCountFromPlacar('MD3', '1-1', 3)).toBe(3);
  });
});
