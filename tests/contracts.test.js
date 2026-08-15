import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const matchSchema = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../docs/contracts/match.schema.json'), 'utf-8'));
const syncSchema = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../docs/contracts/sync-payload.schema.json'), 'utf-8'));
const jwtSchema = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../docs/contracts/jwt-claims.schema.json'), 'utf-8'));

function validateBasicSchema(schema, data) {
  if (schema.type === 'object') {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return false;
    if (Array.isArray(schema.required)) {
      for (const reqField of schema.required) {
        if (data[reqField] === undefined || data[reqField] === null) return false;
      }
    }
  }
  return true;
}

describe('Data Contracts & Schema Validation (GAP-SDD-003)', () => {
  it('deve validar fixture de partida valida contra match.schema.json', () => {
    const validMatch = {
      id: 'm_178600000',
      Data: '2026-08-15',
      Player: 'Danilo',
      Adversario: 'GuiVaz',
      Deck: 'Charizard ex',
      DeckAdv: 'Praca de Festa',
      Placar: '2x0',
      Formato: 'MD3',
      Resultado: 'Vitoria',
      seqID: 1
    };

    expect(validateBasicSchema(matchSchema, validMatch)).toBe(true);
  });

  it('deve rejeitar partida sem campos obrigatorios', () => {
    const invalidMatch = {
      id: 'm_178600000',
      Player: 'Danilo'
      // Faltam Data, Adversario, Deck, DeckAdv, Placar, Formato
    };

    expect(validateBasicSchema(matchSchema, invalidMatch)).toBe(false);
  });

  it('deve validar payload de sincronizacao contra sync-payload.schema.json', () => {
    const validPayload = {
      manualMatches: [
        {
          id: 'm_1',
          Data: '2026-08-15',
          Player: 'Danilo',
          Adversario: 'Victor',
          Deck: 'Charizard ex',
          DeckAdv: 'Miraidon ex',
          Placar: '2x1',
          Formato: 'MD3'
        }
      ],
      decks: [],
      players: []
    };

    expect(validateBasicSchema(syncSchema, validPayload)).toBe(true);
  });

  it('deve validar claims de JWT contra jwt-claims.schema.json', () => {
    const validClaims = {
      id: 'usr_123',
      email: 'danilo@jornada.com',
      name: 'Danilo',
      teamId: 'team_default_sync',
      role: 'admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 2592000
    };

    expect(validateBasicSchema(jwtSchema, validClaims)).toBe(true);
  });
});
