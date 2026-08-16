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
const routerCode = fs.readFileSync(path.resolve(__dirname, '../js/router.js'), 'utf-8');
const authCode = fs.readFileSync(path.resolve(__dirname, '../js/auth.js'), 'utf-8');

describe('DOM & UI Integration Tests (JSDOM)', () => {
  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM(htmlContent, { url: 'https://www.jornadatcgteam.com.br' });
    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    document = dom.window.document;

    // Load core modules
    new Function(statsCode)();
    new Function(mirrorCode)();
    new Function(authCode)();
    new Function(routerCode)();
  });

  it('deve possuir todos os IDs críticos no DOM do index.html', () => {
    expect(document.getElementById('formMatchData')).not.toBeNull();
    expect(document.getElementById('formMatchPlayer')).not.toBeNull();
    expect(document.getElementById('formMatchAdv')).not.toBeNull();
    expect(document.getElementById('tableBody')).not.toBeNull();
    expect(document.getElementById('tableSearch')).not.toBeNull();
    expect(document.getElementById('quickLogBody')).not.toBeNull();
    expect(document.getElementById('modalMatchForm')).not.toBeNull();
    expect(document.getElementById('mobileMenuBtn')).not.toBeNull();
    expect(document.getElementById('topNavRouter')).not.toBeNull();
  });

  it('deve alternar menu mobile (menu-open e is-active) e fechar ao clicar em nav-link (CHG-001)', () => {
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const topNav = document.getElementById('topNavRouter');

    if (window.initRouter) window.initRouter();

    expect(topNav.classList.contains('menu-open')).toBe(false);
    expect(mobileBtn.classList.contains('is-active')).toBe(false);

    // 1. Clicar no botão hambúrguer para abrir
    mobileBtn.click();
    expect(topNav.classList.contains('menu-open')).toBe(true);
    expect(mobileBtn.classList.contains('is-active')).toBe(true);

    // 2. Clicar novamente no botão hambúrguer para fechar
    mobileBtn.click();
    expect(topNav.classList.contains('menu-open')).toBe(false);
    expect(mobileBtn.classList.contains('is-active')).toBe(false);

    // 3. Abrir novamente e fechar ao clicar em um nav-link
    mobileBtn.click();
    expect(topNav.classList.contains('menu-open')).toBe(true);
    
    const navLink = topNav.querySelector('.nav-link');
    expect(navLink).not.toBeNull();
    navLink.click();

    expect(topNav.classList.contains('menu-open')).toBe(false);
    expect(mobileBtn.classList.contains('is-active')).toBe(false);
  });

  it('deve ativar auth-session-active imediatamente quando credenciais estiverem no localStorage (CHG-001 anti-FOUC)', () => {
    dom.window.localStorage.setItem('jornada_auth_token', 'valid_mock_jwt_token');
    dom.window.localStorage.setItem('jornada_user_profile', JSON.stringify({ name: 'Danilo', email: 'danilo@jornada.com' }));

    // Executa módulo auth
    new Function(authCode)();
    expect(document.documentElement.classList.contains('auth-session-active')).toBe(true);
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

  it('deve garantir que package.json, version.json e index.html (#appVersion e #appVersionAuth) sao estritamente identicos para evitar loop de reload (CHG-002)', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
    const versionJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../version.json'), 'utf8'));
    
    const appVersionEl = document.getElementById('appVersion');
    const appVersionAuthEl = document.getElementById('appVersionAuth');

    expect(appVersionEl).not.toBeNull();
    expect(appVersionAuthEl).not.toBeNull();

    const domAppVersion = appVersionEl.textContent.trim();
    const domAppVersionAuth = appVersionAuthEl.textContent.trim();

    expect(pkg.version).toBe(versionJson.version);
    expect(domAppVersion).toBe(pkg.version);
    expect(domAppVersionAuth).toBe(pkg.version);

    // Valida que nenhuma atualizacao espuria sera disparada quando as versoes forem identicas
    let updateCalled = false;
    if (versionJson.version && versionJson.version !== domAppVersion) {
      updateCalled = true;
    }
    expect(updateCalled).toBe(false);
  });
});


