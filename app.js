/* ============================================================
   JORNADA DASHBOARD — app.js
   Full logic: data loading, filtering, charts, table
   ============================================================ */

'use strict';

// ── 1. DEMO DATA (extracted from the provided Excel) ─────────────────────────
const DEMO_DATA = [
  { id:"demo_1", Data:"2026-07-19", Player:"Guivaz",  Deck:"Zoroark",       Adversario:"GreatBall", DeckAdv:"Draga Puro",      Luck:4, Formato:"MD3", Start:"1º", Resultado:"Vitória",  Pontos:1,   Placar:"2-1", Local:"Caverna",         Brick:"Médio",   BrickOp:"Pequeno" },
  { id:"demo_2", Data:"2026-07-19", Player:"Trevas",  Deck:"Greninja Duns", Adversario:"GreatBall", DeckAdv:"Alaka Duns",      Luck:3, Formato:"MD3", Start:"1º", Resultado:"Vitória",  Pontos:1,   Placar:"2-1", Local:"Spell",           Brick:"Pequeno", BrickOp:"Nenhum"  },
  { id:"demo_3", Data:"2026-07-19", Player:"Guivaz",  Deck:"Alaka Duns",    Adversario:"GreatBall", DeckAdv:"Zoroark",         Luck:3, Formato:"MD3", Start:"1º", Resultado:"Vitória",  Pontos:1,   Placar:"2-1", Local:"Spell",           Brick:"Médio",   BrickOp:"Médio"   },
  { id:"demo_4", Data:"2026-07-19", Player:"Leleco",  Deck:"Draga Dusk",    Adversario:"UltraBall", DeckAdv:"Zoroark",         Luck:4, Formato:"MD3", Start:"1º", Resultado:"Empate",   Pontos:0.5, Placar:"1-1", Local:"Leitura RioMar",  Brick:"Médio",   BrickOp:"Médio"   },
  { id:"demo_5", Data:"2026-07-19", Player:"Trevas",  Deck:"Zoroark",       Adversario:"UltraBall", DeckAdv:"Draga Blaziken",  Luck:2, Formato:"MD3", Start:"1º", Resultado:"Vitória",  Pontos:1,   Placar:"2-1", Local:"Leitura RioMar",  Brick:"Médio",   BrickOp:"Pequeno" },
  { id:"demo_6", Data:"2026-07-19", Player:"Trevas",  Deck:"Zoroark",       Adversario:"UltraBall", DeckAdv:"Draga Blaziken",  Luck:1, Formato:"MD3", Start:"1º", Resultado:"Empate",   Pontos:0.5, Placar:"1-1", Local:"Spell",           Brick:"Médio",   BrickOp:"Grande"  },
  { id:"demo_7", Data:"2026-07-19", Player:"Trevas",  Deck:"Zoroark",       Adversario:"UltraBall", DeckAdv:"Draga Puro",      Luck:4, Formato:"MD1", Start:"1º", Resultado:"Vitória",  Pontos:1,   Placar:"2-0", Local:"Leitura RioMar",  Brick:"Médio",   BrickOp:"Pequeno" },
  { id:"demo_8", Data:"2026-07-19", Player:"Trevas",  Deck:"Draga Puro",    Adversario:"UltraBall", DeckAdv:"Zoroark",         Luck:4, Formato:"MD1", Start:"2º", Resultado:"Vitória",  Pontos:1,   Placar:"2-1", Local:"Spell",           Brick:"Médio",   BrickOp:"Médio"   },
  { id:"demo_9", Data:"2026-07-19", Player:"Braz",    Deck:"Draga Puro",    Adversario:"Arceus",    DeckAdv:"Alaka Duns",      Luck:3, Formato:"MD1", Start:"2º", Resultado:"Derrota",  Pontos:0,   Placar:"0-1", Local:"Leitura RioMar",  Brick:"Nenhum",  BrickOp:"Pequeno" },
  { id:"demo_10", Data:"2026-07-19", Player:"Guivaz",  Deck:"Zoroark",       Adversario:"GreatBall", DeckAdv:"Greninja Duns",   Luck:2, Formato:"MD1", Start:"2º", Resultado:"Empate",   Pontos:0.5, Placar:"1-1", Local:"Leitura RioMar",  Brick:"Médio",   BrickOp:"Pequeno" },
  { id:"demo_11", Data:"2026-07-19", Player:"Guivaz",  Deck:"Draga Puro",    Adversario:"GreatBall", DeckAdv:"Alaka Duns",      Luck:3, Formato:"MD1", Start:"2º", Resultado:"Vitória",  Pontos:1,   Placar:"1-0", Local:"Leitura Tacaruna",Brick:"Médio",   BrickOp:"Médio"   },
  { id:"demo_12", Data:"2026-07-19", Player:"Guivaz",  Deck:"Draga Puro",    Adversario:"GreatBall", DeckAdv:"Alaka Duns",      Luck:3, Formato:"MD1", Start:"2º", Resultado:"Vitória",  Pontos:1,   Placar:"1-0", Local:"Leitura Tacaruna",Brick:"Médio",   BrickOp:"Médio"   },
];

// ── 2. STATE ─────────────────────────────────────────────────────────────────
let allData    = [];
let filtered   = [];
let charts     = {};

// Helper to apply overrides, deletes, and manual matches
function applyDataOverrides(rawData) {
  let baseData = [...rawData];

  if (typeof loadDeleted === 'function' && typeof loadEdits === 'function') {
    const deleted = loadDeleted();
    const edits = loadEdits();
    baseData = baseData.filter(d => !deleted.has(d.id));
    baseData = baseData.map(d => edits[d.id] ? edits[d.id] : d);
  }

  if (typeof loadManual === 'function') {
    const manual = loadManual();
    const deleted = (typeof loadDeleted === 'function') ? loadDeleted() : new Set();
    const manualFiltered = manual.filter(m => !deleted.has(m.id));
    const ids = new Set(baseData.map(d => d.id));
    manualFiltered.forEach(m => {
      if (!ids.has(m.id)) baseData.push(m);
    });
  }

  return baseData;
}

function initializeData() {
  allData = applyDataOverrides(DEMO_DATA);
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

// ── 5. POPULATE FILTERS ──────────────────────────────────────────────────────
function populateFilters() {
  const players  = [...new Set(allData.map(d => d.Player))].sort();
  const decks    = [...new Set(allData.map(d => d.Deck))].sort();
  const formatos = [...new Set(allData.map(d => d.Formato))].sort();
  const locais   = [...new Set(allData.map(d => d.Local))].sort();

  fillSelect('filterPlayer',  players);
  fillSelect('filterDeck',    decks);
  fillSelect('filterFormato', formatos);
  fillSelect('filterLocal',   locais);
}

function fillSelect(id, values) {
  const sel = document.getElementById(id);
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todos</option>';
  values.forEach(v => {
    const o = document.createElement('option');
    o.value = v; o.textContent = v;
    sel.appendChild(o);
  });
  sel.value = cur;
}

// ── 6. FILTER LOGIC ──────────────────────────────────────────────────────────
function applyFilters() {
  const player  = document.getElementById('filterPlayer').value;
  const deck    = document.getElementById('filterDeck').value;
  const formato = document.getElementById('filterFormato').value;
  const local   = document.getElementById('filterLocal').value;

  filtered = allData.filter(d =>
    (!player  || d.Player  === player) &&
    (!deck    || d.Deck    === deck)   &&
    (!formato || d.Formato === formato) &&
    (!local   || d.Local   === local)
  );

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
  const labels = Object.keys(byDeck).sort();
  const wrData = labels.map(d => pct(byDeck[d].filter(r => r.Resultado==='Vitória').length, byDeck[d].length));
  const bgColors = labels.map((_, i) => PALETTE[i % PALETTE.length]);

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
              const dk = labels[ctx.dataIndex];
              const tot = byDeck[dk].length;
              const wins = byDeck[dk].filter(r=>r.Resultado==='Vitória').length;
              return ` ${ctx.parsed.y}%  (${wins}V / ${tot} jogos)`;
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
  const labels = Object.keys(byPlayer).sort();
  const wins   = labels.map(p => byPlayer[p].filter(r=>r.Resultado==='Vitória').length);
  const draws  = labels.map(p => byPlayer[p].filter(r=>r.Resultado==='Empate').length);
  const losses = labels.map(p => byPlayer[p].filter(r=>r.Resultado==='Derrota').length);

  charts['playerPerf'] = new Chart(document.getElementById('chartPlayerPerf'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Vitórias', data: wins,   backgroundColor: WIN_COLOR  + 'bb', borderColor: WIN_COLOR,   borderWidth:2, borderRadius:6 },
        { label: 'Empates',  data: draws,  backgroundColor: DRAW_COLOR + 'bb', borderColor: DRAW_COLOR,  borderWidth:2, borderRadius:6 },
        { label: 'Derrotas', data: losses, backgroundColor: LOSS_COLOR + 'bb', borderColor: LOSS_COLOR,  borderWidth:2, borderRadius:6 },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        y: { stacked: false, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { grid: { color: 'rgba(255,255,255,0.03)' } }
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

// ── 13. CHART: WIN RATE VS OPONENTE ─────────────────────────────────────────────
function renderOppWR() {
  destroyChart('oppWR');
  const byOpp = groupBy(filtered, 'Adversario');
  const sorted = Object.entries(byOpp)
    .filter(([k]) => k && k !== '0')
    .map(([opp, rows]) => ({
      opp,
      wins:   rows.filter(r => r.Resultado === 'Vitória').length,
      draws:  rows.filter(r => r.Resultado === 'Empate').length,
      losses: rows.filter(r => r.Resultado === 'Derrota').length,
      total:  rows.length,
      wr:     pct(rows.filter(r => r.Resultado === 'Vitória').length, rows.length),
    }))
    .sort((a, b) => b.wr - a.wr || b.total - a.total);

  if (!sorted.length) return;

  const labels  = sorted.map(e => e.opp);
  const wrs     = sorted.map(e => e.wr);
  const bgs     = sorted.map(e => e.wr >= 60 ? '#34e0a1bb' : e.wr >= 40 ? '#f5c842bb' : '#f75050bb');
  const borders = sorted.map(e => e.wr >= 60 ? '#34e0a1'   : e.wr >= 40 ? '#f5c842'   : '#f75050');

  charts['oppWR'] = new Chart(document.getElementById('chartOppWR'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Win Rate (%)',
        data: wrs,
        backgroundColor: bgs,
        borderColor: borders,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const e = sorted[ctx.dataIndex];
              return [` ${e.wr}% WR`, ` ${e.wins}V · ${e.draws}E · ${e.losses}D (${e.total} jogos)`];
            }
          }
        }
      },
      scales: {
        x: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: v => v + '%' } },
        y: { grid: { color: 'rgba(255,255,255,0.03)' } }
      }
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

// ── 17. TABLE ───────────────────────────────────────────────────────────────
let tableRows = [];

function renderTable(rows) {
  tableRows = rows;
  const tbody = document.getElementById('tableBody');
  const search = (document.getElementById('tableSearch').value || '').toLowerCase();
  const toRender = rows.filter(r =>
    Object.values(r).some(v => String(v).toLowerCase().includes(search))
  );

  const reversed = [...toRender].reverse();

  tbody.innerHTML = reversed.map((r, i) => {
    const badgeClass = r.Resultado === 'Vitória' ? 'badge-win' :
                       r.Resultado === 'Empate'  ? 'badge-draw' : 'badge-loss';
    const emoji = r.Resultado === 'Vitória' ? '✅' : r.Resultado === 'Empate' ? '🤝' : '❌';

    // Find matching deck for player's deck and opponent's deck
    const myDeckObj = (typeof decks !== 'undefined')
      ? decks.find(d => d.name === r.Deck)
      : null;
    const oppDeckObj = (typeof decks !== 'undefined')
      ? decks.find(d => d.name === r.DeckAdv)
      : null;

    let myBtn = myDeckObj 
      ? `<button class="list-peek-btn" onclick="openDeckList('${myDeckObj.id}')" title="Ver lista do Player">Meu</button>` 
      : '';
    let oppBtn = oppDeckObj 
      ? `<button class="list-peek-btn opp-btn" onclick="openDeckList('${oppDeckObj.id}')" title="Ver lista do Oponente">Opo</button>` 
      : '';

    const listasCol = (myBtn || oppBtn) 
      ? `<div style="display:flex;gap:4px;justify-content:center">${myBtn}${oppBtn}</div>` 
      : '<span style="color:var(--text2);font-size:.75rem">—</span>';

    const brickVal = (r.Brick === 'Sim' || (r.Brick && r.Brick !== 'Nenhum' && r.Brick !== 'Não'))
      ? '💥 Sim' : '✅ Não';

    const actionsCol = `
      <div style="display:flex;gap:4px;justify-content:center">
        <button class="icon-btn sm" onclick="editMatch('${r.id}')" title="Editar partida">✏️</button>
        <button class="icon-btn danger sm" onclick="deleteMatch('${r.id}')" title="Deletar partida">🗑️</button>
      </div>
    `;

    return `<tr>
      <td>${reversed.length - i}</td>
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

  // Update footer count
  const fc = document.getElementById('footerCount');
  if (fc) fc.textContent = `${allData.length} partidas registradas`;
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
  const playerSel = document.getElementById('matchupPlayer')?.value || '';

  // Filter data by matchup player selector (independent of main filters)
  let baseData = allData.filter(d => !playerSel || d.Player === playerSel);

  const matchupData = buildMatchupData(baseData);
  const myDecks  = [...new Set(baseData.map(d => d.Deck).filter(Boolean))].sort();
  const oppDecks = [...new Set(baseData.map(d => d.DeckAdv).filter(Boolean))].sort();

  if (matchupCurrentView === 'matrix') {
    renderMatchupMatrix(matchupData, myDecks, oppDecks);
  } else {
    renderMatchupBar(matchupData);
  }
}

function renderMatchupMatrix(matchupData, myDecks, oppDecks) {
  const container = document.getElementById('matchupMatrix');
  if (!container) return;

  if (myDecks.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚔️</div><p>Sem dados de matchup suficientes.</p></div>';
    return;
  }

  // Build grid: rows = myDeck, cols = oppDeck
  let html = '<table class="matrix-table">';

  // Header row
  html += '<thead><tr><th class="matrix-corner">Meu Deck \\ Oponente</th>';
  oppDecks.forEach(opp => {
    html += `<th class="matrix-col-header"><div class="col-label">${opp}</div></th>`;
  });
  html += '<th class="matrix-col-header total-col">Total</th></tr></thead>';

  // Data rows
  html += '<tbody>';
  myDecks.forEach(myDeck => {
    let rowWins = 0, rowTotal = 0;
    html += `<tr><td class="matrix-row-header">${myDeck}</td>`;

    oppDecks.forEach(opp => {
      const key = `${myDeck}|||${opp}`;
      const entry = matchupData[key];
      if (!entry || entry.total === 0) {
        html += `<td class="matrix-cell empty" title="Sem dados">—</td>`;
      } else {
        const wr = Math.round((entry.wins / entry.total) * 100);
        const bg = wrColor(wr, 0.75);
        const textColor = (wr >= 40 && wr <= 60) ? '#fff' : (wr > 60 ? '#0b1a0f' : '#1a0b0b');
        rowWins  += entry.wins;
        rowTotal += entry.total;
        html += `<td class="matrix-cell" 
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

function renderMatchupBar(matchupData) {
  destroyChart('matchupBar');
  const entries = Object.values(matchupData)
    .filter(e => e.total >= 1)
    .map(e => ({ label: `${e.deck} vs ${e.opp}`, wr: Math.round((e.wins / e.total) * 100), total: e.total, wins: e.wins, draws: e.draws, losses: e.losses }))
    .sort((a, b) => b.wr - a.wr);

  if (entries.length === 0) {
    document.getElementById('matchupBarView').innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><p>Sem dados de matchup.</p></div>';
    return;
  }

  const labels = entries.map(e => e.label);
  const wrs    = entries.map(e => e.wr);
  const bgs    = entries.map(e => wrColor(e.wr, 0.75));
  const borders= entries.map(e => wrColor(e.wr, 1));

  // Re-inject canvas if needed
  let barView = document.getElementById('matchupBarView');
  if (!barView.querySelector('canvas')) {
    barView.innerHTML = '<div class="chart-wrap" style="min-height:320px"><canvas id="chartMatchupBar"></canvas></div>';
  }

  charts['matchupBar'] = new Chart(document.getElementById('chartMatchupBar'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Win Rate (%)',
        data: wrs,
        backgroundColor: bgs,
        borderColor: borders,
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const e = entries[ctx.dataIndex];
              return [` ${e.wr}% Win Rate`, ` ${e.wins}V · ${e.draws}E · ${e.losses}D (${e.total} jogos)`];
            }
          }
        }
      },
      scales: {
        x: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: v => v + '%' } },
        y: { grid: { color: 'rgba(255,255,255,0.03)' } }
      }
    }
  });
}

window.showMatchupDetail = function(myDeck, oppDeck) {
  const playerSel = document.getElementById('matchupPlayer')?.value || '';
  let baseData = allData.filter(d => !playerSel || d.Player === playerSel);

  const matches = baseData.filter(r => r.Deck === myDeck && r.DeckAdv === oppDeck);
  if (!matches.length) return;

  const wins   = matches.filter(r => r.Resultado === 'Vitória').length;
  const draws  = matches.filter(r => r.Resultado === 'Empate').length;
  const losses = matches.filter(r => r.Resultado === 'Derrota').length;
  const wr     = Math.round((wins / matches.length) * 100);

  document.getElementById('detailTitle').textContent = `${myDeck} vs ${oppDeck}`;

  const playerBreakdown = {};
  matches.forEach(m => {
    if (!playerBreakdown[m.Player]) playerBreakdown[m.Player] = { wins: 0, draws: 0, losses: 0 };
    const pb = playerBreakdown[m.Player];
    if (m.Resultado === 'Vitória') pb.wins++;
    else if (m.Resultado === 'Empate') pb.draws++;
    else pb.losses++;
  });

  const playerRows = Object.entries(playerBreakdown).map(([p, s]) => {
    const pTotal = s.wins + s.draws + s.losses;
    const pWR = Math.round((s.wins / pTotal) * 100);
    return `<div class="detail-player-row">
      <span class="detail-player-name">👤 ${p}</span>
      <span class="detail-record">${s.wins}V · ${s.draws}E · ${s.losses}D</span>
      <span class="detail-wr" style="color:${wrColor(pWR, 1)}">${pWR}%</span>
    </div>`;
  }).join('');

  const recentRows = [...matches].reverse().slice(0, 5).map(m => {
    const badge = m.Resultado === 'Vitória' ? 'badge-win' : m.Resultado === 'Empate' ? 'badge-draw' : 'badge-loss';
    const emoji = m.Resultado === 'Vitória' ? '✅' : m.Resultado === 'Empate' ? '🤝' : '❌';
    return `<div class="detail-match-row">
      <span class="detail-date">${m.Data}</span>
      <span class="detail-match-player">👤 ${m.Player}</span>
      <span class="detail-placar">${m.Placar || '—'}</span>
      <span class="badge ${badge}" style="font-size:.7rem">${emoji} ${m.Resultado}</span>
      <span class="detail-local">📍 ${m.Local || '—'}</span>
    </div>`;
  }).join('');

  document.getElementById('detailBody').innerHTML = `
    <div class="detail-kpis">
      <div class="detail-kpi"><span class="dkpi-val" style="color:var(--green)">${wins}</span><span class="dkpi-label">Vitórias</span></div>
      <div class="detail-kpi"><span class="dkpi-val" style="color:var(--yellow)">${draws}</span><span class="dkpi-label">Empates</span></div>
      <div class="detail-kpi"><span class="dkpi-val" style="color:var(--red)">${losses}</span><span class="dkpi-label">Derrotas</span></div>
      <div class="detail-kpi"><span class="dkpi-val" style="color:${wrColor(wr, 1)}">${wr}%</span><span class="dkpi-label">Win Rate</span></div>
    </div>
    ${Object.keys(playerBreakdown).length > 1 ? `<div class="detail-subtitle">Por Player</div>${playerRows}` : ''}
    <div class="detail-subtitle">Últimas Partidas</div>
    ${recentRows}
  `;
  document.getElementById('matchupDetail').style.display = 'block';
};

function populateMatchupPlayerSelect() {
  const sel = document.getElementById('matchupPlayer');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todos os Players</option>';
  const ps = [...new Set(allData.map(d => d.Player).filter(Boolean))].sort();
  ps.forEach(p => {
    const o = document.createElement('option');
    o.value = p; o.textContent = p;
    sel.appendChild(o);
  });
  sel.value = cur;
}

// ── 18b. VIEW TOGGLE ──────────────────────────────────────────────────────────
function initMatchupToggle() {
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      matchupCurrentView = btn.dataset.view;
      const isMatrix = matchupCurrentView === 'matrix';
      document.getElementById('matchupMatrixView').style.display = isMatrix ? '' : 'none';
      document.getElementById('matchupBarView').style.display    = isMatrix ? 'none' : '';
      document.getElementById('matchupDetail').style.display     = 'none';
      renderMatchup();
    });
  });

  document.getElementById('matchupPlayer')?.addEventListener('change', () => {
    document.getElementById('matchupDetail').style.display = 'none';
    renderMatchup();
  });
}

// ── 19. RENDER ALL ──────────────────────────────────────────────────────────
function renderAll() {
  renderKPIs();
  renderDeckWR();
  renderPlayerPerf();
  renderResultPie();
  renderLocal();
  renderFormato();
  renderOppWR();
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

    // Process all parsed records through deletes, edits, and manual matches merging
    allData  = applyDataOverrides(parsed);
    filtered = [...allData];
    populateFilters();
    applyFilters();

    const now = new Date().toLocaleString('pt-BR');
    document.getElementById('lastUpdate').textContent = `📊 ${parsed.length} registros • ${now}`;
  } catch(err) {
    alert('Erro ao ler o Excel: ' + err.message);
    console.error(err);
  }
}

// ── 20. EVENT LISTENERS ──────────────────────────────────────────────────────
document.getElementById('fileInput').addEventListener('change', e => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});

['filterPlayer','filterDeck','filterFormato','filterLocal'].forEach(id => {
  document.getElementById(id).addEventListener('change', applyFilters);
});

document.getElementById('resetFilters').addEventListener('click', () => {
  ['filterPlayer','filterDeck','filterFormato','filterLocal'].forEach(id => {
    document.getElementById(id).value = '';
  });
  applyFilters();
});

document.getElementById('tableSearch').addEventListener('input', () => {
  renderTable(filtered);
});

// Drag & drop on body
document.body.addEventListener('dragover', e => e.preventDefault());
document.body.addEventListener('drop', e => {
  e.preventDefault();
  const file = e.dataTransfer?.files?.[0];
  if (file && file.name.match(/\.xlsx?$|\.xlsm$/i)) handleFile(file);
});

// ── 21. INIT ──────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initializeData();
  populateFilters();
  initMatchupToggle();
  renderAll();
});

