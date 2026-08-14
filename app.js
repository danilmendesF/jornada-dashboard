/* ============================================================
   JORNADA DASHBOARD — app.js
   Full logic: data loading, filtering, charts, table
   ============================================================ */

'use strict';

// ── 2. STATE ─────────────────────────────────────────────────────────────────
let allData    = [];
let filtered   = [];
let charts     = {};

function applyDataOverrides(rawData) {
  let baseData = [...rawData];

  if (typeof loadDeleted === 'function' && typeof loadEdits === 'function') {
    const deleted = loadDeleted();
    const edits = loadEdits();
    baseData = baseData.filter(d => !deleted.has(d.id));
    baseData = baseData.map(d => edits[d.id] ? edits[d.id] : d);
  }

  if (typeof loadArchetypeUnifications === 'function') {
    const unifications = loadArchetypeUnifications();
    if (Array.isArray(unifications) && unifications.length > 0) {
      baseData.forEach(m => {
        unifications.forEach(rule => {
          const fromDeck = rule.fromDeck;
          const targetArchetype = rule.targetArchetype;
          if (fromDeck && targetArchetype) {
            if (m.Deck === fromDeck || m.Arquetipo === fromDeck || (typeof getMatchDeck === 'function' && getMatchDeck(m) === fromDeck)) {
              m.Arquetipo = targetArchetype;
              m.Deck = m.Subtipo ? `${targetArchetype} (${m.Subtipo})` : targetArchetype;
            }
            if (m.DeckAdv === fromDeck || m.DeckAdvArquetipo === fromDeck || (typeof getMatchOppDeck === 'function' && getMatchOppDeck(m) === fromDeck)) {
              m.DeckAdvArquetipo = targetArchetype;
              m.DeckAdv = m.SubtipoAdv ? `${targetArchetype} (${m.SubtipoAdv})` : targetArchetype;
            }
          }
        });
      });
    }
  }

  if (typeof ensureMatchSequence === 'function') {
    ensureMatchSequence(baseData);
  }

  return baseData;
}

window.getMatchTimestamp = function(match) {
  if (!match) return 0;

  if (match.createdAt) {
    const t = Date.parse(match.createdAt);
    if (!isNaN(t) && t > 1000000000000) return t;
  }

  if (match.id) {
    const idStr = String(match.id).substring(0, 13);
    const idNum = parseInt(idStr, 10);
    if (!isNaN(idNum) && idNum > 1000000000000) return idNum;
  }

  if (match.Data) {
    const dateParsed = Date.parse(match.Data + 'T12:00:00Z');
    if (!isNaN(dateParsed) && dateParsed > 1000000000000) {
      const subId = parseInt(String(match.seqID || match.seqId || match.id || '0').replace(/\D/g, ''), 10) || 0;
      return dateParsed + (subId % 86400000);
    }
  }

  return 0;
};

window.ensureMatchSequence = function(matches) {
  if (!Array.isArray(matches) || matches.length === 0) return matches;
  matches.sort((a, b) => window.getMatchTimestamp(a) - window.getMatchTimestamp(b));
  matches.forEach((m, idx) => {
    m.seqID = idx + 1;
    m.seqId = m.seqID;
    m._displayId = m.seqID;
  });

  return matches;
};

window.getNextSeqID = function(list) {
  const dataset = (Array.isArray(list) && list.length > 0) ? list : (typeof allData !== 'undefined' && Array.isArray(allData) ? allData : []);
  if (dataset.length > 0) {
    ensureMatchSequence(dataset);
  }
  let maxSeq = 0;
  dataset.forEach(m => {
    const s = Number(m.seqID || m.seqId || m._displayId || 0);
    if (s > maxSeq) maxSeq = s;
  });
  return maxSeq + 1;
};
window.getNextSeqId = window.getNextSeqID;

function initializeData() {
  if (typeof syncAllTeamMirrorMatches === 'function') {
    syncAllTeamMirrorMatches();
  }
  const manual = (typeof loadManual === 'function') ? loadManual() : [];
  allData = applyDataOverrides(manual);
  if (typeof saveManual === 'function' && Array.isArray(allData) && allData.length > 0) {
    saveManual(allData);
  }
  filtered = [...allData];
  if (typeof initAuthSession === 'function') {
    initAuthSession();
  }
}

// ── MULTI-TAB SYNC ───────────────────────────────────────────────────────────
window.addEventListener('storage', (e) => {
  if (!e.key || !e.key.startsWith('jornada_')) return;

  if (typeof loadPlayers === 'function') players = loadPlayers();
  if (typeof loadDecks === 'function') decks = loadDecks();
  if (typeof loadColecoes === 'function') colecoes = loadColecoes();
  if (typeof loadLocais === 'function') locais = loadLocais();
  initializeData();
  if (typeof populateFilters === 'function') populateFilters();
  if (typeof populateDeckSelects === 'function') populateDeckSelects();
  if (typeof populatePlayerSelects === 'function') populatePlayerSelects();
  if (typeof populatePlayerRegisterDropdowns === 'function') populatePlayerRegisterDropdowns();
  if (typeof populateQuickLogDropdowns === 'function') populateQuickLogDropdowns();
  if (typeof applyFilters === 'function') applyFilters();
  if (typeof showToast === 'function') showToast('🔄 Dados atualizados de outra sessão.');
});


// ── 3. CHART DEFAULTS ────────────────────────────────────────────────────────
Chart.register(ChartDataLabels);
Chart.defaults.color = '#8890b0';
Chart.defaults.font.family = "'Outfit', sans-serif";
Chart.defaults.plugins.datalabels.display = false; // Off by default, enable per chart
Chart.defaults.plugins.legend.labels.boxWidth = 12;
Chart.defaults.plugins.legend.labels.padding  = 16;
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(16,19,31,0.95)';
Chart.defaults.plugins.tooltip.borderColor     = 'rgba(124,106,247,0.3)';
Chart.defaults.plugins.tooltip.borderWidth     = 1;
Chart.defaults.plugins.tooltip.padding         = 10;

const PALETTE = ['#7c6af7','#c56af7','#34e0a1','#f5c842','#f75050','#38d9f5','#ff9f43','#54a0ff','#a29bfe','#fd79a8'];
const WIN_COLOR  = '#34e0a1';
const DRAW_COLOR = '#f5c842';
const LOSS_COLOR = '#f75050';

// ── 4. UTILITY ───────────────────────────────────────────────────────────────
function pct(n, d) { return d === 0 ? 0 : Math.round((n / d) * 100); }
function avg(arr)  { return arr.length ? (arr.reduce((a,b) => a+b, 0) / arr.length) : 0; }

function getMatchDeck(d) {
  if (!d) return '';
  return d.Arquetipo || d.Deck || '';
}
window.getMatchDeck = getMatchDeck;

function getMatchOppDeck(d) {
  if (!d) return '';
  return d.DeckAdvArquetipo || d.DeckAdv || '';
}
window.getMatchOppDeck = getMatchOppDeck;

function groupBy(data, keyOrFn) {
  return data.reduce((acc, row) => {
    const k = (typeof keyOrFn === 'function' ? keyOrFn(row) : row[keyOrFn]) ?? 'N/A';
    if (!acc[k]) acc[k] = [];
    acc[k].push(row);
    return acc;
  }, {});
}

function isBricked(r) {
  if (!r) return false;
  if (r.GamesDetail && Array.isArray(r.GamesDetail) && r.GamesDetail.length > 0) {
    return r.GamesDetail.some(g => g.brick === 'Sim');
  }
  return r.Brick === 'Sim' || (r.Brick && r.Brick !== 'Nenhum' && r.Brick !== 'Não');
}

function calculateStats(matches) {
  if (!Array.isArray(matches) || matches.length === 0) {
    return { wins: 0, draws: 0, losses: 0, total: 0, wr: 0, brickWins: 0, totalBricks: 0, totalGamesCount: 0, totalGameBricksCount: 0 };
  }
  const total = matches.length;
  const wins = matches.filter(m => m.Resultado === 'Vitória').length;
  const draws = matches.filter(m => m.Resultado === 'Empate').length;
  const losses = matches.filter(m => m.Resultado === 'Derrota').length;
  const wr = pct(wins, total);
  const brickMatches = matches.filter(m => isBricked(m));
  const brickWins = brickMatches.filter(m => m.Resultado === 'Vitória').length;

  let totalGamesCount = 0;
  let totalGameBricksCount = 0;
  matches.forEach(m => {
    if (m.GamesDetail && Array.isArray(m.GamesDetail) && m.GamesDetail.length > 0) {
      totalGamesCount += m.GamesDetail.length;
      totalGameBricksCount += m.GamesDetail.filter(g => g.brick === 'Sim').length;
    } else {
      totalGamesCount += 1;
      if (isBricked(m)) totalGameBricksCount += 1;
    }
  });

  return { 
    wins, 
    draws, 
    losses, 
    total, 
    wr, 
    brickWins, 
    totalBricks: brickMatches.length,
    totalGamesCount,
    totalGameBricksCount
  };
}

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

// ── SEARCHABLE SELECT ENHANCER ───────────────────────────────────────────────
function makeSearchableSelect(selectEl) {
  if (!selectEl || selectEl.dataset.searchableInit) {
    if (selectEl && selectEl.syncSearchableSelect) selectEl.syncSearchableSelect();
    return;
  }
  selectEl.dataset.searchableInit = "true";
  selectEl.style.display = "none";

  const wrap = document.createElement("div");
  wrap.className = "searchable-select-wrap";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "searchable-select-input";
  input.autocomplete = "off";

  const dropdown = document.createElement("div");
  dropdown.className = "searchable-select-dropdown";

  wrap.appendChild(input);
  wrap.appendChild(dropdown);
  selectEl.parentNode.insertBefore(wrap, selectEl.nextSibling);

  let focusedIndex = -1;

  function updateInputFromSelect() {
    const selectedOpt = selectEl.options[selectEl.selectedIndex];
    if (selectedOpt) {
      input.value = selectedOpt.text;
    } else {
      input.value = selectEl.options[0]?.text || "Selecione…";
    }
  }

  function renderOptions(filterText = "") {
    dropdown.innerHTML = "";
    focusedIndex = -1;
    const query = filterText.toLowerCase().trim();
    let count = 0;

    Array.from(selectEl.options).forEach((opt, idx) => {
      const text = opt.text;
      const value = opt.value;
      if (query && !text.toLowerCase().includes(query) && value !== "") return;

      count++;
      const div = document.createElement("div");
      div.className = "searchable-option";
      if (opt.selected) div.classList.add("selected");
      div.textContent = text;
      div.dataset.value = value;

      div.addEventListener("mousedown", (e) => {
        e.preventDefault();
        selectOption(value, text);
      });

      dropdown.appendChild(div);
    });

    if (count === 0) {
      const noRes = document.createElement("div");
      noRes.className = "searchable-no-results";
      noRes.textContent = 'Nenhum resultado para "' + filterText + '"';
      dropdown.appendChild(noRes);
    }
  }

  function selectOption(val, text) {
    selectEl.value = val;
    updateInputFromSelect();
    closeDropdown();
    input.blur();
    selectEl.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function openDropdown() {
    document.querySelectorAll(".searchable-select-wrap.open").forEach((el) => {
      if (el !== wrap) el.classList.remove("open");
    });
    // Fechar todos os outros menus customizados
    document.getElementById('multiPlayerWrap')?.classList.remove('open');
    document.getElementById('multiDeckWrap')?.classList.remove('open');
    document.querySelector('.user-dropdown-menu')?.classList.remove('show-dropdown');
    document.getElementById('mobileMenuBtn')?.classList.remove('is-active');
    document.getElementById('topNavRouter')?.classList.remove('menu-open');
    
    wrap.classList.add("open");
    renderOptions(input.value === (selectEl.options[selectEl.selectedIndex]?.text || "") ? "" : input.value);
  }

  function closeDropdown() {
    wrap.classList.remove("open");
    updateInputFromSelect();
    input.blur();
  }

  input.addEventListener("mousedown", (e) => {
    if (wrap.classList.contains("open")) {
      closeDropdown();
      e.preventDefault();
    }
  });

  input.addEventListener("focus", () => {
    input.select();
    openDropdown();
  });

  input.addEventListener("input", () => {
    openDropdown();
    renderOptions(input.value);
  });

  input.addEventListener("keydown", (e) => {
    const opts = dropdown.querySelectorAll(".searchable-option");
    if (!wrap.classList.contains("open")) {
      if (e.key === "ArrowDown" || e.key === "Enter") openDropdown();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusedIndex = Math.min(focusedIndex + 1, opts.length - 1);
      highlightOption(opts);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusedIndex = Math.max(focusedIndex - 1, 0);
      highlightOption(opts);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedIndex >= 0 && opts[focusedIndex]) {
        opts[focusedIndex].dispatchEvent(new MouseEvent("mousedown"));
      } else if (opts.length > 0) {
        opts[0].dispatchEvent(new MouseEvent("mousedown"));
      }
    } else if (e.key === "Escape" || e.key === "Tab") {
      closeDropdown();
    }
  });

  function highlightOption(opts) {
    opts.forEach((o, i) => {
      if (i === focusedIndex) {
        o.classList.add("focused");
        o.scrollIntoView({ block: "nearest" });
      } else {
        o.classList.remove("focused");
      }
    });
  }

  if (!window._searchableSelectGlobalClickSet) {
    window._searchableSelectGlobalClickSet = true;
    document.addEventListener("click", (e) => {
      document.querySelectorAll(".searchable-select-wrap.open").forEach(w => {
        if (!w.contains(e.target)) {
          w.classList.remove("open");
        }
      });
    });
  }

  selectEl.addEventListener("change", updateInputFromSelect);
  updateInputFromSelect();
  selectEl.syncSearchableSelect = function() {
    updateInputFromSelect();
    renderOptions();
  };
}

function initAllSearchableSelects() {
  const ids = [
    'filterPlayer', 'filterDeck', 'filterFormato', 'filterLocal', 'filterColecao',
    'quickLogPlayer', 'quickLogDeck', 'quickLogDeckAdv', 'quickLogColecao',
    'matchupPlayer', 'matchupSelectMyDeck', 'matchupSelectOppDeck',
    'formMatchPlayer', 'formMatchDeck', 'formMatchDeckAdv', 'formDeckPlayer', 'formMatchColecao'
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) makeSearchableSelect(el);
  });
}

// ── 5a. MULTI-PLAYER FILTER LOGIC ─────────────────────────────────────────────
let selectedPlayers = new Set();
let isExplicitPlayerSelection = false;
let allAvailablePlayers = [];

function populateMultiPlayerFilter() {
  const listEl = document.getElementById('multiPlayerList');
  if (!listEl) return;

  const dataPlayers    = allData.map(d => d.Player).filter(Boolean);
  const managerPlayers = (typeof players !== 'undefined') ? players : [];
  
  allAvailablePlayers = [...new Set([...dataPlayers, ...managerPlayers])].sort((a, b) => a.localeCompare(b));

  if (!isExplicitPlayerSelection) {
    selectedPlayers = new Set(allAvailablePlayers);
  } else {
    selectedPlayers = new Set([...selectedPlayers].filter(p => allAvailablePlayers.includes(p)));
  }

  renderMultiPlayerItems(allAvailablePlayers);
  updateMultiPlayerBtnText();
  initMultiPlayerEvents();
}

function renderMultiPlayerItems(playerList) {
  const listEl = document.getElementById('multiPlayerList');
  if (!listEl) return;

  if (playerList.length === 0) {
    listEl.innerHTML = `<div class="searchable-no-results">Nenhum player encontrado</div>`;
    return;
  }

  listEl.innerHTML = playerList.map(pName => {
    const isChecked = selectedPlayers.has(pName);
    return `<label class="multi-deck-item">
      <input type="checkbox" class="multi-player-checkbox" value="${pName}" ${isChecked ? 'checked' : ''} />
      <span class="multi-deck-name">👤 ${pName}</span>
    </label>`;
  }).join('');

  listEl.querySelectorAll('.multi-player-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      isExplicitPlayerSelection = true;
      const val = cb.value;
      if (cb.checked) {
        selectedPlayers.add(val);
      } else {
        selectedPlayers.delete(val);
      }
      updateMultiPlayerBtnText();
      isExplicitSelection = false;
      populateMultiDeckFilter();
      applyFilters();
    });
  });
}

function updateMultiPlayerBtnText() {
  const btnText = document.getElementById('multiPlayerBtnText');
  if (!btnText) return;

  if (allAvailablePlayers.length === 0) {
    btnText.textContent = 'Sem players';
  } else if (selectedPlayers.size === 0) {
    btnText.textContent = 'Nenhum Player Selecionado';
  } else if (selectedPlayers.size === allAvailablePlayers.length) {
    btnText.textContent = `Todos os Players (${allAvailablePlayers.length})`;
  } else if (selectedPlayers.size === 1) {
    btnText.textContent = Array.from(selectedPlayers)[0];
  } else {
    btnText.textContent = `${selectedPlayers.size} Players Selecionados`;
  }
}

function initMultiPlayerEvents() {
  const toggleBtn = document.getElementById('btnMultiPlayerToggle');
  const wrap = document.getElementById('multiPlayerWrap');
  const searchInput = document.getElementById('multiPlayerSearch');
  const selectAllBtn = document.getElementById('btnMultiPlayerSelectAll');
  const clearAllBtn = document.getElementById('btnMultiPlayerClearAll');

  if (toggleBtn && wrap && !toggleBtn.dataset.init) {
    toggleBtn.dataset.init = "true";

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Fechar outros dropdowns
      document.getElementById('multiDeckWrap')?.classList.remove('open');
      document.querySelector('.user-dropdown-menu')?.classList.remove('show-dropdown');
      document.getElementById('mobileMenuBtn')?.classList.remove('is-active');
      document.getElementById('topNavRouter')?.classList.remove('menu-open');
      document.querySelectorAll(".searchable-select-wrap.open").forEach(w => w.classList.remove("open"));

      wrap.classList.toggle('open');
      if (wrap.classList.contains('open') && searchInput) {
        searchInput.focus();
      }
    });

    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) {
        wrap.classList.remove('open');
      }
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.toLowerCase().trim();
        const filtered = allAvailablePlayers.filter(p => p.toLowerCase().includes(q));
        renderMultiPlayerItems(filtered);
      });
    }

    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        isExplicitPlayerSelection = false;
        selectedPlayers = new Set(allAvailablePlayers);
        renderMultiPlayerItems(allAvailablePlayers);
        updateMultiPlayerBtnText();
        isExplicitSelection = false;
        populateMultiDeckFilter();
        applyFilters();
      });
    }

    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        isExplicitPlayerSelection = true;
        selectedPlayers.clear();
        renderMultiPlayerItems(allAvailablePlayers);
        updateMultiPlayerBtnText();
        isExplicitSelection = false;
        populateMultiDeckFilter();
        applyFilters();
      });
    }
  }
}

// ── 5b. MULTI-DECK FILTER LOGIC ───────────────────────────────────────────────
let selectedDecks = new Set();
let isExplicitSelection = false;
let allAvailableDecks = [];

function populateMultiDeckFilter() {
  const listEl = document.getElementById('multiDeckList');
  if (!listEl) return;

  const relevantData = selectedPlayers.size > 0
    ? allData.filter(d => d.Player && selectedPlayers.has(d.Player))
    : allData;

  const dataDecks    = relevantData.map(d => getMatchDeck(d)).filter(Boolean);
  const oppDecks     = relevantData.map(d => getMatchOppDeck(d)).filter(Boolean);
  const managerDecks = (typeof decks !== 'undefined') ? decks.filter(d => selectedPlayers.size === 0 || !d.player || selectedPlayers.has(d.player)).map(d => d.arquetipo || d.name) : [];
  
  allAvailableDecks = [...new Set([...dataDecks, ...oppDecks, ...managerDecks])].sort((a, b) => a.localeCompare(b));

  if (!isExplicitSelection) {
    selectedDecks = new Set(allAvailableDecks);
  } else {
    selectedDecks = new Set([...selectedDecks].filter(d => allAvailableDecks.includes(d)));
  }

  renderMultiDeckItems(allAvailableDecks);
  updateMultiDeckBtnText();
  initMultiDeckEvents();
}

function renderMultiDeckItems(deckList) {
  const listEl = document.getElementById('multiDeckList');
  if (!listEl) return;

  if (deckList.length === 0) {
    listEl.innerHTML = `<div class="searchable-no-results">Nenhum deck encontrado</div>`;
    return;
  }

  listEl.innerHTML = deckList.map(deckName => {
    const isChecked = selectedDecks.has(deckName);
    return `<label class="multi-deck-item">
      <input type="checkbox" class="multi-deck-checkbox" value="${deckName}" ${isChecked ? 'checked' : ''} />
      <span class="multi-deck-name">${deckName}</span>
    </label>`;
  }).join('');

  listEl.querySelectorAll('.multi-deck-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      isExplicitSelection = true;
      const val = cb.value;
      if (cb.checked) {
        selectedDecks.add(val);
      } else {
        selectedDecks.delete(val);
      }
      updateMultiDeckBtnText();
      applyFilters();
    });
  });
}

function updateMultiDeckBtnText() {
  const btnText = document.getElementById('multiDeckBtnText');
  if (!btnText) return;

  if (allAvailableDecks.length === 0) {
    btnText.textContent = 'Sem decks';
  } else if (selectedDecks.size === 0) {
    btnText.textContent = 'Nenhum Deck Selecionado';
  } else if (selectedDecks.size === allAvailableDecks.length) {
    btnText.textContent = `Todos os Decks (${allAvailableDecks.length})`;
  } else if (selectedDecks.size === 1) {
    btnText.textContent = Array.from(selectedDecks)[0];
  } else {
    btnText.textContent = `${selectedDecks.size} Decks Selecionados`;
  }
}

function initMultiDeckEvents() {
  const toggleBtn = document.getElementById('btnMultiDeckToggle');
  const wrap = document.getElementById('multiDeckWrap');
  const searchInput = document.getElementById('multiDeckSearch');
  const selectAllBtn = document.getElementById('btnMultiDeckSelectAll');
  const clearAllBtn = document.getElementById('btnMultiDeckClearAll');

  if (toggleBtn && wrap && !toggleBtn.dataset.init) {
    toggleBtn.dataset.init = "true";

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();

      // Fechar outros dropdowns
      document.getElementById('multiPlayerWrap')?.classList.remove('open');
      document.querySelector('.user-dropdown-menu')?.classList.remove('show-dropdown');
      document.getElementById('mobileMenuBtn')?.classList.remove('is-active');
      document.getElementById('topNavRouter')?.classList.remove('menu-open');
      document.querySelectorAll(".searchable-select-wrap.open").forEach(w => w.classList.remove("open"));

      wrap.classList.toggle('open');
      if (wrap.classList.contains('open') && searchInput) {
        searchInput.focus();
      }
    });

    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) {
        wrap.classList.remove('open');
      }
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.toLowerCase().trim();
        const filtered = allAvailableDecks.filter(d => d.toLowerCase().includes(q));
        renderMultiDeckItems(filtered);
      });
    }

    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        isExplicitSelection = false;
        selectedDecks = new Set(allAvailableDecks);
        renderMultiDeckItems(allAvailableDecks);
        updateMultiDeckBtnText();
        applyFilters();
      });
    }

    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        isExplicitSelection = true;
        selectedDecks.clear();
        renderMultiDeckItems(allAvailableDecks);
        updateMultiDeckBtnText();
        applyFilters();
      });
    }
  }
}

// ── POPULATE FILTERS ──────────────────────────────────────────────────────────
function populateFilters() {
  const formatos = [...new Set(allData.map(d => d.Formato))].sort();

  fillSelect('filterFormato', formatos);
  if (typeof populateLocalSelects   === 'function') populateLocalSelects();
  if (typeof populateColecaoSelects === 'function') populateColecaoSelects();
  populateMultiPlayerFilter();
  populateMultiDeckFilter();
  populateMatchupDeckSelects();
  initAllSearchableSelects();

  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const localToday = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const fStart = document.getElementById('filterDateStart');
  const fEnd = document.getElementById('filterDateEnd');
  if (fStart) fStart.max = localToday;
  if (fEnd) fEnd.max = localToday;

  ['filterFormato', 'filterLocal', 'filterColecao', 'filterPeriod', 'filterDateStart', 'filterDateEnd'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.dataset.filterHandler) {
      el.dataset.filterHandler = "true";
      el.addEventListener('change', (e) => {
        if (e.target.id === 'filterPeriod') {
          const customWrap = document.getElementById('customDateWrap');
          if (customWrap) {
            customWrap.style.display = e.target.value === 'custom' ? 'flex' : 'none';
          }
        }
        applyFilters();
      });
    }
  });
}

function fillSelect(id, values) {
  const sel = document.getElementById(id);
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todos</option>';
  values.forEach(v => {
    const o = document.createElement('option');
    o.value = v; o.textContent = v;
    sel.appendChild(o);
  });
  sel.value = cur;
  if (sel.syncSearchableSelect) sel.syncSearchableSelect();
}

// ── 6. FILTER LOGIC ──────────────────────────────────────────────────────────
function getDateFilters() {
  const pPeriod = window.customDatePickerState ? window.customDatePickerState.period : 'all';
  let dStart = window.customDatePickerState ? window.customDatePickerState.start : '';
  let dEnd   = window.customDatePickerState ? window.customDatePickerState.end : '';

  if (pPeriod !== 'custom' && pPeriod !== 'all') {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const format = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    
    if (pPeriod === 'today') {
      dStart = format(today);
      dEnd = dStart;
    } else if (pPeriod === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      dStart = format(y);
      dEnd = dStart;
    } else if (pPeriod === 'week') {
      const w = new Date(today);
      w.setDate(w.getDate() - 7);
      dStart = format(w);
      dEnd = format(today);
    } else if (pPeriod === 'month') {
      const m = new Date(today);
      m.setDate(1);
      dStart = format(m);
      dEnd = format(today);
    }
  } else if (pPeriod === 'all') {
    dStart = '';
    dEnd = '';
  }
  return { dStart, dEnd };
}

function renderActiveFilters() {
  const container = document.getElementById('activeFiltersContainer');
  if (!container) return;

  const pills = [];

  // Formato
  const formatoEl = document.getElementById('filterFormato');
  if (formatoEl && formatoEl.value) {
    pills.push({ label: '<b>Formato:</b> ' + formatoEl.value, remove: () => { formatoEl.value = ''; if(formatoEl.syncSearchableSelect) formatoEl.syncSearchableSelect(); } });
  }

  // Local
  const localEl = document.getElementById('filterLocal');
  if (localEl && localEl.value) {
    pills.push({ label: '<b>Local:</b> ' + localEl.value, remove: () => { localEl.value = ''; if(localEl.syncSearchableSelect) localEl.syncSearchableSelect(); } });
  }

  // Coleção
  const colecaoEl = document.getElementById('filterColecao');
  if (colecaoEl && colecaoEl.value) {
    pills.push({ label: '<b>Coleção:</b> ' + colecaoEl.value, remove: () => { colecaoEl.value = ''; if(colecaoEl.syncSearchableSelect) colecaoEl.syncSearchableSelect(); } });
  }

  // Data de Criação
  const { dStart, dEnd } = typeof getDateFilters === 'function' ? getDateFilters() : {dStart:'',dEnd:''};
  if (dStart || dEnd) {
    let dateStr = '';
    const customDateLabel = document.getElementById('customDateLabel');
    if (customDateLabel && customDateLabel.textContent !== 'Todo o Período' && customDateLabel.textContent !== 'Personalizado...') {
      dateStr = customDateLabel.textContent;
    } else {
      dateStr = (dStart ? dStart.split('-').reverse().join('/') : 'Início') + ' - ' + (dEnd ? dEnd.split('-').reverse().join('/') : 'Fim');
    }
    pills.push({ 
      label: '<b>Data:</b> ' + dateStr, 
      remove: () => { 
        if (typeof window.customDatePickerState !== 'undefined') {
          window.customDatePickerState.period = 'all';
          window.customDatePickerState.start = '';
          window.customDatePickerState.end = '';
        }
        if (customDateLabel) customDateLabel.textContent = 'Todo o Período';
        const calStart = document.getElementById('calInputStart');
        const calEnd = document.getElementById('calInputEnd');
        if(calStart) calStart.value = '';
        if(calEnd) calEnd.value = '';
        const clearBtn = document.getElementById('customDateClear');
        if(clearBtn) clearBtn.style.display = 'none';
      } 
    });
  }

  // Confiabilidade
  const confAlta = document.getElementById('filterConfAlta');
  const confBaixa = document.getElementById('filterConfBaixa');
  if (confAlta && confBaixa) {
    if (confAlta.checked && !confBaixa.checked) {
      pills.push({ label: '<b>Confiabilidade:</b> Alta', remove: () => { confBaixa.checked = true; document.getElementById('multiConfBtnText').textContent = 'Todas'; } });
    } else if (!confAlta.checked && confBaixa.checked) {
      pills.push({ label: '<b>Confiabilidade:</b> Baixa', remove: () => { confAlta.checked = true; document.getElementById('multiConfBtnText').textContent = 'Todas'; } });
    } else if (!confAlta.checked && !confBaixa.checked) {
      pills.push({ label: '<b>Confiabilidade:</b> Nenhuma', remove: () => { confAlta.checked = true; confBaixa.checked = true; document.getElementById('multiConfBtnText').textContent = 'Todas'; } });
    }
  }

  // Players
  if (typeof allAvailablePlayers !== 'undefined' && typeof selectedPlayers !== 'undefined') {
    if (selectedPlayers.size < allAvailablePlayers.length) {
      if (selectedPlayers.size <= 3 && selectedPlayers.size > 0) {
        selectedPlayers.forEach(p => {
          pills.push({ 
            label: '<b>Player:</b> ' + p, 
            remove: () => { 
              selectedPlayers.delete(p); 
              if (typeof renderMultiPlayerItems === 'function') {
                renderMultiPlayerItems(allAvailablePlayers);
                updateMultiPlayerBtnText();
              }
            } 
          });
        });
      } else {
        pills.push({ 
          label: '<b>Players:</b> ' + selectedPlayers.size + ' selecionados', 
          remove: () => { 
            selectedPlayers = new Set(allAvailablePlayers); 
            if (typeof renderMultiPlayerItems === 'function') {
              renderMultiPlayerItems(allAvailablePlayers);
              updateMultiPlayerBtnText();
            }
          } 
        });
      }
    }
  }

  // Decks
  if (typeof allAvailableDecks !== 'undefined' && typeof selectedDecks !== 'undefined') {
    if (selectedDecks.size < allAvailableDecks.length) {
      if (selectedDecks.size <= 3 && selectedDecks.size > 0) {
        selectedDecks.forEach(d => {
          pills.push({ 
            label: '<b>Deck:</b> ' + d, 
            remove: () => { 
              selectedDecks.delete(d); 
              if (typeof renderMultiDeckItems === 'function') {
                renderMultiDeckItems(allAvailableDecks);
                updateMultiDeckBtnText();
              }
            } 
          });
        });
      } else {
        pills.push({ 
          label: '<b>Decks:</b> ' + selectedDecks.size + ' selecionados', 
          remove: () => { 
            selectedDecks = new Set(allAvailableDecks); 
            if (typeof renderMultiDeckItems === 'function') {
              renderMultiDeckItems(allAvailableDecks);
              updateMultiDeckBtnText();
            }
          } 
        });
      }
    }
  }

  if (pills.length === 0) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  container.style.display = 'flex';
  container.innerHTML = '';
  pills.forEach(pill => {
    const el = document.createElement('div');
    el.className = 'active-filter-pill';
    el.innerHTML = '<span>' + pill.label + '</span>';
    
    const closeBtn = document.createElement('div');
    closeBtn.className = 'active-filter-close';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.onclick = () => {
      pill.remove();
      applyFilters();
    };
    
    el.appendChild(closeBtn);
    container.appendChild(el);
  });
}


function applyFilters() {
  const formato   = (document.getElementById('filterFormato')?.value || '').trim().toLowerCase();
  const local     = (document.getElementById('filterLocal')?.value || '').trim().toLowerCase();
  const colecao   = (document.getElementById('filterColecao')?.value || '').trim().toLowerCase();
  const { dStart: dateStart, dEnd: dateEnd } = getDateFilters();
  const confAltaChecked  = document.getElementById('filterConfAlta')?.checked ?? true;
  const confBaixaChecked = document.getElementById('filterConfBaixa')?.checked ?? true;

  filtered = allData.filter(d => {
    const pName        = (d.Player || '').trim();
    const fName        = (d.Formato || '').trim().toLowerCase();
    const lName        = (d.Local || '').trim().toLowerCase();
    const cName        = (d.Colecao || '').trim().toLowerCase();
    const mDate        = (d.Data || '').slice(0, 10);
    const confVal      = d.Confiabilidade || 'Alta';

    const matchPlayer  = selectedPlayers.has(pName);
    const matchFormato = !formato || fName === formato;
    const matchLocal   = !local   || lName === local;
    const matchColecao = !colecao || cName === colecao;
    const dArchetype   = getMatchDeck(d);
    const matchDeck    = selectedDecks.has(dArchetype) || selectedDecks.has(d.Deck);
    const matchConf    = (confVal === 'Alta' && confAltaChecked) || (confVal === 'Baixa' && confBaixaChecked);

    let matchDate = true;
    if (dateStart && mDate < dateStart) matchDate = false;
    if (dateEnd   && mDate > dateEnd)   matchDate = false;

    return matchPlayer && matchFormato && matchLocal && matchColecao && matchDeck && matchDate && matchConf;
  });

  renderAll();
}

// ── 7. KPI CARDS ─────────────────────────────────────────────────────────────
function renderKPIs() {
  const stats = calculateStats(filtered);
  const brickPct = pct(stats.totalGameBricksCount, stats.totalGamesCount);

  animCount('kpiTotal', stats.total);
  animCount('kpiWin',   stats.wins);
  animCount('kpiDraw',  stats.draws);
  animCount('kpiLoss',  stats.losses);
  document.getElementById('kpiWR').textContent = stats.wr + '%';
  const bEl = document.getElementById('kpiBrick');
  if (bEl) bEl.textContent = brickPct + '%';
}

function animCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let start = 0;
  const step = Math.ceil(target / 20);
  const tick = () => {
    start = Math.min(start + step, target);
    el.textContent = start;
    if (start < target) requestAnimationFrame(tick);
  };
  tick();
}

// ── 8. CHART: DECK WIN RATE ──────────────────────────────────────────────────
function renderDeckWR() {
  destroyChart('deckWR');
  const byDeck = groupBy(filtered, getMatchDeck);

  const deckStats = Object.keys(byDeck).map(d => {
    const s = calculateStats(byDeck[d]);
    return { deck: d, wr: s.wr, wins: s.wins, tot: s.total };
  });

  let validDecks = deckStats.filter(d => d.tot >= 10);
    if (validDecks.length === 0) validDecks = deckStats;
    validDecks.sort((a, b) => b.wr - a.wr || b.tot - a.tot);
    const top10 = validDecks.slice(0, 10);
    const labels = top10.map(d => d.deck);
    const wrData = top10.map(d => d.wr);
    const bgColors = top10.map((_, i) => PALETTE[i % PALETTE.length]);

  charts['deckWR'] = new Chart(document.getElementById('chartDeckWR'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Win Rate (%)',
        data: wrData,
        backgroundColor: bgColors.map(c => c + 'cc'),
        borderColor: bgColors,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
          legend: { display: false },
          datalabels: { display: true, color: '#fff', font: { weight: 'bold', size: 11 }, anchor: 'center', align: 'center', textStrokeColor: '#000000', textStrokeWidth: 3, formatter: v => Math.round(v) + '%' },
          tooltip: {
          callbacks: {
            label: ctx => {
              const stat = top10[ctx.dataIndex];
              return ` ${stat.wr}%  (${stat.wins}V / ${stat.tot} jogos)`;
            }
          }
        }
      },
      scales: {
        y: {
          min: 0, max: 100,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { callback: v => v + '%' }
        },
        x: { grid: { color: 'rgba(255,255,255,0.03)' } }
      }
    }
  });
}

// ── 9. CHART: PLAYER PERFORMANCE ────────────────────────────────────────────
function renderPlayerPerf() {
    destroyChart('playerPerf');
    const byPlayer = groupBy(filtered, 'Player');
  
    const registeredPlayers = (typeof players !== 'undefined') ? players : [];
    let baseLabels = registeredPlayers.map(p => p.name || p);
    if (baseLabels.length === 0) baseLabels = Object.keys(byPlayer);
  
    const playerStats = baseLabels.map(p => {
      const ms = byPlayer[p] || [];
      return calculateStats(ms);
    });
  
    const combined = baseLabels.map((l, i) => ({ label: l, stat: playerStats[i] }));
    combined.sort((a, b) => b.stat.wins - a.stat.wins || b.stat.tot - a.stat.tot);
  
    const labels = combined.map(c => c.label);
    const sortedStats = combined.map(c => c.stat);
  
    const wins   = sortedStats.map(s => s.wins);
    const draws  = sortedStats.map(s => s.draws);
    const losses = sortedStats.map(s => s.losses);
    const maxTotal = Math.max(...sortedStats.map(s => s.total), 1);

    const playerPerfWRPlugin = {
      id: 'playerPerfWRLabel',
      afterDatasetsDraw(chart) {
        const { ctx, scales: { x, y } } = chart;
        ctx.save();
        ctx.font = 'bold 11px "Outfit", "Inter", sans-serif';
        ctx.fillStyle = '#38d9f5';
        ctx.textBaseline = 'middle';
        
        sortedStats.forEach((stat, index) => {
          if (stat.total === 0) return;
          const yPos = y.getPixelForTick(index);
          const xPos = x.getPixelForValue(stat.total);
          ctx.fillText(` ${stat.wr}% WR`, xPos + 4, yPos);
        });
        ctx.restore();
      }
    };

    charts['playerPerf'] = new Chart(document.getElementById('chartPlayerPerf'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Vitórias', data: wins,   backgroundColor: WIN_COLOR  + 'bb', borderColor: WIN_COLOR,   borderWidth: 2, borderRadius: 6 },
          { label: 'Empates',  data: draws,  backgroundColor: DRAW_COLOR + 'bb', borderColor: DRAW_COLOR,  borderWidth: 2, borderRadius: 6 },
          { label: 'Derrotas', data: losses, backgroundColor: LOSS_COLOR + 'bb', borderColor: LOSS_COLOR,  borderWidth: 2, borderRadius: 6 },
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 60 } },
        plugins: {
          legend: { position: 'bottom' },
          datalabels: {
            display: function(context) {
              return context.dataset.data[context.dataIndex] > 0;
            },
            textStrokeColor: '#000000',
            textStrokeWidth: 3,
            color: '#fff',
            font: { weight: 'bold', size: 11 },
            formatter: Math.round
          },
          tooltip: {
            callbacks: {
              label: ctx => {
                const stat = sortedStats[ctx.dataIndex];
                const dsLabel = ctx.dataset.label;
                const val = ctx.parsed.x;
                return ` ${dsLabel}: ${val} (Total: ${stat.total} jogos | WR: ${stat.wr}%)`;
              }
            }
          }
        },
        scales: {
          x: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: {
            stacked: true,
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { autoSkip: false }
          }
        }
      },
      plugins: [playerPerfWRPlugin]
    });
}

function renderPlayerSubtypeBreakdown() {
  const sectionEl = document.getElementById('playerSubtypeSection');
  const titleEl   = document.getElementById('playerSubtypeTitle');
  const bodyEl    = document.getElementById('playerSubtypeBody');
  if (!sectionEl || !bodyEl) return;

  const isSinglePlayer = typeof selectedPlayers !== 'undefined' && selectedPlayers.size === 1;

  if (!isSinglePlayer) {
    sectionEl.style.display = 'none';
    return;
  }

  const playerName = Array.from(selectedPlayers)[0];
  sectionEl.style.display = 'block';

  if (titleEl) {
    titleEl.textContent = `📊 Desempenho por Variante & Subtipo (${playerName})`;
  }

  const playerMatches = filtered.filter(m => (m.Player || '').trim() === playerName);

  if (playerMatches.length === 0) {
    bodyEl.innerHTML = '<div class="empty-state" style="padding:1.5rem;"><p>Nenhuma partida encontrada para este jogador com os filtros atuais.</p></div>';
    return;
  }

  const byArchetype = groupBy(playerMatches, getMatchDeck);
  const sortedArchetypes = Object.keys(byArchetype).sort((a, b) => byArchetype[b].length - byArchetype[a].length);

  let html = `<div style="display:flex; flex-direction:column; gap:1rem;">`;

  sortedArchetypes.forEach(arq => {
    const arqMatches = byArchetype[arq];
    const arqStats   = calculateStats(arqMatches);
    const wrColorStyle = arqStats.wr >= 60 ? 'color:var(--green)' : arqStats.wr >= 50 ? 'color:var(--yellow)' : 'color:var(--red)';

    const byVariant = groupBy(arqMatches, 'Deck');
    const variantKeys = Object.keys(byVariant).sort((a, b) => byVariant[b].length - byVariant[a].length);

    html += `
      <div style="background:var(--bg3); border-radius:var(--radius-sm); border:1px solid var(--glass-bd); padding:0.9rem 1.1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:0.6rem; margin-bottom:0.6rem;">
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <strong style="font-size:0.95rem; color:var(--text);">${arq}</strong>
            <span style="font-size:0.75rem; color:var(--text2);">(${arqStats.total} jogos)</span>
          </div>
          <div style="display:flex; align-items:center; gap:0.75rem; font-size:0.82rem;">
            <span style="color:var(--green)">${arqStats.wins}V</span>
            <span style="color:var(--yellow)">${arqStats.draws}E</span>
            <span style="color:var(--red)">${arqStats.losses}D</span>
            <span style="font-size:0.9rem; font-weight:800; ${wrColorStyle}">${arqStats.wr}% WR</span>
          </div>
        </div>
        
        <div style="display:flex; flex-direction:column; gap:0.4rem;">
    `;

    variantKeys.forEach(vName => {
      const vMatches = byVariant[vName];
      const vStats   = calculateStats(vMatches);
      const vLabel   = (vName === arq) ? `${vName} (Versão Padrão)` : vName;

      const byOpp = groupBy(vMatches, getMatchOppDeck);
      const oppKeys = Object.keys(byOpp).sort((a, b) => byOpp[b].length - byOpp[a].length);

      let oppHtml = `<div style="display:flex; flex-wrap:wrap; gap:0.4rem; margin-top:0.45rem;">`;

      oppKeys.forEach(oppName => {
        const oppM = byOpp[oppName];
        const oppStats = calculateStats(oppM);
        const oppWrColor = oppStats.wr >= 60 ? 'var(--green)' : oppStats.wr >= 50 ? 'var(--yellow)' : 'var(--red)';

        const oppDetails = oppM.map(m => {
          const icon = m.Resultado === 'Vitória' ? '✅' : m.Resultado === 'Empate' ? '🤝' : '❌';
          return `${icon} vs ${m.Adversario} (${m.Placar || m.Resultado})`;
        }).join('\n');

        oppHtml += `
          <div style="background:rgba(26,127,255,0.08); border:1px solid rgba(26,127,255,0.22); border-radius:6px; padding:0.3rem 0.6rem; font-size:0.75rem; display:flex; align-items:center; gap:0.45rem;" title="${oppDetails}">
            <span style="color:var(--text2);">vs <strong style="color:var(--accent2);">${oppName}</strong>:</span>
            <span style="font-weight:600; color:var(--text);">${oppStats.wins}V-${oppStats.draws}E-${oppStats.losses}D</span>
            <span style="font-weight:800; color:${oppWrColor}; font-size:0.72rem; padding:1px 6px; border-radius:10px; background:rgba(0,0,0,0.35);">${oppStats.wr}% WR</span>
          </div>
        `;
      });

      oppHtml += `</div>`;

      html += `
        <div style="background:rgba(255,255,255,0.02); border-radius:8px; padding:0.6rem 0.85rem; border-left:3px solid var(--accent2); margin-bottom:0.35rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.82rem; flex-wrap:wrap; gap:0.4rem;">
            <span style="color:var(--text); font-weight:600;">↳ ${vLabel}</span>
            <div style="display:flex; gap:0.75rem; align-items:center;">
              <span style="color:var(--text2); font-size:0.75rem;">Total da Variante: ${vStats.wins}V - ${vStats.draws}E - ${vStats.losses}D (${vStats.total} jogos)</span>
              <span style="font-weight:800; color:${vStats.wr >= 50 ? 'var(--green)' : 'var(--red)'}; min-width:45px; text-align:right;">${vStats.wr}% WR</span>
            </div>
          </div>
          ${oppHtml}
        </div>
      `;
    });

    html += `</div></div>`;
  });

  html += `</div>`;
  bodyEl.innerHTML = html;
}

// ── 10. CHART: RESULT PIE ────────────────────────────────────────────────────
function renderResultPie() {
  destroyChart('resultPie');
  const wins   = filtered.filter(d=>d.Resultado==='Vitória').length;
  const draws  = filtered.filter(d=>d.Resultado==='Empate').length;
  const losses = filtered.filter(d=>d.Resultado==='Derrota').length;

  charts['resultPie'] = new Chart(document.getElementById('chartResultPie'), {
    type: 'doughnut',
    data: {
      labels: ['Vitórias','Empates','Derrotas'],
      datasets: [{
        data: [wins, draws, losses],
        backgroundColor: [WIN_COLOR+'cc', DRAW_COLOR+'cc', LOSS_COLOR+'cc'],
        borderColor:     [WIN_COLOR, DRAW_COLOR, LOSS_COLOR],
        borderWidth: 2,
        hoverOffset: 10,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom' },
        datalabels: {
          display: function(ctx) {
            return ctx.dataset.data[ctx.dataIndex] > 0;
          },
          color: '#fff',
          font: { weight: 'bold', size: 11 },
          textStrokeColor: '#000000',
          textStrokeWidth: 3,
          formatter: (val, ctx) => {
            const suffixes = ['V', 'E', 'D'];
            return `${val}${suffixes[ctx.dataIndex] || ''}`;
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a,b)=>a+b,0);
              return ` ${ctx.label}: ${ctx.raw} (${pct(ctx.raw,total)}%)`;
            }
          }
        }
      }
    }
  });
}

// ── 11. CHART: LOCAL ────────────────────────────────────────────────────────
function renderLocal() {
  destroyChart('local');
  const byLocal = groupBy(filtered, 'Local');
  const sorted  = Object.entries(byLocal).sort((a,b) => b[1].length - a[1].length);
  const labels  = sorted.map(([k]) => k);
  const counts  = sorted.map(([,v]) => v.length);
  const bgColors= labels.map((_,i) => PALETTE[i % PALETTE.length]);

  charts['local'] = new Chart(document.getElementById('chartLocal'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Partidas',
        data: counts,
        backgroundColor: bgColors.map(c => c + 'cc'),
        borderColor: bgColors,
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { right: 35 } },
      plugins: {
        legend: { display: false },
        datalabels: {
          display: function(ctx) { return ctx.dataset.data[ctx.dataIndex] > 0; },
          color: '#fff',
          font: { weight: 'bold', size: 11 },
          anchor: 'end',
          align: 'right',
          textStrokeColor: '#000000',
          textStrokeWidth: 3,
          formatter: Math.round
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' } },
        y: {
          grid: { color: 'rgba(255,255,255,0.03)' },
          ticks: { autoSkip: false, font: { size: 11 } }
        }
      }
    }
  });
}

// ── 12. CHART: FORMATO ──────────────────────────────────────────────────────
function renderFormato() {
  destroyChart('formato');
  const byFmt = groupBy(filtered, 'Formato');
  const labels = Object.keys(byFmt);
  const counts = labels.map(f => byFmt[f].length);

  charts['formato'] = new Chart(document.getElementById('chartFormato'), {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data: counts,
        backgroundColor: ['#7c6af7cc','#38d9f5cc'],
        borderColor:     ['#7c6af7','#38d9f5'],
        borderWidth: 2,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' }, datalabels: {
          display: function(ctx) {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const val = ctx.dataset.data[ctx.dataIndex];
            return (total > 0 && (val / total) >= 0.05) ? 'auto' : false;
          },
          color: '#fff',
          font: { weight: 'bold', size: 13 },
          textStrokeColor: '#000000',
          textStrokeWidth: 3,
          formatter: Math.round
        } }
    }
  });
}

// ── 14. CHART: DECK COUNT ───────────────────────────────────────────────────
function renderDeckCount() {
  destroyChart('deckCount');
  const byDeck = groupBy(filtered, getMatchDeck);
  const sorted = Object.entries(byDeck).sort((a,b) => b[1].length - a[1].length).slice(0, 10);
  const labels = sorted.map(([k]) => k);
  const counts = sorted.map(([,v]) => v.length);

  charts['deckCount'] = new Chart(document.getElementById('chartDeckCount'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Partidas',
        data: counts,
        backgroundColor: PALETTE.map(c=>c+'99'),
        borderColor: PALETTE,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
        indexAxis: 'y',
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { right: 35 } },
      plugins: {
        legend: { display: false },
        datalabels: {
          display: function(ctx) { return ctx.dataset.data[ctx.dataIndex] > 0; },
          color: '#fff',
          font: { weight: 'bold', size: 11 },
          anchor: 'end',
          align: 'right',
          textStrokeColor: '#000000',
          textStrokeWidth: 3,
          formatter: Math.round
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' } },
        y: {
          grid: { color: 'rgba(255,255,255,0.03)' },
          ticks: { autoSkip: false, font: { size: 11 } }
        }
      }
    }
  });
}

// ── 15. CHART: START ────────────────────────────────────────────────────────
function renderStart() {
  destroyChart('start');
  const positions = ['1º', '2º'];

  const expandedStarts = [];
  filtered.forEach(m => {
    if (m.GamesDetail && Array.isArray(m.GamesDetail) && m.GamesDetail.length > 0) {
      m.GamesDetail.forEach(g => {
        expandedStarts.push({ ...m, Start: g.start });
      });
    } else {
      expandedStarts.push(m);
    }
  });
  const byStart = groupBy(expandedStarts, 'Start');

  const datasets = [
    { label: 'Vitórias', color: WIN_COLOR  },
    { label:'Empates',  color: DRAW_COLOR },
    { label:'Derrotas', color: LOSS_COLOR },
  ];

  charts['start'] = new Chart(document.getElementById('chartStart'), {
    type: 'bar',
    data: {
      labels: positions,
      datasets: datasets.map(ds => ({
        label: ds.label,
        data: positions.map(pos => {
          const rows = byStart[pos] ?? [];
          const keyword = ds.label === 'Vitórias' ? 'Vitória' : ds.label === 'Empates' ? 'Empate' : 'Derrota';
          return rows.filter(r=>r.Resultado===keyword).length;
        }),
        backgroundColor: ds.color + 'bb',
        borderColor: ds.color,
        borderWidth: 2,
        borderRadius: 8,
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' }, datalabels: { display: function(ctx) { return ctx.dataset.data[ctx.dataIndex] > 0; }, color: '#fff', font: { weight: 'bold', size: 12 }, textStrokeColor: '#000000', textStrokeWidth: 3, formatter: Math.round } },
      scales: {
        y: { grid: { color:'rgba(255,255,255,0.05)' } },
        x: { grid: { color:'rgba(255,255,255,0.03)' } }
      }
    }
  });
}

// ── 16. CHART: BRICK ───────────────────────────────────────────────────────
function renderBrick() {
    destroyChart('brick');
  
    const byDeck = groupBy(filtered, 'Deck');
    let brickStats = Object.keys(byDeck).map(deck => {
      const rows = byDeck[deck];
      let totalGames = 0, brickedGames = 0;
      rows.forEach(r => {
        if (r.GamesDetail && Array.isArray(r.GamesDetail) && r.GamesDetail.length > 0) {
          totalGames += r.GamesDetail.length;
          brickedGames += r.GamesDetail.filter(g => g.brick === 'Sim').length;
        } else {
          totalGames += 1;
          if (isBricked(r)) brickedGames += 1;
        }
      });
      const pct = totalGames ? Math.round((brickedGames / totalGames) * 100) : 0;
      return { deck, pct, total: totalGames };
    });
    
    // Filtra decks com pelo menos 1 jogo para evitar divis�o por zero se houver sujeira
    brickStats = brickStats.filter(s => s.total > 0);
    // Ordena decrescente por % de brick e desempata por total de jogos
    brickStats.sort((a, b) => b.pct - a.pct || b.total - a.total);
    // Limita aos 10 maiores
    const top10 = brickStats.slice(0, 10);
  
    const labels = top10.map(s => s.deck);
    const dataPct = top10.map(s => s.pct);
  
    charts['brick'] = new Chart(document.getElementById('chartBrick'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '% Brick',
          data: dataPct,
          backgroundColor: '#f75050bb',
          borderColor: '#f75050',
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 85 } },
        plugins: {
          legend: { display: false },
          datalabels: {
            display: function(context) {
              return context.dataset.data[context.dataIndex] > 0;
            },
            color: '#fff',
            font: { weight: 'bold', size: 11 },
            textStrokeColor: '#000000',
            textStrokeWidth: 3,
            anchor: 'end',
            align: 'right',
            formatter: (value, ctx) => {
              const stat = top10[ctx.dataIndex];
              return `${value}% (${stat.total} jogos)`;
            }
          },
          tooltip: {
            callbacks: {
              label: ctx => {
                const stat = top10[ctx.dataIndex];
                return ` Brick: ${stat.pct}% (${stat.brickedGames || ''} / ${stat.total} jogos)`;
              }
            }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, max: 100 },
          y: {
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { autoSkip: false, font: { size: 11 } }
          }
        }
      }
    });
}

// ── 17. TABLE & PAGINATION ───────────────────────────────────────────────────
let tableRows = [];
let currentPage = 1;
const PAGE_SIZE = 10;

function normalizeStr(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

window.tableWRSortState = 'none'; // 'none', 'desc', 'asc'

window.toggleTableWRSort = function() {
  if (window.tableWRSortState === 'none') {
    window.tableWRSortState = 'desc';
  } else if (window.tableWRSortState === 'desc') {
    window.tableWRSortState = 'asc';
  } else {
    window.tableWRSortState = 'none';
  }
  updateTableSortButtonUI();
  renderTable(filtered || allData, true);
};

function updateTableSortButtonUI() {
  const icon = document.getElementById('tableSortWRIcon');
  const label = document.getElementById('tableSortWRLabel');
  const btn = document.getElementById('btnTableSortWR');
  if (btn) {
    if (window.tableWRSortState !== 'none') btn.classList.add('active');
    else btn.classList.remove('active');
  }
  if (icon && label) {
    if (window.tableWRSortState === 'desc') {
      icon.textContent = '⬇️';
      label.textContent = 'Maior WR';
    } else if (window.tableWRSortState === 'asc') {
      icon.textContent = '⬆️';
      label.textContent = 'Menor WR';
    } else {
      icon.textContent = '📊';
      label.textContent = 'Ordenação WR';
    }
  }
}

function changePage(page) {
  currentPage = page;
  renderTable(tableRows, false);
}
window.changePage = changePage;

function renderTable(rows, resetPage = false) {
  const targetRows = (Array.isArray(rows)) ? rows : (filtered || allData || []);
  tableRows = targetRows;
  if (resetPage) currentPage = 1;

  const tbody = document.getElementById('tableBody');
  const searchInput = document.getElementById('tableSearch');
  const searchRaw = (searchInput?.value || '').trim();
  const searchNorm = normalizeStr(searchRaw);

  window.tableSortState = window.tableSortState || { column: 'seqID', dir: 'desc' };

window.sortTableByColumn = function(colKey) {
  if (colKey === 'listas' || colKey === 'acoes') return;

  if (window.tableSortState.column === colKey) {
    window.tableSortState.dir = (window.tableSortState.dir === 'asc') ? 'desc' : 'asc';
  } else {
    window.tableSortState.column = colKey;
    if (colKey === 'seqID' || colKey === 'Data' || colKey === 'Placar') {
      window.tableSortState.dir = 'desc';
    } else {
      window.tableSortState.dir = 'asc';
    }
  }

  renderTable();
};

function updateTableHeaderSortUI() {
  const allSortCols = ['seqID','Data','Player','Deck','Adversario','DeckAdv','Formato','Colecao','Confiabilidade','Start','Placar','Resultado','Brick','Local'];
  const { column, dir } = window.tableSortState || { column: 'seqID', dir: 'desc' };

  allSortCols.forEach(col => {
    const el = document.getElementById(`sort-icon-${col}`);
    const th = el?.closest('th');
    if (el) {
      if (col === column) {
        el.textContent = dir === 'asc' ? ' ▲' : ' ▼';
        if (th) th.classList.add('active-sort');
      } else {
        el.textContent = '';
        if (th) th.classList.remove('active-sort');
      }
    }
  });
}

  const clearBtn = document.getElementById('btnClearTableSearch');
  if (clearBtn) clearBtn.style.display = searchNorm ? 'block' : 'none';

  const toRender = targetRows.filter(r => {
    if (!searchNorm) return true;

    if (searchNorm.includes(':')) {
      const parts = searchNorm.split(':');
      const key = parts[0].trim();
      const val = parts.slice(1).join(':').trim();

      if (key === 'player' || key === 'jogador') {
        return normalizeStr(r.Player).includes(val) || normalizeStr(r.Adversario).includes(val);
      }
      if (key === 'deck') {
        return normalizeStr(r.Deck).includes(val) || normalizeStr(r.DeckAdv).includes(val);
      }
      if (key === 'placar') {
        return normalizeStr(r.Placar).includes(val);
      }
      if (key === 'local') {
        return normalizeStr(r.Local).includes(val);
      }
      if (key === 'colecao' || key === 'coleção') {
        return normalizeStr(r.Colecao).includes(val);
      }
      if (key === 'conf' || key === 'confiabilidade') {
        return normalizeStr(r.Confiabilidade).includes(val);
      }
      if (key === 'resultado') {
        return normalizeStr(r.Resultado).includes(val);
      }
      if (key === 'start') {
        return normalizeStr(r.Start).includes(val);
      }
      if (key === 'formato') {
        return normalizeStr(r.Formato).includes(val);
      }
      if (key === 'brick') {
        return normalizeStr(r.Brick).includes(val);
      }
    }

    const visibleValues = [
      r.Data,
      r.Player,
      r.Deck,
      r.Adversario,
      r.DeckAdv,
      r.Formato,
      r.Colecao,
      r.Confiabilidade,
      r.Start,
      r.Placar,
      r.Resultado,
      r.Brick,
      r.Local,
      r.Comentarios
    ].filter(Boolean).map(v => normalizeStr(v));

    return visibleValues.some(v => v.includes(searchNorm));
  });

  let sorted = [...toRender];
  const { column, dir } = window.tableSortState || { column: 'Data', dir: 'desc' };
  const multiplier = (dir === 'asc') ? 1 : -1;

  sorted.sort((a, b) => {
    let valA, valB;

    switch(column) {
      case 'seqID':
      case 'id':
        valA = Number(a.seqID || a.seqId || a._displayId) || parseInt(String(a.id).replace(/\D/g, ''), 10) || 0;
        valB = Number(b.seqID || b.seqId || b._displayId) || parseInt(String(b.id).replace(/\D/g, ''), 10) || 0;
        break;
      case 'Data':
        valA = a.Data || '';
        valB = b.Data || '';
        break;
      case 'Player':
        valA = a.Player || '';
        valB = b.Player || '';
        break;
      case 'Deck':
        valA = a.Deck || '';
        valB = b.Deck || '';
        break;
      case 'Adversario':
        valA = a.Adversario || '';
        valB = b.Adversario || '';
        break;
      case 'DeckAdv':
        valA = a.DeckAdv || '';
        valB = b.DeckAdv || '';
        break;
      case 'Formato':
        valA = a.Formato || '';
        valB = b.Formato || '';
        break;
      case 'Colecao':
        valA = a.Colecao || '';
        valB = b.Colecao || '';
        break;
      case 'Confiabilidade':
        valA = (a.Confiabilidade || 'Alta').toLowerCase() === 'alta' ? 1 : 0;
        valB = (b.Confiabilidade || 'Alta').toLowerCase() === 'alta' ? 1 : 0;
        break;
      case 'Start':
        valA = a.Start || '';
        valB = b.Start || '';
        break;
      case 'Placar':
        valA = a.Placar || '';
        valB = b.Placar || '';
        break;
      case 'Resultado':
        const rank = r => r === 'Vitória' ? 2 : r === 'Empate' ? 1 : 0;
        valA = rank(a.Resultado);
        valB = rank(b.Resultado);
        break;
      case 'Brick':
        valA = (a.Brick === 'Sim' || (a.Brick && a.Brick !== 'Nenhum' && a.Brick !== 'Não')) ? 1 : 0;
        valB = (b.Brick === 'Sim' || (b.Brick && b.Brick !== 'Nenhum' && b.Brick !== 'Não')) ? 1 : 0;
        break;
      case 'Local':
        valA = a.Local || '';
        valB = b.Local || '';
        break;
      default:
        valA = Number(a.seqID || a.seqId || a._displayId) || parseInt(String(a.id).replace(/\D/g, ''), 10) || 0;
        valB = Number(b.seqID || b.seqId || b._displayId) || parseInt(String(b.id).replace(/\D/g, ''), 10) || 0;
    }

    if (typeof valA === 'string') {
      const cmp = valA.localeCompare(valB, 'pt-BR', { numeric: true });
      if (cmp !== 0) return cmp * multiplier;
    } else if (valA !== valB) {
      return (valA < valB ? -1 : 1) * multiplier;
    }
    
    const seqA = Number(a.seqID || a.seqId || a._displayId) || parseInt(String(a.id).replace(/\D/g, ''), 10) || 0;
    const seqB = Number(b.seqID || b.seqId || b._displayId) || parseInt(String(b.id).replace(/\D/g, ''), 10) || 0;
    return seqB - seqA;
  });

  updateTableHeaderSortUI();

  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, totalItems);
  const pagedRows = sorted.slice(startIdx, endIdx);

  if (pagedRows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="16" style="text-align:center;padding:2rem;color:var(--text2)">Nenhuma partida encontrada</td></tr>`;
  } else {
    tbody.innerHTML = pagedRows.map((r, i) => {
      const globalRowNumber = r._displayId || r.seqID || r.seqId || (totalItems - (startIdx + i));
      const badgeClass = r.Resultado === 'Vitória' ? 'badge-win' :
                         r.Resultado === 'Empate'  ? 'badge-draw' : 'badge-loss';
      const emoji = r.Resultado === 'Vitória' ? '✅' : r.Resultado === 'Empate' ? '🤝' : '❌';

      let myBtn = r.Deck ? `<button class="list-peek-btn" onclick="openMatchDeckList('${r.id}', 'own')" title="Ver/Editar lista do Meu Deck desta partida">Meu</button>` : '';
      let oppBtn = (r.DeckAdv && r.DeckAdv !== '—') ? `<button class="list-peek-btn opp-btn" onclick="openMatchDeckList('${r.id}', 'adv')" title="Ver/Editar lista do Deck Oponente desta partida">Opo</button>` : '';

      const listasCol = (myBtn || oppBtn) 
        ? `<div style="display:flex;gap:4px;justify-content:center">${myBtn}${oppBtn}</div>` 
        : '<span style="color:var(--text2);font-size:.75rem">—</span>';

      const brickVal = (r.Brick === 'Sim' || (r.Brick && r.Brick !== 'Nenhum' && r.Brick !== 'Não')) ? '💥 Sim' : '✅ Não';
      const confVal = (r.Confiabilidade === 'Baixa') ? 'Baixa' : 'Alta';
      const confBadgeClass = (confVal === 'Baixa') ? 'badge-loss' : 'badge-win';
      const confBadge = `<span class="badge ${confBadgeClass}" style="font-size:0.73rem;">${confVal === 'Baixa' ? '🔴 Baixa' : '🟢 Alta'}</span>`;

      const hasComment = r.Comentarios && r.Comentarios.trim() !== '';
      const commentBtn = hasComment 
        ? `<button class="icon-btn sm" onclick="viewMatchComment('${r.id}')" title="${(r.Comentarios || '').replace(/"/g, '&quot;')}" style="background:rgba(0,200,248,0.18);color:var(--accent2);border-color:rgba(0,200,248,0.35);">💬</button>` 
        : '';

      const currentUserObj = typeof getActivePlayerName === 'function' ? getActivePlayerName() : window.currentUser?.name || '';
      const isOwner = currentUserObj && (r.Player || '').trim().toLowerCase() === currentUserObj.trim().toLowerCase();

      const actionsCol = `
        <div style="display:flex;gap:4px;justify-content:center;align-items:center;">
          ${commentBtn}
          ${isOwner ? `<button class="icon-btn sm" onclick="editMatch('${r.id}')" title="Editar partida">✏️</button>
          <button class="icon-btn danger sm" onclick="deleteMatch('${r.id}')" title="Deletar partida">🗑️</button>` : ''}
        </div>
      `;

      return `<tr>
        <td>${globalRowNumber}</td>
        <td>${r.Data}</td>
        <td>${r.Player}</td>
        <td><strong>${r.Deck}</strong></td>
        <td>${r.DeckAdv}</td>
        <td>${r.Formato}</td>
        <td><span style="font-size:.8rem;color:var(--accent2);font-weight:600">${r.Colecao || '—'}</span></td>
        <td>${confBadge}</td>
        <td>${r.Start}</td>
        <td>${r.Placar}</td>
        <td><span class="badge ${badgeClass}">${emoji} ${r.Resultado}</span></td>
        <td>${brickVal}</td>
        <td>${r.Local}</td>
        <td style="text-align:center;">${listasCol}</td>
        <td style="text-align:center;">${actionsCol}</td>
      </tr>`;
    }).join('');
  }

  renderPaginationControls(totalItems, startIdx, endIdx, totalPages);

  const fc = document.getElementById('footerCount');
  if (fc) fc.textContent = `${allData.length} partidas registradas`;
}

function renderPaginationControls(totalItems, startIdx, endIdx, totalPages) {
  const info = document.getElementById('paginationInfo');
  const ctrl = document.getElementById('paginationControls');
  if (!info || !ctrl) return;

  if (totalItems === 0) {
    info.textContent = 'Mostrando 0 de 0 partidas';
    ctrl.innerHTML = '';
    return;
  }

  info.textContent = `Mostrando ${startIdx + 1}–${endIdx} de ${totalItems} partidas`;

  let btns = [];

  btns.push(`<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">‹ Ant</button>`);

  let startP = Math.max(1, currentPage - 2);
  let endP = Math.min(totalPages, startP + 4);
  if (endP - startP < 4) {
    startP = Math.max(1, endP - 4);
  }

  if (startP > 1) {
    btns.push(`<button class="page-btn" onclick="changePage(1)">1</button>`);
    if (startP > 2) btns.push(`<span style="color:var(--text2);font-size:.8rem">…</span>`);
  }

  for (let p = startP; p <= endP; p++) {
    const active = p === currentPage ? 'active' : '';
    btns.push(`<button class="page-btn ${active}" onclick="changePage(${p})">${p}</button>`);
  }

  if (endP < totalPages) {
    if (endP < totalPages - 1) btns.push(`<span style="color:var(--text2);font-size:.8rem">…</span>`);
    btns.push(`<button class="page-btn" onclick="changePage(${totalPages})">${totalPages}</button>`);
  }

  btns.push(`<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Próx ›</button>`);

  ctrl.innerHTML = btns.join('');
}

// ── 18. MATCHUP WIN RATE ─────────────────────────────────────────────────────
let matchupCurrentView = 'matrix';

function buildMatchupData(data) {
  const map = {};
  data.forEach(r => {
    const myDeck = getMatchDeck(r);
    const oppDeck = getMatchOppDeck(r);
    if (!myDeck || !oppDeck || oppDeck === '—' || oppDeck === '') return;
    const key = `${myDeck}|||${oppDeck}`;
    if (!map[key]) map[key] = { deck: myDeck, opp: oppDeck, wins: 0, draws: 0, losses: 0, total: 0, matches: [] };
    const entry = map[key];
    entry.total++;
    if (r.Resultado === 'Vitória') entry.wins++;
    else if (r.Resultado === 'Empate') entry.draws++;
    else entry.losses++;
    entry.matches.push(r);
  });
  return map;
}

function wrColor(wr, alpha = 1) {
  if (wr === null) return `rgba(255,255,255,0.05)`;
  if (wr < 50) {
    const t = wr / 50;
    const r = 247, g = Math.round(80 + (200 - 80) * t), b = 80;
    return `rgba(${r},${g},${b},${alpha})`;
  } else {
    const t = (wr - 50) / 50;
    const r = Math.round(247 - (247 - 52) * t), g = Math.round(200 + (224 - 200) * t), b = Math.round(80 + (161 - 80) * t);
    return `rgba(${r},${g},${b},${alpha})`;
  }
}

function getMatchupBaseDataset() {
  const formato   = (document.getElementById('filterFormato')?.value || '').trim().toLowerCase();
  const local     = (document.getElementById('filterLocal')?.value || '').trim().toLowerCase();
  const colecao   = (document.getElementById('filterColecao')?.value || '').trim().toLowerCase();
  const { dStart: dateStart, dEnd: dateEnd } = getDateFilters();
  const confAltaChecked  = document.getElementById('filterConfAlta')?.checked ?? true;
  const confBaixaChecked = document.getElementById('filterConfBaixa')?.checked ?? true;

  return allData.filter(d => {
    const pName        = (d.Player || '').trim();
    const fName        = (d.Formato || '').trim().toLowerCase();
    const lName        = (d.Local || '').trim().toLowerCase();
    const cName        = (d.Colecao || '').trim().toLowerCase();
    const mDate        = (d.Data || '').slice(0, 10);
    const confVal      = d.Confiabilidade || 'Alta';

    const matchPlayer  = selectedPlayers.has(pName);
    const matchFormato = !formato || fName === formato;
    const matchLocal   = !local   || lName === local;
    const matchColecao = !colecao || cName === colecao;
    const matchConf    = (confVal === 'Alta' && confAltaChecked) || (confVal === 'Baixa' && confBaixaChecked);

    let matchDate = true;
    if (dateStart && mDate < dateStart) matchDate = false;
    if (dateEnd   && mDate > dateEnd)   matchDate = false;

    return matchPlayer && matchFormato && matchLocal && matchColecao && matchDate && matchConf;
  });
}

function renderMatchup() {
  const selectedPlayer = document.getElementById('matchupPlayer')?.value || '';
  
  let matchupDataset = getMatchupBaseDataset();
  if (selectedPlayer) {
    matchupDataset = matchupDataset.filter(d => d.Player === selectedPlayer);
  }

  const matchupData = buildMatchupData(matchupDataset);
  
  let myDecks  = [...new Set(matchupDataset.map(d => getMatchDeck(d)).filter(Boolean))].sort();
  let oppDecks = [...new Set(matchupDataset.map(d => getMatchOppDeck(d)).filter(Boolean))].sort();

  const selectedMyDeck  = document.getElementById('matchupSelectMyDeck')?.value || '';
  const selectedOppDeck = document.getElementById('matchupSelectOppDeck')?.value || '';

  if (selectedMyDeck) {
    myDecks = myDecks.filter(d => d === selectedMyDeck);
    if (myDecks.length === 0) myDecks = [selectedMyDeck];
  }

  if (selectedOppDeck) {
    oppDecks = oppDecks.filter(d => d === selectedOppDeck);
    if (oppDecks.length === 0) oppDecks = [selectedOppDeck];
  }

  renderMatchupMatrix(matchupData, myDecks, oppDecks);
}

function populateMatchupDeckSelects() {
  const selMy  = document.getElementById('matchupSelectMyDeck');
  const selOpp = document.getElementById('matchupSelectOppDeck');
  if (!selMy || !selOpp) return;

  const curMy  = selMy.value;
  const curOpp = selOpp.value;

  const registeredDeckNames = (typeof decks !== 'undefined' && Array.isArray(decks))
    ? decks.map(d => d.arquetipo || d.name).filter(Boolean)
    : [];

  const myDecks  = [...new Set([...registeredDeckNames, ...allData.map(d => getMatchDeck(d)).filter(Boolean)])].sort((a, b) => a.localeCompare(b));
  const oppDecks = [...new Set([...registeredDeckNames, ...allData.map(d => getMatchOppDeck(d)).filter(Boolean)])].sort((a, b) => a.localeCompare(b));

  selMy.innerHTML = '<option value="">Todos os Decks</option>';
  myDecks.forEach(d => {
    const o = document.createElement('option');
    o.value = d; o.textContent = d;
    selMy.appendChild(o);
  });
  if (curMy && myDecks.includes(curMy)) selMy.value = curMy;
  if (selMy.syncSearchableSelect) selMy.syncSearchableSelect();

  selOpp.innerHTML = '<option value="">Todos os Decks</option>';
  oppDecks.forEach(d => {
    const o = document.createElement('option');
    o.value = d; o.textContent = d;
    selOpp.appendChild(o);
  });
  if (curOpp && oppDecks.includes(curOpp)) selOpp.value = curOpp;
  if (selOpp.syncSearchableSelect) selOpp.syncSearchableSelect();
}

window.matchupSortState = 'desc'; // Default: 'desc' (Maior WR primeiro), 'asc' (Menor WR primeiro), 'name' (Alfabética)

window.toggleMatchupSortOrder = function() {
  if (window.matchupSortState === 'desc') {
    window.matchupSortState = 'asc';
  } else if (window.matchupSortState === 'asc') {
    window.matchupSortState = 'name';
  } else {
    window.matchupSortState = 'desc';
  }
  updateMatchupSortButtonUI();
  renderMatchup();
};

function updateMatchupSortButtonUI() {
  const icon = document.getElementById('matchupSortIcon');
  const label = document.getElementById('matchupSortLabel');
  const btn = document.getElementById('btnMatchupSortToggle');
  if (btn) {
    if (window.matchupSortState !== 'desc') btn.classList.add('active');
    else btn.classList.remove('active');
  }
  if (icon && label) {
    if (window.matchupSortState === 'desc') {
      icon.textContent = '⬇️';
      label.textContent = 'Maior WR';
    } else if (window.matchupSortState === 'asc') {
      icon.textContent = '⬆️';
      label.textContent = 'Menor WR';
    } else {
      icon.textContent = '🔤';
      label.textContent = 'Alfabética';
    }
  }
}

window.resetMatchupFilters = function() {
  const selPlayer = document.getElementById('matchupPlayer');
  const selMy     = document.getElementById('matchupSelectMyDeck');
  const selOpp    = document.getElementById('matchupSelectOppDeck');

  if (selPlayer) { selPlayer.value = ''; if (selPlayer.syncSearchableSelect) selPlayer.syncSearchableSelect(); }
  if (selMy)     { selMy.value = '';     if (selMy.syncSearchableSelect) selMy.syncSearchableSelect(); }
  if (selOpp)    { selOpp.value = '';    if (selOpp.syncSearchableSelect) selOpp.syncSearchableSelect(); }

  window.matchupSortState = 'desc';
  updateMatchupSortButtonUI();

  window.activeDeckSort = { deck: null, mode: 'desc' };

  const detailEl = document.getElementById('matchupDetail');
  if (detailEl) detailEl.style.display = 'none';

  renderMatchup();

  if (typeof showToast === 'function') showToast('🔄 Filtros da Matriz de Matchups resetados!');
};

window.activeDeckSort = { deck: null, mode: 'desc' };

window.toggleDeckRowSort = function(deckName) {
  if (window.activeDeckSort.deck === deckName) {
    if (window.activeDeckSort.mode === 'desc') {
      window.activeDeckSort.mode = 'asc';
    } else {
      window.activeDeckSort.mode = 'desc';
    }
  } else {
    window.activeDeckSort.deck = deckName;
    window.activeDeckSort.mode = 'desc';
  }

  const selMy = document.getElementById('matchupSelectMyDeck');
  if (selMy) {
    selMy.value = deckName;
    if (selMy.syncSearchableSelect) selMy.syncSearchableSelect();
  }

  renderMatchup();
  showDeckMatchupOverview(deckName, window.activeDeckSort.mode);
};

window.showDeckMatchupOverview = function(myDeck, mode = 'desc') {
  const detailEl = document.getElementById('matchupDetail');
  const titleEl  = document.getElementById('detailTitle');
  const bodyEl   = document.getElementById('detailBody');
  if (!detailEl || !titleEl || !bodyEl) return;

  const selectedPlayer = document.getElementById('matchupPlayer')?.value || '';
  let dataset = getMatchupBaseDataset().filter(m => 
    getMatchDeck(m) === myDeck || m.Arquetipo === myDeck || m.Deck === myDeck
  );
  if (selectedPlayer) dataset = dataset.filter(m => m.Player === selectedPlayer);

  if (dataset.length === 0) {
    detailEl.style.display = 'none';
    return;
  }

  const byOpp = groupBy(dataset, m => getMatchOppDeck(m) || m.DeckAdv || 'Outros');
  const oppSummaries = Object.keys(byOpp).map(opp => {
    const mList = byOpp[opp];
    const total = mList.length;
    const wins = mList.filter(m => m.Resultado === 'Vitória').length;
    const draws = mList.filter(m => m.Resultado === 'Empate').length;
    const losses = mList.filter(m => m.Resultado === 'Derrota').length;
    const wr = Math.round((wins / total) * 100);
    return { opp, total, wins, draws, losses, wr, matches: mList };
  });

  oppSummaries.sort((a, b) => {
    if (mode === 'desc') {
      if (b.wr !== a.wr) return b.wr - a.wr;
      return b.total - a.total;
    } else {
      if (a.wr !== b.wr) return a.wr - b.wr;
      return a.total - b.total;
    }
  });

  const overallWins = dataset.filter(m => m.Resultado === 'Vitória').length;
  const overallTotal = dataset.length;
  const overallWR = Math.round((overallWins / overallTotal) * 100);
  const modeBadge = mode === 'desc' ? '⬇️ Maior Win Rate Contra' : '⬆️ Menor Win Rate Contra';

  const safeDeckName = myDeck.replace(/'/g, "\\'");
  titleEl.innerHTML = `🃏 ${myDeck} &middot; <span style="font-size:0.85rem;color:var(--accent2);">${modeBadge}</span> <span style="font-size:0.8rem;color:var(--text2);margin-left:0.5rem">(${overallWR}% WR Geral &middot; ${overallTotal} partidas)</span>`;

  let html = `
    <div style="margin-bottom:1rem;display:flex;gap:0.6rem;align-items:center;flex-wrap:wrap;background:var(--bg3);padding:0.65rem 0.85rem;border-radius:var(--radius-sm);border:1px solid var(--glass-bd);width:100%;box-sizing:border-box;">
      <span style="font-size:0.78rem;color:var(--text2);font-weight:600;">Ordenação dos confrontos:</span>
      <button class="btn-deck-sort-toggle" onclick="toggleDeckRowSort('${safeDeckName}')" title="Clique para alternar ordem de Win Rate">
        <span>${mode === 'desc' ? '⬇️ MAIOR WIN RATE PRIMEIRO' : '⬆️ MENOR WIN RATE PRIMEIRO'}</span>
        <span style="opacity:0.7;font-size:0.7rem;font-weight:400;">(clique p/ alternar)</span>
      </button>
    </div>
    <div style="display:flex;flex-direction:column;gap:1rem;">
  `;

  oppSummaries.forEach(s => {
    const wrBorder = wrColor(s.wr, 0.6);
    const badgeClass = s.wr >= 60 ? 'badge-win' : s.wr >= 40 ? 'badge-draw' : 'badge-loss';
    const matchText = s.total === 1 ? '1 partida' : `${s.total} partidas`;

    html += `
      <div style="background:var(--bg3);border:1px solid ${wrBorder};border-radius:var(--radius-sm);padding:0.85rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.65rem;flex-wrap:wrap;gap:0.5rem;background:rgba(0,0,0,0.25);padding:0.5rem 0.75rem;border-radius:var(--radius-sm);">
          <strong style="font-size:0.95rem;color:var(--text)">vs ${s.opp}</strong>
          <span class="badge ${badgeClass}" style="font-size:0.82rem;padding:4px 10px;font-weight:700;">
            ${s.wr}% WR &middot; ${s.wins}V - ${s.draws}E - ${s.losses}D (${matchText})
          </span>
        </div>
        <div style="overflow-x:auto;">
          <table class="matrix-table" style="width:100%;font-size:0.78rem;">
            <thead>
              <tr>
                <th>Data</th>
                <th>Player</th>
                <th>Adversário</th>
                <th>Formato</th>
                <th>Coleção</th>
                <th>Conf.</th>
                <th>Placar</th>
                <th>Resultado</th>
                <th>Local</th>
                <th>Brick</th>
                <th>Listas</th>
              </tr>
            </thead>
            <tbody>
    `;

    s.matches.forEach(m => {
      const mBadgeClass = m.Resultado === 'Vitória' ? 'badge-win' : m.Resultado === 'Empate' ? 'badge-draw' : 'badge-loss';
      const mEmoji = m.Resultado === 'Vitória' ? '✅' : m.Resultado === 'Empate' ? '🤝' : '❌';
      const brickVal = (m.Brick === 'Sim' || (m.Brick && m.Brick !== 'Nenhum' && m.Brick !== 'Não')) ? '💥 Sim' : '✅ Não';
      const confVal = (m.Confiabilidade === 'Baixa') ? 'Baixa' : 'Alta';
      const confBadge = confVal === 'Baixa' ? '🔴 Baixa' : '🟢 Alta';

      let myBtn = m.Deck ? `<button class="list-peek-btn" onclick="openMatchDeckList('${m.id}', 'own')" title="Ver/Editar lista">Meu</button>` : '';
      let oppBtn = (m.DeckAdv && m.DeckAdv !== '—') ? `<button class="list-peek-btn opp-btn" onclick="openMatchDeckList('${m.id}', 'adv')" title="Ver/Editar lista">Opo</button>` : '';
      const listasCol = (myBtn || oppBtn) ? `<div style="display:flex;gap:4px;justify-content:center">${myBtn}${oppBtn}</div>` : '—';

      html += `<tr>
        <td>${m.Data || '—'}</td>
        <td><strong>${m.Player || '—'}</strong></td>
        <td>${m.Adversario || '—'}</td>
        <td>${m.Formato || '—'}</td>
        <td><span style="color:var(--accent2);font-weight:600">${m.Colecao || '—'}</span></td>
        <td>${confBadge}</td>
        <td>${m.Placar || '—'}</td>
        <td><span class="badge ${mBadgeClass}">${mEmoji} ${m.Resultado}</span></td>
        <td>${m.Local || '—'}</td>
        <td>${brickVal}</td>
        <td>${listasCol}</td>
      </tr>`;
    });

    html += `</tbody></table></div></div>`;
  });

  html += `</div>`;
  bodyEl.innerHTML = html;
  detailEl.style.display = 'block';

  detailEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

function renderMatchupMatrix(matchupData, myDecks, oppDecks) {
  const container = document.getElementById('matchupMatrix');
  if (!container) return;

  const selMy  = document.getElementById('matchupSelectMyDeck')?.value || '';
  const selOpp = document.getElementById('matchupSelectOppDeck')?.value || '';
  const sortOrder = window.matchupSortState || 'desc';

  if (myDecks.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚔️</div><p>Sem dados de matchup suficientes.</p></div>';
    return;
  }

  const rowStats = myDecks.map(myDeck => {
    let rowWins = 0, rowTotal = 0;
    oppDecks.forEach(opp => {
      const entry = matchupData[`${myDeck}|||${opp}`];
      if (entry && entry.total > 0) {
        rowWins  += entry.wins;
        rowTotal += entry.total;
      }
    });
    const wr = rowTotal > 0 ? (rowWins / rowTotal) * 100 : -1;
    return { myDeck, rowWins, rowTotal, wr };
  });

  rowStats.sort((a, b) => {
    if (sortOrder === 'desc') {
      if (b.wr !== a.wr) return b.wr - a.wr;
      if (b.rowTotal !== a.rowTotal) return b.rowTotal - a.rowTotal;
      return a.myDeck.localeCompare(b.myDeck);
    } else if (sortOrder === 'asc') {
      if (a.wr === -1 && b.wr !== -1) return 1;
      if (b.wr === -1 && a.wr !== -1) return -1;
      if (a.wr !== b.wr) return a.wr - b.wr;
      if (a.rowTotal !== b.rowTotal) return a.rowTotal - b.rowTotal;
      return a.myDeck.localeCompare(b.myDeck);
    } else {
      return a.myDeck.localeCompare(b.myDeck);
    }
  });

  let html = '<table class="matrix-table">';

  html += '<thead><tr><th class="matrix-corner">Meu Deck \\ Oponente</th>';
  oppDecks.forEach(opp => {
    const isColActive = selOpp === opp;
    html += `<th class="matrix-col-header ${isColActive ? 'active-header' : ''}"><div class="col-label">${opp}</div></th>`;
  });
  html += '<th class="matrix-col-header total-col">Total</th></tr></thead>';

  html += '<tbody>';
  rowStats.forEach(({ myDeck, rowWins, rowTotal, wr }) => {
    const isRowActive = selMy === myDeck;
    const isDeckSortActive = window.activeDeckSort.deck === myDeck;
    const sortBadge = isDeckSortActive ? (window.activeDeckSort.mode === 'desc' ? ' ⬇️' : ' ⬆️') : '';
    const clickTitle = isDeckSortActive
      ? (window.activeDeckSort.mode === 'desc' ? 'Clique para ver Menor Win Rate vs outros decks' : 'Clique para ver Maior Win Rate vs outros decks')
      : 'Clique para ordenar confrontos por Maior/Menor Win Rate';

    const safeDeckName = myDeck.replace(/'/g, "\\'");
    html += `<tr><td class="matrix-row-header ${isRowActive || isDeckSortActive ? 'active-header' : ''}" 
      onclick="toggleDeckRowSort('${safeDeckName}')" 
      title="${clickTitle}">
      ${myDeck}${sortBadge}
    </td>`;

    oppDecks.forEach(opp => {
      const key = `${myDeck}|||${opp}`;
      const entry = matchupData[key];
      const isActiveCell = (selMy === myDeck && selOpp === opp);
      const activeClass = isActiveCell ? ' matrix-cell-active' : '';

      if (!entry || entry.total === 0) {
        html += `<td class="matrix-cell empty${activeClass}" title="Sem dados">—</td>`;
      } else {
        const wrVal = Math.round((entry.wins / entry.total) * 100);
        const bg = wrColor(wrVal, 0.75);
        const textColor = (wrVal >= 40 && wrVal <= 60) ? '#fff' : (wrVal > 60 ? '#0b1a0f' : '#1a0b0b');
        html += `<td class="matrix-cell${activeClass}" 
          style="background:${bg}; color:${textColor}"
          onclick="showMatchupDetail('${myDeck}', '${opp}')"
          title="${myDeck} vs ${opp}: ${wrVal}% (${entry.wins}V-${entry.draws}E-${entry.losses}D / ${entry.total} jogos)">
          <span class="cell-pct">${wrVal}%</span>
          <span class="cell-record">${entry.wins}-${entry.draws}-${entry.losses}</span>
        </td>`;
      }
    });

    const rowWR = wr >= 0 ? Math.round(wr) : null;
    const rowBg = wrColor(rowWR, 0.5);
    html += `<td class="matrix-cell total-col" style="background:${rowBg}">${rowWR !== null ? rowWR + '%' : '—'}<br><span class="cell-record">${rowTotal}j</span></td>`;

    html += '</tr>';
  });
  html += '</tbody></table>';

  container.innerHTML = html;
}

function populateMatchupPlayerSelect() {
  const sel = document.getElementById('matchupPlayer');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todos os Treinadores (Consolidado)</option>';
  
  const dataPlayers = allData.map(d => d.Player).filter(Boolean);
  const managerPlayers = (typeof players !== 'undefined') ? players : [];
  const allPlayerNames = [...new Set([...dataPlayers, ...managerPlayers])].sort((a, b) => a.localeCompare(b));

  allPlayerNames.forEach(p => {
    const o = document.createElement('option');
    o.value = p; o.textContent = p;
    sel.appendChild(o);
  });
  if (cur && allPlayerNames.includes(cur)) sel.value = cur;
  if (sel.syncSearchableSelect) sel.syncSearchableSelect();
}

window.showMatchupDetail = function(myDeck, oppDeck, scroll = true) {
  const detailEl = document.getElementById('matchupDetail');
  const titleEl  = document.getElementById('detailTitle');
  const bodyEl   = document.getElementById('detailBody');
  if (!detailEl || !titleEl || !bodyEl) return;

  const selectedPlayer = document.getElementById('matchupPlayer')?.value || '';
  let dataset = getMatchupBaseDataset().filter(m => 
    (getMatchDeck(m) === myDeck || m.Deck === myDeck) && 
    (getMatchOppDeck(m) === oppDeck || m.DeckAdv === oppDeck)
  );
  if (selectedPlayer) dataset = dataset.filter(m => m.Player === selectedPlayer);

  if (dataset.length === 0) {
    detailEl.style.display = 'none';
    return;
  }

  const total  = dataset.length;
  const wins   = dataset.filter(m => m.Resultado === 'Vitória').length;
  const draws  = dataset.filter(m => m.Resultado === 'Empate').length;
  const losses = dataset.filter(m => m.Resultado === 'Derrota').length;
  const wr     = Math.round((wins / total) * 100);

  titleEl.innerHTML = `⚔️ ${myDeck} <span style="color:var(--text2);font-weight:400">vs</span> ${oppDeck} <span style="font-size:0.85rem;color:var(--accent2);margin-left:0.5rem">(${wr}% WR &middot; ${wins}V-${draws}E-${losses}D)</span>`;

  let html = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:0.75rem;margin-bottom:1rem;">
      <div style="background:var(--bg3);padding:0.6rem 0.8rem;border-radius:var(--radius-sm);border:1px solid var(--glass-bd);text-align:center;">
        <span style="font-size:0.72rem;color:var(--text2);display:block;">Partidas</span>
        <strong style="font-size:1.1rem;color:var(--text);">${total}</strong>
      </div>
      <div style="background:var(--bg3);padding:0.6rem 0.8rem;border-radius:var(--radius-sm);border:1px solid var(--glass-bd);text-align:center;">
        <span style="font-size:0.72rem;color:var(--text2);display:block;">Vitórias</span>
        <strong style="font-size:1.1rem;color:var(--green);">${wins}</strong>
      </div>
      <div style="background:var(--bg3);padding:0.6rem 0.8rem;border-radius:var(--radius-sm);border:1px solid var(--glass-bd);text-align:center;">
        <span style="font-size:0.72rem;color:var(--text2);display:block;">Empates</span>
        <strong style="font-size:1.1rem;color:var(--yellow);">${draws}</strong>
      </div>
      <div style="background:var(--bg3);padding:0.6rem 0.8rem;border-radius:var(--radius-sm);border:1px solid var(--glass-bd);text-align:center;">
        <span style="font-size:0.72rem;color:var(--text2);display:block;">Derrotas</span>
        <strong style="font-size:1.1rem;color:var(--red);">${losses}</strong>
      </div>
      <div style="background:var(--bg3);padding:0.6rem 0.8rem;border-radius:var(--radius-sm);border:1px solid var(--glass-bd);text-align:center;">
        <span style="font-size:0.72rem;color:var(--text2);display:block;">Win Rate</span>
        <strong style="font-size:1.1rem;color:var(--accent2);">${wr}%</strong>
      </div>
    </div>
    <div style="overflow-x:auto;">
      <table class="matrix-table" style="width:100%;font-size:0.82rem;">
        <thead>
          <tr>
            <th>Data</th>
            <th>Player</th>
            <th>Adversário</th>
            <th>Formato</th>
            <th>Coleção</th>
            <th>Conf.</th>
            <th>Placar</th>
            <th>Resultado</th>
            <th>Local</th>
            <th>Brick</th>
            <th>Listas</th>
            <th>Comentários</th>
          </tr>
        </thead>
        <tbody>
  `;

  dataset.forEach(m => {
    const badgeClass = m.Resultado === 'Vitória' ? 'badge-win' : m.Resultado === 'Empate' ? 'badge-draw' : 'badge-loss';
    const emoji = m.Resultado === 'Vitória' ? '✅' : m.Resultado === 'Empate' ? '🤝' : '❌';
    const brickVal = (m.Brick === 'Sim' || (m.Brick && m.Brick !== 'Nenhum' && m.Brick !== 'Não')) ? '💥 Sim' : '✅ Não';
    const confVal = (m.Confiabilidade === 'Baixa') ? 'Baixa' : 'Alta';
    const confBadge = confVal === 'Baixa' ? '🔴 Baixa' : '🟢 Alta';

    let myBtn = m.Deck ? `<button class="list-peek-btn" onclick="openMatchDeckList('${m.id}', 'own')" title="Ver/Editar lista do Meu Deck desta partida">Meu</button>` : '';
    let oppBtn = (m.DeckAdv && m.DeckAdv !== '—') ? `<button class="list-peek-btn opp-btn" onclick="openMatchDeckList('${m.id}', 'adv')" title="Ver/Editar lista do Deck Oponente desta partida">Opo</button>` : '';
    const listasCol = (myBtn || oppBtn) ? `<div style="display:flex;gap:4px;justify-content:center">${myBtn}${oppBtn}</div>` : '<span style="color:var(--text2);font-size:.75rem">—</span>';

    html += `<tr>
      <td>${m.Data || '—'}</td>
      <td><strong>${m.Player || '—'}</strong></td>
      <td>${m.Adversario || '—'}</td>
      <td>${m.Formato || '—'}</td>
      <td><span style="color:var(--accent2);font-weight:600">${m.Colecao || '—'}</span></td>
      <td><span style="font-size:0.75rem;">${confBadge}</span></td>
      <td>${m.Placar || '—'}</td>
      <td><span class="badge ${badgeClass}">${emoji} ${m.Resultado}</span></td>
      <td>${m.Local || '—'}</td>
      <td>${brickVal}</td>
      <td>${listasCol}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(m.Comentarios || '').replace(/"/g, '&quot;')}">${m.Comentarios || '—'}</td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  bodyEl.innerHTML = html;
  detailEl.style.display = 'block';

  if (scroll) {
    detailEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
};

function initMatchupToggle() {
  ['matchupPlayer', 'matchupSelectMyDeck', 'matchupSelectOppDeck'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      window.applyMatchupFilter();
    });
  });
}

window.applyMatchupFilter = function() {
  const myDeck  = document.getElementById('matchupSelectMyDeck')?.value || '';
  const oppDeck = document.getElementById('matchupSelectOppDeck')?.value || '';
  renderMatchup();
  if (myDeck && oppDeck) {
    showMatchupDetail(myDeck, oppDeck, false);
  } else {
    document.getElementById('matchupDetail').style.display = 'none';
  }
};

// ── 19. RENDER ALL ──────────────────────────────────────────────────────────
function renderAll() {
  renderKPIs();
  renderDeckWR();
  renderPlayerPerf();
  renderPlayerSubtypeBreakdown();
  renderResultPie();
  renderLocal();
  renderFormato();
  renderDeckCount();
  renderStart();
  renderBrick();
  populateMatchupPlayerSelect();
  renderMatchup();
  renderTable(filtered);
    renderActiveFilters();
  }

// ── 19. EXCEL READER (via SheetJS) ──────────────────────────────────────────
async function loadSheetJS() {
  return new Promise((resolve, reject) => {
    if (window.XLSX) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function handleFile(file) {
  try {
    await loadSheetJS();
    const buf  = await file.arrayBuffer();
    const wb   = XLSX.read(buf, { type:'array', cellDates:true });

    const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('banco')) || wb.SheetNames[0];
    const ws   = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval: null });

    let headerIdx = rows.findIndex(r => r && r.some(c => String(c).toLowerCase().includes('resultado')));
    if (headerIdx < 0) headerIdx = 1;

    const headers = rows[headerIdx].map(h => (h||'').toString().trim());
    const col = name => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));

    const idxData    = col('Data');
    const idxPlayer  = col('Player');
    const idxDeck    = col('Deck') !== col('Deck Advers') ? col('Deck') : headers.indexOf('Deck');
    const idxAdv     = col('Advers');
    const idxDeckAdv = col('Deck Advers');
    const idxLuck    = col('Luck');
    const idxFmt     = col('Formato');
    const idxStart   = col('Start');
    const idxRes     = col('Resultado');
    const idxPts     = col('Pontos');
    const idxPlacar  = col('Placar');
    const idxLocal   = col('Local');
    const idxBrick   = col('Brick');
    const idxBrickOp = headers.findIndex((h,i) => h.toLowerCase().includes('brick') && i !== idxBrick);

    const parsed = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      const player = r[idxPlayer];
      const res    = r[idxRes];
      if (!player || player === 0) continue;
      if (!res || String(res).includes('VALUE') || res === 0) continue;
      if (!String(res).match(/Vit|Emp|Der/i)) continue;

      let data = r[idxData];
      if (data instanceof Date) data = data.toISOString().slice(0,10);
      else if (typeof data === 'number') {

        const d = new Date(Math.round((data - 25569) * 86400 * 1000));
        data = d.toISOString().slice(0,10);
      }

      let resultado = String(res).trim();
      if (!resultado.match(/^(Vitória|Empate|Derrota)$/)) {
        resultado = resultado.toLowerCase().includes('vit') ? 'Vitória' :
                    resultado.toLowerCase().includes('emp') ? 'Empate'  : 'Derrota';
      }

      const pData = String(data || '').slice(0,10);
      const pPlayer = String(player).trim();

      const rowId = `ex_${i}_${pPlayer.replace(/\s+/g, '_')}_${pData}`;

      parsed.push({
        id:         rowId,
        Data:       pData,
        Player:     pPlayer,
        Deck:       String(r[idxDeck] || '').trim(),
        Adversario: String(r[idxAdv]  || '').trim(),
        DeckAdv:    String(r[idxDeckAdv] || '').trim(),
        Luck:       Number(r[idxLuck]) || 0,
        Formato:    String(r[idxFmt]  || '').trim(),
        Start:      String(r[idxStart]|| '').trim().replace('?','º'),
        Resultado:  resultado,
        Pontos:     Number(r[idxPts]) || 0,
        Placar:     String(r[idxPlacar] || '').trim(),
        Local:      String(r[idxLocal]  || '').trim(),
        Brick:      String(r[idxBrick]  || '').trim(),
        BrickOp:    idxBrickOp >= 0 ? String(r[idxBrickOp] || '').trim() : '',
      });
    }

    if (parsed.length === 0) throw new Error('Nenhum dado válido encontrado na planilha.');

    localStorage.setItem('jornada_excel_matches', JSON.stringify(parsed));

    allData  = applyDataOverrides(parsed);
    filtered = [...allData];
    populateFilters();
    applyFilters();

    if (typeof triggerSyncPush === 'function') {
      triggerSyncPush();
    }

    const now = new Date().toLocaleString('pt-BR');
    const lu = document.getElementById('lastUpdate');
    if (lu) lu.textContent = `⏱️ ${parsed.length} registros • ${now}`;
  } catch(err) {
    alert('Erro ao ler o Excel: ' + err.message);
    console.error(err);
  }
}

// ── 20. GLOBAL RESET FUNCTION ────────────────────────────────────────────────
window.resetAllFilters = function() {

  ['filterFormato','filterLocal','filterDateStart','filterDateEnd'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = '';
      if (el.selectedIndex !== undefined) el.selectedIndex = 0;
      if (el.syncSearchableSelect) el.syncSearchableSelect();
    }
  });

  if (window.customDatePickerState) {
    window.customDatePickerState.period = 'all';
    window.customDatePickerState.start = '';
    window.customDatePickerState.end = '';
    const label = document.getElementById('customDateLabel');
    if (label) label.textContent = 'Todo o Período';
    const clearBtn = document.getElementById('customDateClear');
    if (clearBtn) clearBtn.style.display = 'none';
  }

  const colEl = document.getElementById('filterColecao');
  if (colEl) {
    colEl.value = '';
    if (colEl.syncSearchableSelect) colEl.syncSearchableSelect();
  }

  if (document.getElementById('filterConfAlta'))  document.getElementById('filterConfAlta').checked = true;
  if (document.getElementById('filterConfBaixa')) document.getElementById('filterConfBaixa').checked = true;

  isExplicitPlayerSelection = false;
  const dataPlayers    = allData.map(d => d.Player).filter(Boolean);
  const managerPlayers = (typeof players !== 'undefined') ? players : [];
  allAvailablePlayers = [...new Set([...dataPlayers, ...managerPlayers])].sort((a, b) => a.localeCompare(b));
  selectedPlayers = new Set(allAvailablePlayers);
  renderMultiPlayerItems(allAvailablePlayers);
  updateMultiPlayerBtnText();

  isExplicitSelection = false;
  const dataDecks    = allData.map(d => d.Deck).filter(Boolean);
  const oppDecks     = allData.map(d => d.DeckAdv).filter(Boolean);
  const managerDecks = (typeof decks !== 'undefined') ? decks.map(d => d.name) : [];
  allAvailableDecks = [...new Set([...dataDecks, ...oppDecks, ...managerDecks])].sort((a, b) => a.localeCompare(b));
  selectedDecks = new Set(allAvailableDecks);
  renderMultiDeckItems(allAvailableDecks);
  updateMultiDeckBtnText();

  const searchInput = document.getElementById('tableSearch');
  if (searchInput) searchInput.value = '';

  applyFilters();
};

// ── 21. INIT ──────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {

  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', e => {
      if (e.target.files[0]) handleFile(e.target.files[0]);
    });
  }

  const tableSearchEl = document.getElementById('tableSearch');
  const btnTableSearch = document.getElementById('btnTableSearch');
  const btnClearTableSearch = document.getElementById('btnClearTableSearch');

  const triggerSearch = () => renderTable(filtered, true);

  if (btnTableSearch) {
    btnTableSearch.addEventListener('click', triggerSearch);
  }
  if (btnClearTableSearch && tableSearchEl) {
    btnClearTableSearch.addEventListener('click', () => {
      tableSearchEl.value = '';
      triggerSearch();
    });
  }
  if (tableSearchEl) {
    tableSearchEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerSearch();
      }
    });
    ['input', 'keyup', 'change', 'search'].forEach(evt => {
      tableSearchEl.addEventListener(evt, triggerSearch);
    });
  }

  document.body.addEventListener('dragover', e => e.preventDefault());
  document.body.addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.name.match(/\.xlsx?$|\.xlsm$/i)) handleFile(file);
  });

  initializeData();
  populateFilters();
  initMatchupToggle();
  renderAll();
});



// =========================================================================
// CUSTOM DATE RANGE PICKER
// =========================================================================
// =========================================================================
// CUSTOM DATE RANGE PICKER
// =========================================================================
window.customDatePickerState = {
  period: 'all',
  start: '',
  end: ''
};

function initCustomDatePicker() {
  const wrap = document.getElementById('customDatePickerWrap');
  if (!wrap) return;

  const trigger = document.getElementById('customDateTrigger');
  const label = document.getElementById('customDateLabel');
  const clearBtn = document.getElementById('customDateClear');
  const dropdown = document.getElementById('customDateDropdown');
  
  const presetsView = document.getElementById('datePresetsView');
  const calendarView = document.getElementById('dateCalendarView');
  
  const backBtn = document.getElementById('calendarBackBtn');
  const applyBtn = document.getElementById('calApplyBtn');
  
  const inputStart = document.getElementById('calInputStart');
  const inputEnd = document.getElementById('calInputEnd');
  
  const prevMonth = document.getElementById('calPrevMonth');
  const nextMonth = document.getElementById('calNextMonth');
  const monthLabel = document.getElementById('calMonthLabel');
  const daysContainer = document.getElementById('calDaysContainer');

  let currentViewDate = new Date();
  let tempStart = null;
  let tempEnd = null;

  // Toggle Dropdown (mousedown to avoid blur issues)
  trigger.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (e.target.closest('#customDateClear')) return;
    
    const isShowing = dropdown.style.display === 'flex';
    // Close other dropdowns
    document.querySelectorAll('.searchable-select-wrap.open').forEach(el => {
      el.classList.remove('open');
      const drop = el.querySelector('.searchable-select-dropdown');
      if (drop) drop.style.display = 'none';
    });
    document.getElementById('userDropdownMenu')?.classList.remove('show-dropdown');
    document.getElementById('mobileMenu')?.classList.remove('active');
    
    if (!isShowing) {
      dropdown.style.display = 'flex';
      wrap.classList.add('open');
      showPresetsView();
    } else {
      dropdown.style.display = 'none';
      wrap.classList.remove('open');
    }
  });

  // Clear button
  clearBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setPeriod('all');
    dropdown.style.display = 'none';
    wrap.classList.remove('open');
    applyFilters();
  });

  // Click outside to close (mousedown is safer for dynamically rebuilt DOM)
  document.addEventListener('mousedown', (e) => {
    if (!wrap.contains(e.target)) {
      dropdown.style.display = 'none';
      wrap.classList.remove('open');
    }
  });

  // Prevent dropdown closing when clicking inside
  dropdown.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });

  // PRESETS VIEW
  const presetOptions = presetsView.querySelectorAll('.date-preset-option');
  presetOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      const val = opt.dataset.value;
      if (val === 'custom') {
        showCalendarView();
      } else {
        setPeriod(val);
        dropdown.style.display = 'none';
        wrap.classList.remove('open');
        applyFilters();
      }
    });
  });

  // CALENDAR VIEW
  backBtn.addEventListener('click', () => {
    showPresetsView();
  });

  prevMonth.addEventListener('click', () => {
    currentViewDate.setMonth(currentViewDate.getMonth() - 1);
    renderCalendar();
  });

  nextMonth.addEventListener('click', () => {
    currentViewDate.setMonth(currentViewDate.getMonth() + 1);
    renderCalendar();
  });

  applyBtn.addEventListener('click', () => {
    if (tempStart) {
      if (!tempEnd) tempEnd = tempStart; // Single date selection fallback
      window.customDatePickerState.period = 'custom';
      window.customDatePickerState.start = formatDateStr(tempStart);
      window.customDatePickerState.end = formatDateStr(tempEnd);
      
      label.textContent = tempStart.getTime() === tempEnd.getTime() 
        ? formatDateBr(tempStart) 
        : `${formatDateBr(tempStart)} - ${formatDateBr(tempEnd)}`;
        
      clearBtn.style.display = 'block';
      dropdown.style.display = 'none';
      wrap.classList.remove('open');
      applyFilters();
    }
  });

  function showPresetsView() {
    presetsView.style.display = 'flex';
    calendarView.style.display = 'none';
    
    presetOptions.forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.value === window.customDatePickerState.period);
    });
  }

  function showCalendarView() {
    presetsView.style.display = 'none';
    calendarView.style.display = 'flex';
    
    if (window.customDatePickerState.period === 'custom' && window.customDatePickerState.start) {
      tempStart = parseDateStr(window.customDatePickerState.start);
      tempEnd = parseDateStr(window.customDatePickerState.end);
      currentViewDate = new Date(tempStart);
    } else {
      tempStart = null;
      tempEnd = null;
      currentViewDate = new Date();
    }
    updateCalendarInputs();
    renderCalendar();
  }

  function setPeriod(p) {
    window.customDatePickerState.period = p;
    window.customDatePickerState.start = '';
    window.customDatePickerState.end = '';
    clearBtn.style.display = p === 'all' ? 'none' : 'block';
    
    const labels = {
      'all': 'Todo o Período',
      'today': 'Hoje',
      'yesterday': 'Ontem',
      'week': 'Últimos 7 dias',
      'month': 'Este Mês'
    };
    label.textContent = labels[p] || 'Período';
  }

  function updateCalendarInputs() {
    inputStart.value = tempStart ? formatDateBr(tempStart) : '';
    inputEnd.value = tempEnd ? formatDateBr(tempEnd) : '';
  }

  function renderCalendar() {
    daysContainer.innerHTML = '';
    
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    monthLabel.textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0,0,0,0);
    
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-day empty';
      daysContainer.appendChild(empty);
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      cellDate.setHours(0,0,0,0);
      
      const cell = document.createElement('div');
      cell.className = 'cal-day';
      cell.textContent = d;
      
      if (cellDate > today) {
        cell.classList.add('disabled');
      } else {
        if (tempStart && cellDate.getTime() === tempStart.getTime()) {
          cell.classList.add('selected', 'selected-start');
        }
        if (tempEnd && cellDate.getTime() === tempEnd.getTime()) {
          cell.classList.add('selected', 'selected-end');
          if (tempStart && tempStart.getTime() === tempEnd.getTime()) {
            cell.classList.remove('selected-start', 'selected-end');
          }
        }
        if (tempStart && tempEnd && cellDate > tempStart && cellDate < tempEnd) {
          cell.classList.add('in-range');
        }
        
        // Use mousedown instead of click to prevent issues with detached DOM nodes
        cell.addEventListener('mousedown', (e) => {
          e.preventDefault(); // Prevent text selection
          if (!tempStart || (tempStart && tempEnd)) {
            tempStart = cellDate;
            tempEnd = null;
          } else if (tempStart && !tempEnd) {
            if (cellDate < tempStart) {
              tempEnd = tempStart;
              tempStart = cellDate;
            } else {
              tempEnd = cellDate;
            }
          }
          updateCalendarInputs();
          renderCalendar();
        });
      }
      daysContainer.appendChild(cell);
    }
  }

  function formatDateStr(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
  function formatDateBr(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
  }
  function parseDateStr(s) {
    if (!s) return null;
    const [y, m, d] = s.split('-');
    return new Date(y, m - 1, d);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initCustomDatePicker();
});
// =========================================================================
// CONFIABILIDADE MULTI-SELECT
// =========================================================================
function initMultiConfFilter() {
  const wrap = document.getElementById('multiConfWrap');
  if (!wrap) return;

  const trigger = document.getElementById('btnMultiConfToggle');
  const dropdown = document.getElementById('multiConfDropdown');
  const btnText = document.getElementById('multiConfBtnText');
  const cbs = wrap.querySelectorAll('.multi-conf-cb');
  
  trigger.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const isShowing = dropdown.style.display === 'flex';
    
    // Close others
    document.querySelectorAll('.searchable-select-wrap.open, .multi-deck-wrap.open, .custom-date-picker-wrap.open').forEach(el => {
      if (el !== wrap) {
        el.classList.remove('open');
        const drop1 = el.querySelector('.searchable-select-dropdown');
        const drop2 = el.querySelector('.multi-deck-dropdown');
        const drop3 = el.querySelector('.custom-date-dropdown');
        if (drop1) drop1.style.display = 'none';
        if (drop2) drop2.style.display = 'none';
        if (drop3) drop3.style.display = 'none';
      }
    });
    document.getElementById('userDropdownMenu')?.classList.remove('show-dropdown');
    document.getElementById('mobileMenu')?.classList.remove('active');
    
    if (!isShowing) {
      dropdown.style.display = 'flex';
      wrap.classList.add('open');
    } else {
      dropdown.style.display = 'none';
      wrap.classList.remove('open');
    }
  });

  document.addEventListener('mousedown', (e) => {
    if (!wrap.contains(e.target)) {
      dropdown.style.display = 'none';
      wrap.classList.remove('open');
    }
  });

  dropdown.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });

  cbs.forEach(cb => {
    cb.addEventListener('change', () => {
      const checkedVals = Array.from(cbs).filter(c => c.checked).map(c => c.value);
      if (checkedVals.length === 2) {
        btnText.textContent = 'Todas';
      } else if (checkedVals.length === 1) {
        btnText.textContent = checkedVals[0];
      } else {
        btnText.textContent = 'Nenhuma';
      }
      if (typeof applyFilters === 'function') applyFilters();
    });
  });
}
document.addEventListener('DOMContentLoaded', initMultiConfFilter);





// =========================================================================
// MOBILE FILTER TOGGLE
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
  const mobileFilterToggle = document.getElementById("mobileFilterToggle");
  const filtersInner = document.getElementById("filtersInner");
  
  if (mobileFilterToggle && filtersInner) {
    mobileFilterToggle.addEventListener("click", () => {
      mobileFilterToggle.classList.toggle("open");
      filtersInner.classList.toggle("expanded");
    });
  }
});








