import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const utilCode = fs.readFileSync(path.resolve(__dirname, '../js/util.js'), 'utf-8');
const tableCode = fs.readFileSync(path.resolve(__dirname, '../js/table.js'), 'utf-8');

describe('Frontend XSS Sanitization & DOM Security (SEC-005 / SPEC-007)', () => {
  beforeEach(() => {
    const dom = new JSDOM('<!doctype html><html><body><table><tbody id="tableBody"></tbody></table><div id="paginationInfo"></div></body></html>', { url: 'http://localhost' });
    global.window = dom.window;
    global.document = dom.window.document;

    new Function(utilCode)();
    new Function(tableCode)();
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
});
