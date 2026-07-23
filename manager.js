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
const KEY_DELETED = 'jornada_deleted_ids';
const KEY_EDITS   = 'jornada_edited_matches';
const KEY_ADMIN_PIN = 'jornada_admin_pin';

function getAdminPin() { return localStorage.getItem(KEY_ADMIN_PIN) || ''; }
function hasAdminPin() { return !!getAdminPin(); }
function isAdminUnlocked() { return sessionStorage.getItem('jornada_admin_unlocked') === 'true'; }

let adminAuthMode = 'login'; // 'login' or 'create'

// ── LOAD / SAVE ───────────────────────────────────────────────────────────────
function loadDecks()   { try { return JSON.parse(localStorage.getItem(KEY_DECKS))   || []; } catch { return []; } }
function loadManual()  { try { return JSON.parse(localStorage.getItem(KEY_MATCHES)) || []; } catch { return []; } }
function loadPlayers() { try { return JSON.parse(localStorage.getItem(KEY_PLAYERS)) || ['Guivaz','Trevas','Braz','Leleco']; } catch { return ['Guivaz','Trevas','Braz','Leleco']; } }
function loadLocais()  { try { return JSON.parse(localStorage.getItem(KEY_LOCAIS))  || ['Regional SP','Regional Curitiba','League Cup','Treino Interno','TCG Live Online']; } catch { return ['Regional SP','Regional Curitiba','League Cup','Treino Interno','TCG Live Online']; } }

function saveDecks(d)   { localStorage.setItem(KEY_DECKS,   JSON.stringify(d)); triggerSyncPush(); }
function saveManual(m)  { localStorage.setItem(KEY_MATCHES, JSON.stringify(m)); triggerSyncPush(); }
function savePlayers(p) { localStorage.setItem(KEY_PLAYERS, JSON.stringify(p)); triggerSyncPush(); }
function saveLocais(l)  { localStorage.setItem(KEY_LOCAIS,  JSON.stringify(l)); triggerSyncPush(); }
function loadDeleted()  { try { return new Set(JSON.parse(localStorage.getItem(KEY_DELETED)) || []); } catch { return new Set(); } }
function loadEdits()    { try { return JSON.parse(localStorage.getItem(KEY_EDITS)) || {}; } catch { return {}; } }
function saveDeleted(s) { localStorage.setItem(KEY_DELETED, JSON.stringify([...s])); triggerSyncPush(); }
function saveEdits(e)   { localStorage.setItem(KEY_EDITS,   JSON.stringify(e)); triggerSyncPush(); }

// Exposed state
let decks   = loadDecks();
let players = loadPlayers();
let locais  = loadLocais();

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
    const first = sel.options[0];
    sel.innerHTML = '';
    if (first) sel.appendChild(first);
    players.forEach(p => {
      const o = document.createElement('option');
      o.value = p; o.textContent = p;
      sel.appendChild(o);
    });
    sel.value = cur;
    if (sel.syncSearchableSelect) sel.syncSearchableSelect();
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
    
    const sortedDecks = [...decks].sort((a, b) => a.name.localeCompare(b.name));
    
    sortedDecks.forEach(d => {
      const o = document.createElement('option');
      o.value = d.name;
      o.textContent = d.name + (d.player ? ` (${d.player})` : '');
      sel.appendChild(o);
    });
    
    sel.value = cur;
    if (sel.syncSearchableSelect) sel.syncSearchableSelect();
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
  const targetDeck = decks.find(d => d.id === deckId);
  decks = decks.filter(d => d.id !== deckId);
  saveDecks(decks);
  populateDeckSelects();
  renderDecksList();
  if (targetDeck && typeof selectedDecks !== 'undefined') {
    selectedDecks.delete(targetDeck.name);
  }
  if (typeof populateFilters === 'function') populateFilters();
  if (typeof applyFilters    === 'function') applyFilters();
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

  // Repopulate local selects to reflect any updated custom/data locations
  populateLocalSelects();

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
  get('formMatchComentarios').value = matchData?.Comentarios || '';

  // Local select logic
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

  // Deck select — match by name directly
  get('formMatchDeck').value = matchData?.Deck || '';

  // Brick toggles
  const isOldBrick = v => v && v !== 'Nenhum' && v !== 'Não';
  const brickVal   = isOldBrick(matchData?.Brick) ? 'Sim' : 'Não';
  const brickOpVal = isOldBrick(matchData?.BrickOp) ? 'Sim' : 'Não';

  get('formMatchBrick').value = brickVal;
  document.querySelectorAll('#brickToggleGroup .brick-toggle').forEach(b => {
    b.classList.toggle('active', b.dataset.value === brickVal);
  });

  get('formMatchBrickOp').value = brickOpVal;
  document.querySelectorAll('#brickOpToggleGroup .brick-toggle').forEach(b => {
    b.classList.toggle('active', b.dataset.value === brickOpVal);
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
  if (typeof populateFilters === 'function') populateFilters();
  if (typeof applyFilters    === 'function') applyFilters();
  input.value = '';
  showToast(`👤 Player "${name}" adicionado!`);
}

function deletePlayer(name) {
  if (!confirm(`Remover player "${name}"?`)) return;
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
      <button class="icon-btn danger sm" onclick="deletePlayer('${p}')">✕</button>
    </div>
  `).join('');
}

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

function deleteLocal(name) {
  if (!confirm(`Remover local "${name}"?`)) return;
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
  const select = document.getElementById('formMatchLocal');
  if (!select) return;
  const cur = select.value;

  const customLocais = (typeof loadLocais === 'function') ? loadLocais() : [];
  const dataLocais = (typeof allData !== 'undefined' && Array.isArray(allData)) ? allData.map(d => d.Local).filter(Boolean) : [];
  const allLocais = [...new Set([...customLocais, ...dataLocais])].sort((a, b) => a.localeCompare(b));

  select.innerHTML = '<option value="">Selecione…</option>';
  allLocais.forEach(l => {
    const o = document.createElement('option');
    o.value = l;
    o.textContent = l;
    select.appendChild(o);
  });
  const outroOpt = document.createElement('option');
  outroOpt.value = '__outro__';
  outroOpt.textContent = 'Outro…';
  select.appendChild(outroOpt);

  if (cur && (allLocais.includes(cur) || cur === '__outro__')) {
    select.value = cur;
  }

  if (select.syncSearchableSelect) select.syncSearchableSelect();
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
  if (qPlayer) {
    const curP = qPlayer.value;
    qPlayer.innerHTML = players.map(p => `<option value="${p}">👤 ${p}</option>`).join('');
    if (curP && players.includes(curP)) qPlayer.value = curP;
    if (qPlayer.syncSearchableSelect) qPlayer.syncSearchableSelect();
  }

  const qLocal = document.getElementById('quickLogLocal');
  if (qLocal) {
    const curL = qLocal.value;
    const customLocais = (typeof loadLocais === 'function') ? loadLocais() : [];
    const dataLocais = (typeof allData !== 'undefined' && Array.isArray(allData)) ? allData.map(d => d.Local).filter(Boolean) : [];
    const allLocais = [...new Set([...customLocais, ...dataLocais])].sort((a, b) => a.localeCompare(b));

    qLocal.innerHTML = '<option value="">Selecione…</option>';
    allLocais.forEach(l => {
      const o = document.createElement('option');
      o.value = l; o.textContent = l;
      qLocal.appendChild(o);
    });
    if (curL && allLocais.includes(curL)) qLocal.value = curL;
    if (qLocal.syncSearchableSelect) qLocal.syncSearchableSelect();
  }
}

window.quickLogMatch = function(resultado) {
  const player   = document.getElementById('quickLogPlayer')?.value;
  const deckName = document.getElementById('quickLogDeck')?.value;
  const advName  = document.getElementById('quickLogAdvName')?.value.trim() || 'Oponente';
  const deckAdv  = document.getElementById('quickLogDeckAdv')?.value;
  const formato  = document.getElementById('quickLogFormato')?.value || 'MD3';
  const local    = document.getElementById('quickLogLocal')?.value;
  const placarInput = document.getElementById('quickLogPlacar')?.value.trim();

  if (!player)   { showToast('⚠️ Selecione seu player.'); return; }
  if (!deckName) { showToast('⚠️ Selecione seu deck.'); return; }
  if (!deckAdv)  { showToast('⚠️ Selecione o deck do oponente.'); return; }
  if (!formato)  { showToast('⚠️ Selecione o formato (MD1 ou MD3).'); return; }
  if (!local)    { showToast('⚠️ Selecione o local da partida.'); return; }
  if (!placarInput) { showToast('⚠️ Informe o placar da partida (ex: 2-1).'); return; }

  const pontos = resultado === 'Vitória' ? 1 : resultado === 'Empate' ? 0.5 : 0;

  const matchData = {
    id:          Date.now().toString(),
    Data:        new Date().toISOString().slice(0, 10),
    Player:      player,
    Deck:        deckName,
    Adversario:  advName,
    DeckAdv:     deckAdv,
    Luck:        0,
    Formato:     formato,
    Start:       '1º',
    Resultado:   resultado,
    Pontos:      pontos,
    Placar:      placarInput,
    Local:       local,
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
  const plc = document.getElementById('quickLogPlacar');
  if (plc) plc.value = '';

  if (typeof populateFilters === 'function') populateFilters();
  if (typeof applyFilters    === 'function') applyFilters();

  showToast(`⚡ Partida (${resultado} - ${placarInput} em ${local}) registrada!`);
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
  // Ensure both local file and Vercel proxy hit the exact same key name: jornada_sync_<token>
  // Added timestamp parameter to completely bypass browser caching
  return isLocalFile 
    ? `https://keyvalue.xyz/v1/jornada_sync_${cleanToken}?_t=${ts}` 
    : `/api/sync?token=${cleanToken}&_t=${ts}`;
}

async function pullFromCloud(quiet = false) {
  const token = localStorage.getItem('jornada_sync_token');
  if (!token) return;

  // Skip pull if we are actively pushing or if a local write occurred recently (< 6 seconds ago)
  // This prevents race conditions where old cloud data overwrites new local changes
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
      const cloudDecks = data.decks || [];
      const cloudMatches = data.manualMatches || [];
      const cloudPlayers = data.players || [];
      const cloudDeleted = data.deletedIds || [];
      const cloudEdits = data.editedMatches || {};

      const localDecks = loadDecks();
      const localMatches = loadManual();
      const localPlayers = loadPlayers();
      const localDeleted = [...loadDeleted()];
      const localEdits = loadEdits();

      // 1. Combine deleted IDs from both local and cloud
      const combinedDeleted = new Set([...localDeleted, ...cloudDeleted]);

      // 2. Combine edit overrides from both
      const combinedEdits = { ...localEdits, ...cloudEdits };

      // 3. Merge matches list
      const matchesMap = new Map();
      [...localMatches, ...cloudMatches].forEach(m => {
        if (combinedDeleted.has(m.id)) return; // Exclude deleted
        const finalMatch = combinedEdits[m.id] || m; // Respect edits
        matchesMap.set(m.id, finalMatch);
      });
      const finalMatches = Array.from(matchesMap.values());

      // 4. Merge Decks (unique by name)
      const decksMap = new Map();
      [...localDecks, ...cloudDecks].forEach(d => {
        decksMap.set(d.name, d);
      });
      const finalDecks = Array.from(decksMap.values());

      // 5. Merge Players
      const finalPlayers = [...new Set([...localPlayers, ...cloudPlayers])];

      // Convert to strings for comparison
      const localDecksStr = JSON.stringify(localDecks);
      const localMatchesStr = JSON.stringify(localMatches);
      const localPlayersStr = JSON.stringify(localPlayers);
      const localDeletedStr = JSON.stringify(localDeleted);
      const localEditsStr = JSON.stringify(localEdits);

      const finalDecksStr = JSON.stringify(finalDecks);
      const finalMatchesStr = JSON.stringify(finalMatches);
      const finalPlayersStr = JSON.stringify(finalPlayers);
      const finalDeletedStr = JSON.stringify([...combinedDeleted]);
      const finalEditsStr = JSON.stringify(combinedEdits);

      const hasLocalChanges = (localDecksStr !== finalDecksStr || localMatchesStr !== finalMatchesStr ||
                               localPlayersStr !== finalPlayersStr || localDeletedStr !== finalDeletedStr ||
                               localEditsStr !== finalEditsStr);

      const hasCloudChanges = (JSON.stringify(cloudDecks) !== finalDecksStr || JSON.stringify(cloudMatches) !== finalMatchesStr ||
                               JSON.stringify(cloudPlayers) !== finalPlayersStr || JSON.stringify(cloudDeleted) !== finalDeletedStr ||
                               JSON.stringify(cloudEdits) !== finalEditsStr);

      if (hasLocalChanges) {
        console.log('🔄 Sync [Pull]: Novos dados mesclados localmente! Atualizando banco local...');
        localStorage.setItem(KEY_DECKS, finalDecksStr);
        localStorage.setItem(KEY_MATCHES, finalMatchesStr);
        localStorage.setItem(KEY_PLAYERS, finalPlayersStr);
        localStorage.setItem(KEY_DELETED, finalDeletedStr);
        localStorage.setItem(KEY_EDITS, finalEditsStr);

        decks = finalDecks;
        players = finalPlayers;

        if (typeof initializeData === 'function') initializeData();
        if (typeof populateFilters === 'function') populateFilters();
        if (typeof applyFilters === 'function') applyFilters();
        if (typeof populatePlayerSelects === 'function') populatePlayerSelects();
        if (typeof populateDeckSelects === 'function') populateDeckSelects();
        if (typeof renderDecksList === 'function') renderDecksList();
        if (typeof renderPlayersList === 'function') renderPlayersList();
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

async function pushToCloud() {
  const token = localStorage.getItem('jornada_sync_token');
  if (!token) return;
  if (isSyncing) {
    console.log('⏳ Sync [Push]: Envio pulado pois já existe um push em andamento.');
    return;
  }

  isSyncing = true;
  try {
    const payload = {
      decks: loadDecks(),
      manualMatches: loadManual(),
      players: loadPlayers(),
      deletedIds: [...loadDeleted()],
      editedMatches: loadEdits()
    };
    
    console.log(`🌐 Sync [Push]: Enviando dados locais para o banco na nuvem...`, {
      decksCount: payload.decks.length,
      matchesCount: payload.manualMatches.length,
      playersCount: payload.players.length,
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
  }
}

// Debounced push: coalesces rapid consecutive saves (e.g. batch import)
// into a single HTTP request after 800ms of inactivity.
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

// Smart Polling: Pause sync requests when tab is inactive (in background or device locked)
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

  // Event: Brick toggle buttons
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

  // Event: deck form save
  document.getElementById('btnSaveDeck')?.addEventListener('click', saveDeckForm);

  // Event: match form save
  document.getElementById('btnSaveMatch')?.addEventListener('click', saveMatchForm);

  // Event: add player
  document.getElementById('btnAddPlayer')?.addEventListener('click', addPlayer);
  document.getElementById('newPlayerName')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') addPlayer();
  });

  // Event: add local
  document.getElementById('btnAddLocal')?.addEventListener('click', addLocal);
  document.getElementById('newLocalName')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') addLocal();
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

  // Manager panel toggle — protected by Admin PIN/Password
  document.getElementById('btnOpenManager')?.addEventListener('click', () => {
    openProtectedManager();
  });
  document.getElementById('btnCloseManager')?.addEventListener('click', () => {
    document.getElementById('managerPanel').classList.remove('open');
  });
  document.getElementById('btnLockManager')?.addEventListener('click', () => {
    lockAdminAccess();
  });

  // Admin Auth Modal handlers
  document.getElementById('btnSubmitAdminAuth')?.addEventListener('click', submitAdminAuth);
  document.getElementById('adminPinInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') submitAdminAuth();
  });
  document.getElementById('adminPinConfirmInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') submitAdminAuth();
  });

  // Password visibility toggle
  document.getElementById('btnToggleAdminPinVisibility')?.addEventListener('click', () => {
    const pinIn = document.getElementById('adminPinInput');
    const confIn = document.getElementById('adminPinConfirmInput');
    if (pinIn) {
      const isPass = pinIn.type === 'password';
      pinIn.type = isPass ? 'text' : 'password';
      if (confIn) confIn.type = isPass ? 'text' : 'password';
    }
  });

  // Admin security settings handlers inside tabSeguranca
  document.getElementById('btnSaveNewAdminPin')?.addEventListener('click', () => {
    const p1 = document.getElementById('changeAdminPinNew')?.value.trim();
    const p2 = document.getElementById('changeAdminPinConfirm')?.value.trim();
    if (!p1 || p1.length < 4) { alert('A senha deve ter pelo menos 4 caracteres.'); return; }
    if (p1 !== p2) { alert('As senhas não coincidem!'); return; }
    localStorage.setItem(KEY_ADMIN_PIN, p1);
    document.getElementById('changeAdminPinNew').value = '';
    document.getElementById('changeAdminPinConfirm').value = '';
    showToast('🔑 Senha de administrador atualizada com sucesso!');
  });

  document.getElementById('btnRemoveAdminPin')?.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja remover a proteção por senha do Gerenciador de Dados? Qualquer pessoa poderá acessar os dados.')) {
      localStorage.removeItem(KEY_ADMIN_PIN);
      sessionStorage.removeItem('jornada_admin_unlocked');
      showToast('🔓 Proteção por senha desativada.');
    }
  });

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

// ── ADMIN PROTECTION FUNCTIONS ────────────────────────────────────────────────
function openProtectedManager() {
  if (isAdminUnlocked()) {
    document.getElementById('managerPanel').classList.add('open');
    renderDecksList();
    renderPlayersList();
    renderLocaisList();
    return;
  }
  setupAdminAuthModal(hasAdminPin() ? 'login' : 'create');
  showModal('modalAdminAuth');
}

function setupAdminAuthModal(mode) {
  adminAuthMode = mode;
  const title = document.getElementById('adminAuthTitle');
  const sub   = document.getElementById('adminAuthSub');
  const pinInput = document.getElementById('adminPinInput');
  const confirmWrap = document.getElementById('adminPinConfirmWrap');
  const confirmInput = document.getElementById('adminPinConfirmInput');
  const btnSubmit = document.getElementById('btnSubmitAdminAuth');
  const errorEl = document.getElementById('adminAuthError');

  if (pinInput) pinInput.value = '';
  if (confirmInput) confirmInput.value = '';
  if (errorEl) errorEl.textContent = '';

  if (mode === 'create') {
    if (title) title.textContent = '🔑 Criar Senha de Admin';
    if (sub)   sub.textContent = 'Esta área é privada. Crie uma senha ou PIN de administrador para proteger o Gerenciador de Dados.';
    if (confirmWrap) confirmWrap.style.display = 'block';
    if (btnSubmit) btnSubmit.textContent = '💾 Salvar e Desbloquear';
  } else {
    if (title) title.textContent = '🔒 Acesso Privado';
    if (sub)   sub.textContent = 'Digite sua senha ou PIN de administrador para acessar o Gerenciador de Dados.';
    if (confirmWrap) confirmWrap.style.display = 'none';
    if (btnSubmit) btnSubmit.textContent = '🔓 Desbloquear Acesso';
  }

  setTimeout(() => pinInput?.focus(), 150);
}

function submitAdminAuth() {
  const pinInput = document.getElementById('adminPinInput');
  const confirmInput = document.getElementById('adminPinConfirmInput');
  const remember = document.getElementById('adminRememberSession')?.checked;
  const errorEl = document.getElementById('adminAuthError');

  const val = pinInput ? pinInput.value.trim() : '';

  if (!val) {
    if (errorEl) errorEl.textContent = '⚠️ Digite a senha ou PIN.';
    return;
  }

  if (adminAuthMode === 'create') {
    const confirmVal = confirmInput ? confirmInput.value.trim() : '';
    if (val.length < 4) {
      if (errorEl) errorEl.textContent = '⚠️ A senha deve ter pelo menos 4 caracteres.';
      return;
    }
    if (val !== confirmVal) {
      if (errorEl) errorEl.textContent = '⚠️ As senhas não coincidem!';
      return;
    }
    localStorage.setItem(KEY_ADMIN_PIN, val);
    sessionStorage.setItem('jornada_admin_unlocked', 'true');
    closeModal('modalAdminAuth');
    document.getElementById('managerPanel').classList.add('open');
    renderDecksList();
    renderPlayersList();
    renderLocaisList();
    showToast('🔑 Senha de administrador criada com sucesso!');
    return;
  }

  // Login mode
  const stored = getAdminPin();
  if (val === stored) {
    if (remember) {
      sessionStorage.setItem('jornada_admin_unlocked', 'true');
    }
    closeModal('modalAdminAuth');
    document.getElementById('managerPanel').classList.add('open');
    renderDecksList();
    renderPlayersList();
    renderLocaisList();
    showToast('🔓 Acesso concedido!');
  } else {
    if (errorEl) errorEl.textContent = '❌ Senha ou PIN incorreto!';
    if (pinInput) {
      pinInput.classList.add('shake-error');
      setTimeout(() => pinInput.classList.remove('shake-error'), 400);
    }
  }
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



