/* ============================================================
   JORNADA DASHBOARD — manager.js
   CRUD: Decks (com lista PTCGL), Partidas manuais, Players
   ============================================================ */

'use strict';

// ── STORAGE KEYS ─────────────────────────────────────────────────────────────
const KEY_DECKS   = 'jornada_decks';
const KEY_MATCHES = 'jornada_manual_matches';
const KEY_PLAYERS = 'jornada_players';
const KEY_DELETED = 'jornada_deleted_ids';
const KEY_EDITS   = 'jornada_edited_matches';

// ── LOAD / SAVE ───────────────────────────────────────────────────────────────
function loadDecks()   { try { return JSON.parse(localStorage.getItem(KEY_DECKS))   || []; } catch { return []; } }
function loadManual()  { try { return JSON.parse(localStorage.getItem(KEY_MATCHES)) || []; } catch { return []; } }
function loadPlayers() { try { return JSON.parse(localStorage.getItem(KEY_PLAYERS)) || ['Guivaz','Trevas','Braz','Leleco']; } catch { return ['Guivaz','Trevas','Braz','Leleco']; } }

function saveDecks(d)   { localStorage.setItem(KEY_DECKS,   JSON.stringify(d)); }
function saveManual(m)  { localStorage.setItem(KEY_MATCHES, JSON.stringify(m)); }
function savePlayers(p) { localStorage.setItem(KEY_PLAYERS, JSON.stringify(p)); }
function loadDeleted()  { try { return new Set(JSON.parse(localStorage.getItem(KEY_DELETED)) || []); } catch { return new Set(); } }
function loadEdits()    { try { return JSON.parse(localStorage.getItem(KEY_EDITS)) || {}; } catch { return {}; } }
function saveDeleted(s) { localStorage.setItem(KEY_DELETED, JSON.stringify([...s])); }
function saveEdits(e)   { localStorage.setItem(KEY_EDITS,   JSON.stringify(e)); }

// Exposed state
let decks   = loadDecks();
let players = loadPlayers();

// ── PTCGL PARSER ─────────────────────────────────────────────────────────────
function parsePTCGL(raw) {
  const sections  = { 'Pokémon': [], 'Treinador': [], 'Energia': [] };
  let currentSec  = null;
  let total       = 0;
  const lines     = raw.split('\n');

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Section headers like "Pokémon: 12" or "Treinador: 36" or "Energia: 12"
    const secMatch = line.match(/^(Pok[eé]mon|Treinador|Energia)\s*:/i);
    if (secMatch) {
      const key = secMatch[1].charAt(0).toUpperCase() + secMatch[1].slice(1).toLowerCase();
      currentSec = key === 'Pokémon' || key === 'Pokemon' ? 'Pokémon' :
                   key === 'Treinador' ? 'Treinador' : 'Energia';
      continue;
    }

    // "Total de cartas: 60" line — skip
    if (/total/i.test(line)) continue;

    // Card lines: "4 Charizard ex OBF 125"  or  "4 Charizard ex"
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

// ── MODAL HELPERS ────────────────────────────────────────────────────────────
function showModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ── POPULATE PLAYER SELECTS ──────────────────────────────────────────────────
function populatePlayerSelects() {
  ['formMatchPlayer','formDeckPlayer','filterPlayer'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    // Keep first option (placeholder or "Todos")
    const first = sel.options[0];
    sel.innerHTML = '';
    sel.appendChild(first);
    players.forEach(p => {
      const o = document.createElement('option');
      o.value = p; o.textContent = p;
      sel.appendChild(o);
    });
    sel.value = cur;
  });
  if (typeof populateQuickLogDropdowns === 'function') populateQuickLogDropdowns();
}

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
    
    // Sort decks alphabetically by name
    const sortedDecks = [...decks].sort((a, b) => a.name.localeCompare(b.name));
    
    sortedDecks.forEach(d => {
      const o = document.createElement('option');
      o.value = d.name;
      o.textContent = d.name + (d.player ? ` (${d.player})` : '');
      sel.appendChild(o);
    });
    
    sel.value = cur;
  });
}

// ── RENDER DECKS LIST ────────────────────────────────────────────────────────
function renderDecksList() {
  const container = document.getElementById('decksList');
  if (!container) return;

  if (decks.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🃏</div>
      <p>Nenhum deck cadastrado ainda.</p>
      <p class="empty-sub">Clique em "+ Novo Deck" para começar.</p>
    </div>`;
    return;
  }

  container.innerHTML = decks.map(deck => {
    const parsed  = parsePTCGL(deck.list || '');
    const total   = parsed.total;
    const valid   = total === 60;
    const pokCount = parsed.sections['Pokémon'].reduce((s, c) => s + c.qty, 0);
    const trnCount = parsed.sections['Treinador'].reduce((s, c) => s + c.qty, 0);
    const engCount = parsed.sections['Energia'].reduce((s, c) => s + c.qty, 0);

    // Stats from allData
    const deckMatches = (typeof allData !== 'undefined' ? allData : []).filter(m => m.Deck === deck.name);
    const wins        = deckMatches.filter(m => m.Resultado === 'Vitória').length;
    const wr          = deckMatches.length ? Math.round((wins / deckMatches.length) * 100) : 0;

    return `<div class="deck-card" data-id="${deck.id}">
      <div class="deck-card-header">
        <div class="deck-card-name">
          <span class="deck-dot"></span>
          <strong>${deck.name}</strong>
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
window.openDeckList = function(deckId) {
  const deck   = decks.find(d => d.id === deckId);
  if (!deck) return;

  const parsed = parsePTCGL(deck.list || '');
  const total  = parsed.total;
  const valid  = total === 60;

  document.getElementById('deckListTitle').textContent = deck.name;
  document.getElementById('deckListPlayer').textContent = deck.player ? `👤 ${deck.player}` : '';
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

  body.innerHTML = html || '<p style="color:var(--text2);padding:1rem">Lista vazia.</p>';

  // Search
  document.getElementById('deckListSearch').value = '';
  showModal('modalDeckList');
};

// Deck list search filter
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
});

// ── ADD / EDIT DECK ──────────────────────────────────────────────────────────
let editingDeckId = null;

window.openNewDeck = function() {
  editingDeckId = null;
  document.getElementById('deckFormTitle').textContent = '+ Novo Deck';
  document.getElementById('formDeckName').value   = '';
  document.getElementById('formDeckPlayer').value = '';
  document.getElementById('formDeckList').value   = '';
  updateCardCounter();
  showModal('modalDeckForm');
};

window.openEditDeck = function(deckId) {
  const deck = decks.find(d => d.id === deckId);
  if (!deck) return;
  editingDeckId = deckId;
  document.getElementById('deckFormTitle').textContent = '✏️ Editar Deck';
  document.getElementById('formDeckName').value   = deck.name;
  document.getElementById('formDeckPlayer').value = deck.player || '';
  document.getElementById('formDeckList').value   = deck.list  || '';
  updateCardCounter();
  showModal('modalDeckForm');
};

window.deleteDeck = function(deckId) {
  if (!confirm('Tem certeza que deseja excluir este deck?')) return;
  decks = decks.filter(d => d.id !== deckId);
  saveDecks(decks);
  populateDeckSelects();
  renderDecksList();
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
  const name   = document.getElementById('formDeckName').value.trim();
  const player = document.getElementById('formDeckPlayer').value;
  const list   = document.getElementById('formDeckList').value.trim();

  if (!name) { alert('Nome do deck é obrigatório.'); return; }

  if (editingDeckId) {
    const idx = decks.findIndex(d => d.id === editingDeckId);
    if (idx >= 0) decks[idx] = { ...decks[idx], name, player, list };
  } else {
    decks.push({ id: Date.now().toString(), name, player, list, createdAt: new Date().toISOString() });
  }

  saveDecks(decks);
  populateDeckSelects();
  renderDecksList();
  closeModal('modalDeckForm');

  // Refresh app data if available
  if (typeof populateFilters === 'function') populateFilters();
  if (typeof applyFilters    === 'function') applyFilters();
}

// ── MATCH FORM ────────────────────────────────────────────────────────────────
// current match being edited (null = new match)
let editingMatchId = null;

function openMatchForm(matchData) {
  editingMatchId = matchData?.id || null;

  // Header label
  const h = document.querySelector('#modalMatchForm .modal-header h3');
  if (h) h.textContent = editingMatchId ? '✏️ Editar Partida' : '⚔️ Registrar Partida';

  const get = id => document.getElementById(id);

  get('formMatchData').value      = matchData?.Data     || new Date().toISOString().slice(0, 10);
  get('formMatchPlayer').value    = matchData?.Player   || '';
  get('formMatchAdv').value       = matchData?.Adversario || '';
  get('formMatchDeckAdv').value   = matchData?.DeckAdv  || '';
  get('formMatchFormato').value   = matchData?.Formato  || 'MD3';
  get('formMatchStart').value     = matchData?.Start    || '1º';
  get('formMatchResultado').value = matchData?.Resultado|| 'Vitória';
  get('formMatchPlacar').value    = matchData?.Placar   || '';
  get('formMatchLocal').value     = matchData?.Local    || '';
  get('formMatchLocalCustom').style.display = 'none';
  get('formMatchComentarios').value = matchData?.Comentarios || '';

  // Deck select — match by name directly
  get('formMatchDeck').value = matchData?.Deck || '';

  // Brick toggles
  const brickVal   = matchData?.Brick   || 'Não';
  const brickOpVal = matchData?.BrickOp || 'Não';
  const isOldBrick = v => v && v !== 'Nenhum' && v !== 'Não';

  ['brickToggleGroup', 'formMatchBrick'].forEach((gid, i) => {
    const val = i === 0 ? (isOldBrick(brickVal)   ? 'Sim' : 'Não') : null;
    if (i === 1) { get(gid).value = isOldBrick(brickVal) ? 'Sim' : 'Não'; return; }
    const g = document.getElementById(gid);
    if (!g) return;
    g.querySelectorAll('.brick-toggle').forEach(b => b.classList.toggle('active', b.dataset.value === val));
  });
  ['brickOpToggleGroup', 'formMatchBrickOp'].forEach((gid, i) => {
    const val = i === 0 ? (isOldBrick(brickOpVal) ? 'Sim' : 'Não') : null;
    if (i === 1) { get(gid).value = isOldBrick(brickOpVal) ? 'Sim' : 'Não'; return; }
    const g = document.getElementById(gid);
    if (!g) return;
    g.querySelectorAll('.brick-toggle').forEach(b => b.classList.toggle('active', b.dataset.value === val));
  });

  showModal('modalMatchForm');
}

function saveMatchForm() {
  const player     = document.getElementById('formMatchPlayer').value;
  const deckName   = document.getElementById('formMatchDeck').value;
  const adversario = document.getElementById('formMatchAdv').value.trim();
  const resultado  = document.getElementById('formMatchResultado').value;
  const deckAdv    = document.getElementById('formMatchDeckAdv').value;

  if (!player)    { alert('Selecione o player.'); return; }
  if (!adversario){ alert('Informe o adversário.'); return; }

  const localSel = document.getElementById('formMatchLocal').value;
  const localCustom = document.getElementById('formMatchLocalCustom').value.trim();
  const local    = localSel === '__outro__' ? localCustom : localSel;
  const pontos   = resultado === 'Vitória' ? 1 : resultado === 'Empate' ? 0.5 : 0;

  const matchData = {
    id:          editingMatchId || Date.now().toString(),
    Data:        document.getElementById('formMatchData').value,
    Player:      player,
    Deck:        deckName,
    Adversario:  adversario,
    DeckAdv:     deckAdv,
    Luck:        0,
    Formato:     document.getElementById('formMatchFormato').value,
    Start:       document.getElementById('formMatchStart').value,
    Resultado:   resultado,
    Pontos:      pontos,
    Placar:      document.getElementById('formMatchPlacar').value.trim(),
    Local:       local,
    Brick:       document.getElementById('formMatchBrick').value,
    BrickOp:     document.getElementById('formMatchBrickOp').value,
    Comentarios: document.getElementById('formMatchComentarios').value.trim(),
    _manual:     true,
  };

  if (editingMatchId) {
    // --- EDIT mode ---
    // 1. Update manual store if it's a manual match
    const manual = loadManual();
    const midx   = manual.findIndex(m => m.id === editingMatchId);
    if (midx >= 0) {
      manual[midx] = matchData;
      saveManual(manual);
    } else {
      // Imported match — save as an edit override
      const edits = loadEdits();
      edits[editingMatchId] = matchData;
      saveEdits(edits);
    }
    // 2. Update in-memory allData
    if (typeof allData !== 'undefined') {
      const aidx = allData.findIndex(m => m.id === editingMatchId);
      if (aidx >= 0) allData[aidx] = matchData;
    }
    showToast('✏️ Partida atualizada!');
  } else {
    // --- NEW match ---
    const manual = loadManual();
    manual.push(matchData);
    saveManual(manual);
    if (typeof allData !== 'undefined') allData.push(matchData);
    showToast('✅ Partida registrada com sucesso!');
  }

  if (typeof populateFilters === 'function') populateFilters();
  if (typeof applyFilters    === 'function') applyFilters();
  closeModal('modalMatchForm');
}

// ── DELETE MATCH ──────────────────────────────────────────────────────────────
window.deleteMatch = function(matchId) {
  if (!confirm('Deletar esta partida? Esta ação não pode ser desfeita.')) return;

  // Remove from manual store
  const manual = loadManual();
  const newManual = manual.filter(m => m.id !== matchId);
  if (newManual.length < manual.length) saveManual(newManual);

  // Mark as deleted (covers imported matches)
  const deleted = loadDeleted();
  deleted.add(matchId);
  saveDeleted(deleted);

  // Remove edits override if any
  const edits = loadEdits();
  delete edits[matchId];
  saveEdits(edits);

  // Update in-memory allData
  if (typeof allData !== 'undefined') {
    const idx = allData.findIndex(m => m.id === matchId);
    if (idx >= 0) allData.splice(idx, 1);
  }

  if (typeof populateFilters === 'function') populateFilters();
  if (typeof applyFilters    === 'function') applyFilters();
  showToast('🗑️ Partida deletada.');
};

// ── EDIT MATCH ────────────────────────────────────────────────────────────────
window.editMatch = function(matchId) {
  const match = (typeof allData !== 'undefined') ? allData.find(m => m.id === matchId) : null;
  if (!match) { showToast('⚠️ Partida não encontrada.'); return; }
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
  input.value = '';
  showToast(`👤 Player "${name}" adicionado!`);
}

function deletePlayer(name) {
  if (!confirm(`Remover player "${name}"?`)) return;
  players = players.filter(p => p !== name);
  savePlayers(players);
  populatePlayerSelects();
  renderPlayersList();
}

function renderPlayersList() {
  const el = document.getElementById('playersList');
  if (!el) return;
  el.innerHTML = players.map(p => `
    <div class="player-tag">
      <span>👤 ${p}</span>
      <button class="icon-btn danger sm" onclick="deletePlayer('${p}')">✕</button>
    </div>
  `).join('');
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

// ── QUICK LOG FUNCTIONALITY ──────────────────────────────────────────────────
function populateQuickLogDropdowns() {
  const qPlayer = document.getElementById('quickLogPlayer');
  if (!qPlayer) return;

  const curP = qPlayer.value;
  qPlayer.innerHTML = players.map(p => `<option value="${p}">👤 ${p}</option>`).join('');
  if (curP && players.includes(curP)) qPlayer.value = curP;
}

window.quickLogMatch = function(resultado) {
  const player = document.getElementById('quickLogPlayer')?.value;
  const deckName = document.getElementById('quickLogDeck')?.value;
  const advName = document.getElementById('quickLogAdvName')?.value.trim() || 'Oponente';
  const deckAdv = document.getElementById('quickLogDeckAdv')?.value;

  if (!player) { alert('Adicione ou selecione um player primeiro.'); return; }
  if (!deckName) { alert('Selecione seu deck para registrar.'); return; }
  if (!deckAdv) { alert('Selecione o deck do oponente.'); return; }

  const pontos = resultado === 'Vitória' ? 1 : resultado === 'Empate' ? 0.5 : 0;

  const matchData = {
    id:          Date.now().toString(),
    Data:        new Date().toISOString().slice(0, 10),
    Player:      player,
    Deck:        deckName,
    Adversario:  advName,
    DeckAdv:     deckAdv,
    Luck:        0,
    Formato:     'MD3',
    Start:       '1º',
    Resultado:   resultado,
    Pontos:      pontos,
    Placar:      resultado === 'Vitória' ? '2-1' : resultado === 'Empate' ? '1-1' : '1-2',
    Local:       'Online',
    Brick:       'Não',
    BrickOp:     'Não',
    Comentarios: 'Registrado via Quick Log',
    _manual:     true
  };

  const manual = loadManual();
  manual.push(matchData);
  saveManual(manual);

  if (typeof allData !== 'undefined') {
    allData.push(matchData);
  }

  const opD = document.getElementById('quickLogDeckAdv');
  if (opD) opD.value = '';

  if (typeof populateFilters === 'function') populateFilters();
  if (typeof applyFilters    === 'function') applyFilters();

  showToast(`⚡ Partida (${resultado}) registrada!`);
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
let syncInterval = null;
let isSyncing = false;

function getSyncUrl(token) {
  const isLocalFile = window.location.protocol === 'file:';
  const cleanToken = token.replace(/[^a-zA-Z0-9_-]/g, '');
  // Ensure both local file and Vercel proxy hit the exact same key name: jornada_sync_<token>
  return isLocalFile 
    ? `https://keyvalue.xyz/v1/jornada_sync_${cleanToken}` 
    : `/api/sync?token=${cleanToken}`;
}

async function pullFromCloud(quiet = false) {
  const token = localStorage.getItem('jornada_sync_token');
  if (!token) return;

  try {
    if (!quiet) setSyncStatus('connecting', 'Conectando…');
    const res = await fetch(getSyncUrl(token));
    if (!res.ok) {
      if (res.status === 404) {
        // Token exists but cloud has no data, push initial local data
        await pushToCloud();
        setSyncStatus('connected', 'Sincronizado');
        return;
      }
      throw new Error('Server error');
    }
    const data = await res.json();
    if (data && typeof data === 'object') {
      const localDecks = localStorage.getItem(KEY_DECKS) || '[]';
      const localMatches = localStorage.getItem(KEY_MATCHES) || '[]';
      const localPlayers = localStorage.getItem(KEY_PLAYERS) || '[]';
      const localDeleted = localStorage.getItem(KEY_DELETED) || '[]';
      const localEdits = localStorage.getItem(KEY_EDITS) || '{}';

      const cloudDecks = JSON.stringify(data.decks || []);
      const cloudMatches = JSON.stringify(data.manualMatches || []);
      const cloudPlayers = JSON.stringify(data.players || []);
      const cloudDeleted = JSON.stringify(data.deletedIds || []);
      const cloudEdits = JSON.stringify(data.editedMatches || {});

      if (localDecks !== cloudDecks || localMatches !== cloudMatches || 
          localPlayers !== cloudPlayers || localDeleted !== cloudDeleted || 
          localEdits !== cloudEdits) {
        
        localStorage.setItem(KEY_DECKS, cloudDecks);
        localStorage.setItem(KEY_MATCHES, cloudMatches);
        localStorage.setItem(KEY_PLAYERS, cloudPlayers);
        localStorage.setItem(KEY_DELETED, cloudDeleted);
        localStorage.setItem(KEY_EDITS, cloudEdits);

        decks = data.decks || [];
        players = data.players || [];

        if (typeof initializeData === 'function') initializeData();
        if (typeof populateFilters === 'function') populateFilters();
        if (typeof applyFilters === 'function') applyFilters();
        if (typeof populatePlayerSelects === 'function') populatePlayerSelects();
        if (typeof populateDeckSelects === 'function') populateDeckSelects();
        if (typeof renderDecksList === 'function') renderDecksList();
        if (typeof renderPlayersList === 'function') renderPlayersList();
        populateQuickLogDropdowns();
      }
      setSyncStatus('connected', 'Sincronizado');
    }
  } catch (err) {
    console.error('Sync pull error:', err);
    setSyncStatus('error', 'Erro de Conexão');
  }
}

async function pushToCloud() {
  const token = localStorage.getItem('jornada_sync_token');
  if (!token) return;

  try {
    const payload = {
      decks: loadDecks(),
      manualMatches: loadManual(),
      players: loadPlayers(),
      deletedIds: [...loadDeleted()],
      editedMatches: loadEdits()
    };
    const res = await fetch(getSyncUrl(token), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Push failed');
    setSyncStatus('connected', 'Sincronizado');
  } catch (err) {
    console.error('Sync push error:', err);
    setSyncStatus('error', 'Erro ao enviar');
  }
}

function triggerSyncPush() {
  const token = localStorage.getItem('jornada_sync_token');
  if (token) {
    pushToCloud();
  }
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

function initSyncUI() {
  const tokenInput = document.getElementById('syncTokenInput');
  const btnEnable = document.getElementById('btnEnableSync');
  const btnDisable = document.getElementById('btnDisableSync');
  const btnGen = document.getElementById('btnGenerateSyncToken');
  const btnCopy = document.getElementById('btnCopySyncToken');

  const curToken = localStorage.getItem('jornada_sync_token');
  if (curToken) {
    if (tokenInput) tokenInput.value = curToken;
    startSyncInterval();
  } else {
    setSyncStatus('disconnected');
  }

  document.getElementById('btnOpenSync')?.addEventListener('click', () => {
    const tok = localStorage.getItem('jornada_sync_token') || '';
    if (tokenInput) tokenInput.value = tok;
    showModal('modalSync');
  });

  btnEnable?.addEventListener('click', async () => {
    const val = tokenInput?.value.trim();
    if (!val) { alert('Digite ou gere uma chave de sincronização.'); return; }
    localStorage.setItem('jornada_sync_token', val);
    showToast('🌐 Conectando à nuvem…');
    await pullFromCloud();
    startSyncInterval();
    closeModal('modalSync');
  });

  btnDisable?.addEventListener('click', () => {
    if (confirm('Desativar sincronização online? Seus dados continuarão locais.')) {
      localStorage.removeItem('jornada_sync_token');
      stopSyncInterval();
      if (tokenInput) tokenInput.value = '';
      setSyncStatus('disconnected');
      showToast('❌ Sincronização desativada.');
    }
  });

  btnGen?.addEventListener('click', () => {
    const token = 'jornada_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    if (tokenInput) tokenInput.value = token;
    showToast('✨ Nova chave gerada. Clique em "Ativar / Conectar" para aplicar.');
  });

  btnCopy?.addEventListener('click', () => {
    const val = tokenInput?.value;
    if (!val) return;
    navigator.clipboard.writeText(val);
    showToast('📋 Chave copiada!');
  });
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
  populateQuickLogDropdowns();
  initSyncUI();
  initQuickLogToggle();

  // Event: deck list textarea counter
  const listTA = document.getElementById('formDeckList');
  if (listTA) listTA.addEventListener('input', updateCardCounter);

  // Event: luck slider display
  const luckSlider = document.getElementById('formMatchLuck');
  if (luckSlider) {
    luckSlider.addEventListener('input', () => {
      document.getElementById('luckDisplay').textContent = luckSlider.value;
    });
  }

  // Event: local select → show custom input
  const localSel = document.getElementById('formMatchLocal');
  if (localSel) {
    localSel.addEventListener('change', () => {
      const customWrap = document.getElementById('formMatchLocalCustom');
      customWrap.style.display = localSel.value === '__outro__' ? 'block' : 'none';
    });
  }

  // Event: deck form save
  document.getElementById('btnSaveDeck')?.addEventListener('click', saveDeckForm);

  // Event: match form save
  document.getElementById('btnSaveMatch')?.addEventListener('click', saveMatchForm);

  // Event: add player
  document.getElementById('btnAddPlayer')?.addEventListener('click', addPlayer);
  document.getElementById('newPlayerName')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') addPlayer();
  });

  // Event: quick log buttons
  document.getElementById('btnQuickWin')?.addEventListener('click', () => quickLogMatch('Vitória'));
  document.getElementById('btnQuickDraw')?.addEventListener('click', () => quickLogMatch('Empate'));
  document.getElementById('btnQuickLoss')?.addEventListener('click', () => quickLogMatch('Derrota'));

  // Event: quick add deck from dropdowns
  document.getElementById('btnQuickAddDeckOwn')?.addEventListener('click', () => openNewDeck());
  document.getElementById('btnQuickAddDeckAdv')?.addEventListener('click', () => openNewDeck());
  document.getElementById('btnFormAddDeckAdv')?.addEventListener('click', () => openNewDeck());

  // Modal close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });

  // Click outside modal to close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // FAB
  document.getElementById('fabBtn')?.addEventListener('click', () => openMatchForm());

  // Tab switching in manager panel
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab)?.classList.add('active');
    });
  });

  // Manager panel toggle
  document.getElementById('btnOpenManager')?.addEventListener('click', () => {
    document.getElementById('managerPanel').classList.toggle('open');
    renderDecksList();
    renderPlayersList();
  });
  document.getElementById('btnCloseManager')?.addEventListener('click', () => {
    document.getElementById('managerPanel').classList.remove('open');
  });

  // Brick toggle handlers
  function initBrickToggles(groupId, hiddenId) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('.brick-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.brick-toggle').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const hidden = document.getElementById(hiddenId);
        if (hidden) hidden.value = btn.dataset.value;
      });
    });
  }
  initBrickToggles('brickToggleGroup',   'formMatchBrick');
  initBrickToggles('brickOpToggleGroup', 'formMatchBrickOp');

  // Reset toggles when match form opens
  const origOpenMatchForm = window.openMatchForm;
  window.openMatchForm = function(matchData) {
    if (typeof origOpenMatchForm === 'function') origOpenMatchForm(matchData);
    // Reset brick toggles to correct value
    const brickVal = matchData?.Brick || 'Não';
    const brickOpVal = matchData?.BrickOp || 'Não';
    const isOldBrick = v => v && v !== 'Nenhum' && v !== 'Não';

    const bv = isOldBrick(brickVal) ? 'Sim' : 'Não';
    const bov = isOldBrick(brickOpVal) ? 'Sim' : 'Não';

    const bg = document.getElementById('brickToggleGroup');
    if (bg) {
      bg.querySelectorAll('.brick-toggle').forEach(b => {
        b.classList.toggle('active', b.dataset.value === bv);
      });
    }
    const bog = document.getElementById('brickOpToggleGroup');
    if (bog) {
      bog.querySelectorAll('.brick-toggle').forEach(b => {
        b.classList.toggle('active', b.dataset.value === bov);
      });
    }

    const bh = document.getElementById('formMatchBrick');
    const bo = document.getElementById('formMatchBrickOp');
    if (bh) bh.value = bv;
    if (bo) bo.value = bov;
  };

  // Backup events
  document.getElementById('btnExportBackup')?.addEventListener('click', () => window.exportBackup());
  document.getElementById('backupFileInput')?.addEventListener('change', e => {
    if (e.target.files[0]) window.importBackup(e.target.files[0]);
  });

  // Merge manual matches into allData
  const manual = loadManual();
  if (manual.length && typeof allData !== 'undefined') {
    const existingIds = new Set(allData.map(m => m.id).filter(Boolean));
    manual.forEach(m => { if (!existingIds.has(m.id)) allData.push(m); });
    if (typeof populateFilters === 'function') populateFilters();
    if (typeof applyFilters    === 'function') applyFilters();
  }
});

window.exportBackup = function() {
  const payload = {
    decks: loadDecks(),
    manualMatches: loadManual(),
    players: loadPlayers(),
    deletedIds: [...loadDeleted()],
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
        localStorage.setItem(KEY_DELETED, JSON.stringify(data.deletedIds || []));
        localStorage.setItem(KEY_EDITS, JSON.stringify(data.editedMatches || {}));

        decks = data.decks || [];
        players = data.players || [];

        if (typeof initializeData === 'function') initializeData();
        if (typeof populateFilters === 'function') populateFilters();
        if (typeof applyFilters === 'function') applyFilters();
        if (typeof populatePlayerSelects === 'function') populatePlayerSelects();
        if (typeof populateDeckSelects === 'function') populateDeckSelects();
        if (typeof renderDecksList === 'function') renderDecksList();
        if (typeof renderPlayersList === 'function') renderPlayersList();
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



