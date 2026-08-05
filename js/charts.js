// ── JS/CHARTS.JS ────────────────────────────────────────────────────────────
// Chart.js visualizations & dashboard canvas rendering

window.charts = {};

window.destroyChart = function(id) {
  if (window.charts[id]) {
    window.charts[id].destroy();
    delete window.charts[id];
  }
};

window.renderKPIs = function() {
  if (typeof calculateStats !== 'function') return;
  const stats = calculateStats(window.filtered || []);
  const brickPct = typeof pct === 'function' ? pct(stats.totalGameBricksCount, stats.totalGamesCount) : 0;

  const anim = (id, target) => {
    const el = document.getElementById(id);
    if (!el) return;
    let start = 0;
    const step = Math.ceil(target / 20) || 1;
    const tick = () => {
      start = Math.min(start + step, target);
      el.textContent = start;
      if (start < target) requestAnimationFrame(tick);
    };
    tick();
  };

  anim('kpiTotal', stats.total);
  anim('kpiWin',   stats.wins);
  anim('kpiDraw',  stats.draws);
  anim('kpiLoss',  stats.losses);
  
  const wrEl = document.getElementById('kpiWR');
  if (wrEl) wrEl.textContent = stats.wr + '%';

  const bEl = document.getElementById('kpiBrick');
  if (bEl) bEl.textContent = brickPct + '%';
};

window.renderDeckWR = function() {
  destroyChart('deckWR');
  const canvas = document.getElementById('chartDeckWR');
  if (!canvas || typeof groupBy !== 'function') return;

  const byDeck = groupBy(window.filtered || [], typeof getMatchDeck === 'function' ? getMatchDeck : 'Deck');
  const deckStats = Object.keys(byDeck).map(d => {
    const st = calculateStats(byDeck[d]);
    return { deck: d, wr: st.wr, total: st.total };
  }).sort((a, b) => b.wr - a.wr);

  window.charts['deckWR'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: deckStats.map(d => d.deck),
      datasets: [{
        label: 'Win Rate (%)',
        data: deckStats.map(d => d.wr),
        backgroundColor: deckStats.map(d => d.wr >= 65 ? '#34e0a1' : d.wr >= 50 ? '#f5c842' : '#f75050'),
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { max: 100, min: 0 } }
    }
  });
};

window.renderPlayerPerf = function() {
  destroyChart('playerPerf');
  const canvas = document.getElementById('chartPlayerPerf');
  if (!canvas || typeof groupBy !== 'function') return;

  const byPlayer = groupBy(window.filtered || [], 'Player');
  const playersList = Object.keys(byPlayer).sort();

  window.charts['playerPerf'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: playersList,
      datasets: [
        { label: 'Vitórias', data: playersList.map(p => calculateStats(byPlayer[p]).wins), backgroundColor: WIN_COLOR },
        { label: 'Empates',  data: playersList.map(p => calculateStats(byPlayer[p]).draws), backgroundColor: DRAW_COLOR },
        { label: 'Derrotas', data: playersList.map(p => calculateStats(byPlayer[p]).losses), backgroundColor: LOSS_COLOR }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { x: { stacked: true }, y: { stacked: true } }
    }
  });
};

window.renderStart = function() {
  destroyChart('start');
  const canvas = document.getElementById('chartStart');
  if (!canvas || typeof groupBy !== 'function') return;

  const expandedStarts = [];
  (window.filtered || []).forEach(m => {
    if (m.GamesDetail && Array.isArray(m.GamesDetail) && m.GamesDetail.length > 0) {
      m.GamesDetail.forEach(g => {
        expandedStarts.push({ ...m, Start: g.start });
      });
    } else {
      expandedStarts.push(m);
    }
  });

  const byStart = groupBy(expandedStarts, 'Start');
  const positions = ['1º', '2º'];

  window.charts['start'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: positions,
      datasets: [
        { label: 'Vitórias', data: positions.map(pos => (byStart[pos] || []).filter(r => r.Resultado === 'Vitória').length), backgroundColor: WIN_COLOR },
        { label: 'Empates',  data: positions.map(pos => (byStart[pos] || []).filter(r => r.Resultado === 'Empate').length), backgroundColor: DRAW_COLOR },
        { label: 'Derrotas', data: positions.map(pos => (byStart[pos] || []).filter(r => r.Resultado === 'Derrota').length), backgroundColor: LOSS_COLOR }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
};

window.renderBrick = function() {
  destroyChart('brick');
  const canvas = document.getElementById('chartBrick');
  if (!canvas || typeof groupBy !== 'function') return;

  const byDeck = groupBy(window.filtered || [], 'Deck');
  const deckLabels = Object.keys(byDeck).sort();

  const bricked = deckLabels.map(deck => {
    const rows = byDeck[deck];
    let totalGames = 0, brickedGames = 0;
    rows.forEach(r => {
      if (r.GamesDetail && Array.isArray(r.GamesDetail) && r.GamesDetail.length > 0) {
        totalGames += r.GamesDetail.length;
        brickedGames += r.GamesDetail.filter(g => g.brick === 'Sim').length;
      } else {
        totalGames += 1;
        if (typeof isBricked === 'function' && isBricked(r)) brickedGames += 1;
      }
    });
    return totalGames ? Math.round((brickedGames / totalGames) * 100) : 0;
  });

  window.charts['brick'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: deckLabels,
      datasets: [
        { label: '🟢 Sem Brick', data: bricked.map(v => 100 - v), backgroundColor: '#34e0a1bb' },
        { label: '💥 Brickado', data: bricked, backgroundColor: '#f75050bb' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { x: { stacked: true }, y: { stacked: true, max: 100 } }
    }
  });
};

window.renderAllCharts = function() {
  if (typeof renderKPIs === 'function') renderKPIs();
  if (typeof renderDeckWR === 'function') renderDeckWR();
  if (typeof renderPlayerPerf === 'function') renderPlayerPerf();
  if (typeof renderStart === 'function') renderStart();
  if (typeof renderBrick === 'function') renderBrick();
};
