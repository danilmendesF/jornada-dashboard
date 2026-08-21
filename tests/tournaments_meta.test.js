import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getPreviousDaySp,
  parseCompletedTournaments,
  parseStandingsWinner,
  parseStandingsTop3,
  parseTournamentMetagame,
  parseTournamentMatchups,
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

describe('Tournaments Meta Intelligence (SPEC-009 / CHG-007)', () => {

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

  describe('2. Filtros de Elegibilidade (>100 jogadores & Standard)', () => {
    const sampleHtml = `
      <table>
        <tr data-date="2026-08-17T22:05:00.000Z" data-name="Tour A" data-organizer="Org A" data-format="4" data-players="209" data-winner="P1">
          <td><a href="/tournament/tour_a/standings">Link</a></td>
        </tr>
        <tr data-date="2026-08-17T18:00:00.000Z" data-name="Tour B" data-organizer="Org B" data-format="4" data-players="100" data-winner="P2">
          <td><a href="/tournament/tour_b/standings">Link</a></td>
        </tr>
        <tr data-date="2026-08-17T15:00:00.000Z" data-name="Tour C" data-organizer="Org C" data-format="4" data-players="101" data-winner="P3">
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

    it('deve incluir apenas torneios com players > 100 (100 descartado, 101 incluido)', () => {
      const eligible = parseCompletedTournaments(sampleHtml, '2026-08-17');
      const names = eligible.map(t => t.name);

      expect(names).toContain('Tour A'); // 209 players
      expect(names).toContain('Tour C'); // 101 players
      expect(names).not.toContain('Tour B'); // 100 players (DESCARTADO)
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

  describe('3. Parser de Standings e Top 3 Pódio', () => {
    const standingsHtml = `
      <table>
        <tr data-placing="1" data-name="Guithemegames" data-country="BR">
          <td>1</td>
          <td><a href="/player/guithemegames">Guithemegames</a></td>
          <td><a href="/metagame/cynthia-garchomp"><span data-tooltip="Cynthia's Garchomp"><img src="https://r2.limitlesstcg.net/pokemon/gen9/garchomp.png"/></span></a></td>
          <td><a href="/tournament/t1/player/guithemegames/decklist">List</a></td>
        </tr>
        <tr data-placing="2" data-name="Danilo" data-country="BR">
          <td>2</td>
          <td><a href="/player/danilo">Danilo</a></td>
          <td><a href="/metagame/dragapult"><span data-tooltip="Dragapult ex"><img src="https://r2.limitlesstcg.net/pokemon/gen9/dragapult.png"/></span></a></td>
          <td><a href="/tournament/t1/player/danilo/decklist">List</a></td>
        </tr>
        <tr data-placing="3" data-name="Mago" data-country="BR">
          <td>3</td>
          <td><a href="/player/mago">Mago</a></td>
          <td><a href="/metagame/gardevoir"><span data-tooltip="Gardevoir ex"><img src="https://r2.limitlesstcg.net/pokemon/gen9/gardevoir.png"/></span></a></td>
          <td><a href="/tournament/t1/player/mago/decklist">List</a></td>
        </tr>
        <tr data-placing="4" data-name="Vini" data-country="BR">
          <td>4</td>
          <td><a href="/player/vini">Vini</a></td>
          <td><a href="/metagame/charizard"><span data-tooltip="Charizard ex"><img src="https://r2.limitlesstcg.net/pokemon/gen9/charizard.png"/></span></a></td>
          <td><a href="/tournament/t1/player/vini/decklist">List</a></td>
        </tr>
      </table>
    `;

    it('deve extrair corretamente os dados do campeao (1º Lugar)', () => {
      const tourInfo = { id: 't1', name: 'Sunny Weekly', players: 209, url: 'https://play.limitlesstcg.com/tournament/t1/standings' };
      const champ = parseStandingsWinner(standingsHtml, tourInfo);

      expect(champ.player).toBe('Guithemegames');
      expect(champ.deck).toBe("Cynthia's Garchomp");
      expect(champ.icons).toContain('https://r2.limitlesstcg.net/pokemon/gen9/garchomp.png');
      expect(champ.decklistUrl).toBe('https://play.limitlesstcg.com/tournament/t1/player/guithemegames/decklist');
      expect(champ.players).toBe(209);
    });

    it('deve extrair o Top 3 completo para exibicao do podio', () => {
      const tourInfo = { id: 't1', name: 'Sunny Weekly', players: 209, url: 'https://play.limitlesstcg.com/tournament/t1/standings' };
      const top3 = parseStandingsTop3(standingsHtml, tourInfo);

      expect(top3.length).toBe(3);
      expect(top3[0].placing).toBe(1);
      expect(top3[0].player).toBe('Guithemegames');
      expect(top3[1].placing).toBe(2);
      expect(top3[1].player).toBe('Danilo');
      expect(top3[1].deck).toBe('Dragapult ex');
      expect(top3[2].placing).toBe(3);
      expect(top3[2].player).toBe('Mago');
      expect(top3[2].deck).toBe('Gardevoir ex');
    });
  });

  describe('4. Parser de Metagame & Win Rates', () => {
    const metaHtml = `
      <table>
        <tr data-share="0.25">
          <td><img src="https://r2.limitlesstcg.net/pokemon/gen9/dragapult.png"/></td>
          <td>50</td>
          <td><a href="/metagame/dragapult">Dragapult</a></td>
          <td>25.0%</td>
          <td>120-80-10</td>
          <td>57.1%</td>
        </tr>
        <tr data-share="0.15">
          <td><img src="https://r2.limitlesstcg.net/pokemon/gen9/slowking.png"/></td>
          <td>30</td>
          <td><a href="/metagame/slowking">Slowking</a></td>
          <td>15.0%</td>
          <td>70-60-5</td>
          <td>51.9%</td>
        </tr>
      </table>
    `;

    it('deve parsear arquétipos, contagem, registros de partidas e Win Rates', () => {
      const decks = parseTournamentMetagame(metaHtml);
      expect(decks.length).toBe(2);
      expect(decks[0].name).toBe('Dragapult');
      expect(decks[0].players).toBe(50);
      expect(decks[0].matchWins).toBe(120);
      expect(decks[0].matchLosses).toBe(80);
      expect(decks[0].matchTies).toBe(10);
      expect(decks[0].winRate).toBe(57.1);

      expect(decks[1].name).toBe('Slowking');
      expect(decks[1].players).toBe(30);
      expect(decks[1].winRate).toBe(51.9);
    });
  });

  describe('5. Parser de Matriz de Matchups', () => {
    const matchupsHtml = `
      <table>
        <thead>
          <tr>
            <th>Deck</th>
            <th>Dragapult</th>
            <th>Charizard</th>
          </tr>
        </thead>
        <tbody>
          <tr data-deck="Dragapult">
            <td>Dragapult</td>
            <td data-score="10-10-2">10-10 (50.0%)</td>
            <td data-score="18-12-0">18-12 (60.0%)</td>
          </tr>
          <tr data-deck="Charizard">
            <td>Charizard</td>
            <td data-score="12-18-0">12-18 (40.0%)</td>
            <td data-score="15-15-1">15-15 (50.0%)</td>
          </tr>
        </tbody>
      </table>
    `;

    it('deve parsear confrontos diretos na matriz', () => {
      const matrix = parseTournamentMatchups(matchupsHtml);
      expect(matrix['Dragapult']['Charizard'].wins).toBe(18);
      expect(matrix['Dragapult']['Charizard'].losses).toBe(12);
      expect(matrix['Dragapult']['Charizard'].winRate).toBe(60.0);

      expect(matrix['Charizard']['Dragapult'].wins).toBe(12);
      expect(matrix['Charizard']['Dragapult'].losses).toBe(18);
      expect(matrix['Charizard']['Dragapult'].winRate).toBe(40.0);
    });
  });

  describe('6. Agregacao Ponderada, Top 15 e Matchups', () => {
    const tournaments = [
      { id: 't1', name: 'T1', players: 200 },
      { id: 't2', name: 'T2', players: 100 }
    ];

    const champions = [
      { tournament: 'T1', player: 'P1', deck: 'Deck 1' },
      { tournament: 'T2', player: 'P2', deck: 'Deck 1' }
    ];

    // Create 18 decks to test Top 15 + Other slicing
    const tour1Decks = [];
    const tour2Decks = [];
    for (let i = 1; i <= 18; i++) {
      tour1Decks.push({ name: `Deck ${i}`, players: 20 - i, icons: [`icon_${i}`], matchWins: 10, matchLosses: 5, matchTies: 1 });
      tour2Decks.push({ name: `Deck ${i}`, players: 10, icons: [`icon_${i}`], matchWins: 5, matchLosses: 5, matchTies: 0 });
    }

    const metaListByTour = [tour1Decks, tour2Decks];

    it('deve calcular Top 15 Decks no Meta Share e agrupar o restante em Outros', () => {
      const summary = aggregateTournamentData(tournaments, champions, metaListByTour, '2026-08-17');

      expect(summary.totalTournaments).toBe(2);
      expect(summary.minPlayersFilter).toBe(100);
      expect(summary.topDecks.length).toBe(15); // Top 15!
      expect(summary.topDecks[0].name).toBe('Deck 1');
      expect(summary.topDecks[0].wins).toBe(2);
      expect(summary.topDecks[0].winRate).toBeGreaterThan(0);

      // Remaining 3 decks (16, 17, 18) must be in other
      expect(summary.other.players).toBeGreaterThan(0);
      expect(summary.other.metaShare).toBeGreaterThan(0);
    });

    it('deve validar payload agregado contra schema JSON de contrato', () => {
      const summary = aggregateTournamentData(tournaments, champions, metaListByTour, '2026-08-17');
      expect(validateContractSchema(schema, summary)).toBe(true);
    });
  });

});
