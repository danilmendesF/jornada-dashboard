import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const utilCode = fs.readFileSync(path.resolve(__dirname, '../js/util.js'), 'utf-8');
const tableCode = fs.readFileSync(path.resolve(__dirname, '../js/table.js'), 'utf-8');
const matchupCode = fs.readFileSync(path.resolve(__dirname, '../js/matchup.js'), 'utf-8');
const md3Code = fs.readFileSync(path.resolve(__dirname, '../js/md3.js'), 'utf-8');

describe('Universal Frontend XSS Sanitization (SEC-005 / SEC-NEW-001 / SPEC-007)', () => {
  beforeEach(() => {
    const dom = new JSDOM('<!doctype html><html><body><table><tbody id="tableBody"></tbody></table><div id="paginationInfo"></div><div id="matchupDetail"></div><div id="md3Grid"></div><div id="md3Toggle"></div></body></html>', { url: 'http://localhost' });
    global.window = dom.window;
    global.document = dom.window.document;

    new Function(utilCode)();
    new Function(tableCode)();
    new Function(matchupCode)();
    new Function(md3Code)();
  });

  it('deve escapar caracteres perigosos via escapeHtml', () => {
    const payload = '<script>alert("XSS")</script>';
    const escaped = window.escapeHtml(payload);
    expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    expect(escaped).not.toContain('<script>');
  });

  it('deve renderizar partidas com payloads maliciosos no tableBody de forma sanitizada', () => {
    const maliciousMatches = [
      {
        id: 'm_xss_1',
        Player: '<img src=x onerror=alert(1)>',
        Deck: '"><script>alert(2)</script>',
        DeckAdv: 'Charizard ex',
        Adversario: 'Victor',
        Placar: '2x0',
        Resultado: 'Vitória',
        Data: '2026-08-15',
        Formato: 'MD3',
        seqID: 1
      }
    ];

    window.renderTable(maliciousMatches);

    const tbody = document.getElementById('tableBody');
    expect(tbody.innerHTML).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(tbody.innerHTML).toContain('&lt;script&gt;alert(2)&lt;/script&gt;');
    expect(tbody.querySelectorAll('script').length).toBe(0);
    expect(tbody.querySelectorAll('img').length).toBe(0);
  });

  it('deve renderizar resumo de matchup de deck malicioso de forma sanitizada', () => {
    window.filtered = [
      {
        Deck: '<script>alert("deck_xss")</script>',
        DeckAdv: '<img src=x onerror=alert("opp_xss")>',
        Resultado: 'Vitória'
      }
    ];

    window.showDeckMatchupOverview('<script>alert("deck_xss")</script>');
    const detail = document.getElementById('matchupDetail');
    expect(detail.innerHTML).toContain('&lt;script&gt;alert("deck_xss")&lt;/script&gt;');
    expect(detail.querySelectorAll('script').length).toBe(0);
  });
});
