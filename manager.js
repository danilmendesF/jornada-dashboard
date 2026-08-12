/* ============================================================
   JORNADA DASHBOARD — manager.js
   CRUD: Decks (com lista PTCGL), Partidas manuais, Players
   ============================================================ */

'use strict';

// ── STORAGE KEYS ─────────────────────────────────────────────────────────────
const KEY_DECKS   = 'jornada_decks';
const KEY_MATCHES = 'jornada_manual_matches';
const KEY_PLAYERS = 'jornada_players';
const KEY_LOCAIS  = 'jornada_locais';
const KEY_COLECOES = 'jornada_colecoes';
const KEY_DELETED = 'jornada_deleted_ids';
const KEY_DELETED_DECKS   = 'jornada_deleted_decks';
const KEY_DELETED_PLAYERS = 'jornada_deleted_players';
const KEY_DELETED_LOCAIS  = 'jornada_deleted_locais';
const KEY_DELETED_COLECOES = 'jornada_deleted_colecoes';
const KEY_EDITS   = 'jornada_edited_matches';

// ── LOAD / SAVE ───────────────────────────────────────────────────────────────
function loadDecks()   { try { return JSON.parse(localStorage.getItem(KEY_DECKS))   || []; } catch { return []; } }
function loadManual()  { try { return JSON.parse(localStorage.getItem(KEY_MATCHES)) || []; } catch { return []; } }
function loadPlayers() { try { return JSON.parse(localStorage.getItem(KEY_PLAYERS)) || ['Danilo', 'GuiVaz', 'Victor', 'Lipe']; } catch { return ['Danilo', 'GuiVaz', 'Victor', 'Lipe']; } }
function loadLocais()  { try { return JSON.parse(localStorage.getItem(KEY_LOCAIS))  || ['Regional SP','Regional Curitiba','League Cup','Treino Interno','TCG Live Online']; } catch { return ['Regional SP','Regional Curitiba','League Cup','Treino Interno','TCG Live Online']; } }
function loadColecoes(){ try { return JSON.parse(localStorage.getItem(KEY_COLECOES))|| ['SV8 Surging Sparks','SV7 Stellar Crown','SV6 Twilight Masquerade','SV5 Temporal Forces','SV4 Paradox Rift']; } catch { return ['SV8 Surging Sparks','SV7 Stellar Crown','SV6 Twilight Masquerade','SV5 Temporal Forces','SV4 Paradox Rift']; } }

function safeSetItem(key, val) {
  try {
    localStorage.setItem(key, val);
    return true;
  } catch (err) {
    console.error(`❌ Erro ao salvar "${key}" no localStorage:`, err);
    if (typeof showToast === 'function') {
      showToast('⚠️ Erro ao salvar dados no navegador (armazenamento cheio)');
    }
    return false;
  }
}

function saveDecks(d)   { safeSetItem(KEY_DECKS,   JSON.stringify(d)); triggerSyncPush(); }
function saveManual(m)  { safeSetItem(KEY_MATCHES, JSON.stringify(m)); triggerSyncPush(); }
function savePlayers(p) { safeSetItem(KEY_PLAYERS, JSON.stringify(p)); triggerSyncPush(); }
function saveLocais(l)  { safeSetItem(KEY_LOCAIS,  JSON.stringify(l)); triggerSyncPush(); }
function saveColecoes(c){ safeSetItem(KEY_COLECOES,JSON.stringify(c)); triggerSyncPush(); }

function loadDeleted()         { try { return new Set(JSON.parse(localStorage.getItem(KEY_DELETED))          || []); } catch { return new Set(); } }
function loadDeletedDecks()    { try { return new Set(JSON.parse(localStorage.getItem(KEY_DELETED_DECKS))    || []); } catch { return new Set(); } }
function loadDeletedPlayers()  { try { return new Set(JSON.parse(localStorage.getItem(KEY_DELETED_PLAYERS))  || []); } catch { return new Set(); } }
function loadDeletedLocais()   { try { return new Set(JSON.parse(localStorage.getItem(KEY_DELETED_LOCAIS))   || []); } catch { return new Set(); } }
function loadDeletedColecoes() { try { return new Set(JSON.parse(localStorage.getItem(KEY_DELETED_COLECOES)) || []); } catch { return new Set(); } }

function loadEdits()           { try { return JSON.parse(localStorage.getItem(KEY_EDITS)) || {}; } catch { return {}; } }

function saveDeleted(s)         { safeSetItem(KEY_DELETED,          JSON.stringify([...s])); triggerSyncPush(); }
function saveDeletedDecks(s)    { safeSetItem(KEY_DELETED_DECKS,    JSON.stringify([...s])); triggerSyncPush(); }
function saveDeletedPlayers(s)  { safeSetItem(KEY_DELETED_PLAYERS,  JSON.stringify([...s])); triggerSyncPush(); }
function saveDeletedLocais(s)   { safeSetItem(KEY_DELETED_LOCAIS,   JSON.stringify([...s])); triggerSyncPush(); }
function saveDeletedColecoes(s) { safeSetItem(KEY_DELETED_COLECOES, JSON.stringify([...s])); triggerSyncPush(); }
function saveEdits(e)          { safeSetItem(KEY_EDITS,            JSON.stringify(e));      triggerSyncPush(); }
let decks    = loadDecks();
let players  = loadPlayers();
let locais   = loadLocais();
let colecoes = loadColecoes();

// ── PTCGL PARSER ─────────────────────────────────────────────────────────────
function parsePTCGL(raw) {
  const sections  = { 'Pokémon': [], 'Treinador': [], 'Energia': [] };
  let currentSec  = null;
  let total       = 0;
  const lines     = raw.split('\n');

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    const secMatch = line.match(/^(Pok[eé]mon|Treinador|Energia)\s*:/i);
    if (secMatch) {
      const key = secMatch[1].charAt(0).toUpperCase() + secMatch[1].slice(1).toLowerCase();
      currentSec = key === 'Pokémon' || key === 'Pokemon' ? 'Pokémon' :
                   key === 'Treinador' ? 'Treinador' : 'Energia';
      continue;
    }
    if (/total/i.test(line)) continue;
    const cardMatch = line.match(/^(\d+)\s+(.+)/);
    if (cardMatch && currentSec) {
      const qty  = parseInt(cardMatch[1], 10);
      const name = cardMatch[2].trim();
      sections[currentSec].push({ qty, name });
      total += qty;
    }
  }

  return { sections, total };
}

// ── DECK CARD COUNT ──────────────────────────────────────────────────────────
function countCards(raw) { return parsePTCGL(raw).total; }

function showModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const openModals = document.querySelectorAll('.modal-overlay.open');
  const baseZ = 400;
  el.style.zIndex = baseZ + (openModals.length + 1) * 100;
  el.classList.add('open');
}

function getMatchFormStateSnapshot() {
  const get = id => document.getElementById(id)?.value || '';
  return {
    Data:           get('formMatchData'),
    Player:         get('formMatchPlayer'),
    Deck:           get('formMatchDeck'),
    Subtipo:        get('formMatchSubtipo'),
    Adversario:     get('formMatchAdv'),
    DeckAdv:        get('formMatchDeckAdv'),
    SubtipoAdv:     get('formMatchSubtipoAdv'),
    Formato:        get('formMatchFormato'),
    Start:          get('formMatchStart'),
    Resultado:      get('formMatchResultado'),
    Placar:         get('formMatchPlacar'),
    Colecao:        get('formMatchColecao'),
    Local:          get('formMatchLocal'),
    LocalCustom:    get('formMatchLocalCustom'),
    Brick:          get('formMatchBrick'),
    BrickOp:        get('formMatchBrickOp'),
    Confiabilidade: get('formMatchConfiabilidade'),
    ListaMeuDeck:   get('formMatchDeckOwnList'),
    ListaDeckAdv:   get('formMatchDeckAdvList'),
    Comentarios:    get('formMatchComentarios')
  };
}

function isMatchFormDirty() {
  if (!window.initialMatchFormSnapshot) return false;
  const current = getMatchFormStateSnapshot();
  return JSON.stringify(current) !== JSON.stringify(window.initialMatchFormSnapshot);
}

function closeModal(id, force = false) {
  const el = document.getElementById(id);
  if (!el) return false;

  if (id === 'modalMatchForm' && !force && isMatchFormDirty()) {
    if (!confirm('⚠️ Você possui dados/alterações não salvas no registro da partida.\n\nDeseja realmente cancelar e fechar sem salvar?')) {
      return false;
    }
  }

  el.classList.remove('open');
  el.style.zIndex = '';
  if (id === 'modalMatchForm') {
    window.initialMatchFormSnapshot = null;
  }
  return true;
}

// ── POPULATE PLAYER SELECTS ──────────────────────────────────────────────────
function populatePlayerSelects() {
  const activeName = typeof getActivePlayerName === 'function' ? getActivePlayerName() : null;

  ['formMatchPlayer','formDeckPlayer','filterPlayer'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    const first = sel.options[0];
    sel.innerHTML = '';

    if (id === 'formMatchPlayer' && activeName) {
      const o = document.createElement('option');
      o.value = activeName;
      o.textContent = `👤 ${activeName}`;
      sel.appendChild(o);
      sel.value = activeName;
    } else {
      if (first) sel.appendChild(first);
      players.forEach(p => {
        const o = document.createElement('option');
        o.value = p; o.textContent = p;
        sel.appendChild(o);
      });
      sel.value = cur;
    }
    if (sel.syncSearchableSelect) sel.syncSearchableSelect();
  });

  if (typeof populateQuickLogDropdowns === 'function') populateQuickLogDropdowns();

  const dlAdv = document.getElementById('playerOptionsAdv');
  if (dlAdv) {
    dlAdv.innerHTML = '';
    players.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      dlAdv.appendChild(opt);
    });
  }

  if (typeof populateQuickLogDropdowns === 'function') populateQuickLogDropdowns();
}

// ── MIRROR MATCH AUTOMATION ───────────────────────────────────────────────────
window.invertPlacar = function(placar) {
  if (!placar || typeof placar !== 'string') return placar || '';
  const parts = placar.split(/[-:]/);
  if (parts.length === 2) {
    return `${parts[1].trim()}-${parts[0].trim()}`;
  }
  return placar;
};

window.buildMirrorMatch = function(primaryMatch) {
  if (!primaryMatch || !primaryMatch.Player || !primaryMatch.Adversario) return null;
  const teamPlayers = (typeof players !== 'undefined' && Array.isArray(players)) ? players : [];
  const advName = primaryMatch.Adversario.trim();
  const isTeamPlayer = teamPlayers.some(p => p.toLowerCase() === advName.toLowerCase());
  if (!isTeamPlayer || advName.toLowerCase() === primaryMatch.Player.trim().toLowerCase()) {
    return null; // Not an internal team duel
  }

  const teamPlayerName = teamPlayers.find(p => p.toLowerCase() === advName.toLowerCase()) || advName;
  const res = primaryMatch.Resultado;
  const mirrorRes = res === 'Vitória' ? 'Derrota' : res === 'Derrota' ? 'Vitória' : 'Empate';
  const mirrorPontos = mirrorRes === 'Vitória' ? 1 : mirrorRes === 'Empate' ? 0.5 : 0;
  const mirrorPlacar = invertPlacar(primaryMatch.Placar);
  let mirrorGamesDetail = null;
  let mirrorStart = primaryMatch.Start === '1º' ? '2º' : primaryMatch.Start === '2º' ? '1º' : primaryMatch.Start;
  let mirrorBrick = primaryMatch.BrickOp || 'Não';
  let mirrorBrickOp = primaryMatch.Brick || 'Não';

  if (primaryMatch.GamesDetail && Array.isArray(primaryMatch.GamesDetail) && primaryMatch.GamesDetail.length > 0) {
    mirrorGamesDetail = primaryMatch.GamesDetail.map(g => ({
      game: g.game,
      start: g.start === '1º' ? '2º' : '1º',
      brick: g.brickOp || 'Não',
      brickOp: g.brick || 'Não'
    }));
    mirrorStart = mirrorGamesDetail.map(g => g.start).join(', ');
    mirrorBrick = mirrorGamesDetail.some(g => g.brick === 'Sim') ? 'Sim' : 'Não';
    mirrorBrickOp = mirrorGamesDetail.some(g => g.brickOp === 'Sim') ? 'Sim' : 'Não';
  }

  let mirrorId = primaryMatch._mirrorId;
  if (!mirrorId) {
    const baseNum = Number(primaryMatch.id);
    mirrorId = (!isNaN(baseNum) && baseNum > 0) ? (baseNum + 1).toString() : (Date.now() + 1).toString();
  }

  return {
    id:               mirrorId,
    _mirroredFrom:    primaryMatch.id,
    Data:             primaryMatch.Data,
    Player:           teamPlayerName,
    Deck:             primaryMatch.DeckAdv,
    Arquetipo:        primaryMatch.DeckAdvArquetipo || primaryMatch.DeckAdv,
    Subtipo:          primaryMatch.SubtipoAdv || '',
    Adversario:       primaryMatch.Player,
    DeckAdv:          primaryMatch.Deck,
    DeckAdvArquetipo: primaryMatch.Arquetipo || primaryMatch.Deck,
    SubtipoAdv:       primaryMatch.Subtipo || '',
    Luck:             primaryMatch.Luck || 0,
    Formato:          primaryMatch.Formato || 'MD1',
    Start:            mirrorStart,
    Resultado:        mirrorRes,
    Pontos:           mirrorPontos,
    Placar:           mirrorPlacar,
    Local:            primaryMatch.Local || '—',
    Colecao:          primaryMatch.Colecao || '—',
    Brick:            mirrorBrick,
    BrickOp:          mirrorBrickOp,
    Confiabilidade:   primaryMatch.Confiabilidade || 'Alta',
    GamesDetail:      mirrorGamesDetail,
    ListaMeuDeck:     primaryMatch.ListaDeckAdv || '',
    ListaDeckAdv:     primaryMatch.ListaMeuDeck || '',
    Comentarios:      primaryMatch.Comentarios ? `[Espelho vs ${primaryMatch.Player}] ${primaryMatch.Comentarios}` : `Partida interna vs ${primaryMatch.Player}`,
    _manual:          true
  };
};

window.syncAllTeamMirrorMatches = function() {
  if (typeof players === 'undefined' || !Array.isArray(players) || players.length === 0) return;
  const manual = loadManual();
  let addedCount = 0;

  manual.forEach(m => {
    if (!m || !m.Player || !m.Adversario) return;
    const mirror = buildMirrorMatch(m);
    if (mirror) {
      const exists = manual.some(existing => 
        existing.id === mirror.id || 
        existing._mirroredFrom === m.id || 
        m._mirrorId === existing.id ||
        (existing.Player.toLowerCase() === mirror.Player.toLowerCase() &&
         existing.Adversario.toLowerCase() === mirror.Adversario.toLowerCase() &&
         existing.Data === mirror.Data &&
         existing.Deck === mirror.Deck)
      );

      if (!exists) {
        m._mirrorId = mirror.id;
        manual.push(mirror);
        addedCount++;
      }
    }
  });

  if (addedCount > 0) {
    saveManual(manual);
    console.log(`⚔️ Sync retroativo criou ${addedCount} partidas espelho para o time!`);
  }
};

// ── POPULATE DECK SELECTS ────────────────────────────────────────────────────
function populateDeckSelects() {
  const selects = [
    { id: 'formMatchDeck', placeholder: 'Sem deck cadastrado' },
    { id: 'formMatchDeckAdv', placeholder: 'Selecione…' },
    { id: 'quickLogDeck', placeholder: 'Selecione seu deck…' },
    { id: 'quickLogDeckAdv', placeholder: 'Selecione o deck oponente…' }
  ];

  selects.forEach(selInfo => {
    const sel = document.getElementById(selInfo.id);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = `<option value="">${selInfo.placeholder}</option>`;
    const dataset = (typeof allData !== 'undefined' && Array.isArray(allData)) ? allData : [];
    const registeredArchetypes = decks.map(d => d.arquetipo || d.name).filter(Boolean);
    const matchArchetypes = dataset.map(m => m.Arquetipo || m.Deck).filter(Boolean);
    const uniqueArchetypes = [...new Set([...registeredArchetypes, ...matchArchetypes])].sort((a, b) => a.localeCompare(b));

    uniqueArchetypes.forEach(arq => {
      const o = document.createElement('option');
      o.value = arq;
      o.textContent = arq;
      sel.appendChild(o);
    });
    if (cur && Array.from(sel.options).some(o => o.value === cur)) {
      sel.value = cur;
    } else if (cur) {
      const o = document.createElement('option');
      o.value = cur;
      o.textContent = cur;
      sel.appendChild(o);
      sel.value = cur;
    }
    if (sel.syncSearchableSelect) sel.syncSearchableSelect();
  });
}

// ── RENDER DECKS & ARCHETYPES LISTS ──────────────────────────────────────────
function renderArchetypesList() {
  const container = document.getElementById('archetypesList');
  if (!container) return;

  const dataset = (typeof allData !== 'undefined' && Array.isArray(allData)) ? allData : [];
  const registeredArchetypes = decks.map(d => d.arquetipo || d.name).filter(Boolean);
  const matchArchetypes = dataset.map(m => m.Arquetipo || m.Deck).filter(Boolean);
  const uniqueArchetypes = [...new Set([...registeredArchetypes, ...matchArchetypes])].sort((a, b) => a.localeCompare(b));

  if (uniqueArchetypes.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🃏</div><p>Nenhum arquétipo cadastrado ainda.</p></div>`;
    return;
  }

  container.innerHTML = uniqueArchetypes.map(arq => {
    const variantDecks = decks.filter(d => (d.arquetipo || d.name) === arq);
    const arqMatches   = dataset.filter(m => (m.Arquetipo || m.Deck) === arq);
    const wins         = arqMatches.filter(m => m.Resultado === 'Vitória').length;
    const wr           = arqMatches.length ? Math.round((wins / arqMatches.length) * 100) : 0;

    return `<div class="deck-card" style="border-left: 4px solid var(--accent2);">
      <div class="deck-card-header">
        <div class="deck-card-name">
          <span class="deck-dot" style="background:var(--accent2);"></span>
          <strong>${arq}</strong>
          <span class="deck-player-tag" style="background:rgba(0,200,248,0.12); color:var(--accent2); font-weight:700;">${variantDecks.length} variante(s) / lista(s)</span>
        </div>
        <div class="deck-card-actions">
          <button class="icon-btn" onclick="openUnifyArchetypesModal()" title="Unificar com outro arquétipo">🔗 Unificar</button>
        </div>
      </div>
      <div class="deck-card-stats">
        <span class="deck-stat">📊 ${arqMatches.length} partidas no total</span>
        ${arqMatches.length ? `<span class="deck-stat wr-stat">📈 ${wr}% WR (${wins}V)</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

function renderDecksList() {
  renderArchetypesList();

  const container = document.getElementById('decksList');
  if (!container) return;

  if (decks.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📜</div>
      <p>Nenhuma variante / lista cadastrada ainda.</p>
      <p class="empty-sub">Clique em "+ Nova Variante / Deck" para começar.</p>
    </div>`;
    return;
  }
  const matchesByDeck = new Map();
  const dataset = (typeof allData !== 'undefined' && Array.isArray(allData)) ? allData : [];
  dataset.forEach(m => {
    const dName = m.Arquetipo || m.Deck;
    if (!dName) return;
    let arr = matchesByDeck.get(dName);
    if (!arr) {
      arr = [];
      matchesByDeck.set(dName, arr);
    }
    arr.push(m);
    if (m.Deck && m.Deck !== dName) {
      let arr2 = matchesByDeck.get(m.Deck);
      if (!arr2) {
        arr2 = [];
        matchesByDeck.set(m.Deck, arr2);
      }
      arr2.push(m);
    }
  });

  container.innerHTML = decks.map(deck => {
    const parsed  = parsePTCGL(deck.list || '');
    const total   = parsed.total;
    const valid   = total === 60;
    const pokCount = parsed.sections['Pokémon'].reduce((s, c) => s + c.qty, 0);
    const trnCount = parsed.sections['Treinador'].reduce((s, c) => s + c.qty, 0);
    const engCount = parsed.sections['Energia'].reduce((s, c) => s + c.qty, 0);
    const deckMatches = matchesByDeck.get(deck.name) || [];
    const wins        = deckMatches.filter(m => m.Resultado === 'Vitória').length;
    const wr          = deckMatches.length ? Math.round((wins / deckMatches.length) * 100) : 0;
    const arqTag      = (deck.arquetipo && deck.arquetipo !== deck.name) ? ` [${deck.arquetipo}]` : '';

    return `<div class="deck-card" data-id="${deck.id}">
      <div class="deck-card-header">
        <div class="deck-card-name">
          <span class="deck-dot"></span>
          <strong>${deck.name}</strong>${arqTag ? `<span style="font-size:0.75rem; color:var(--accent2); margin-left:0.3rem;">${arqTag}</span>` : ''}
          <span class="deck-player-tag">${deck.player || ''}</span>
        </div>
        <div class="deck-card-actions">
          <button class="icon-btn" onclick="openDeckList('${deck.id}')" title="Ver lista">📋</button>
          <button class="icon-btn" onclick="openEditDeck('${deck.id}')" title="Editar">✏️</button>
          <button class="icon-btn danger" onclick="deleteDeck('${deck.id}')" title="Excluir">🗑️</button>
        </div>
      </div>
      <div class="deck-card-stats">
        <span class="deck-stat"><span class="stat-dot poke"></span>${pokCount} Pokémon</span>
        <span class="deck-stat"><span class="stat-dot train"></span>${trnCount} Treinador</span>
        <span class="deck-stat"><span class="stat-dot energy"></span>${engCount} Energia</span>
        <span class="deck-stat ${valid ? 'valid' : 'invalid'}">${valid ? '✅' : '⚠️'} ${total}/60 cartas</span>
        ${deckMatches.length ? `<span class="deck-stat wr-stat">📈 ${wr}% WR (${deckMatches.length}j)</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ── OPEN DECK LIST MODAL ─────────────────────────────────────────────────────
let currentViewingDeckId = null;
let currentViewingMatchDeck = null; // { matchId, type, list, name, player }

window.openMatchDeckList = function(matchId, type) {
  const match = (typeof allData !== 'undefined') ? allData.find(m => m.id === matchId) : null;
  if (!match) return;

  const isOwn = (type === 'own');
  const deckName = isOwn ? match.Deck : match.DeckAdv;
  const playerName = isOwn ? match.Player : match.Adversario;
  let listStr = isOwn ? match.ListaMeuDeck : match.ListaDeckAdv;
  if (!listStr && deckName) {
    const dObj = decks.find(d => d.name === deckName);
    listStr = dObj?.list || '';
  }

  currentViewingMatchDeck = {
    matchId,
    type,
    deckName,
    playerName,
    list: listStr || '',
    match
  };
  currentViewingDeckId = null;

  const parsed = parsePTCGL(listStr || '');
  const total = parsed.total;
  const valid = total === 60;

  document.getElementById('deckListTitle').textContent = deckName ? `${deckName} (Partida ${match.Data || ''})` : 'Lista da Partida';
  document.getElementById('deckListPlayer').textContent = playerName ? `👤 ${playerName}` : '';
  document.getElementById('deckListCount').textContent = `${total}/60 cartas`;
  document.getElementById('deckListCount').className = 'deck-list-count ' + (valid ? 'valid' : 'invalid');

  const body = document.getElementById('deckListBody');
  const secIcons = { 'Pokémon': '🐾', 'Treinador': '🎓', 'Energia': '⚡' };

  let html = '';
  for (const [secName, cards] of Object.entries(parsed.sections)) {
    if (cards.length === 0) continue;
    const secTotal = cards.reduce((s, c) => s + c.qty, 0);
    html += `<div class="list-section">
      <div class="list-section-header">${secIcons[secName]} ${secName} <span class="list-sec-count">${secTotal}</span></div>
      <div class="list-cards">
        ${cards.map(c => `<div class="list-card-row">
          <span class="list-qty">${c.qty}×</span>
          <span class="list-name">${c.name}</span>
        </div>`).join('')}
      </div>
    </div>`;
  }

  body.innerHTML = html || '<p style="color:var(--text2);padding:1rem;text-align:center;">Nenhuma carta cadastrada para esta partida. Clique em <strong>"✏️ Editar / Importar Lista"</strong> acima para adicionar as cartas.</p>';
  if (html) {
    body.title = "Clique para copiar a lista no formato Pokémon TCG Live";
    body.style.cursor = "pointer";
    body.onclick = function() {
      window.exportCurrentDeckToTCGLive();
    };
  } else {
    body.title = "";
    body.style.cursor = "default";
    body.onclick = null;
  }

  document.getElementById('deckListSearch').value = '';
  showModal('modalDeckList');
};

window.openDeckListByName = function(deckName, playerName) {
  if (!deckName) return;
  const deck = decks.find(d => d.name.toLowerCase() === deckName.toLowerCase());
  if (deck) {
    openDeckList(deck.id);
  } else {
    currentViewingDeckId = null;
    currentViewingMatchDeck = { matchId: null, type: 'transient', list: '', name: deckName, player: playerName || '' };

    document.getElementById('deckListTitle').textContent = deckName;
    document.getElementById('deckListPlayer').textContent = playerName ? `👤 ${playerName}` : '';
    document.getElementById('deckListCount').textContent = `0/60 cartas`;
    document.getElementById('deckListCount').className = 'deck-list-count invalid';

    const body = document.getElementById('deckListBody');
    body.innerHTML = `<p style="color:var(--text2);padding:1.5rem;text-align:center;">O deck <strong>"${deckName}"</strong> ainda não possui uma lista cadastrada no Gerenciador de Decks.</p>`;
    body.title = "";
    body.style.cursor = "default";
    body.onclick = null;

    document.getElementById('deckListSearch').value = '';
    showModal('modalDeckList');
  }
};

window.openDeckList = function(deckId) {
  currentViewingDeckId = deckId;
  currentViewingMatchDeck = null;
  const deck = decks.find(d => d.id === deckId);
  if (!deck) return;

  const parsed = parsePTCGL(deck.list || '');
  const total  = parsed.total;
  const valid  = total === 60;

  document.getElementById('deckListTitle').textContent = deck.name;
  document.getElementById('deckListPlayer').textContent = '';
  document.getElementById('deckListCount').textContent = `${total}/60 cartas`;
  document.getElementById('deckListCount').className   = 'deck-list-count ' + (valid ? 'valid' : 'invalid');

  const body = document.getElementById('deckListBody');
  const secIcons = { 'Pokémon': '🐾', 'Treinador': '🎓', 'Energia': '⚡' };

  let html = '';
  for (const [secName, cards] of Object.entries(parsed.sections)) {
    if (cards.length === 0) continue;
    const secTotal = cards.reduce((s, c) => s + c.qty, 0);
    html += `<div class="list-section">
      <div class="list-section-header">${secIcons[secName]} ${secName} <span class="list-sec-count">${secTotal}</span></div>
      <div class="list-cards">
        ${cards.map(c => `<div class="list-card-row">
          <span class="list-qty">${c.qty}×</span>
          <span class="list-name">${c.name}</span>
        </div>`).join('')}
      </div>
    </div>`;
  }

  body.innerHTML = html || '<p style="color:var(--text2);padding:1rem;text-align:center;">Lista vazia. Clique em <strong>"✏️ Editar / Importar Lista"</strong> acima para adicionar as cartas deste deck.</p>';
  if (html) {
    body.title = "Clique para copiar a lista no formato Pokémon TCG Live";
    body.style.cursor = "pointer";
    body.onclick = function() {
      window.exportCurrentDeckToTCGLive();
    };
  } else {
    body.title = "";
    body.style.cursor = "default";
    body.onclick = null;
  }
  document.getElementById('deckListSearch').value = '';
  showModal('modalDeckList');
};

window.viewMatchComment = function(matchId) {
  const match = (typeof allData !== 'undefined') ? allData.find(m => m.id === matchId) : null;
  if (!match) return;

  const infoEl = document.getElementById('commentMatchInfo');
  const bodyEl = document.getElementById('commentTextBody');
  if (!infoEl || !bodyEl) return;

  infoEl.innerHTML = `📅 <strong>${match.Data || '—'}</strong> &middot; 👤 <strong>${match.Player}</strong> (${match.Deck || '—'}) vs <strong>${match.Adversario}</strong> (${match.DeckAdv || '—'}) &middot; Placar: <strong>${match.Placar || '—'}</strong> &middot; 📍 ${match.Local || '—'}`;
  bodyEl.textContent = match.Comentarios || 'Sem comentários salvos.';

  showModal('modalViewComment');
};

window.exportCurrentDeckToTCGLive = function() {
  let list = '';
  if (currentViewingMatchDeck) {
    list = (currentViewingMatchDeck.list || '').trim();
  } else if (currentViewingDeckId) {
    const deck = decks.find(d => d.id === currentViewingDeckId);
    list = (deck?.list || '').trim();
  }

  if (!list) {
    showToast('⚠️ Este deck não possui cartas cadastradas para exportar.');
    return;
  }

  const notify = () => showToast('📋 Lista copiada para a área de transferência no formato Pokémon TCG Live!');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(list).then(notify).catch(() => fallbackCopyList(list));
  } else {
    fallbackCopyList(list);
  }
};

function fallbackCopyList(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('📋 Lista copiada para a área de transferência no formato Pokémon TCG Live!');
  } catch(err) {
    alert('Não foi possível copiar a lista automaticamente.');
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const searchEl = document.getElementById('deckListSearch');
  if (searchEl) {
    searchEl.addEventListener('input', () => {
      const q = searchEl.value.toLowerCase();
      document.querySelectorAll('.list-card-row').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  document.getElementById('btnExportTCGLive')?.addEventListener('click', exportCurrentDeckToTCGLive);

  document.getElementById('btnEditDeckListFromModal')?.addEventListener('click', () => {
    if (currentViewingMatchDeck) {
      closeModal('modalDeckList');
      openMatchForm(currentViewingMatchDeck.match);
    } else if (currentViewingDeckId) {
      closeModal('modalDeckList');
      openEditDeck(currentViewingDeckId);
    }
  });

  document.getElementById('btnFormAddDeckOwn')?.addEventListener('click', () => openDeckFormForTarget('formMatchDeck'));
  document.getElementById('btnFormAddDeckAdv')?.addEventListener('click', () => openDeckFormForTarget('formMatchDeckAdv'));
  document.getElementById('btnQuickAddDeckOwn')?.addEventListener('click', () => openDeckFormForTarget('quickLogDeck'));
  document.getElementById('btnQuickAddDeckAdv')?.addEventListener('click', () => openDeckFormForTarget('quickLogDeckAdv'));
});

// ── ADD / EDIT DECK ──────────────────────────────────────────────────────────
let editingDeckId = null;
let deckSelectTargetId = null;

window.openDeckFormForTarget = function(targetSelectId) {
  deckSelectTargetId = targetSelectId;
  openNewDeck();
};

window.openNewDeck = function() {
  editingDeckId = null;
  document.getElementById('deckFormTitle').textContent = '+ Novo Deck';

  const arqEl = document.getElementById('formDeckArquetipo');
  if (arqEl) arqEl.value = '';

  const subEl = document.getElementById('formDeckSubtipo');
  if (subEl) subEl.value = '';

  const playerEl = document.getElementById('formDeckPlayer');
  if (playerEl) {
    playerEl.innerHTML = '<option value="">Sem player atribuído</option>' + (players || []).map(p => `<option value="${p}">👤 ${p}</option>`).join('');
    playerEl.value = '';
    if (playerEl.syncSearchableSelect) playerEl.syncSearchableSelect();
  }

  document.getElementById('formDeckList').value = '';
  updateCardCounter();
  showModal('modalDeckForm');
};

window.openEditDeck = function(deckId) {
  const deck = decks.find(d => d.id === deckId);
  if (!deck) return;
  editingDeckId = deckId;
  document.getElementById('deckFormTitle').textContent = '✏️ Editar Deck';

  const arqEl = document.getElementById('formDeckArquetipo');
  if (arqEl) arqEl.value = deck.arquetipo || deck.name || '';

  const subEl = document.getElementById('formDeckSubtipo');
  if (subEl) subEl.value = deck.subtipo || '';

  const playerEl = document.getElementById('formDeckPlayer');
  if (playerEl) {
    playerEl.innerHTML = '<option value="">Sem player atribuído</option>' + (players || []).map(p => `<option value="${p}">👤 ${p}</option>`).join('');
    playerEl.value = deck.player || '';
    if (playerEl.syncSearchableSelect) playerEl.syncSearchableSelect();
  }

  document.getElementById('formDeckList').value = deck.list || '';
  updateCardCounter();
  showModal('modalDeckForm');
};

window.deleteDeck = function(deckId) {
  if (!confirm('Tem certeza que deseja excluir este deck?')) return;
  lastWriteTime = Date.now();
  const targetDeck = decks.find(d => d.id === deckId);

  const delDecks = loadDeletedDecks();
  delDecks.add(deckId);
  if (targetDeck && targetDeck.name) delDecks.add(targetDeck.name);
  saveDeletedDecks(delDecks);

  decks = decks.filter(d => d.id !== deckId);
  saveDecks(decks);
  populateDeckSelects();
  renderDecksList();
  if (targetDeck && typeof selectedDecks !== 'undefined') {
    selectedDecks.delete(targetDeck.name);
  }
  if (typeof populateFilters === 'function') populateFilters();
  if (typeof applyFilters    === 'function') applyFilters();
  showToast('🗑️ Deck excluído.');
};

function updateCardCounter() {
  const raw   = document.getElementById('formDeckList')?.value || '';
  const count = countCards(raw);
  const el    = document.getElementById('cardCounter');
  if (!el) return;
  el.textContent = `${count}/60 cartas`;
  el.className   = 'card-counter ' + (count === 60 ? 'valid' : count > 60 ? 'over' : 'under');
}

function saveDeckForm() {
  const arquetipo = document.getElementById('formDeckArquetipo')?.value.trim();
  const subtipo   = document.getElementById('formDeckSubtipo')?.value.trim();
  const player    = document.getElementById('formDeckPlayer')?.value.trim();
  const list      = document.getElementById('formDeckList')?.value.trim();

  if (!arquetipo) { alert('⚠️ Arquétipo do Deck é obrigatório.'); return; }

  const name = subtipo ? `${arquetipo} (${subtipo})` : arquetipo;

  if (editingDeckId) {
    const idx = decks.findIndex(d => d.id === editingDeckId);
    if (idx >= 0) {
      const oldDeck = decks[idx];
      var oldName = oldDeck.name;
      var oldArquetipo = oldDeck.arquetipo;
      decks[idx] = { ...oldDeck, name, arquetipo, subtipo, player, list };
    }
  } else {
    decks.push({ id: Date.now().toString(), name, arquetipo, subtipo, player, list, createdAt: new Date().toISOString() });
    try { 
      const activeUser = typeof getActivePlayerName === 'function' ? getActivePlayerName() : '';
      const finalPlayerName = activeUser || 'Jogador Desconhecido';
      fetch('/api/notifyDeck', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({playerName: finalPlayerName, deckName: name}) }); 
    } catch(e) {}
  }
  const delDecks = loadDeletedDecks();
  let delChanged = false;
  if (delDecks.has(name)) { delDecks.delete(name); delChanged = true; }
  if (delDecks.has(arquetipo)) { delDecks.delete(arquetipo); delChanged = true; }
  if (editingDeckId && delDecks.has(editingDeckId)) { delDecks.delete(editingDeckId); delChanged = true; }

  if (oldName && oldName !== name) {
    delDecks.add(oldName);
    delChanged = true;
  }
  if (oldArquetipo && oldArquetipo !== arquetipo) {
    delDecks.add(oldArquetipo);
    delChanged = true;
  }

  if (delChanged) saveDeletedDecks(delDecks);

  saveDecks(decks);
  populateDeckSelects();
  renderDecksList();
  if (deckSelectTargetId) {
    const targetSelect = document.getElementById(deckSelectTargetId);
    if (targetSelect) {
      targetSelect.value = arquetipo;
      if (targetSelect.syncSearchableSelect) targetSelect.syncSearchableSelect();
    }
    deckSelectTargetId = null;
  }
  if (typeof populateFilters === 'function') populateFilters();
  if (typeof applyFilters    === 'function') applyFilters();

  closeModal('modalDeckForm');
  showToast(`💾 Deck "${name}" salvo com sucesso!`);
}

// ── MATCH FORM ────────────────────────────────────────────────────────────────
let editingMatchId = null;

function updateMatchDeckCounters() {
  const rawOwn = document.getElementById('formMatchDeckOwnList')?.value || '';
  const parsedOwn = parsePTCGL(rawOwn);
  const counterOwn = document.getElementById('formMatchDeckOwnCounter');
  if (counterOwn) {
    const total = parsedOwn.total;
    counterOwn.textContent = `${total}/60`;
    counterOwn.className = 'card-counter ' + (total === 60 ? 'valid' : total > 60 ? 'over' : 'under');
  }

  const rawAdv = document.getElementById('formMatchDeckAdvList')?.value || '';
  const parsedAdv = parsePTCGL(rawAdv);
  const counterAdv = document.getElementById('formMatchDeckAdvCounter');
  if (counterAdv) {
    const total = parsedAdv.total;
    counterAdv.textContent = `${total}/60`;
    counterAdv.className = 'card-counter ' + (total === 60 ? 'valid' : total > 60 ? 'over' : 'under');
  }
}

function openMatchForm(matchData) {
  editingMatchId = matchData?.id || null;
  populateLocalSelects();
  populateColecaoSelects();
  const h = document.querySelector('#modalMatchForm .modal-header h3');
  if (h) h.textContent = editingMatchId ? '✏️ Editar Partida' : '⚔️ Registrar Partida';

  const get = id => document.getElementById(id);

  get('formMatchData').value      = matchData?.Data     || new Date().toISOString().slice(0, 10);
  get('formMatchPlayer').value    = matchData?.Player   || '';
  get('formMatchAdv').value       = matchData?.Adversario || '';
  get('formMatchDeckAdv').value   = matchData?.DeckAdvArquetipo || matchData?.DeckAdv  || '';
  if (get('formMatchSubtipoAdv')) get('formMatchSubtipoAdv').value = matchData?.SubtipoAdv || '';
  get('formMatchFormato').value   = matchData?.Formato  || 'MD1';
  get('formMatchStart').value     = matchData?.Start    || '1º';
  get('formMatchResultado').value = matchData?.Resultado|| 'Vitória';
  if (typeof updatePlacarDropdown === 'function') {
    updatePlacarDropdown('formMatchFormato', 'formMatchPlacar', matchData?.Placar || null, matchData?.Resultado || null);
  } else {
    get('formMatchPlacar').value  = matchData?.Placar   || '';
  }
  get('formMatchComentarios').value = matchData?.Comentarios || '';

  const colSel = get('formMatchColecao');
  if (colSel) {
    colSel.value = matchData?.Colecao || '';
    if (colSel.syncSearchableSelect) colSel.syncSearchableSelect();
  }
  const localSel = get('formMatchLocal');
  const localCustom = get('formMatchLocalCustom');
  const targetLocal = matchData?.Local || '';

  if (targetLocal) {
    const hasOption = Array.from(localSel.options).some(o => o.value === targetLocal);
    if (hasOption) {
      localSel.value = targetLocal;
      localCustom.value = '';
      localCustom.style.display = 'none';
    } else {
      localSel.value = '__outro__';
      localCustom.value = targetLocal;
      localCustom.style.display = 'block';
    }
  } else {
    localSel.value = '';
    localCustom.value = '';
    localCustom.style.display = 'none';
  }
  if (localSel.syncSearchableSelect) localSel.syncSearchableSelect();
  get('formMatchDeck').value = matchData?.Arquetipo || matchData?.Deck || '';
  if (get('formMatchSubtipo')) get('formMatchSubtipo').value = matchData?.Subtipo || '';
  const ownDeckObj = matchData?.Deck ? decks.find(d => d.name === matchData.Deck) : null;
  const advDeckObj = matchData?.DeckAdv ? decks.find(d => d.name === matchData.DeckAdv) : null;

  const ownListTA = get('formMatchDeckOwnList');
  if (ownListTA) ownListTA.value = matchData?.ListaMeuDeck || (ownDeckObj?.list || '');

  const advListTA = get('formMatchDeckAdvList');
  if (advListTA) advListTA.value = matchData?.ListaDeckAdv || (advDeckObj?.list || '');

  updateMatchDeckCounters();
  const isOldBrick = v => v && v !== 'Nenhum' && v !== 'Não';
  const brickVal   = isOldBrick(matchData?.Brick) ? 'Sim' : 'Não';
  const brickOpVal = isOldBrick(matchData?.BrickOp) ? 'Sim' : 'Não';
  const rawConf = matchData?.Confiabilidade || 'Alta';
  const confVal = (String(rawConf).trim().toLowerCase() === 'baixa') ? 'Baixa' : 'Alta';

  get('formMatchBrick').value = brickVal;
  document.querySelectorAll('#brickToggleGroup .brick-toggle').forEach(b => {
    b.classList.toggle('active', b.dataset.value === brickVal);
  });

  get('formMatchBrickOp').value = brickOpVal;
  document.querySelectorAll('#brickOpToggleGroup .brick-toggle').forEach(b => {
    b.classList.toggle('active', b.dataset.value === brickOpVal);
  });

  get('formMatchConfiabilidade').value = confVal;
  document.querySelectorAll('#confiabilidadeToggleGroup .brick-toggle').forEach(b => {
    b.classList.toggle('active', b.dataset.value.toLowerCase() === confVal.toLowerCase());
  });
  [
    'formMatchPlayer',
    'formMatchDeck',
    'formMatchDeckAdv',
    'formMatchFormato',
    'formMatchStart',
    'formMatchResultado',
    'formMatchPlacar',
    'formMatchColecao',
    'formMatchLocal'
  ].forEach(id => {
    const el = get(id);
    if (el && typeof el.syncSearchableSelect === 'function') {
      el.syncSearchableSelect();
    }
  });

  updateSubtipoOptions();
  renderMD3GamesUI(matchData?.GamesDetail);

  showModal('modalMatchForm');
  window.initialMatchFormSnapshot = getMatchFormStateSnapshot();
}

window.getGameCountFromPlacar = function(formato, placar, userOverriddenCount = null) {
  if (formato !== 'MD3') return 1;
  const cleanPlacar = (placar || '').trim();

  if (userOverriddenCount) {
    if ((cleanPlacar === '1-0' || cleanPlacar === '0-1') && (userOverriddenCount === 1 || userOverriddenCount === 2)) {
      return userOverriddenCount;
    }
    if (cleanPlacar === '1-1' && (userOverriddenCount === 2 || userOverriddenCount === 3)) {
      return userOverriddenCount;
    }
  }
  if (cleanPlacar === '0-0') return 1;
  if (cleanPlacar === '1-0' || cleanPlacar === '0-1') return 1;
  if (cleanPlacar === '1-1') return 2;
  if (cleanPlacar === '2-0' || cleanPlacar === '0-2') return 2;
  if (cleanPlacar === '2-1' || cleanPlacar === '1-2') return 3;

  return 2;
};

window.renderMD3GamesUI = function(existingGamesDetail = null, userCountOverride = null) {
  const formato = document.getElementById('formMatchFormato')?.value || 'MD1';
  const placar = document.getElementById('formMatchPlacar')?.value || '1-0';
  const sec = document.getElementById('md3GamesSection');
  const grid = document.getElementById('md3GamesGrid');
  const hint = document.getElementById('md3GamesCountHint');
  const singleStartGroup = document.getElementById('formMatchStart')?.closest('.form-group');
  const singleBrickGroup = document.getElementById('singleMatchBrickGroup');
  const singleBrickOpGroup = document.getElementById('singleMatchBrickOpGroup');

  if (!sec || !grid) return;

  if (formato !== 'MD3') {
    sec.style.display = 'none';
    if (singleStartGroup) singleStartGroup.style.display = 'block';
    if (singleBrickGroup) singleBrickGroup.style.display = 'block';
    if (singleBrickOpGroup) singleBrickOpGroup.style.display = 'block';
    return;
  }
  sec.style.display = 'block';
  if (singleStartGroup) singleStartGroup.style.display = 'none';
  if (singleBrickGroup) singleBrickGroup.style.display = 'none';
  if (singleBrickOpGroup) singleBrickOpGroup.style.display = 'none';

  let count = userCountOverride;
  if (!count && existingGamesDetail && Array.isArray(existingGamesDetail) && existingGamesDetail.length > 0) {
    count = existingGamesDetail.length;
  }
  if (!count) {
    count = getGameCountFromPlacar('MD3', placar);
  }

  window._activeMD3GameCount = count;

  const cleanPlacar = (placar || '').trim();
  let toggleHtml = '';
  if (cleanPlacar === '1-0' || cleanPlacar === '0-1') {
    toggleHtml = `
      <div style="display:inline-flex; gap:4px; margin-left:8px;">
        <button type="button" class="icon-btn sm" onclick="renderMD3GamesUI(null, 1)" style="${count === 1 ? 'background:var(--accent2);color:#000;font-weight:bold;' : ''}">1 Game</button>
        <button type="button" class="icon-btn sm" onclick="renderMD3GamesUI(null, 2)" style="${count === 2 ? 'background:var(--accent2);color:#000;font-weight:bold;' : ''}">2 Games</button>
      </div>
    `;
  } else if (cleanPlacar === '1-1') {
    toggleHtml = `
      <div style="display:inline-flex; gap:4px; margin-left:8px;">
        <button type="button" class="icon-btn sm" onclick="renderMD3GamesUI(null, 2)" style="${count === 2 ? 'background:var(--accent2);color:#000;font-weight:bold;' : ''}">2 Games</button>
        <button type="button" class="icon-btn sm" onclick="renderMD3GamesUI(null, 3)" style="${count === 3 ? 'background:var(--accent2);color:#000;font-weight:bold;' : ''}">3 Games</button>
      </div>
    `;
  }

  if (hint) {
    hint.innerHTML = `${count} game${count > 1 ? 's' : ''} jogado${count > 1 ? 's' : ''} (Placar: ${placar}) ${toggleHtml}`;
  }

  grid.innerHTML = '';
  for (let i = 1; i <= count; i++) {
    const existingGame = (existingGamesDetail && Array.isArray(existingGamesDetail))
      ? existingGamesDetail.find(g => g.game === i)
      : null;

    const defaultStart = existingGame ? existingGame.start : (i === 1 ? '1º' : '2º');
    const defaultBrick = existingGame ? existingGame.brick : 'Não';
    const defaultBrickOp = existingGame ? existingGame.brickOp : 'Não';

    const card = document.createElement('div');
    card.className = 'md3-game-card';
    card.style.cssText = 'background:var(--bg3); padding:0.6rem 0.85rem; border-radius:6px; display:flex; align-items:center; justify-content:space-between; gap:0.5rem; flex-wrap:wrap; border:1px solid var(--border);';

    card.innerHTML = `
      <span style="font-weight:600; font-size:0.82rem; color:var(--accent2); display:flex; align-items:center; gap:0.3rem;">
        🎮 Game ${i}
      </span>
      <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:0.3rem;">
          <span style="font-size:0.75rem; color:var(--text2);">Start:</span>
          <select id="md3GameStart_${i}" class="form-input" style="padding:0.25rem 0.4rem; font-size:0.78rem; width: auto;">
            <option value="1º" ${defaultStart === '1º' ? 'selected' : ''}>1º (Começou)</option>
            <option value="2º" ${defaultStart === '2º' ? 'selected' : ''}>2º (Segundo)</option>
          </select>
        </div>
        <div style="display:flex; align-items:center; gap:0.3rem;">
          <span style="font-size:0.75rem; color:var(--text2);">Brickei:</span>
          <select id="md3GameBrick_${i}" class="form-input" style="padding:0.25rem 0.4rem; font-size:0.78rem; width: auto;">
            <option value="Não" ${defaultBrick === 'Não' ? 'selected' : ''}>✅ Não</option>
            <option value="Sim" ${defaultBrick === 'Sim' ? 'selected' : ''}>💥 Sim</option>
          </select>
        </div>
        <div style="display:flex; align-items:center; gap:0.3rem;">
          <span style="font-size:0.75rem; color:var(--text2);">Oponente brickou:</span>
          <select id="md3GameBrickOp_${i}" class="form-input" style="padding:0.25rem 0.4rem; font-size:0.78rem; width: auto;">
            <option value="Não" ${defaultBrickOp === 'Não' ? 'selected' : ''}>✅ Não</option>
            <option value="Sim" ${defaultBrickOp === 'Sim' ? 'selected' : ''}>💥 Sim</option>
          </select>
        </div>
      </div>
    `;
    grid.appendChild(card);
  }
};

window.updateSubtipoOptions = function() {
  const player    = document.getElementById('formMatchPlayer')?.value || '';
  const arquetipo = document.getElementById('formMatchDeck')?.value || '';

  const dlOwn = document.getElementById('subtipoOptionsOwn');
  if (dlOwn) {
    dlOwn.innerHTML = '';
    if (arquetipo) {
      const dataset = (typeof allData !== 'undefined' && Array.isArray(allData)) ? allData : [];
      const deckSubtipos = decks
        .filter(d => (d.arquetipo || d.name) === arquetipo && (!d.player || !player || d.player === player))
        .map(d => d.subtipo)
        .filter(Boolean);

      const matchSubtipos = dataset
        .filter(m => (m.Arquetipo || m.Deck) === arquetipo && (!player || m.Player === player))
        .map(m => m.Subtipo)
        .filter(Boolean);

      const uniqueSubtipos = [...new Set([...deckSubtipos, ...matchSubtipos])].sort((a, b) => a.localeCompare(b));

      uniqueSubtipos.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        dlOwn.appendChild(opt);
      });
    }
  }

  const arquetipoAdv = document.getElementById('formMatchDeckAdv')?.value || '';
  const dlAdv = document.getElementById('subtipoOptionsAdv');
  if (dlAdv) {
    dlAdv.innerHTML = '';
    if (arquetipoAdv) {
      const dataset = (typeof allData !== 'undefined' && Array.isArray(allData)) ? allData : [];
      const oppDeckSubtipos = decks
        .filter(d => (d.arquetipo || d.name) === arquetipoAdv)
        .map(d => d.subtipo)
        .filter(Boolean);

      const oppMatchSubtipos = dataset
        .filter(m => (m.DeckAdvArquetipo || m.DeckAdv) === arquetipoAdv)
        .map(m => m.SubtipoAdv)
        .filter(Boolean);

      const uniqueAdvSubtipos = [...new Set([...oppDeckSubtipos, ...oppMatchSubtipos])].sort((a, b) => a.localeCompare(b));

      uniqueAdvSubtipos.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        dlAdv.appendChild(opt);
      });
    }
  }
};

window.findRegisteredDeck = function(player, arquetipo, subtipo) {
  if (!arquetipo) return null;
  let found = decks.find(d => 
    (d.arquetipo || d.name) === arquetipo && 
    (d.subtipo || '') === subtipo && 
    d.player === player
  );
  if (found) return found;
  found = decks.find(d => 
    (d.arquetipo || d.name) === arquetipo && 
    (d.subtipo || '') === subtipo
  );
  if (found) return found;
  const fullName = subtipo ? `${arquetipo} (${subtipo})` : arquetipo;
  found = decks.find(d => d.name === fullName);
  if (found) return found;
  if (!subtipo) {
    found = decks.find(d => (d.arquetipo || d.name) === arquetipo);
    if (found) return found;
  }

  return null;
};

window.autoFetchMatchDeckLists = function(forceUpdate = false) {
  const player    = document.getElementById('formMatchPlayer')?.value || '';
  const arquetipo = document.getElementById('formMatchDeck')?.value || '';
  const subtipo   = document.getElementById('formMatchSubtipo')?.value || '';

  const ownListTA = document.getElementById('formMatchDeckOwnList');
  if (ownListTA) {
    const deck = findRegisteredDeck(player, arquetipo, subtipo);
    if (deck && deck.list) {
      ownListTA.value = deck.list;
    } else if (forceUpdate && !editingMatchId) {
      ownListTA.value = '';
    }
  }

  const arquetipoAdv = document.getElementById('formMatchDeckAdv')?.value || '';
  const subtipoAdv   = document.getElementById('formMatchSubtipoAdv')?.value || '';

  const advListTA = document.getElementById('formMatchDeckAdvList');
  if (advListTA) {
    const deckAdv = findRegisteredDeck(null, arquetipoAdv, subtipoAdv);
    if (deckAdv && deckAdv.list) {
      advListTA.value = deckAdv.list;
    } else if (forceUpdate && !editingMatchId) {
      advListTA.value = '';
    }
  }

  if (typeof updateMatchDeckCounters === 'function') updateMatchDeckCounters();
};

document.addEventListener('DOMContentLoaded', () => {
  ['formMatchPlayer', 'formMatchDeck', 'formMatchSubtipo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        if (typeof updateSubtipoOptions === 'function') updateSubtipoOptions();
        if (typeof autoFetchMatchDeckLists === 'function') autoFetchMatchDeckLists(true);
      });
      el.addEventListener('input', () => {
        if (typeof autoFetchMatchDeckLists === 'function') autoFetchMatchDeckLists(true);
      });
    }
  });

  ['formMatchDeckAdv', 'formMatchSubtipoAdv'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        if (typeof updateSubtipoOptions === 'function') updateSubtipoOptions();
        if (typeof autoFetchMatchDeckLists === 'function') autoFetchMatchDeckLists(true);
      });
      el.addEventListener('input', () => {
        if (typeof autoFetchMatchDeckLists === 'function') autoFetchMatchDeckLists(true);
      });
    }
  });

  ['formMatchFormato', 'formMatchPlacar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        if (typeof renderMD3GamesUI === 'function') renderMD3GamesUI();
      });
    }
  });
});

function saveMatchForm() {
  const getVal = id => document.getElementById(id)?.value || '';
  const player     = getVal('formMatchPlayer');
  const deckName   = getVal('formMatchDeck');
  const adversario = getVal('formMatchAdv').trim() || 'Oponente';
  const resultado  = getVal('formMatchResultado');
  const deckAdv    = getVal('formMatchDeckAdv');
  const colecao    = getVal('formMatchColecao');

  if (!player)   { alert('⚠️ Selecione o player.'); return; }
  if (!deckName) { alert('⚠️ Selecione o seu deck (Arquétipo).'); return; }
  if (!deckAdv)  { alert('⚠️ Selecione o deck do adversário (Arquétipo).'); return; }
  if (!colecao || colecao === '' || colecao.toLowerCase().includes('toda')) {
    alert('⚠️ A coleção é obrigatória. Selecione uma coleção específica (não pode ser vazia nem "Todas").');
    return;
  }

  const localSel = getVal('formMatchLocal');
  const localCustom = getVal('formMatchLocalCustom').trim();
  const local    = localSel === '__outro__' ? localCustom : localSel;
  const pontos   = resultado === 'Vitória' ? 1 : resultado === 'Empate' ? 0.5 : 0;
  const ownListRaw = getVal('formMatchDeckOwnList').trim();
  const advListRaw = getVal('formMatchDeckAdvList').trim();

  const arquetipo    = deckName;
  const subtipo      = getVal('formMatchSubtipo').trim();
  const arquetipoAdv = deckAdv;
  const subtipoAdv   = getVal('formMatchSubtipoAdv').trim();

  const deckFullName    = subtipo ? `${arquetipo} (${subtipo})` : arquetipo;
  const deckAdvFullName = subtipoAdv ? `${arquetipoAdv} (${subtipoAdv})` : arquetipoAdv;

  let decksChanged = false;
  let ownDeck = findRegisteredDeck(player, arquetipo, subtipo);
  if (!ownDeck) {
    ownDeck = {
      id: 'deck_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: deckFullName,
      arquetipo: arquetipo,
      subtipo: subtipo,
      player: player,
      list: ownListRaw,
      createdAt: new Date().toISOString()
    };
    decks.push(ownDeck);
    decksChanged = true;
  } else if (ownListRaw && ownDeck.list !== ownListRaw) {
    ownDeck.list = ownListRaw;
    decksChanged = true;
  }
  let advDeck = findRegisteredDeck(null, arquetipoAdv, subtipoAdv);
  if (!advDeck) {
    advDeck = {
      id: 'deck_' + (Date.now() + 1) + '_' + Math.random().toString(36).substring(2, 6),
      name: deckAdvFullName,
      arquetipo: arquetipoAdv,
      subtipo: subtipoAdv,
      list: advListRaw,
      createdAt: new Date().toISOString()
    };
    decks.push(advDeck);
    decksChanged = true;
  } else if (advListRaw && advDeck.list !== advListRaw) {
    advDeck.list = advListRaw;
    decksChanged = true;
  }

  if (decksChanged) {
    saveDecks(decks);
    if (typeof populateDeckSelects === 'function') populateDeckSelects();
    if (typeof renderDecksList === 'function') renderDecksList();
  }

  const formato = getVal('formMatchFormato') || 'MD1';
  const placar  = getVal('formMatchPlacar').trim();
  let gamesDetail = null;

  if (formato === 'MD3') {
    const count = getGameCountFromPlacar('MD3', placar);
    gamesDetail = [];
    for (let i = 1; i <= count; i++) {
      gamesDetail.push({
        game: i,
        start: getVal(`md3GameStart_${i}`) || '1º',
        brick: getVal(`md3GameBrick_${i}`) || 'Não',
        brickOp: getVal(`md3GameBrickOp_${i}`) || 'Não'
      });
    }
  }

  const startVal = (formato === 'MD3' && gamesDetail && gamesDetail.length > 0)
    ? gamesDetail.map(g => g.start).join(', ')
    : (getVal('formMatchStart') || '1º');

  const brickVal = (formato === 'MD3' && gamesDetail && gamesDetail.length > 0)
    ? (gamesDetail.some(g => g.brick === 'Sim') ? 'Sim' : 'Não')
    : (getVal('formMatchBrick') || 'Não');

  const brickOpVal = (formato === 'MD3' && gamesDetail && gamesDetail.length > 0)
    ? (gamesDetail.some(g => g.brickOp === 'Sim') ? 'Sim' : 'Não')
    : (getVal('formMatchBrickOp') || 'Não');

  const matchData = {
    id:               editingMatchId || (Date.now().toString() + Math.random().toString(36).substr(2, 4)),
    Data:             getVal('formMatchData') || new Date().toISOString().slice(0, 10),
    Player:           player,
    Deck:             deckFullName,
    Arquetipo:        arquetipo,
    Subtipo:          subtipo,
    Adversario:       adversario,
    DeckAdv:          deckAdvFullName,
    DeckAdvArquetipo: arquetipoAdv,
    SubtipoAdv:       subtipoAdv,
    Luck:             0,
    Formato:          formato,
    Start:            startVal,
    Resultado:        resultado,
    Pontos:           pontos,
    Placar:           placar,
    Local:            local,
    Colecao:          colecao,
    Brick:            brickVal,
    BrickOp:          brickOpVal,
    Confiabilidade:   getVal('formMatchConfiabilidade') || 'Alta',
    GamesDetail:      gamesDetail,
    ListaMeuDeck:     ownListRaw,
    ListaDeckAdv:     advListRaw,
    Comentarios:      getVal('formMatchComentarios').trim(),
    createdAt:        new Date().toISOString(),
    _manual:          true,
  };

  const mirrorMatch = buildMirrorMatch(matchData);
  if (mirrorMatch) {
    matchData._mirrorId = mirrorMatch.id;
  }

  const manual = loadManual();
  if (editingMatchId) {
    const midx = manual.findIndex(m => m.id === editingMatchId);
    if (midx >= 0) {
      const s = manual[midx].seqID || manual[midx].seqId;
      if (s) {
        matchData.seqID = s;
        matchData.seqId = s;
        matchData._displayId = s;
      }
      manual[midx] = matchData;
    } else {
      const edits = loadEdits();
      edits[editingMatchId] = matchData;
      saveEdits(edits);
    }
  } else {
    if (!matchData.seqID && !matchData.seqId) {
      matchData.seqID = typeof getNextSeqID === 'function' ? getNextSeqID(manual) : (manual.length + 1);
      matchData.seqId = matchData.seqID;
      matchData._displayId = matchData.seqID;
    }
    manual.push(matchData);
  }
  if (mirrorMatch) {
    if (!mirrorMatch.seqID && !mirrorMatch.seqId) {
      mirrorMatch.seqID = typeof getNextSeqID === 'function' ? getNextSeqID(manual) : (matchData.seqID + 1);
      mirrorMatch.seqId = mirrorMatch.seqID;
      mirrorMatch._displayId = mirrorMatch.seqID;
    }
    const mIdx = manual.findIndex(m => m.id === mirrorMatch.id || m._mirroredFrom === matchData.id);
    if (mIdx >= 0) manual[mIdx] = mirrorMatch;
    else manual.push(mirrorMatch);
  } else {
    const mIdx = manual.findIndex(m => m._mirroredFrom === matchData.id);
    if (mIdx >= 0) manual.splice(mIdx, 1);
  }
  saveManual(manual);
  if (typeof allData !== 'undefined' && Array.isArray(allData)) {
    const aidx = allData.findIndex(m => m.id === matchData.id);
    if (aidx >= 0) allData[aidx] = matchData;
    else allData.push(matchData);

    if (mirrorMatch) {
      const maidx = allData.findIndex(m => m.id === mirrorMatch.id || m._mirroredFrom === matchData.id);
      if (maidx >= 0) allData[maidx] = mirrorMatch;
      else allData.push(mirrorMatch);
    } else {
      const maidx = allData.findIndex(m => m._mirroredFrom === matchData.id);
      if (maidx >= 0) allData.splice(maidx, 1);
    }
  }

  if (editingMatchId) {
    showToast('✏️ Partida (e espelho do time) atualizada!');
  } else if (mirrorMatch) {
    showToast(`⚔️ Partida registrada para ${matchData.Player} e espelho para ${mirrorMatch.Player}!`);
  } else {
    showToast('✅ Partida registrada com sucesso!');
  }
  editingMatchId = null;

  if (typeof populateFilters === 'function') populateFilters();
  if (typeof applyFilters    === 'function') applyFilters();
  closeModal('modalMatchForm', true);
}

// ── DELETE MATCH ──────────────────────────────────────────────────────────────
window.deleteMatch = function(matchId) {
  const manual = loadManual();
  const targetMatch = manual.find(m => m.id === matchId) || ((typeof allData !== 'undefined') ? allData.find(m => m.id === matchId) : null);

  const currentUserObj = typeof getCurrentUser === 'function' ? getCurrentUser() : window.currentUser;
  const currentName = currentUserObj?.linkedPlayer || currentUserObj?.name || '';

  if (targetMatch && currentName && targetMatch.Player.trim().toLowerCase() !== currentName.trim().toLowerCase()) {
    if (typeof showToast === 'function') showToast('⚠️ Você só possui permissão para apagar suas próprias partidas!');
    return;
  }

  if (!confirm('Deletar esta partida? Esta ação não pode ser desfeita.')) return;
  lastWriteTime = Date.now();
  const mirrorId = targetMatch?._mirrorId;
  const mirroredFromId = targetMatch?._mirroredFrom;

  const newManual = manual.filter(m => 
    m.id !== matchId && 
    (!mirrorId || m.id !== mirrorId) && 
    (!mirroredFromId || m.id !== mirroredFromId) &&
    m._mirroredFrom !== matchId
  );
  saveManual(newManual);

  const deleted = loadDeleted();
  deleted.add(matchId);
  if (mirrorId) deleted.add(mirrorId);
  if (mirroredFromId) deleted.add(mirroredFromId);
  saveDeleted(deleted);

  const edits = loadEdits();
  delete edits[matchId];
  if (mirrorId) delete edits[mirrorId];
  if (mirroredFromId) delete edits[mirroredFromId];
  saveEdits(edits);

  if (typeof allData !== 'undefined' && Array.isArray(allData)) {
    const filterAll = m => 
      m.id !== matchId && 
      (!mirrorId || m.id !== mirrorId) && 
      (!mirroredFromId || m.id !== mirroredFromId) &&
      m._mirroredFrom !== matchId;
    allData = allData.filter(filterAll);
  }

  if (typeof populateFilters === 'function') populateFilters();
  if (typeof applyFilters    === 'function') applyFilters();
  showToast('🗑️ Partida (e espelho do time) deletada.');
};

// ── EDIT MATCH ────────────────────────────────────────────────────────────────
window.editMatch = function(matchId) {
  const match = (typeof allData !== 'undefined') ? allData.find(m => m.id === matchId) : null;
  if (!match) { showToast('⚠️ Partida não encontrada.'); return; }

  const currentUserObj = typeof getCurrentUser === 'function' ? getCurrentUser() : window.currentUser;
  const currentName = currentUserObj?.linkedPlayer || currentUserObj?.name || '';

  if (currentName && match.Player.trim().toLowerCase() !== currentName.trim().toLowerCase()) {
    if (typeof showToast === 'function') showToast('⚠️ Você só possui permissão para editar suas próprias partidas!');
    return;
  }

  openMatchForm(match);
};

// ── PLAYER MANAGEMENT ─────────────────────────────────────────────────────────
function addPlayer() {
  const input = document.getElementById('newPlayerName');
  const name  = input?.value.trim();
  if (!name) return;
  if (players.includes(name)) { showToast('⚠️ Player já existe.'); return; }
  players.push(name);
  savePlayers(players);
  populatePlayerSelects();
  renderPlayersList();
  if (typeof populateFilters === 'function') populateFilters();
  if (typeof applyFilters    === 'function') applyFilters();
  input.value = '';
  showToast(`👤 Player "${name}" adicionado!`);
}

window.deletePlayer = function(name) {
  if (!confirm(`Remover player "${name}"?`)) return;
  lastWriteTime = Date.now();

  const delPlayers = loadDeletedPlayers();
  delPlayers.add(name);
  saveDeletedPlayers(delPlayers);

  players = players.filter(p => p !== name);
  savePlayers(players);
  populatePlayerSelects();
  renderPlayersList();
  if (typeof populateFilters === 'function') populateFilters();
  if (typeof applyFilters    === 'function') applyFilters();
  showToast(`🗑️ Player "${name}" removido.`);
}

function renderPlayersList() {
  const el = document.getElementById('playersList');
  if (!el) return;
  el.innerHTML = players.map(p => `
    <div class="player-tag">
      <span>👤 ${p}</span>
      <div style="display:flex; gap:0.25rem;">
        <button class="icon-btn warning sm" onclick="resetPlayerAccount('${p.replace(/'/g, "\\'")}')" title="Resetar Senha da Conta">🔑</button>
        <button class="icon-btn danger sm" onclick="deletePlayer('${p.replace(/'/g, "\\'")}')" title="Excluir Jogador do Time">🗑️</button>
      </div>
    </div>
  `).join('');
}

window.resetPlayerAccount = async function(playerName) {
  if (!confirm(`⚠️ Tem certeza que deseja resetar a senha da conta de "${playerName}"?\nO e-mail atrelado será apagado e a pessoa precisará se cadastrar novamente.`)) return;
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_single', playerName })
    });
    const data = await res.json();
    if (res.ok) {
      showToast?.(`✅ Conta de ${playerName} resetada com sucesso!`);
      try {
        const claimed = JSON.parse(localStorage.getItem('jornada_claimed_players') || '[]');
        const updated = claimed.filter(n => n.trim() !== playerName.trim());
        localStorage.setItem('jornada_claimed_players', JSON.stringify(updated));
      } catch(e) {}
      if (typeof fetchClaimedPlayers === 'function') await fetchClaimedPlayers();
      if (typeof populatePlayerRegisterDropdowns === 'function') populatePlayerRegisterDropdowns();
    } else {
      showToast?.(`❌ Erro ao resetar: ${data.error}`);
    }
  } catch (e) {
    showToast?.(`❌ Erro de conexão com o servidor.`);
  }
};

// ── LOCAL MANAGEMENT ──────────────────────────────────────────────────────────
function addLocal() {
  const input = document.getElementById('newLocalName');
  const name  = input?.value.trim();
  if (!name) return;
  if (locais.some(l => l.toLowerCase() === name.toLowerCase())) { showToast('⚠️ Local já existe.'); return; }
  locais.push(name);
  saveLocais(locais);
  renderLocaisList();
  populateLocalSelects();
  if (typeof populateFilters === 'function') populateFilters();
  if (typeof applyFilters    === 'function') applyFilters();
  input.value = '';
  showToast(`📍 Local "${name}" adicionado!`);
}

window.deleteLocal = function(name) {
  if (!confirm(`Remover local "${name}"?`)) return;
  lastWriteTime = Date.now();

  const delLocais = loadDeletedLocais();
  delLocais.add(name);
  saveDeletedLocais(delLocais);

  locais = locais.filter(l => l !== name);
  saveLocais(locais);
  renderLocaisList();
  populateLocalSelects();
  if (typeof populateFilters === 'function') populateFilters();
  if (typeof applyFilters    === 'function') applyFilters();
  showToast(`🗑️ Local "${name}" removido.`);
}

function renderLocaisList() {
  const el = document.getElementById('locaisList');
  if (!el) return;
  el.innerHTML = locais.map(l => `
    <div class="player-tag">
      <span>📍 ${l}</span>
      <button class="icon-btn danger sm" onclick="deleteLocal('${l.replace(/'/g, "\\'")}')">✕</button>
    </div>
  `).join('');
}

function populateLocalSelects() {
  const customLocais = (typeof loadLocais === 'function') ? loadLocais() : [];
  const dataLocais   = (typeof allData !== 'undefined' && Array.isArray(allData)) ? allData.map(d => d.Local).filter(Boolean) : [];
  const allLocais    = [...new Set([...customLocais, ...dataLocais])].sort((a, b) => a.localeCompare(b));
  const modalSel = document.getElementById('formMatchLocal');
  if (modalSel) {
    const cur = modalSel.value;
    modalSel.innerHTML = '<option value="">Selecione…</option>';
    allLocais.forEach(l => {
      const o = document.createElement('option');
      o.value = l; o.textContent = l;
      modalSel.appendChild(o);
    });
    const outroOpt = document.createElement('option');
    outroOpt.value = '__outro__';
    outroOpt.textContent = 'Outro…';
    modalSel.appendChild(outroOpt);
    if (cur && (allLocais.includes(cur) || cur === '__outro__')) modalSel.value = cur;
    if (modalSel.syncSearchableSelect) modalSel.syncSearchableSelect();
  }
  const quickSel = document.getElementById('quickLogLocal');
  if (quickSel) {
    const cur = quickSel.value;
    quickSel.innerHTML = '<option value="">Selecione…</option>';
    allLocais.forEach(l => {
      const o = document.createElement('option');
      o.value = l; o.textContent = l;
      quickSel.appendChild(o);
    });
    if (cur && allLocais.includes(cur)) quickSel.value = cur;
    if (quickSel.syncSearchableSelect) quickSel.syncSearchableSelect();
  }
  const filterSel = document.getElementById('filterLocal');
  if (filterSel) {
    const cur = filterSel.value;
    filterSel.innerHTML = '<option value="">Todos</option>';
    allLocais.forEach(l => {
      const o = document.createElement('option');
      o.value = l; o.textContent = l;
      filterSel.appendChild(o);
    });
    if (cur && allLocais.includes(cur)) filterSel.value = cur;
    if (filterSel.syncSearchableSelect) filterSel.syncSearchableSelect();
  }
}

// ── COLEÇÃO MANAGEMENT ────────────────────────────────────────────────────────
function addColecao() {
  const input = document.getElementById('newColecaoName');
  const name  = input?.value.trim();
  if (!name) return;
  if (colecoes.some(c => c.toLowerCase() === name.toLowerCase())) { showToast('⚠️ Coleção já existe.'); return; }
  colecoes.push(name);
  saveColecoes(colecoes);
  renderColecoesList();
  populateColecaoSelects();
  if (typeof populateFilters === 'function') populateFilters();
  if (typeof applyFilters    === 'function') applyFilters();
  input.value = '';
  showToast(`📦 Coleção "${name}" adicionada!`);
}

window.deleteColecao = function(name) {
  if (!confirm(`Remover coleção "${name}"?`)) return;
  lastWriteTime = Date.now();

  const delColecoes = loadDeletedColecoes();
  delColecoes.add(name);
  saveDeletedColecoes(delColecoes);

  colecoes = colecoes.filter(c => c !== name);
  saveColecoes(colecoes);
  renderColecoesList();
  populateColecaoSelects();
  if (typeof populateFilters === 'function') populateFilters();
  if (typeof applyFilters    === 'function') applyFilters();
  showToast(`🗑️ Coleção "${name}" removida.`);
}

function renderColecoesList() {
  const el = document.getElementById('colecoesList');
  if (!el) return;
  el.innerHTML = colecoes.map(c => `
    <div class="player-tag">
      <span>📦 ${c}</span>
      <button class="icon-btn danger sm" onclick="deleteColecao('${c.replace(/'/g, "\\'")}')">✕</button>
    </div>
  `).join('');
}

function populateColecaoSelects() {
  const customColecoes = (typeof loadColecoes === 'function') ? loadColecoes() : [];
  const dataColecoes   = (typeof allData !== 'undefined' && Array.isArray(allData)) ? allData.map(d => d.Colecao).filter(Boolean) : [];
  const allColecoes    = [...new Set([...customColecoes, ...dataColecoes])].sort((a, b) => a.localeCompare(b));
  const modalSel = document.getElementById('formMatchColecao');
  if (modalSel) {
    const cur = modalSel.value;
    modalSel.innerHTML = '<option value="">Selecione a coleção…</option>';
    allColecoes.forEach(c => {
      const o = document.createElement('option');
      o.value = c; o.textContent = c;
      modalSel.appendChild(o);
    });
    if (cur && allColecoes.includes(cur)) modalSel.value = cur;
    if (modalSel.syncSearchableSelect) modalSel.syncSearchableSelect();
  }
  const quickSel = document.getElementById('quickLogColecao');
  if (quickSel) {
    const cur = quickSel.value;
    quickSel.innerHTML = '<option value="">Selecione a coleção…</option>';
    allColecoes.forEach(c => {
      const o = document.createElement('option');
      o.value = c; o.textContent = c;
      quickSel.appendChild(o);
    });
    if (cur && allColecoes.includes(cur)) quickSel.value = cur;
    if (quickSel.syncSearchableSelect) quickSel.syncSearchableSelect();
  }
  const filterSel = document.getElementById('filterColecao');
  if (filterSel) {
    const cur = filterSel.value;
    filterSel.innerHTML = '<option value="">Todas as Coleções</option>';
    allColecoes.forEach(c => {
      const o = document.createElement('option');
      o.value = c; o.textContent = c;
      filterSel.appendChild(o);
    });
    if (cur !== undefined && (cur === '' || allColecoes.includes(cur))) {
      filterSel.value = cur;
    } else {
      filterSel.value = '';
    }
    if (filterSel.syncSearchableSelect) filterSel.syncSearchableSelect();
  }
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(msg) {
  let toast = document.getElementById('toastMsg');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastMsg';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── QUICK LOG — Trava #quickLogPlayer ao jogador autenticado ──────────────────
function populateQuickLogDropdowns() {
  const pSel = document.getElementById('quickLogPlayer');
  if (pSel) {
    const activeName = typeof getActivePlayerName === 'function' ? getActivePlayerName() : null;
    if (activeName) {
      pSel.innerHTML = `<option value="${activeName}">👤 ${activeName}</option>`;
      pSel.value = activeName;
      pSel.selectedIndex = 0;
    } else {
      pSel.innerHTML = `<option value="">🔑 Faça Login para Registrar Partida</option>`;
    }
    if (pSel.syncSearchableSelect) pSel.syncSearchableSelect();
  }

  populateLocalSelects();
  populateColecaoSelects();
  updatePlacarDropdown('quickLogFormato', 'quickLogPlacar');
  updatePlacarDropdown('formMatchFormato', 'formMatchPlacar');
  if (typeof renderQuickLogTouchPills === 'function') renderQuickLogTouchPills();

  ['quickLogFormato', 'quickLogPlacar'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.dataset.quickPillListener) {
      el.dataset.quickPillListener = "true";
      el.addEventListener('change', () => {
        if (typeof renderQuickLogTouchPills === 'function') renderQuickLogTouchPills();
      });
    }
  });
}

const PLACAR_RULES = {
  MD1: {
    'ALL':     ['1-0', '0-1', '0-0'],
    'Vitória': ['1-0'],
    'Empate':  ['0-0'],
    'Derrota': ['0-1']
  },
  MD3: {
    'ALL':     ['2-0', '2-1', '1-1', '1-0', '0-0', '0-1', '1-2', '0-2'],
    'Vitória': ['2-0', '2-1', '1-0'],
    'Empate':  ['1-1', '0-0'],
    'Derrota': ['0-2', '1-2', '0-1']
  }
};

window.updatePlacarDropdown = function(formatoId, placarId, currentVal = null, outcome = null, resultadoId = null) {
  const formatoEl = document.getElementById(formatoId);
  const placarEl  = document.getElementById(placarId);
  if (!formatoEl || !placarEl) return;

  const fmt = formatoEl.value || 'MD1';
  const fmtRules = PLACAR_RULES[fmt] || PLACAR_RULES.MD1;
  let activeOutcome = outcome;
  if (!activeOutcome && resultadoId) {
    activeOutcome = document.getElementById(resultadoId)?.value;
  }

  let options;
  if (formatoId === 'quickLogFormato' && !outcome) {
    options = fmtRules['ALL'];
  } else {
    if (!activeOutcome) activeOutcome = 'Vitória';
    if (activeOutcome.includes('Vitória')) activeOutcome = 'Vitória';
    else if (activeOutcome.includes('Empate')) activeOutcome = 'Empate';
    else if (activeOutcome.includes('Derrota')) activeOutcome = 'Derrota';
    options = fmtRules[activeOutcome] || fmtRules['Vitória'];
  }

  let selectedVal = currentVal || placarEl.value;

  placarEl.innerHTML = '';
  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    placarEl.appendChild(o);
  });

  if (selectedVal && options.includes(selectedVal)) {
    placarEl.value = selectedVal;
  } else {
    placarEl.value = options[0];
  }

  if (placarEl.syncSearchableSelect) placarEl.syncSearchableSelect();
};

window.quickLogPillState = {};

window.renderQuickLogTouchPills = function() {
  const formato = document.getElementById('quickLogFormato')?.value || 'MD1';
  const placar = document.getElementById('quickLogPlacar')?.value || '1-0';
  const grid = document.getElementById('quickLogGamesPillGrid');
  const label = document.getElementById('quickLogFormatoLabel');
  const startSelect = document.getElementById('quickLogStart')?.closest('.form-group');

  if (!grid) return;

  if (label) label.textContent = `(${formato})`;
  if (startSelect) {
    startSelect.style.display = formato === 'MD3' ? 'none' : 'block';
  }

  const count = formato === 'MD3' ? getGameCountFromPlacar('MD3', placar) : 1;

  grid.innerHTML = '';
  for (let i = 1; i <= count; i++) {
    if (!window.quickLogPillState[i]) {
      window.quickLogPillState[i] = {
        start: i === 1 ? '1º' : (i % 2 === 0 ? '2º' : '1º'),
        brick: false,
        brickOp: false
      };
    }
    const state = window.quickLogPillState[i];

    const card = document.createElement('div');
    card.className = 'pill-game-row';

    card.innerHTML = `
      <div class="pill-game-header">
        🎮 ${formato === 'MD3' ? 'Game ' + i : 'Game Principal'}
      </div>
      <div class="pill-btn-group">
        <button type="button" class="pill-btn ${state.start === '1º' ? 'active-start' : ''}" onclick="toggleQuickLogPill(${i}, 'start')">
          🎲 ${state.start === '1º' ? '1º (Começou)' : '2º (Segundo)'}
        </button>
        <button type="button" class="pill-btn ${state.brick ? 'active-brick' : ''}" onclick="toggleQuickLogPill(${i}, 'brick')">
          ${state.brick ? '💥 Meu Brick' : '✅ Meu Brick'}
        </button>
        <button type="button" class="pill-btn ${state.brickOp ? 'active-brick' : ''}" onclick="toggleQuickLogPill(${i}, 'brickOp')">
          ${state.brickOp ? '💥 Opp Brick' : '✅ Opp Brick'}
        </button>
      </div>
    `;
    grid.appendChild(card);
  }
};

window.toggleQuickLogPill = function(gameNum, field) {
  if (!window.quickLogPillState[gameNum]) return;
  if (field === 'start') {
    window.quickLogPillState[gameNum].start = window.quickLogPillState[gameNum].start === '1º' ? '2º' : '1º';
  } else if (field === 'brick') {
    window.quickLogPillState[gameNum].brick = !window.quickLogPillState[gameNum].brick;
  } else if (field === 'brickOp') {
    window.quickLogPillState[gameNum].brickOp = !window.quickLogPillState[gameNum].brickOp;
  }
  renderQuickLogTouchPills();
};

window.quickLogMatch = function(resultado) {
  const player   = document.getElementById('quickLogPlayer')?.value;
  const deckName = document.getElementById('quickLogDeck')?.value;
  const advName  = document.getElementById('quickLogAdvName')?.value.trim() || 'Oponente';
  const deckAdv  = document.getElementById('quickLogDeckAdv')?.value;
  const formato  = document.getElementById('quickLogFormato')?.value || 'MD1';
  const colecao  = document.getElementById('quickLogColecao')?.value;
  const local    = document.getElementById('quickLogLocal')?.value;
  updatePlacarDropdown('quickLogFormato', 'quickLogPlacar', null, resultado);
  const placarInput = document.getElementById('quickLogPlacar')?.value || (formato === 'MD1' ? '1-0' : '2-0');

  if (!player)   { showToast('⚠️ Selecione seu player.'); return; }
  if (!deckName) { showToast('⚠️ Selecione seu deck.'); return; }
  if (!deckAdv)  { showToast('⚠️ Selecione o deck do oponente.'); return; }
  if (!formato)  { showToast('⚠️ Selecione o formato (MD1 ou MD3).'); return; }
  if (!colecao || colecao === '' || colecao.toLowerCase().includes('toda')) { showToast('⚠️ Selecione a coleção da partida (não pode ser vazia nem "Todas").'); return; }
  if (!local)    { showToast('⚠️ Selecione o local da partida.'); return; }
  if (!placarInput) { showToast('⚠️ Informe o placar da partida (ex: 2-1).'); return; }

  const count = formato === 'MD3' ? getGameCountFromPlacar('MD3', placarInput) : 1;
  let gamesDetail = null;

  if (formato === 'MD3') {
    gamesDetail = [];
    for (let i = 1; i <= count; i++) {
      const st = window.quickLogPillState[i] || { start: i === 1 ? '1º' : '2º', brick: false, brickOp: false };
      gamesDetail.push({
        game: i,
        start: st.start,
        brick: st.brick ? 'Sim' : 'Não',
        brickOp: st.brickOp ? 'Sim' : 'Não'
      });
    }
  }

  const startVal = (formato === 'MD3' && gamesDetail)
    ? gamesDetail.map(g => g.start).join(', ')
    : (window.quickLogPillState[1]?.start || document.getElementById('quickLogStart')?.value || '1º');

  const brickVal = (formato === 'MD3' && gamesDetail)
    ? (gamesDetail.some(g => g.brick === 'Sim') ? 'Sim' : 'Não')
    : (window.quickLogPillState[1]?.brick ? 'Sim' : 'Não');

  const brickOpVal = (formato === 'MD3' && gamesDetail)
    ? (gamesDetail.some(g => g.brickOp === 'Sim') ? 'Sim' : 'Não')
    : (window.quickLogPillState[1]?.brickOp ? 'Sim' : 'Não');

  const pontos = resultado === 'Vitória' ? 1 : resultado === 'Empate' ? 0.5 : 0;

  const ownDeckObj = decks.find(d => d.name === deckName);
  const advDeckObj = decks.find(d => d.name === deckAdv);
  const arquetipo    = ownDeckObj?.arquetipo || deckName;
  const arquetipoAdv = advDeckObj?.arquetipo || deckAdv;

  const matchData = {
    id:             Date.now().toString() + Math.random().toString(36).substr(2, 4),
    Data:           new Date().toISOString().slice(0, 10),
    Player:         player,
    Deck:           deckName,
    Arquetipo:      arquetipo,
    Adversario:     advName,
    DeckAdv:        deckAdv,
    DeckAdvArquetipo: arquetipoAdv,
    Luck:           0,
    Formato:        formato,
    Start:          startVal,
    Resultado:      resultado,
    Pontos:         pontos,
    Placar:         placarInput,
    Local:          local,
    Colecao:        colecao,
    Brick:          brickVal,
    BrickOp:        brickOpVal,
    Confiabilidade: document.getElementById('quickLogConfiabilidade')?.value || 'Alta',
    GamesDetail:    gamesDetail,
    Comentarios:    'Registrado via Quick Log (Mobile)',
    createdAt:      new Date().toISOString(),
    _manual:        true
  };

  const manual = loadManual();

  if (!matchData.seqID && !matchData.seqId) {
    matchData.seqID = typeof getNextSeqID === 'function' ? getNextSeqID(manual) : (manual.length + 1);
    matchData.seqId = matchData.seqID;
    matchData._displayId = matchData.seqID;
  }

  const mirrorMatch = buildMirrorMatch(matchData);
  if (mirrorMatch) {
    matchData._mirrorId = mirrorMatch.id;
    if (!mirrorMatch.seqID && !mirrorMatch.seqId) {
      mirrorMatch.seqID = typeof getNextSeqID === 'function' ? getNextSeqID(manual) : (matchData.seqID + 1);
      mirrorMatch.seqId = mirrorMatch.seqID;
      mirrorMatch._displayId = mirrorMatch.seqID;
    }
  }

  manual.push(matchData);
  if (mirrorMatch) manual.push(mirrorMatch);
  saveManual(manual);

  if (typeof allData !== 'undefined' && Array.isArray(allData)) {
    allData.push(matchData);
    if (mirrorMatch) allData.push(mirrorMatch);
  }

  const opD = document.getElementById('quickLogDeckAdv');
  if (opD) opD.value = '';
  const plc = document.getElementById('quickLogPlacar');
  if (plc) plc.value = '';

  if (typeof populateFilters === 'function') populateFilters();
  if (typeof applyFilters    === 'function') applyFilters();

  if (mirrorMatch) {
    showToast(`⚡ Partida registrada para ${player} e espelho automático para ${mirrorMatch.Player}!`);
  } else {
    showToast(`⚡ Partida (${resultado} - ${placarInput} em ${colecao}) registrada!`);
  }
};

function initQuickLogToggle() {
  const btn = document.getElementById('btnToggleQuickLog');
  const body = document.getElementById('quickLogBody');
  if (!btn || !body) return;

  const collapsed = localStorage.getItem('jornada_quicklog_collapsed') === 'true';
  if (collapsed) {
    body.classList.add('collapsed');
    btn.textContent = '▲ Expandir';
  }

  btn.addEventListener('click', () => {
    const isCollapsed = body.classList.toggle('collapsed');
    btn.textContent = isCollapsed ? '▲ Expandir' : '▼ Recolher';
    localStorage.setItem('jornada_quicklog_collapsed', isCollapsed);
  });
}

// ── ONLINE SYNC FUNCTIONALITY ───────────────────────────────────────────────
let syncInterval   = null;
let isSyncing      = false;   // true while a push HTTP request is in-flight
let isPullPushing  = false;   // true while pull triggered a remediation push
let lastWriteTime  = 0;       // timestamp of last local write action
let pushDebounceTimer = null; // debounce timer for triggerSyncPush

function getSyncUrl(token) {
  const isLocalFile = window.location.protocol === 'file:';
  const cleanToken = token.replace(/[^a-zA-Z0-9_-]/g, '');
  const ts = Date.now();
  return isLocalFile 
    ? `https://keyvalue.xyz/v1/jornada_sync_${cleanToken}?_t=${ts}` 
    : `/api/sync?token=${cleanToken}&_t=${ts}`;
}

async function pullFromCloud(quiet = false) {
  try {
      const vRes = await fetch(`./version.json?t=${Date.now()}`);
      if (vRes.ok) {
        const vData = await vRes.json();
        const el = document.getElementById('appVersion') || document.getElementById('appVersionAuth');
        const currHTML = el ? el.textContent.replace('v', '').trim() : '';
        if (vData.version && currHTML && vData.version !== currHTML) {
          console.log(`Nova versão detectada: ${vData.version} (Atual: ${currHTML}). Atualizando...`);
          if (typeof showToast === 'function') showToast('🚀 Nova versão do sistema lançada! Atualizando painel...', 'info');
          setTimeout(() => location.reload(true), 2500);
          return;
        }
      }
    } catch (e) {}

  const token = localStorage.getItem('jornada_sync_token');
  if (!token) return;
  if (isSyncing) {
    if (!quiet) console.log('⏳ Sync [Pull]: Pulado pois uma gravação (Push) está ativa.');
    return;
  }
  if (Date.now() - lastWriteTime < 6000) {
    if (!quiet) console.log('⏳ Sync [Pull]: Pulado para evitar colisão com uma gravação local recente.');
    return;
  }

  try {
    if (!quiet) {
      console.log(`🌐 Sync [Pull]: Iniciando consulta na nuvem para o token...`);
      setSyncStatus('connecting', 'Conectando…');
    }
    
    const res = await fetch(getSyncUrl(token));
    if (!res.ok) {
      if (res.status === 404) {
        console.warn('⚠️ Sync [Pull]: Chave inexistente ou sem dados na nuvem. Enviando dados locais iniciais...');
        await pushToCloud();
        setSyncStatus('connected', 'Sincronizado');
        return;
      }
      throw new Error('Server error');
    }
    
    const data = await res.json();
    if (data && typeof data === 'object') {
      const cloudDecks    = data.decks || [];
      const cloudMatches  = data.manualMatches || [];
      const cloudPlayers  = data.players || [];
      const cloudLocais   = data.locais || [];
      const cloudColecoes = data.colecoes || [];

      const cloudDeleted         = data.deletedIds || [];
      const cloudDeletedDecks    = data.deletedDecks || [];
      const cloudDeletedPlayers  = data.deletedPlayers || [];
      const cloudDeletedLocais   = data.deletedLocais || [];
      const cloudDeletedColecoes = data.deletedColecoes || [];

      const cloudEdits    = data.editedMatches || {};
      const cloudAdminPin = data.adminPin !== undefined ? data.adminPin : null;

      if (cloudAdminPin !== null) {
        if (cloudAdminPin) {
          localStorage.setItem(KEY_ADMIN_PIN, cloudAdminPin);
        } else {
          localStorage.removeItem(KEY_ADMIN_PIN);
          sessionStorage.removeItem('jornada_admin_unlocked');
        }
      }

      const localDecks    = loadDecks();
      const localMatches  = loadManual();
      const localPlayers  = loadPlayers();
      const localLocais   = loadLocais();
      const localColecoes = loadColecoes();

      const localDeleted         = [...loadDeleted()];
      const localDeletedDecks    = [...loadDeletedDecks()];
      const localDeletedPlayers  = [...loadDeletedPlayers()];
      const localDeletedLocais   = [...loadDeletedLocais()];
      const localDeletedColecoes = [...loadDeletedColecoes()];

      const localEdits = loadEdits();
      const combinedDeleted         = new Set([...localDeleted, ...cloudDeleted]);
      const combinedDeletedDecks    = new Set([...localDeletedDecks, ...cloudDeletedDecks]);
      const combinedDeletedPlayers  = new Set([...localDeletedPlayers, ...cloudDeletedPlayers]);
      const combinedDeletedLocais   = new Set([...localDeletedLocais, ...cloudDeletedLocais]);
      const combinedDeletedColecoes = new Set([...localDeletedColecoes, ...cloudDeletedColecoes]);

      // ── CRITICAL FIX: Local live decks override cloud deletion markers ───────
      localDecks.forEach(d => {
        if (d?.id)   combinedDeletedDecks.delete(d.id);
        if (d?.name) combinedDeletedDecks.delete(d.name);
      });
      const combinedEdits = { ...localEdits, ...cloudEdits };
      const matchesMap = new Map();
      [...localMatches, ...cloudMatches].forEach(m => {
        if (combinedDeleted.has(m.id)) return;
        const finalMatch = combinedEdits[m.id] || m;
        matchesMap.set(m.id, finalMatch);
      });
      const finalMatches = Array.from(matchesMap.values());
      const decksMap = new Map();
      const getDeckKey = d => (typeof d === 'string' ? d : d?.name || d?.id || '').toLowerCase().trim();

      cloudDecks.forEach(d => {
        const name = typeof d === 'string' ? d : d?.name;
        const id = typeof d === 'object' ? d?.id : null;
        if (combinedDeletedDecks.has(id) || combinedDeletedDecks.has(name)) return;
        const key = getDeckKey(d);
        if (key) decksMap.set(key, typeof d === 'string' ? { id: Date.now().toString(), name: d, list: '' } : d);
      });

      localDecks.forEach(d => {
        const key = getDeckKey(d);
        if (key) decksMap.set(key, typeof d === 'string' ? { id: Date.now().toString(), name: d, list: '' } : d);
      });

      const finalDecks = Array.from(decksMap.values());
      const finalPlayers = [...new Set([...localPlayers, ...cloudPlayers])].filter(p => !combinedDeletedPlayers.has(p));
      const finalLocais = [...new Set([...localLocais, ...cloudLocais])].filter(l => !combinedDeletedLocais.has(l));
      const finalColecoes = [...new Set([...localColecoes, ...cloudColecoes])].filter(c => !combinedDeletedColecoes.has(c));
      const canonicalStringify = (obj) => JSON.stringify(obj, (key, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          return Object.keys(value).sort().reduce((acc, k) => {
            acc[k] = value[k];
            return acc;
          }, {});
        }
        return value;
      });
      const localDecksStr    = canonicalStringify(localDecks);
      const localMatchesStr  = canonicalStringify(localMatches);
      const localPlayersStr  = canonicalStringify(localPlayers);
      const localLocaisStr   = canonicalStringify(localLocais);
      const localColecoesStr = canonicalStringify(localColecoes);

      const localDeletedStr         = canonicalStringify(localDeleted);
      const localDeletedDecksStr    = canonicalStringify(localDeletedDecks);
      const localDeletedPlayersStr  = canonicalStringify(localDeletedPlayers);
      const localDeletedLocaisStr   = canonicalStringify(localDeletedLocais);
      const localDeletedColecoesStr = canonicalStringify(localDeletedColecoes);
      const localEditsStr           = canonicalStringify(localEdits);

      const finalDecksStr    = canonicalStringify(finalDecks);
      const finalMatchesStr  = canonicalStringify(finalMatches);
      const finalPlayersStr  = canonicalStringify(finalPlayers);
      const finalLocaisStr   = canonicalStringify(finalLocais);
      const finalColecoesStr = canonicalStringify(finalColecoes);

      const finalDeletedStr         = canonicalStringify([...combinedDeleted]);
      const finalDeletedDecksStr    = canonicalStringify([...combinedDeletedDecks]);
      const finalDeletedPlayersStr  = canonicalStringify([...combinedDeletedPlayers]);
      const finalDeletedLocaisStr   = canonicalStringify([...combinedDeletedLocais]);
      const finalDeletedColecoesStr = canonicalStringify([...combinedDeletedColecoes]);
      const finalEditsStr           = canonicalStringify(combinedEdits);

      const hasLocalChanges = (localDecksStr !== finalDecksStr || localMatchesStr !== finalMatchesStr ||
                               localPlayersStr !== finalPlayersStr || localLocaisStr !== finalLocaisStr || localColecoesStr !== finalColecoesStr ||
                               localDeletedStr !== finalDeletedStr || localDeletedDecksStr !== finalDeletedDecksStr ||
                               localDeletedPlayersStr !== finalDeletedPlayersStr || localDeletedLocaisStr !== finalDeletedLocaisStr ||
                               localDeletedColecoesStr !== finalDeletedColecoesStr || localEditsStr !== finalEditsStr);

      const hasCloudChanges = (canonicalStringify(cloudDecks) !== finalDecksStr || canonicalStringify(cloudMatches) !== finalMatchesStr ||
                               JSON.stringify(cloudPlayers) !== finalPlayersStr || JSON.stringify(cloudLocais) !== finalLocaisStr || JSON.stringify(cloudColecoes) !== finalColecoesStr ||
                               JSON.stringify(cloudDeleted) !== finalDeletedStr || JSON.stringify(cloudDeletedDecks) !== finalDeletedDecksStr ||
                               JSON.stringify(cloudDeletedPlayers) !== finalDeletedPlayersStr || JSON.stringify(cloudDeletedLocais) !== finalDeletedLocaisStr ||
                               JSON.stringify(cloudDeletedColecoes) !== finalDeletedColecoesStr || JSON.stringify(cloudEdits) !== finalEditsStr);

      if (hasLocalChanges) {
        console.log('🔄 Sync [Pull]: Novos dados mesclados localmente! Atualizando banco local...');
        localStorage.setItem(KEY_DECKS, finalDecksStr);
        localStorage.setItem(KEY_MATCHES, finalMatchesStr);
        localStorage.setItem(KEY_PLAYERS, finalPlayersStr);
        localStorage.setItem(KEY_LOCAIS, finalLocaisStr);
        localStorage.setItem(KEY_COLECOES, finalColecoesStr);

        localStorage.setItem(KEY_DELETED, finalDeletedStr);
        localStorage.setItem(KEY_DELETED_DECKS, finalDeletedDecksStr);
        localStorage.setItem(KEY_DELETED_PLAYERS, finalDeletedPlayersStr);
        localStorage.setItem(KEY_DELETED_LOCAIS, finalDeletedLocaisStr);
        localStorage.setItem(KEY_DELETED_COLECOES, finalDeletedColecoesStr);
        localStorage.setItem(KEY_EDITS, finalEditsStr);

        decks    = finalDecks;
        players  = finalPlayers;
        locais   = finalLocais;
        colecoes = finalColecoes;

        if (typeof initializeData === 'function') initializeData();
        if (typeof populateFilters === 'function') populateFilters();
        if (typeof applyFilters === 'function') applyFilters();
        if (typeof populatePlayerSelects === 'function') populatePlayerSelects();
        if (typeof populatePlayerRegisterDropdowns === 'function') populatePlayerRegisterDropdowns();
        if (typeof populateDeckSelects === 'function') populateDeckSelects();
        if (typeof populateLocalSelects === 'function') populateLocalSelects();
        if (typeof populateColecaoSelects === 'function') populateColecaoSelects();
        if (typeof renderDecksList === 'function') renderDecksList();
        if (typeof renderPlayersList === 'function') renderPlayersList();
        if (typeof renderLocaisList === 'function') renderLocaisList();
        if (typeof renderColecoesList === 'function') renderColecoesList();
        populateQuickLogDropdowns();
      }

      if (hasCloudChanges && !isPullPushing) {
        console.log('🌐 Sync [Pull → Push]: Dados locais têm novidades. Enviando para a nuvem...');
        isPullPushing = true;
        try {
          await pushToCloud();
        } finally {
          isPullPushing = false;
        }
      } else if (!hasLocalChanges && !hasCloudChanges) {
        if (!quiet) console.log('🟢 Sync [Pull]: Dados locais e da nuvem estão em perfeita harmonia.');
      }
      setSyncStatus('connected', 'Sincronizado');
    }
  } catch (err) {
    console.error('❌ Sync [Pull] Error:', err);
    setSyncStatus('error', 'Erro de Conexão');
  }
}

let pendingPush = false;

async function pushToCloud() {
  const token = localStorage.getItem('jornada_sync_token');
  if (!token) return;
  if (isSyncing) {
    console.log('⏳ Sync [Push]: Envio em andamento. Agendando próximo envio para após a conclusão...');
    pendingPush = true;
    return;
  }

  isSyncing = true;
  try {
    const payload = {
      decks: loadDecks(),
      manualMatches: loadManual(),
      players: loadPlayers(),
      locais: loadLocais(),
      colecoes: loadColecoes(),
      deletedIds: [...loadDeleted()],
      deletedDecks: [...loadDeletedDecks()],
      deletedPlayers: [...loadDeletedPlayers()],
      deletedLocais: [...loadDeletedLocais()],
      deletedColecoes: [...loadDeletedColecoes()],
      editedMatches: loadEdits()
    };
    
    console.log(`🌐 Sync [Push]: Enviando dados locais para o banco na nuvem...`, {
      decksCount: payload.decks.length,
      matchesCount: payload.manualMatches.length,
      playersCount: payload.players.length,
      locaisCount: payload.locais.length,
      deletedCount: payload.deletedIds.length
    });

    const res = await fetch(getSyncUrl(token), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) throw new Error('Push failed');
    
    console.log('🟢 Sync [Push]: Sucesso! Dados salvos e propagados no banco de dados da nuvem.');
    setSyncStatus('connected', 'Sincronizado');
  } catch (err) {
    console.error('❌ Sync [Push] Error:', err);
    setSyncStatus('error', 'Erro ao enviar');
  } finally {
    isSyncing = false;
    if (pendingPush) {
      pendingPush = false;
      pushToCloud();
    }
  }
}
function triggerSyncPush() {
  lastWriteTime = Date.now();
  if (pushDebounceTimer) clearTimeout(pushDebounceTimer);
  pushDebounceTimer = setTimeout(() => {
    pushDebounceTimer = null;
    const token = localStorage.getItem('jornada_sync_token');
    if (token) pushToCloud();
  }, 800);
}

function setSyncStatus(state, text) {
  const dot = document.getElementById('syncStatusIndicator');
  const txt = document.getElementById('syncStatusText');
  const hDot = document.getElementById('headerSyncDot');

  const colors = {
    disconnected: { color: '#f75050', label: 'Desativado (Local)' },
    connecting: { color: '#f5c842', label: 'Conectando…' },
    connected: { color: '#34e0a1', label: 'Sincronizado' },
    error: { color: '#f75050', label: text || 'Erro de Conexão' }
  };

  const status = colors[state] || colors.disconnected;

  if (dot) dot.style.background = status.color;
  if (txt) { txt.textContent = status.label; txt.style.color = status.color; }
  if (hDot) hDot.style.background = status.color;
}

function startSyncInterval() {
  stopSyncInterval();
  pullFromCloud();
  syncInterval = setInterval(() => {
    pullFromCloud(true);
  }, 15000);
}

function stopSyncInterval() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('💤 Sync: Aba em segundo plano. Pausando consultas automáticas para economizar requisições no banco...');
    stopSyncInterval();
  } else {
    const token = localStorage.getItem('jornada_sync_token');
    if (token) {
      console.log('⚡ Sync: Aba reativada. Retomando consultas automáticas...');
      startSyncInterval();
    }
  }
});

function initSyncUI() {
  const curToken = 'team_default_sync';
  localStorage.setItem('jornada_sync_token', curToken);
  pullFromCloud(true);
  startSyncInterval();
}

// ── INIT ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  window.loadManual  = loadManual;
  window.showToast   = showToast;
  window.triggerSyncPush = triggerSyncPush;

  populatePlayerSelects();
  populateDeckSelects();
  renderDecksList();
  renderPlayersList();
  renderLocaisList();
  renderColecoesList();
  populateQuickLogDropdowns();
  initSyncUI();
  initQuickLogToggle();
  const listTA = document.getElementById('formDeckList');
  if (listTA) listTA.addEventListener('input', updateCardCounter);

  document.getElementById('formMatchDeckOwnList')?.addEventListener('input', updateMatchDeckCounters);
  document.getElementById('formMatchDeckAdvList')?.addEventListener('input', updateMatchDeckCounters);
  const luckSlider = document.getElementById('formMatchLuck');
  if (luckSlider) {
    luckSlider.addEventListener('input', () => {
      document.getElementById('luckDisplay').textContent = luckSlider.value;
    });
  }
  const localSel = document.getElementById('formMatchLocal');
  if (localSel) {
    localSel.addEventListener('change', () => {
      const customWrap = document.getElementById('formMatchLocalCustom');
      customWrap.style.display = localSel.value === '__outro__' ? 'block' : 'none';
    });
  }
  document.querySelectorAll('#brickToggleGroup .brick-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('#brickToggleGroup .brick-toggle').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const input = document.getElementById('formMatchBrick');
      if (input) input.value = btn.dataset.value;
    });
  });

  document.querySelectorAll('#brickOpToggleGroup .brick-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('#brickOpToggleGroup .brick-toggle').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const input = document.getElementById('formMatchBrickOp');
      if (input) input.value = btn.dataset.value;
    });
  });

  document.querySelectorAll('#confiabilidadeToggleGroup .brick-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('#confiabilidadeToggleGroup .brick-toggle').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const input = document.getElementById('formMatchConfiabilidade');
      if (input) input.value = btn.dataset.value;
    });
  });
  document.getElementById('btnSaveDeck')?.addEventListener('click', saveDeckForm);
  document.getElementById('btnSaveMatch')?.addEventListener('click', saveMatchForm);
  document.getElementById('btnAddPlayer')?.addEventListener('click', addPlayer);
  document.getElementById('newPlayerName')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') addPlayer();
  });
  document.getElementById('btnAddLocal')?.addEventListener('click', addLocal);
  document.getElementById('newLocalName')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') addLocal();
  });
  document.getElementById('btnAddColecao')?.addEventListener('click', addColecao);
  document.getElementById('newColecaoName')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') addColecao();
  });
  document.getElementById('btnQuickWin')?.addEventListener('click', () => quickLogMatch('Vitória'));
  document.getElementById('btnQuickDraw')?.addEventListener('click', () => quickLogMatch('Empate'));
  document.getElementById('btnQuickLoss')?.addEventListener('click', () => quickLogMatch('Derrota'));
  document.getElementById('quickLogFormato')?.addEventListener('change', () => {
    updatePlacarDropdown('quickLogFormato', 'quickLogPlacar');
  });

  document.getElementById('formMatchFormato')?.addEventListener('change', () => {
    updatePlacarDropdown('formMatchFormato', 'formMatchPlacar', null, null, 'formMatchResultado');
  });

  document.getElementById('formMatchResultado')?.addEventListener('change', () => {
    updatePlacarDropdown('formMatchFormato', 'formMatchPlacar', null, null, 'formMatchResultado');
  });
  updatePlacarDropdown('quickLogFormato', 'quickLogPlacar');
  updatePlacarDropdown('formMatchFormato', 'formMatchPlacar', null, null, 'formMatchResultado');
  document.getElementById('btnQuickAddDeckOwn')?.addEventListener('click', () => openDeckFormForTarget('quickLogDeck'));
  document.getElementById('btnQuickAddDeckAdv')?.addEventListener('click', () => openDeckFormForTarget('quickLogDeckAdv'));
  document.getElementById('btnFormAddDeckOwn')?.addEventListener('click', () => openDeckFormForTarget('formMatchDeck'));
  document.getElementById('btnFormAddDeckAdv')?.addEventListener('click', () => openDeckFormForTarget('formMatchDeckAdv'));
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
  document.getElementById('fabBtn')?.addEventListener('click', () => openMatchForm());
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab)?.classList.add('active');
    });
  });
  const closeManager = () => document.getElementById('managerPanel')?.classList.remove('open');

  document.getElementById('btnOpenManager')?.addEventListener('click', () => {
    openProtectedManager();
  });
  document.getElementById('btnCloseManager')?.addEventListener('click', closeManager);
  document.getElementById('btnCloseManagerFooter')?.addEventListener('click', closeManager);
  document.getElementById('panelOverlay')?.addEventListener('click', closeManager);

  document.getElementById('btnLockManager')?.addEventListener('click', () => {
    lockAdminAccess();
  });
  document.getElementById('btnSubmitAdminAuth')?.addEventListener('click', submitAdminAuth);
  document.getElementById('adminPinInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') submitAdminAuth();
  });
  document.getElementById('adminPinConfirmInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') submitAdminAuth();
  });
  document.getElementById('btnToggleAdminPinVisibility')?.addEventListener('click', () => {
    const pinIn = document.getElementById('adminPinInput');
    const confIn = document.getElementById('adminPinConfirmInput');
    if (pinIn) {
      const isPass = pinIn.type === 'password';
      pinIn.type = isPass ? 'text' : 'password';
      if (confIn) confIn.type = isPass ? 'text' : 'password';
    }
  });
  document.getElementById('btnSaveNewAdminPin')?.addEventListener('click', () => {
    const p1 = document.getElementById('changeAdminPinNew')?.value.trim();
    const p2 = document.getElementById('changeAdminPinConfirm')?.value.trim();
    if (!p1 || p1.length < 4) { alert('A senha deve ter pelo menos 4 caracteres.'); return; }
    if (p1 !== p2) { alert('As senhas não coincidem!'); return; }
    localStorage.setItem(KEY_ADMIN_PIN, p1);
    triggerSyncPush();
    document.getElementById('changeAdminPinNew').value = '';
    document.getElementById('changeAdminPinConfirm').value = '';
    showToast('🔑 Senha de administrador atualizada e sincronizada com a nuvem!');
  });

  document.getElementById('btnRemoveAdminPin')?.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja remover a proteção por senha do Gerenciador de Dados? Qualquer pessoa poderá acessar os dados.')) {
      localStorage.removeItem(KEY_ADMIN_PIN);
      sessionStorage.removeItem('jornada_admin_unlocked');
      triggerSyncPush();
      showToast('🔓 Proteção por senha desativada.');
    }
  });
  document.getElementById('btnExportBackup')?.addEventListener('click', () => window.exportBackup());
  document.getElementById('backupFileInput')?.addEventListener('change', e => {
    if (e.target.files[0]) window.importBackup(e.target.files[0]);
  });
  const manual = loadManual();
  if (manual.length && typeof allData !== 'undefined') {
    const existingIds = new Set(allData.map(m => m.id).filter(Boolean));
    manual.forEach(m => { if (!existingIds.has(m.id)) allData.push(m); });
    if (typeof populateFilters === 'function') populateFilters();
    if (typeof applyFilters    === 'function') applyFilters();
  }
});

// ── ADMIN ACCESS ────────────────────────────────────────────────
async function openProtectedManager() {
  document.getElementById('managerPanel').classList.add('open');
  renderDecksList();
  renderPlayersList();
  renderLocaisList();
  renderColecoesList();
}

function lockAdminAccess() {
  sessionStorage.removeItem('jornada_admin_unlocked');
  document.getElementById('managerPanel').classList.remove('open');
  showToast('🔒 Gerenciador de dados bloqueado!');
}

window.exportBackup = function() {
  const payload = {
    decks: loadDecks(),
    manualMatches: loadManual(),
    players: loadPlayers(),
    locais: loadLocais(),
    deletedIds: [...loadDeleted()],
    deletedDecks: [...loadDeletedDecks()],
    deletedPlayers: [...loadDeletedPlayers()],
    deletedLocais: [...loadDeletedLocais()],
    editedMatches: loadEdits()
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `jornada_backup_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('📥 Backup baixado com sucesso!');
};

window.importBackup = function(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data && typeof data === 'object') {
        if (!data.decks && !data.manualMatches && !data.players) {
          throw new Error('Formato de backup inválido.');
        }

        localStorage.setItem(KEY_DECKS, JSON.stringify(data.decks || []));
        localStorage.setItem(KEY_MATCHES, JSON.stringify(data.manualMatches || []));
        localStorage.setItem(KEY_PLAYERS, JSON.stringify(data.players || []));
        localStorage.setItem(KEY_LOCAIS, JSON.stringify(data.locais || []));
        localStorage.setItem(KEY_DELETED, JSON.stringify(data.deletedIds || []));
        localStorage.setItem(KEY_DELETED_DECKS, JSON.stringify(data.deletedDecks || []));
        localStorage.setItem(KEY_DELETED_PLAYERS, JSON.stringify(data.deletedPlayers || []));
        localStorage.setItem(KEY_DELETED_LOCAIS, JSON.stringify(data.deletedLocais || []));
        localStorage.setItem(KEY_EDITS, JSON.stringify(data.editedMatches || {}));

        decks   = data.decks || [];
        players = data.players || [];
        locais  = data.locais || [];

        if (typeof resetAllFilters === 'function') resetAllFilters();
        else {
          if (typeof isExplicitPlayerSelection !== 'undefined') isExplicitPlayerSelection = false;
          if (typeof isExplicitSelection !== 'undefined') isExplicitSelection = false;
          if (typeof initializeData === 'function') initializeData();
          if (typeof populateFilters === 'function') populateFilters();
          if (typeof applyFilters === 'function') applyFilters();
        }
        if (typeof populatePlayerSelects === 'function') populatePlayerSelects();
        if (typeof populateDeckSelects === 'function') populateDeckSelects();
        if (typeof populateLocalSelects === 'function') populateLocalSelects();
        if (typeof renderDecksList === 'function') renderDecksList();
        if (typeof renderPlayersList === 'function') renderPlayersList();
        if (typeof renderLocaisList === 'function') renderLocaisList();
        if (typeof populateQuickLogDropdowns === 'function') populateQuickLogDropdowns();

        triggerSyncPush();
        showToast('📤 Backup restaurado com sucesso!');
        
        const el = document.getElementById('backupFileInput');
        if (el) el.value = '';
      }
    } catch (err) {
      alert('Erro ao importar backup: ' + err.message);
      console.error(err);
    }
  };
  reader.readAsText(file);
};

// ── AUTOMATED DAILY BACKUP SYSTEM ────────────────────────────────────────────
const KEY_AUTO_BACKUPS = 'jornada_auto_backups';
const KEY_LAST_AUTO_BACKUP_DATE = 'jornada_last_auto_backup_date';

function checkAndRunDailyAutoBackup(force = false) {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const lastBackupDate = localStorage.getItem(KEY_LAST_AUTO_BACKUP_DATE);

    if (!force && lastBackupDate === todayStr) {
      renderAutoBackupsList();
      return;
    }

    const payload = {
      decks: loadDecks(),
      manualMatches: loadManual(),
      players: loadPlayers(),
      locais: loadLocais(),
      colecoes: loadColecoes(),
      deletedIds: [...loadDeleted()],
      deletedDecks: [...loadDeletedDecks()],
      deletedPlayers: [...loadDeletedPlayers()],
      deletedLocais: [...loadDeletedLocais()],
      deletedColecoes: [...loadDeletedColecoes()],
      editedMatches: loadEdits()
    };

    const matchesCount = (typeof allData !== 'undefined' && Array.isArray(allData)) ? allData.length : payload.manualMatches.length;

    const snapshot = {
      id: 'auto_' + todayStr + '_' + Date.now(),
      date: todayStr,
      timestamp: new Date().toISOString(),
      type: force ? 'manual_snapshot' : 'auto_daily',
      decksCount: payload.decks.length,
      matchesCount: matchesCount,
      payload
    };

    let backupsList = [];
    try {
      backupsList = JSON.parse(localStorage.getItem(KEY_AUTO_BACKUPS)) || [];
    } catch (e) {
      backupsList = [];
    }
    backupsList = backupsList.filter(b => b.date !== todayStr || force);
    backupsList.unshift(snapshot);
    if (backupsList.length > 7) backupsList = backupsList.slice(0, 7);

    safeSetItem(KEY_AUTO_BACKUPS, JSON.stringify(backupsList));
    safeSetItem(KEY_LAST_AUTO_BACKUP_DATE, todayStr);

    console.log(`💾 Backup Diário Automático (${todayStr}): Criado snapshot com ${snapshot.matchesCount} partidas e ${snapshot.decksCount} decks.`);
    if (force && typeof showToast === 'function') {
      showToast(`💾 Snapshot de backup salvo! (${todayStr})`);
    }
    renderAutoBackupsList();
  } catch (err) {
    console.error('❌ Erro no Backup Diário Automático:', err);
  }
}

window.renderAutoBackupsList = function() {
  const container = document.getElementById('autoBackupsList');
  if (!container) return;

  let backupsList = [];
  try {
    backupsList = JSON.parse(localStorage.getItem(KEY_AUTO_BACKUPS)) || [];
  } catch (e) {
    backupsList = [];
  }

  if (backupsList.length === 0) {
    container.innerHTML = '<p style="font-size:0.78rem;color:var(--text2);text-align:center;padding:0.75rem;">Nenhum snapshot automático gerado ainda.</p>';
    return;
  }

  container.innerHTML = backupsList.map(b => {
    const formattedDate = new Date(b.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const isToday = b.date === new Date().toISOString().slice(0, 10);
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg3);padding:0.6rem 0.75rem;border-radius:var(--radius-sm);border:1px solid var(--glass-bd);margin-bottom:0.5rem;font-size:0.78rem;">
        <div>
          <div style="font-weight:600;color:var(--text);display:flex;align-items:center;gap:0.35rem;">
            📅 ${b.date} ${isToday ? '<span style="font-size:0.65rem;background:rgba(46,232,160,0.18);color:var(--green);padding:1px 6px;border-radius:10px;">Hoje</span>' : ''}
          </div>
          <div style="color:var(--text2);font-size:0.72rem;margin-top:2px;">
            🕒 ${formattedDate} &middot; 📊 ${b.matchesCount} partidas &middot; 🃏 ${b.decksCount} decks
          </div>
        </div>
        <div style="display:flex;gap:0.35rem;">
          <button class="icon-btn sm" onclick="downloadAutoBackup('${b.id}')" title="Baixar JSON deste dia">📥</button>
          <button class="icon-btn sm danger" onclick="restoreAutoBackup('${b.id}')" title="Restaurar dados deste dia">🔄</button>
        </div>
      </div>
    `;
  }).join('');
};

window.downloadAutoBackup = function(backupId) {
  let backupsList = [];
  try { backupsList = JSON.parse(localStorage.getItem(KEY_AUTO_BACKUPS)) || []; } catch (e) {}
  const target = backupsList.find(b => b.id === backupId);
  if (!target || !target.payload) { showToast('⚠️ Snapshot não encontrado.'); return; }

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(target.payload, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `jornada_backup_auto_${target.date}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast(`📥 Backup de ${target.date} baixado com sucesso!`);
};

window.restoreAutoBackup = function(backupId) {
  let backupsList = [];
  try { backupsList = JSON.parse(localStorage.getItem(KEY_AUTO_BACKUPS)) || []; } catch (e) {}
  const target = backupsList.find(b => b.id === backupId);
  if (!target || !target.payload) { showToast('⚠️ Snapshot não encontrado.'); return; }

  if (!confirm(`Restaurar o backup do dia ${target.date}? Seus dados atuais serão substituídos pelo estado do dia ${target.date}.`)) return;

  const data = target.payload;
  safeSetItem(KEY_DECKS, JSON.stringify(data.decks || []));
  safeSetItem(KEY_MATCHES, JSON.stringify(data.manualMatches || []));
  safeSetItem(KEY_PLAYERS, JSON.stringify(data.players || []));
  safeSetItem(KEY_LOCAIS, JSON.stringify(data.locais || []));
  safeSetItem(KEY_COLECOES, JSON.stringify(data.colecoes || []));
  safeSetItem(KEY_DELETED, JSON.stringify(data.deletedIds || []));
  safeSetItem(KEY_DELETED_DECKS, JSON.stringify(data.deletedDecks || []));
  safeSetItem(KEY_DELETED_PLAYERS, JSON.stringify(data.deletedPlayers || []));
  safeSetItem(KEY_DELETED_LOCAIS, JSON.stringify(data.deletedLocais || []));
  safeSetItem(KEY_DELETED_COLECOES, JSON.stringify(data.deletedColecoes || []));
  safeSetItem(KEY_EDITS, JSON.stringify(data.editedMatches || {}));

  decks = data.decks || [];
  players = data.players || [];
  locais = data.locais || [];
  colecoes = data.colecoes || [];

  if (typeof resetAllFilters === 'function') resetAllFilters();
  else {
    if (typeof isExplicitPlayerSelection !== 'undefined') isExplicitPlayerSelection = false;
    if (typeof isExplicitSelection !== 'undefined') isExplicitSelection = false;
    if (typeof initializeData === 'function') initializeData();
    if (typeof populateFilters === 'function') populateFilters();
    if (typeof applyFilters === 'function') applyFilters();
  }
  if (typeof populatePlayerSelects === 'function') populatePlayerSelects();
  if (typeof populateDeckSelects === 'function') populateDeckSelects();
  if (typeof populateLocalSelects === 'function') populateLocalSelects();
  if (typeof populateColecaoSelects === 'function') populateColecaoSelects();
  if (typeof renderDecksList === 'function') renderDecksList();
  if (typeof renderPlayersList === 'function') renderPlayersList();
  if (typeof renderLocaisList === 'function') renderLocaisList();
  if (typeof renderColecoesList === 'function') renderColecoesList();
  if (typeof populateQuickLogDropdowns === 'function') populateQuickLogDropdowns();

  triggerSyncPush();
  showToast(`🔄 Backup de ${target.date} restaurado com sucesso!`);
};

window.triggerManualSnapshot = function() {
  checkAndRunDailyAutoBackup(true);
};

// ── BATCH ARCHETYPE UNIFICATION TOOL ─────────────────────────────────────────
window.openUnifyArchetypesModal = function() {
  const selFrom = document.getElementById('unifyFromDeckSelect');
  const inputTarget = document.getElementById('unifyTargetArchetypeInput');
  if (!selFrom || !inputTarget) return;

  const dataset = (typeof allData !== 'undefined' && Array.isArray(allData)) ? allData : [];
  const registeredDeckNames = (typeof decks !== 'undefined' && Array.isArray(decks))
    ? decks.map(d => d.name).filter(Boolean)
    : [];

  const dataDecks = dataset.map(d => d.Deck).filter(Boolean);
  const oppDecks  = dataset.map(d => d.DeckAdv).filter(Boolean);

  const allNames = [...new Set([...registeredDeckNames, ...dataDecks, ...oppDecks])].sort((a, b) => a.localeCompare(b));

  selFrom.innerHTML = '<option value="">Selecione o deck para unificar…</option>';
  allNames.forEach(name => {
    const o = document.createElement('option');
    o.value = name;
    o.textContent = name;
    selFrom.appendChild(o);
  });

  inputTarget.value = '';
  showModal('modalUnifyArchetypes');
};

window.submitUnifyArchetypes = function() {
  const fromDeck = document.getElementById('unifyFromDeckSelect')?.value;
  const targetArchetype = document.getElementById('unifyTargetArchetypeInput')?.value.trim();

  if (!fromDeck) { alert('Selecione o deck atual que deseja unificar.'); return; }
  if (!targetArchetype) { alert('Informe o arquétipo principal alvo.'); return; }

  if (!confirm(`Tem certeza que deseja unificar todas as partidas e registros de "${fromDeck}" para o arquétipo "${targetArchetype}"?`)) {
    return;
  }

  lastWriteTime = Date.now();
  const unifications = typeof loadArchetypeUnifications === 'function' ? loadArchetypeUnifications() : [];
  if (!unifications.some(u => u.fromDeck === fromDeck && u.targetArchetype === targetArchetype)) {
    unifications.push({ fromDeck, targetArchetype, timestamp: Date.now() });
    if (typeof saveArchetypeUnifications === 'function') saveArchetypeUnifications(unifications);
  }
  let updatedCount = 0;
  const manual = loadManual();
  manual.forEach(m => {
    let touched = false;
    if (m.Deck === fromDeck || m.Arquetipo === fromDeck || (typeof getMatchDeck === 'function' && getMatchDeck(m) === fromDeck)) {
      m.Arquetipo = targetArchetype;
      m.Deck = m.Subtipo ? `${targetArchetype} (${m.Subtipo})` : targetArchetype;
      touched = true;
    }
    if (m.DeckAdv === fromDeck || m.DeckAdvArquetipo === fromDeck || (typeof getMatchOppDeck === 'function' && getMatchOppDeck(m) === fromDeck)) {
      m.DeckAdvArquetipo = targetArchetype;
      m.DeckAdv = m.SubtipoAdv ? `${targetArchetype} (${m.SubtipoAdv})` : targetArchetype;
      touched = true;
    }
    if (touched) updatedCount++;
  });
  saveManual(manual);
  const edits = loadEdits();
  Object.values(edits).forEach(m => {
    if (m.Deck === fromDeck || m.Arquetipo === fromDeck || (typeof getMatchDeck === 'function' && getMatchDeck(m) === fromDeck)) {
      m.Arquetipo = targetArchetype;
      m.Deck = m.Subtipo ? `${targetArchetype} (${m.Subtipo})` : targetArchetype;
    }
    if (m.DeckAdv === fromDeck || m.DeckAdvArquetipo === fromDeck || (typeof getMatchOppDeck === 'function' && getMatchOppDeck(m) === fromDeck)) {
      m.DeckAdvArquetipo = targetArchetype;
      m.DeckAdv = m.SubtipoAdv ? `${targetArchetype} (${m.SubtipoAdv})` : targetArchetype;
    }
  });
  saveEdits(edits);
  decks.forEach(d => {
    if (d.name === fromDeck || d.arquetipo === fromDeck) {
      d.arquetipo = targetArchetype;
      d.name = d.subtipo ? `${targetArchetype} (${d.subtipo})` : targetArchetype;
    }
  });
  saveDecks(decks);
  if (typeof allData !== 'undefined' && Array.isArray(allData)) {
    allData.forEach(m => {
      if (m.Deck === fromDeck || m.Arquetipo === fromDeck || (typeof getMatchDeck === 'function' && getMatchDeck(m) === fromDeck)) {
        m.Arquetipo = targetArchetype;
        m.Deck = m.Subtipo ? `${targetArchetype} (${m.Subtipo})` : targetArchetype;
      }
      if (m.DeckAdv === fromDeck || m.DeckAdvArquetipo === fromDeck || (typeof getMatchOppDeck === 'function' && getMatchOppDeck(m) === fromDeck)) {
        m.DeckAdvArquetipo = targetArchetype;
        m.DeckAdv = m.SubtipoAdv ? `${targetArchetype} (${m.SubtipoAdv})` : targetArchetype;
      }
    });
  }

  triggerSyncPush();

  if (typeof populateDeckSelects === 'function') populateDeckSelects();
  if (typeof renderDecksList     === 'function') renderDecksList();
  if (typeof populateFilters     === 'function') populateFilters();
  if (typeof applyFilters        === 'function') applyFilters();

  closeModal('modalUnifyArchetypes');
  showToast(`🔗 Arquétipo "${fromDeck}" unificado em "${targetArchetype}" com sucesso! (${updatedCount} registros atualizados)`);
};
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(checkAndRunDailyAutoBackup, 1500));
} else {
  setTimeout(checkAndRunDailyAutoBackup, 1500);
}



