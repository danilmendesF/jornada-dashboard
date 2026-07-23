/* ============================================================
   JORNADA DASHBOARD — app.js
   Full logic: data loading, filtering, charts, table
   ============================================================ */

'use strict';

// ── 2. STATE ─────────────────────────────────────────────────────────────────
let allData    = [];
let filtered   = [];
let charts     = {};

// Helper to apply overrides, deletes, and edits
function applyDataOverrides(rawData) {
  let baseData = [...rawData];

  if (typeof loadDeleted === 'function' && typeof loadEdits === 'function') {
    const deleted = loadDeleted();
    const edits = loadEdits();
    baseData = baseData.filter(d => !deleted.has(d.id));
    baseData = baseData.map(d => edits[d.id] ? edits[d.id] : d);
  }

  return baseData;
}

function initializeData() {
  const manual = (typeof loadManual === 'function') ? loadManual() : [];
  allData = applyDataOverrides(manual);
  filtered = [...allData];
}


// ── 3. CHART DEFAULTS ────────────────────────────────────────────────────────
Chart.defaults.color = '#8890b0';
Chart.defaults.font.family = "'Outfit', sans-serif";
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

function groupBy(data, key) {
  return data.reduce((acc, row) => {
    const k = row[key] ?? 'N/A';
    if (!acc[k]) acc[k] = [];
    acc[k].push(row);
    return acc;
  }, {});
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
      input.value = "Todos";
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
    wrap.classList.add("open");
    renderOptions(input.value === (selectEl.options[selectEl.selectedIndex]?.text || "") ? "" : input.value);
  }

  function closeDropdown() {
    wrap.classList.remove("open");
    updateInputFromSelect();
    input.blur();
  }

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

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target) && e.target !== selectEl) {
      closeDropdown();
    }
  });

  selectEl.addEventListener("change", updateInputFromSelect);
  updateInputFromSelect();
  selectEl.syncSearchableSelect = function() {
    updateInputFromSelect();
    renderOptions();
  };
}

function initAllSearchableSelects() {
  const ids = [
    'filterPlayer', 'filterDeck', 'filterFormato', 'filterLocal',
    'quickLogPlayer', 'quickLogDeck', 'quickLogDeckAdv',
    'matchupPlayer', 'matchupSelectMyDeck', 'matchupSelectOppDeck',
    'formMatchPlayer', 'formMatchDeck', 'formMatchDeckAdv', 'formDeckPlayer'
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

  const dataDecks    = relevantData.map(d => d.Deck).filter(Boolean);
  const oppDecks     = relevantData.map(d => d.DeckAdv).filter(Boolean);
  const managerDecks = (typeof decks !== 'undefined') ? decks.filter(d => selectedPlayers.size === 0 || selectedPlayers.has(d.player)).map(d => d.name) : [];
  
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
  const customLocais = (typeof loadLocais === 'function') ? loadLocais() : [];
  const dataLocais   = allData.map(d => d.Local).filter(Boolean);
  const locais       = [...new Set([...customLocais, ...dataLocais])].sort((a, b) => a.localeCompare(b));

  const formatos = [...new Set(allData.map(d => d.Formato))].sort();

  fillSelect('filterFormato', formatos);
  fillSelect('filterLocal',   locais);
  populateMultiPlayerFilter();
  populateMultiDeckFilter();
  populateMatchupDeckSelects();
  initAllSearchableSelects();

  // Attach change handlers to Formato, Local, Data Início, Data Fim
  ['filterFormato', 'filterLocal', 'filterDateStart', 'filterDateEnd'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.dataset.filterHandler) {
      el.dataset.filterHandler = "true";
      el.addEventListener('change', applyFilters);
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
function applyFilters() {
  const formato   = (document.getElementById('filterFormato')?.value || '').trim().toLowerCase();
  const local     = (document.getElementById('filterLocal')?.value || '').trim().toLowerCase();
  const dateStart = document.getElementById('filterDateStart')?.value || '';
  const dateEnd   = document.getElementById('filterDateEnd')?.value || '';

  filtered = allData.filter(d => {
    const pName        = (d.Player || '').trim();
    const fName        = (d.Formato || '').trim().toLowerCase();
    const lName        = (d.Local || '').trim().toLowerCase();
    const mDate        = (d.Data || '').slice(0, 10);

    const matchPlayer  = selectedPlayers.has(pName);
    const matchFormato = !formato || fName === formato;
    const matchLocal   = !local   || lName === local;
    const matchDeck    = selectedDecks.has(d.Deck);

    let matchDate = true;
    if (dateStart && mDate < dateStart) matchDate = false;
    if (dateEnd   && mDate > dateEnd)   matchDate = false;

    return matchPlayer && matchFormato && matchLocal && matchDeck && matchDate;
  });

  renderAll();
}

// ── 7. KPI CARDS ─────────────────────────────────────────────────────────────
function renderKPIs() {
  const total  = filtered.length;
  const wins   = filtered.filter(d => d.Resultado === 'Vitória').length;
  const draws  = filtered.filter(d => d.Resultado === 'Empate').length;
  const losses = filtered.filter(d => d.Resultado === 'Derrota').length;
  const wr     = pct(wins, total);
  const brickCount = filtered.filter(d => d.Brick && d.Brick !== 'Nenhum' && d.Brick !== 'Não').length;
  const brickPct   = pct(brickCount, total);

  animCount('kpiTotal', total);
  animCount('kpiWin',   wins);
  animCount('kpiDraw',  draws);
  animCount('kpiLoss',  losses);
  document.getElementById('kpiWR').textContent    = wr + '%';
  const bEl = document.getElementById('kpiBrick');
  if (bEl) bEl.textContent = brickPct + '%';
}

function animCount(id, target) {
  const el = document.getElementById(id);
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
  const byDeck = groupBy(filtered, 'Deck');

  // Calculate WR stats for each deck
  const deckStats = Object.keys(byDeck).map(d => {
    const tot = byDeck[d].length;
    const wins = byDeck[d].filter(r => r.Resultado === 'Vitória').length;
    const wr = pct(wins, tot);
    return { deck: d, wr, wins, tot };
  });

  // Sort descending by Win Rate, then by total matches
  deckStats.sort((a, b) => b.wr - a.wr || b.tot - a.tot);

  // Take top 7 decks with highest win rates
  const top7 = deckStats.slice(0, 7);

  const labels = top7.map(d => d.deck);
  const wrData = top7.map(d => d.wr);
  const bgColors = top7.map((_, i) => PALETTE[i % PALETTE.length]);

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
        tooltip: {
          callbacks: {
            label: ctx => {
              const stat = top7[ctx.dataIndex];
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
  
  // Include all active players from filtered data and registered players list
  const registeredPlayers = (typeof players !== 'undefined') ? players : [];
  const allPlayerNames = [...new Set([...Object.keys(byPlayer), ...registeredPlayers])];

  const playerStats = allPlayerNames.map(p => {
    const pMatches = byPlayer[p] || [];
    const wins   = pMatches.filter(r => r.Resultado === 'Vitória').length;
    const draws  = pMatches.filter(r => r.Resultado === 'Empate').length;
    const losses = pMatches.filter(r => r.Resultado === 'Derrota').length;
    const total  = pMatches.length;
    const wr     = total > 0 ? pct(wins, total) : 0;
    return { player: p, wins, draws, losses, total, wr };
  });

  // Sort descending by highest number of victories (wins), then by Win Rate, then total matches
  playerStats.sort((a, b) => b.wins - a.wins || b.wr - a.wr || b.total - a.total);

  const labels = playerStats.map(s => s.player);
  const wins   = playerStats.map(s => s.wins);
  const draws  = playerStats.map(s => s.draws);
  const losses = playerStats.map(s => s.losses);

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
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: ctx => {
              const stat = playerStats[ctx.dataIndex];
              const dsLabel = ctx.dataset.label;
              const val = ctx.parsed.y;
              return ` ${dsLabel}: ${val} (Total: ${stat.total} jogos | WR: ${stat.wr}%)`;
            }
          }
        }
      },
      scales: {
        y: { stacked: false, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: {
          grid: { color: 'rgba(255,255,255,0.03)' },
          ticks: {
            autoSkip: false,
            maxRotation: 45,
            minRotation: 0,
            color: '#a0aec0'
          }
        }
      }
    }
  });
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
  const labels  = Object.keys(byLocal).sort((a,b) => byLocal[b].length - byLocal[a].length);
  const counts  = labels.map(l => byLocal[l].length);
  const bgColors= labels.map((_,i) => PALETTE[i % PALETTE.length]);

  charts['local'] = new Chart(document.getElementById('chartLocal'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: counts,
        backgroundColor: bgColors.map(c=>c+'cc'),
        borderColor: bgColors,
        borderWidth: 2,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: { legend: { position: 'bottom' } }
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
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

// ── 14. CHART: DECK COUNT ───────────────────────────────────────────────────
function renderDeckCount() {
  destroyChart('deckCount');
  const byDeck = groupBy(filtered, 'Deck');
  const sorted = Object.entries(byDeck).sort((a,b) => b[1].length - a[1].length);
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
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { grid: { color: 'rgba(255,255,255,0.03)' } }
      }
    }
  });
}

// ── 15. CHART: START ────────────────────────────────────────────────────────
function renderStart() {
  destroyChart('start');
  const positions = ['1º', '2º'];
  const byStart = groupBy(filtered, 'Start');

  const datasets = [
    { label:'Vitórias', color: WIN_COLOR  },
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
      plugins: { legend: { position:'bottom' } },
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

  const byDeck     = groupBy(filtered, 'Deck');
  const deckLabels = Object.keys(byDeck).sort();

  // "Brickado" = Brick === 'Sim' OU qualquer valor antigo diferente de 'Nenhum'/'Não'
  const bricked    = deckLabels.map(deck => {
    const rows = byDeck[deck];
    const n    = rows.filter(r => r.Brick === 'Sim' || (r.Brick && r.Brick !== 'Nenhum' && r.Brick !== 'Não')).length;
    return rows.length ? Math.round((n / rows.length) * 100) : 0;
  });
  const notBricked = bricked.map(v => 100 - v);

  charts['brick'] = new Chart(document.getElementById('chartBrick'), {
    type: 'bar',
    data: {
      labels: deckLabels,
      datasets: [
        {
          label: '🟢 Sem Brick',
          data: notBricked,
          backgroundColor: '#34e0a1bb',
          borderColor: '#34e0a1',
          borderWidth: 1,
          borderSkipped: false,
        },
        {
          label: '🔴 Brickado',
          data: bricked,
          backgroundColor: '#f75050bb',
          borderColor: '#f75050',
          borderWidth: 1,
          borderSkipped: false,
        },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: ctx => {
              const deck  = deckLabels[ctx.dataIndex];
              const rows  = byDeck[deck];
              const isBrick = ctx.datasetIndex === 1;
              const count = rows.filter(r => isBrick
                ? (r.Brick && r.Brick !== 'Nenhum')
                : (!r.Brick || r.Brick === 'Nenhum')
              ).length;
              return ` ${ctx.dataset.label}: ${ctx.parsed.y}%  (${count}/${rows.length} partidas)`;
            }
          }
        }
      },
      scales: {
        x: { stacked: true, grid: { color: 'rgba(255,255,255,0.03)' } },
        y: {
          stacked: true,
          min: 0, max: 100,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { callback: v => v + '%' }
        }
      }
    }
  });
}

// ── 17. TABLE & PAGINATION ───────────────────────────────────────────────────
let tableRows = [];
let currentPage = 1;
const PAGE_SIZE = 10;

function changePage(page) {
  currentPage = page;
  renderTable(tableRows, false);
}
window.changePage = changePage;

function renderTable(rows, resetPage = false) {
  tableRows = rows;
  if (resetPage) currentPage = 1;

  const tbody = document.getElementById('tableBody');
  const search = (document.getElementById('tableSearch').value || '').toLowerCase();
  const toRender = rows.filter(r =>
    Object.values(r).some(v => String(v).toLowerCase().includes(search))
  );

  const reversed = [...toRender].reverse();
  const totalItems = reversed.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, totalItems);
  const pagedRows = reversed.slice(startIdx, endIdx);

  if (pagedRows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="14" style="text-align:center;padding:2rem;color:var(--text2)">Nenhuma partida encontrada</td></tr>`;
  } else {
    tbody.innerHTML = pagedRows.map((r, i) => {
      const globalRowNumber = totalItems - (startIdx + i);
      const badgeClass = r.Resultado === 'Vitória' ? 'badge-win' :
                         r.Resultado === 'Empate'  ? 'badge-draw' : 'badge-loss';
      const emoji = r.Resultado === 'Vitória' ? '✅' : r.Resultado === 'Empate' ? '🤝' : '❌';

      const myDeckObj = (typeof decks !== 'undefined') ? decks.find(d => d.name === r.Deck) : null;
      const oppDeckObj = (typeof decks !== 'undefined') ? decks.find(d => d.name === r.DeckAdv) : null;

      let myBtn = myDeckObj ? `<button class="list-peek-btn" onclick="openDeckList('${myDeckObj.id}')" title="Ver lista do Player">Meu</button>` : '';
      let oppBtn = oppDeckObj ? `<button class="list-peek-btn opp-btn" onclick="openDeckList('${oppDeckObj.id}')" title="Ver lista do Oponente">Opo</button>` : '';

      const listasCol = (myBtn || oppBtn) 
        ? `<div style="display:flex;gap:4px;justify-content:center">${myBtn}${oppBtn}</div>` 
        : '<span style="color:var(--text2);font-size:.75rem">—</span>';

      const brickVal = (r.Brick === 'Sim' || (r.Brick && r.Brick !== 'Nenhum' && r.Brick !== 'Não')) ? '💥 Sim' : '✅ Não';

      const actionsCol = `
        <div style="display:flex;gap:4px;justify-content:center">
          <button class="icon-btn sm" onclick="editMatch('${r.id}')" title="Editar partida">✏️</button>
          <button class="icon-btn danger sm" onclick="deleteMatch('${r.id}')" title="Deletar partida">🗑️</button>
        </div>
      `;

      return `<tr>
        <td>${globalRowNumber}</td>
        <td>${r.Data}</td>
        <td>${r.Player}</td>
        <td><strong>${r.Deck}</strong></td>
        <td>${r.Adversario}</td>
        <td>${r.DeckAdv}</td>
        <td>${r.Formato}</td>
        <td>${r.Start}</td>
        <td>${r.Placar}</td>
        <td><span class="badge ${badgeClass}">${emoji} ${r.Resultado}</span></td>
        <td>${brickVal}</td>
        <td>${r.Local}</td>
        <td>${listasCol}</td>
        <td>${actionsCol}</td>
      </tr>`;
    }).join('');
  }

  // Update Pagination Controls
  renderPaginationControls(totalItems, startIdx, endIdx, totalPages);

  // Update footer count
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
  
  // Previous button
  btns.push(`<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">‹ Ant</button>`);

  // Page numbers logic (show max 5 buttons around current page)
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

  // Next button
  btns.push(`<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Próx ›</button>`);

  ctrl.innerHTML = btns.join('');
}

// ── 18. MATCHUP WIN RATE ─────────────────────────────────────────────────────
let matchupCurrentView = 'matrix';

// Build matchup data: { 'DeckA vs DeckB': { wins, total, matches[] } }
function buildMatchupData(data) {
  const map = {};
  data.forEach(r => {
    if (!r.Deck || !r.DeckAdv || r.DeckAdv === '—' || r.DeckAdv === '') return;
    const key = `${r.Deck}|||${r.DeckAdv}`;
    if (!map[key]) map[key] = { deck: r.Deck, opp: r.DeckAdv, wins: 0, draws: 0, losses: 0, total: 0, matches: [] };
    const entry = map[key];
    entry.total++;
    if (r.Resultado === 'Vitória') entry.wins++;
    else if (r.Resultado === 'Empate') entry.draws++;
    else entry.losses++;
    entry.matches.push(r);
  });
  return map;
}

// WR color: red(0%) → yellow(50%) → green(100%)
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

function renderMatchup() {
  const selectedPlayer = document.getElementById('matchupPlayer')?.value || '';
  
  let matchupDataset = filtered;
  if (selectedPlayer) {
    matchupDataset = filtered.filter(d => d.Player === selectedPlayer);
  }

  const matchupData = buildMatchupData(matchupDataset);
  
  let myDecks  = [...new Set(matchupDataset.map(d => d.Deck).filter(Boolean))].sort();
  let oppDecks = [...new Set(matchupDataset.map(d => d.DeckAdv).filter(Boolean))].sort();

  if (selectedDecks.size > 0) {
    myDecks  = myDecks.filter(d => selectedDecks.has(d));
    oppDecks = oppDecks.filter(d => selectedDecks.has(d));
  }

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
    ? decks.map(d => d.name).filter(Boolean)
    : [];

  const myDecks  = [...new Set([...registeredDeckNames, ...allData.map(d => d.Deck).filter(Boolean)])].sort((a, b) => a.localeCompare(b));
  const oppDecks = [...new Set([...registeredDeckNames, ...allData.map(d => d.DeckAdv).filter(Boolean)])].sort((a, b) => a.localeCompare(b));

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

function renderMatchupMatrix(matchupData, myDecks, oppDecks) {
  const container = document.getElementById('matchupMatrix');
  if (!container) return;

  const selMy  = document.getElementById('matchupSelectMyDeck')?.value || '';
  const selOpp = document.getElementById('matchupSelectOppDeck')?.value || '';

  if (myDecks.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚔️</div><p>Sem dados de matchup suficientes.</p></div>';
    return;
  }

  // Build grid: rows = myDeck, cols = oppDeck
  let html = '<table class="matrix-table">';

  // Header row
  html += '<thead><tr><th class="matrix-corner">Meu Deck \\ Oponente</th>';
  oppDecks.forEach(opp => {
    const isColActive = selOpp === opp;
    html += `<th class="matrix-col-header ${isColActive ? 'active-header' : ''}"><div class="col-label">${opp}</div></th>`;
  });
  html += '<th class="matrix-col-header total-col">Total</th></tr></thead>';

  // Data rows
  html += '<tbody>';
  myDecks.forEach(myDeck => {
    let rowWins = 0, rowTotal = 0;
    const isRowActive = selMy === myDeck;
    html += `<tr><td class="matrix-row-header ${isRowActive ? 'active-header' : ''}">${myDeck}</td>`;

    oppDecks.forEach(opp => {
      const key = `${myDeck}|||${opp}`;
      const entry = matchupData[key];
      const isActiveCell = (selMy === myDeck && selOpp === opp);
      const activeClass = isActiveCell ? ' matrix-cell-active' : '';

      if (!entry || entry.total === 0) {
        html += `<td class="matrix-cell empty${activeClass}" title="Sem dados">—</td>`;
      } else {
        const wr = Math.round((entry.wins / entry.total) * 100);
        const bg = wrColor(wr, 0.75);
        const textColor = (wr >= 40 && wr <= 60) ? '#fff' : (wr > 60 ? '#0b1a0f' : '#1a0b0b');
        rowWins  += entry.wins;
        rowTotal += entry.total;
        html += `<td class="matrix-cell${activeClass}" 
          style="background:${bg}; color:${textColor}"
          onclick="showMatchupDetail('${myDeck}', '${opp}')"
          title="${myDeck} vs ${opp}: ${wr}% (${entry.wins}V-${entry.draws}E-${entry.losses}D / ${entry.total} jogos)">
          <span class="cell-pct">${wr}%</span>
          <span class="cell-record">${entry.wins}-${entry.draws}-${entry.losses}</span>
        </td>`;
      }
    });

    // Row total
    const rowWR = rowTotal ? Math.round((rowWins / rowTotal) * 100) : null;
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
  renderResultPie();
  renderLocal();
  renderFormato();
  renderDeckCount();
  renderStart();
  renderBrick();
  populateMatchupPlayerSelect();
  renderMatchup();
  renderTable(filtered);
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

    // Try "Banco de Dados" first
    const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('banco')) || wb.SheetNames[0];
    const ws   = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval: null });

    // Find header row (has 'Resultado' in it)
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
        // Excel serial date
        const d = new Date(Math.round((data - 25569) * 86400 * 1000));
        data = d.toISOString().slice(0,10);
      }

      // Normalize resultado
      let resultado = String(res).trim();
      if (!resultado.match(/^(Vitória|Empate|Derrota)$/)) {
        resultado = resultado.toLowerCase().includes('vit') ? 'Vitória' :
                    resultado.toLowerCase().includes('emp') ? 'Empate'  : 'Derrota';
      }

      const pData = String(data || '').slice(0,10);
      const pPlayer = String(player).trim();
      // Generate a stable row ID based on Excel row index + player name + date
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

    // Save parsed Excel games to localStorage for persistence
    localStorage.setItem('jornada_excel_matches', JSON.stringify(parsed));

    // Process all parsed records through deletes, edits, and manual matches merging
    allData  = applyDataOverrides(parsed);
    filtered = [...allData];
    populateFilters();
    applyFilters();

    // Trigger online synchronization push
    if (typeof triggerSyncPush === 'function') {
      triggerSyncPush();
    }

    const now = new Date().toLocaleString('pt-BR');
    document.getElementById('lastUpdate').textContent = `📊 ${parsed.length} registros • ${now}`;
  } catch(err) {
    alert('Erro ao ler o Excel: ' + err.message);
    console.error(err);
  }
}

// ── 20. GLOBAL RESET FUNCTION ────────────────────────────────────────────────
window.resetAllFilters = function() {
  // 1. Reset Formato, Local, Data Início, and Data Fim
  ['filterFormato','filterLocal','filterDateStart','filterDateEnd'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = '';
      if (el.selectedIndex !== undefined) el.selectedIndex = 0;
      if (el.syncSearchableSelect) el.syncSearchableSelect();
    }
  });

  // 2. Reset Multi-Player: select ALL players
  isExplicitPlayerSelection = false;
  const dataPlayers    = allData.map(d => d.Player).filter(Boolean);
  const managerPlayers = (typeof players !== 'undefined') ? players : [];
  allAvailablePlayers = [...new Set([...dataPlayers, ...managerPlayers])].sort((a, b) => a.localeCompare(b));
  selectedPlayers = new Set(allAvailablePlayers);
  renderMultiPlayerItems(allAvailablePlayers);
  updateMultiPlayerBtnText();

  // 3. Reset Multi-Deck: select ALL decks
  isExplicitSelection = false;
  const dataDecks    = allData.map(d => d.Deck).filter(Boolean);
  const oppDecks     = allData.map(d => d.DeckAdv).filter(Boolean);
  const managerDecks = (typeof decks !== 'undefined') ? decks.map(d => d.name) : [];
  allAvailableDecks = [...new Set([...dataDecks, ...oppDecks, ...managerDecks])].sort((a, b) => a.localeCompare(b));
  selectedDecks = new Set(allAvailableDecks);
  renderMultiDeckItems(allAvailableDecks);
  updateMultiDeckBtnText();

  // 4. Clear table search
  const searchInput = document.getElementById('tableSearch');
  if (searchInput) searchInput.value = '';

  // 5. Reapply filters
  applyFilters();
};

// ── 21. INIT ──────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // File input
  document.getElementById('fileInput').addEventListener('change', e => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  // Table search
  document.getElementById('tableSearch').addEventListener('input', () => {
    renderTable(filtered, true);
  });

  // Drag & drop on body
  document.body.addEventListener('dragover', e => e.preventDefault());
  document.body.addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.name.match(/\.xlsx?$|\.xlsm$/i)) handleFile(file);
  });

  // Initialize data
  initializeData();
  populateFilters();
  initMatchupToggle();
  renderAll();
});

