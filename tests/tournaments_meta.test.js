import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getPreviousDaySp,
  parseCompletedTournaments,
  parseStandingsWinner,
  parseTournamentMetagame,
  aggregateTournamentData
} from '../api/tournaments_meta.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schema = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../docs/contracts/tournament-meta.schema.json'), 'utf-8'));

function validateContractSchema(schema, data) {
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

describe('Tournaments Meta Intelligence (SPEC-009 / CHG-004)', () => {

  describe('1. Timezone & Data do Dia Anterior (America/Sao_Paulo)', () => {
    it('deve calcular corretamente o dia anterior em America/Sao_Paulo', () => {
      const refDate = new Date('2026-08-18T01:00:00.000Z'); // 22:00 do dia 17 em SP
      const prev = getPreviousDaySp(refDate);
      expect(prev).toBe('2026-08-16');
    });

    it('deve virar o mes corretamente no calculo do dia anterior', () => {
      const refDate = new Date('2026-09-01T15:00:00.000Z');
      const prev = getPreviousDaySp(refDate);
      expect(prev).toBe('2026-08-31');
    });
  });

  describe('2. Filtros de Elegibilidade (>150 jogadores & Standard)', () => {
    const sampleHtml = `
      <table>
        <tr data-date="2026-08-17T22:05:00.000Z" data-name="Tour A" data-organizer="Org A" data-format="4" data-players="209" data-winner="P1">
          <td><a href="/tournament/tour_a/standings">Link</a></td>
        </tr>
        <tr data-date="2026-08-17T18:00:00.000Z" data-name="Tour B" data-organizer="Org B" data-format="4" data-players="150" data-winner="P2">
          <td><a href="/tournament/tour_b/standings">Link</a></td>
        </tr>
        <tr data-date="2026-08-17T15:00:00.000Z" data-name="Tour C" data-organizer="Org C" data-format="4" data-players="151" data-winner="P3">
          <td><a href="/tournament/tour_c/standings">Link</a></td>
        </tr>
        <tr data-date="2026-08-17T12:00:00.000Z" data-name="Tour D" data-organizer="Org D" data-format="0" data-players="300" data-winner="P4">
          <td><a href="/tournament/tour_d/standings">Link</a></td>
        </tr>
        <tr data-date="2026-08-16T12:00:00.000Z" data-name="Tour E" data-organizer="Org E" data-format="4" data-players="400" data-winner="P5">
          <td><a href="/tournament/tour_e/standings">Link</a></td>
        </tr>
      </table>
    `;

    it('deve incluir apenas torneios com players > 150 (150 descartado, 151 incluido)', () => {
      const eligible = parseCompletedTournaments(sampleHtml, '2026-08-17');
      const names = eligible.map(t => t.name);

      expect(names).toContain('Tour A'); // 209 players
      expect(names).toContain('Tour C'); // 151 players
      expect(names).not.toContain('Tour B'); // 150 players (DEVE SER DESCARTADO)
    });

    it('deve descartar torneios com formato diferente de Standard (data-format != 4)', () => {
      const eligible = parseCompletedTournaments(sampleHtml, '2026-08-17');
      const names = eligible.map(t => t.name);
      expect(names).not.toContain('Tour D'); // format 0
    });

    it('deve descartar torneios de outras datas', () => {
      const eligible = parseCompletedTournaments(sampleHtml, '2026-08-17');
      const names = eligible.map(t => t.name);
      expect(names).not.toContain('Tour E'); // data 16/08
    });
  });

  describe('3. Parser de Standings e Campeoes', () => {
    const standingsHtml = `
      <table>
        <tr data-placing="1" data-name="Guithemegames" data-country="BR">
          <td>1</td>
          <td><a href="/player/guithemegames">Guithemegames</a></td>
          <td><img class="flag" src="https://r2.limitlesstcg.net/flags/BR.png" data-tooltip="Brazil"/></td>
          <td><a href="/metagame/cynthia-garchomp"><span data-tooltip="Cynthia's Garchomp"><img src="https://r2.limitlesstcg.net/pokemon/gen9/garchomp.png"/></span></a></td>
          <td><a href="/tournament/t1/player/guithemegames/decklist">List</a></td>
        </tr>
      </table>
    `;

    it('deve extrair corretamente os dados do campeao', () => {
      const tourInfo = { id: 't1', name: 'Sunny Weekly', players: 209, url: 'https://play.limitlesstcg.com/tournament/t1/standings' };
      const champ = parseStandingsWinner(standingsHtml, tourInfo);

      expect(champ.player).toBe('Guithemegames');
      expect(champ.deck).toBe("Cynthia's Garchomp");
      expect(champ.icons).toContain('https://r2.limitlesstcg.net/pokemon/gen9/garchomp.png');
      expect(champ.decklistUrl).toBe('https://play.limitlesstcg.com/tournament/t1/player/guithemegames/decklist');
      expect(champ.players).toBe(209);
    });

    it('deve lidar graciosamente com campeao sem deck identificado', () => {
      const emptyStandings = '<table><tr data-placing="1" data-name="Anon"><td>1</td></tr></table>';
      const champ = parseStandingsWinner(emptyStandings, { id: 't2', name: 'Tour Anon', players: 180, url: 'url' });
      expect(champ.player).toBe('Anon');
      expect(champ.deck).toBe('Deck não identificado');
      expect(champ.decklistUrl).toBeNull();
    });
  });

  describe('4. Parser de Metagame & Contagem de Jogadores', () => {
    const metaHtml = `
      <table>
        <tr data-share="0.25">
          <td><img src="https://r2.limitlesstcg.net/pokemon/gen9/dragapult.png"/></td>
          <td>50</td>
          <td><a href="/metagame/dragapult">Dragapult</a></td>
          <td>25.0%</td>
        </tr>
        <tr data-share="0.15">
          <td><img src="https://r2.limitlesstcg.net/pokemon/gen9/slowking.png"/></td>
          <td>30</td>
          <td><a href="/metagame/slowking">Slowking</a></td>
          <td>15.0%</td>
        </tr>
      </table>
    `;

    it('deve parsear a lista de arquetipos e contagem de jogadores', () => {
      const decks = parseTournamentMetagame(metaHtml);
      expect(decks.length).toBe(2);
      expect(decks[0]).toEqual({
        name: 'Dragapult',
        players: 50,
        icons: ['https://r2.limitlesstcg.net/pokemon/gen9/dragapult.png']
      });
      expect(decks[1].name).toBe('Slowking');
      expect(decks[1].players).toBe(30);
    });
  });

  describe('5. Agregacao Ponderada, Top 6 e Other Decks', () => {
    const tournaments = [
      { id: 't1', name: 'T1', players: 200 },
      { id: 't2', name: 'T2', players: 100 }
    ];

    const champions = [
      { tournament: 'T1', player: 'P1', deck: 'Deck A' },
      { tournament: 'T2', player: 'P2', deck: 'Deck A' }
    ];

    const metaListByTour = [
      [
        { name: 'Deck A', players: 60, icons: ['iconA'] },
        { name: 'Deck B', players: 40, icons: ['iconB'] },
        { name: 'Deck C', players: 30, icons: ['iconC'] },
        { name: 'Deck D', players: 25, icons: ['iconD'] },
        { name: 'Deck E', players: 20, icons: ['iconE'] },
        { name: 'Deck F', players: 15, icons: ['iconF'] },
        { name: 'Deck G', players: 10, icons: ['iconG'] }
      ],
      [
        { name: 'Deck A', players: 30, icons: ['iconA'] },
        { name: 'Deck B', players: 20, icons: ['iconB'] },
        { name: 'Deck C', players: 15, icons: ['iconC'] },
        { name: 'Deck D', players: 10, icons: ['iconD'] },
        { name: 'Deck E', players: 10, icons: ['iconE'] },
        { name: 'Deck F', players: 5, icons: ['iconF'] },
        { name: 'Deck G', players: 10, icons: ['iconG'] }
      ]
    ];

    it('deve calcular Meta Share ponderado por jogadores absolutos', () => {
      const summary = aggregateTournamentData(tournaments, champions, metaListByTour, '2026-08-17');

      expect(summary.totalPlayers).toBe(300);
      expect(summary.totalTournaments).toBe(2);
      expect(summary.topDecks.length).toBe(6);

      // Deck A: 60 + 30 = 90 jogadores -> 90 / 300 = 30.0%
      expect(summary.topDecks[0].name).toBe('Deck A');
      expect(summary.topDecks[0].players).toBe(90);
      expect(summary.topDecks[0].metaShare).toBe(30);
      expect(summary.topDecks[0].wins).toBe(2); // 2 campeões com Deck A

      // Other Decks: Deck G = 10 + 10 = 20 jogadores -> 20 / 300 = 6.7%
      expect(summary.other.players).toBe(20);
      expect(summary.other.metaShare).toBe(6.7);
    });

    it('deve validar payload agregado contra schema JSON de contrato', () => {
      const summary = aggregateTournamentData(tournaments, champions, metaListByTour, '2026-08-17');
      expect(validateContractSchema(schema, summary)).toBe(true);
    });
  });

});
