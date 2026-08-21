// ── JS/TOURNAMENTS_META.JS ──────────────────────────────────────────────────
// Resumo Diário do Meta de Torneios Online (Limitless TCG) — CHG-004 & CHG-007

window.tournamentsMetaData = null;
window.tournamentsMetaLoading = false;

window.fetchTournamentsMetaSummary = async function(dateStr, forceRefresh = false) {
  const container = document.getElementById('tournamentsMetaContainer');
  if (!container) return;

  if (window.tournamentsMetaData && !forceRefresh && !dateStr) {
    window.renderTournamentsMetaSummary(window.tournamentsMetaData);
    return;
  }

  window.tournamentsMetaLoading = true;
  const loadingEl = document.getElementById('tournamentsMetaLoading');
  const errorEl = document.getElementById('tournamentsMetaError');
  const contentEl = document.getElementById('tournamentsMetaContent');
  
  if (loadingEl) loadingEl.style.display = 'flex';
  if (errorEl) errorEl.style.display = 'none';
  if (contentEl) contentEl.style.display = 'none';

  try {
    const query = dateStr ? `?date=${encodeURIComponent(dateStr)}` : '';
    const res = await fetch(`/api/tournaments_meta${query}`);
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    window.tournamentsMetaData = data;
    window.renderTournamentsMetaSummary(data);
  } catch (err) {
    console.error('[Tournaments Meta Error]', err);
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) {
      errorEl.style.display = 'block';
      const msgEl = document.getElementById('tournamentsMetaErrorMsg');
      if (msgEl) msgEl.textContent = 'Não foi possível carregar os dados do Meta neste momento.';
    }
  } finally {
    window.tournamentsMetaLoading = false;
  }
};

window.renderTournamentsMetaSummary = function(data) {
  const loadingEl = document.getElementById('tournamentsMetaLoading');
  const errorEl = document.getElementById('tournamentsMetaError');
  const contentEl = document.getElementById('tournamentsMetaContent');
  const emptyEl = document.getElementById('tournamentsMetaEmpty');

  if (loadingEl) loadingEl.style.display = 'none';
  if (errorEl) errorEl.style.display = 'none';

  if (!data || data.totalTournaments === 0) {
    if (emptyEl) {
      emptyEl.style.display = 'block';
      const emptyDate = document.getElementById('tournamentsMetaEmptyDate');
      if (emptyDate) emptyDate.textContent = data?.displayDate || 'ontem';
    }
    if (contentEl) contentEl.style.display = 'none';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  if (contentEl) contentEl.style.display = 'block';

  // 1. Data e KPIs Superiores
  const dateBadge = document.getElementById('metaDisplayDateBadge');
  if (dateBadge) dateBadge.textContent = data.displayDate || data.date;

  const anim = (id, target) => {
    const el = document.getElementById(id);
    if (!el) return;
    let start = 0;
    const step = Math.ceil(target / 20) || 1;
    const tick = () => {
      start = Math.min(start + step, target);
      el.textContent = typeof target === 'number' && target > 999 ? start.toLocaleString('pt-BR') : start;
      if (start < target) requestAnimationFrame(tick);
    };
    tick();
  };

  anim('kpiMetaTournaments', data.totalTournaments || 0);
  anim('kpiMetaPlayers', data.totalPlayers || 0);

  const topDeck1 = data.topDecks && data.topDecks.length > 0 ? data.topDecks[0] : null;
  const kpiTopDeckEl = document.getElementById('kpiMetaTopDeck');
  const kpiTopDeckSub = document.getElementById('kpiMetaTopDeckSub');
  if (kpiTopDeckEl && topDeck1) {
    kpiTopDeckEl.textContent = topDeck1.name;
    if (kpiTopDeckSub) kpiTopDeckSub.textContent = `${topDeck1.metaShare}% · ${topDeck1.players.toLocaleString('pt-BR')} players`;
  }

  // Maior Vencedor
  const winTally = {};
  (data.champions || []).forEach(c => {
    if (c.deck && c.deck !== 'Deck não identificado') {
      winTally[c.deck] = (winTally[c.deck] || 0) + 1;
    }
  });
  const bestWinnerDeck = Object.keys(winTally).sort((a, b) => winTally[b] - winTally[a])[0];
  const kpiWinnerEl = document.getElementById('kpiMetaWinnerDeck');
  const kpiWinnerSub = document.getElementById('kpiMetaWinnerDeckSub');
  if (kpiWinnerEl) {
    kpiWinnerEl.textContent = bestWinnerDeck || 'Diversos';
    if (kpiWinnerSub && bestWinnerDeck) {
      kpiWinnerSub.textContent = `${winTally[bestWinnerDeck]} ${winTally[bestWinnerDeck] > 1 ? 'títulos' : 'título'}`;
    }
  }

  // 2. Renderizar Cards dos Top 15 Decks
  const topDecksGrid = document.getElementById('metaTopDecksGrid');
  if (topDecksGrid) {
    let decksHtml = '';
    const escape = typeof escapeHtml === 'function' ? escapeHtml : (s) => s;
    (data.topDecks || []).forEach((deck, idx) => {
      const rank = idx + 1;
      const iconHtml = (deck.icons && deck.icons.length > 0)
        ? deck.icons.map(ic => `<img src="${escape(ic)}" alt="${escape(deck.name)}" class="meta-pkmn-icon" loading="lazy" />`).join('')
        : '<span class="meta-pkmn-fallback">🃏</span>';

      const winBadge = deck.wins > 0
        ? `<span class="meta-deck-wins-badge">🏆 ${deck.wins} ${deck.wins > 1 ? 'títulos' : 'título'}</span>`
        : '';

      const wrBadge = deck.winRate > 0
        ? `<span class="meta-deck-wr-badge ${deck.winRate >= 55 ? 'high' : (deck.winRate < 48 ? 'low' : 'mid')}">${deck.winRate}% WR</span>`
        : '';

      decksHtml += `
        <div class="meta-deck-card rank-${rank}">
          <div class="meta-deck-card-header">
            <span class="meta-rank-tag">#${rank}</span>
            <div class="meta-deck-icons">${iconHtml}</div>
            <div class="meta-deck-info">
              <h4 class="meta-deck-title" title="${escape(deck.name)}">${escape(deck.name)}</h4>
              <span class="meta-deck-players">${deck.players.toLocaleString('pt-BR')} jogadores</span>
            </div>
            <div class="meta-deck-badges-group">
              ${wrBadge}
              <div class="meta-deck-share-badge">${deck.metaShare}%</div>
            </div>
          </div>
          <div class="meta-progress-bar-bg">
            <div class="meta-progress-bar-fill" style="width: ${Math.min(100, deck.metaShare * 3.5)}%"></div>
          </div>
          ${winBadge ? `<div class="meta-deck-card-footer">${winBadge}</div>` : ''}
        </div>
      `;
    });

    // Card de Outros Decks
    if (data.other && data.other.players > 0) {
      decksHtml += `
        <div class="meta-deck-card meta-other-card">
          <div class="meta-deck-card-header">
            <span class="meta-rank-tag other">📦</span>
            <div class="meta-deck-icons"><span class="meta-pkmn-fallback">✨</span></div>
            <div class="meta-deck-info">
              <h4 class="meta-deck-title">Demais Arquétipos (Outros)</h4>
              <span class="meta-deck-players">${data.other.players.toLocaleString('pt-BR')} jogadores combinados</span>
            </div>
            <div class="meta-deck-share-badge other">${data.other.metaShare}%</div>
          </div>
          <div class="meta-progress-bar-bg">
            <div class="meta-progress-bar-fill other" style="width: ${Math.min(100, data.other.metaShare)}%"></div>
          </div>
        </div>
      `;
    }

    topDecksGrid.innerHTML = decksHtml;
  }

  // 3. Renderizar Gráfico de Meta Share (Top 15)
  window.renderMetaShareChart(data);

  // 4. Renderizar Seção de Win Rate por Deck
  window.renderMetaWinRateView(data);

  // 5. Renderizar Matriz de Matchups
  window.renderMatchupsMatrixView(data);

  // 6. Renderizar Pódios dos Campeonatos (Top 3)
  window.renderTournamentsPodiums(data);
};

// ── GRÁFICO 1: META SHARE ───────────────────────────────────────────────────
window.renderMetaShareChart = function(data) {
  const canvas = document.getElementById('chartMetaShareDistribution');
  if (!canvas || typeof Chart === 'undefined' || !data || !data.topDecks) return;

  // Safe Destruction of Existing Chart Instance
  if (typeof Chart.getChart === 'function') {
    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();
  }
  if (window.charts && window.charts['metaShareDistribution']) {
    try { window.charts['metaShareDistribution'].destroy(); } catch (e) {}
    delete window.charts['metaShareDistribution'];
  }
  if (typeof window.destroyChart === 'function') {
    window.destroyChart('metaShareDistribution');
  }

  const labels = data.topDecks.map(d => d.name);
  const shares = data.topDecks.map(d => d.metaShare);

  if (data.other && data.other.metaShare > 0) {
    labels.push('Outros');
    shares.push(data.other.metaShare);
  }

  const colors = [
    '#34e0a1', '#2dd4bf', '#38bdf8', '#60a5fa', '#818cf8',
    '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185',
    '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80',
    '#64748b'
  ];

  if (!window.charts) window.charts = {};

  window.charts['metaShareDistribution'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Meta Share (%)',
        data: shares,
        backgroundColor: colors.slice(0, labels.length),
        borderRadius: 6,
        borderWidth: 0
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
            label: (ctx) => ` Meta Share: ${ctx.parsed.x}%`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          ticks: { color: '#94a3b8', callback: (val) => `${val}%` }
        },
        y: {
          grid: { display: false },
          ticks: {
            color: '#f8fafc',
            font: { family: 'Outfit, sans-serif', weight: '600', size: 11 }
          }
        }
      }
    }
  });
};

// ── GRÁFICO 2: WIN RATE POR DECK ───────────────────────────────────────────
window.renderMetaWinRateView = function(data) {
  const canvas = document.getElementById('chartMetaWinRate');
  const tableContainer = document.getElementById('metaWinRateTableContainer');
  if (!data || !data.topDecks) return;

  const validDecks = data.topDecks.filter(d => (d.winRate !== undefined && d.winRate !== null));
  // Sort decks by Win Rate descending for the Win Rate view
  const sortedByWr = [...validDecks].sort((a, b) => (b.winRate || 0) - (a.winRate || 0));

  if (canvas && typeof Chart !== 'undefined') {
    if (typeof Chart.getChart === 'function') {
      const existing = Chart.getChart(canvas);
      if (existing) existing.destroy();
    }
    if (window.charts && window.charts['metaWinRate']) {
      try { window.charts['metaWinRate'].destroy(); } catch (e) {}
      delete window.charts['metaWinRate'];
    }
    if (typeof window.destroyChart === 'function') {
      window.destroyChart('metaWinRate');
    }

    const wrLabels = sortedByWr.map(d => d.name);
    const wrValues = sortedByWr.map(d => d.winRate || 50.0);
    const wrColors = wrValues.map(wr => {
      if (wr >= 55) return '#34e0a1'; // Neon Emerald
      if (wr >= 50) return '#38bdf8'; // Cyan
      if (wr >= 46) return '#fbbf24'; // Amber
      return '#f43f5e'; // Rose
    });

    window.charts['metaWinRate'] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: wrLabels,
        datasets: [{
          label: 'Win Rate (%)',
          data: wrValues,
          backgroundColor: wrColors,
          borderRadius: 6,
          borderWidth: 0
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
              label: (ctx) => {
                const deck = sortedByWr[ctx.dataIndex];
                const rec = (deck.matchWins || deck.matchLosses)
                  ? ` (${deck.matchWins || 0}V - ${deck.matchLosses || 0}D - ${deck.matchTies || 0}E)`
                  : '';
                return ` Win Rate: ${ctx.parsed.x}%${rec}`;
              }
            }
          }
        },
        scales: {
          x: {
            min: 30,
            max: 70,
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: { color: '#94a3b8', callback: (val) => `${val}%` }
          },
          y: {
            grid: { display: false },
            ticks: {
              color: '#f8fafc',
              font: { family: 'Outfit, sans-serif', weight: '600', size: 11 }
            }
          }
        }
      }
    });
  }

  // Render Table Summary
  if (tableContainer) {
    const escape = typeof escapeHtml === 'function' ? escapeHtml : (s) => s;
    let tableHtml = `
      <div class="meta-table-responsive">
        <table class="meta-wr-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Arquétipo</th>
              <th>Win Rate</th>
              <th>Cartel (V - D - E)</th>
              <th>Partidas</th>
            </tr>
          </thead>
          <tbody>
    `;

    sortedByWr.forEach((d, idx) => {
      const wrClass = (d.winRate >= 55) ? 'high' : (d.winRate < 48 ? 'low' : 'mid');
      const iconHtml = (d.icons && d.icons.length > 0)
        ? `<img src="${escape(d.icons[0])}" class="meta-table-pkmn-icon" loading="lazy" />`
        : '🃏';

      tableHtml += `
        <tr>
          <td class="meta-table-rank">${idx + 1}</td>
          <td class="meta-table-deck">
            <div class="meta-table-deck-flex">
              ${iconHtml}
              <span class="meta-table-deck-name">${escape(d.name)}</span>
            </div>
          </td>
          <td>
            <span class="meta-wr-pill ${wrClass}">${d.winRate}%</span>
          </td>
          <td class="meta-table-record">${d.matchWins || 0}V - ${d.matchLosses || 0}D - ${d.matchTies || 0}E</td>
          <td class="meta-table-total">${d.totalMatches || (d.matchWins + d.matchLosses + d.matchTies) || '—'}</td>
        </tr>
      `;
    });

    tableHtml += `
          </tbody>
        </table>
      </div>
    `;
    tableContainer.innerHTML = tableHtml;
  }
};

// ── SEÇÃO 3: MATRIZ DE MATCHUPS ─────────────────────────────────────────────
window.renderMatchupsMatrixView = function(data) {
  const container = document.getElementById('metaMatchupsMatrixContainer');
  const selectFilter = document.getElementById('metaMatchupHighlightSelect');
  if (!container || !data) return;

  const topDecks = (data.topDecks || []).slice(0, 10); // Focus on Top 10 for clean readable matrix
  const matrix = data.matchupMatrix || {};
  const escape = typeof escapeHtml === 'function' ? escapeHtml : (s) => s;

  // Populate select options if needed
  if (selectFilter) {
    const currentVal = selectFilter.value;
    selectFilter.innerHTML = '<option value="">Todos os Decks (Visão Geral)</option>' +
      topDecks.map(d => `<option value="${escape(d.name)}">${escape(d.name)}</option>`).join('');
    selectFilter.value = currentVal || '';

    if (!selectFilter.dataset.bound) {
      selectFilter.dataset.bound = 'true';
      selectFilter.addEventListener('change', () => {
        window.renderMatchupsMatrixView(data);
      });
    }
  }

  const selectedHighlight = selectFilter ? selectFilter.value : '';

  let matrixHtml = `
    <div class="meta-matrix-scroll">
      <table class="meta-matrix-table">
        <thead>
          <tr>
            <th class="matrix-corner-th">Deck / Matchup</th>
            ${topDecks.map(d => {
              const icon = d.icons && d.icons[0]
                ? `<img src="${escape(d.icons[0])}" class="matrix-th-icon" title="${escape(d.name)}" />`
                : '🃏';
              return `<th class="matrix-col-th ${selectedHighlight === d.name ? 'highlighted-col' : ''}" title="${escape(d.name)}">
                <div class="matrix-th-wrap">${icon}<span>${escape(d.name.split(' ')[0])}</span></div>
              </th>`;
            }).join('')}
          </tr>
        </thead>
        <tbody>
  `;

  topDecks.forEach(rowDeck => {
    const isRowHighlighted = selectedHighlight === rowDeck.name;
    const rowIcon = rowDeck.icons && rowDeck.icons[0]
      ? `<img src="${escape(rowDeck.icons[0])}" class="matrix-row-icon" />`
      : '🃏';

    matrixHtml += `
      <tr class="${isRowHighlighted ? 'highlighted-row' : ''}">
        <td class="matrix-row-header">
          <div class="matrix-row-header-flex">
            ${rowIcon}
            <span class="matrix-deck-name" title="${escape(rowDeck.name)}">${escape(rowDeck.name)}</span>
          </div>
        </td>
    `;

    topDecks.forEach(colDeck => {
      if (rowDeck.name === colDeck.name) {
        matrixHtml += `<td class="matrix-cell cell-mirror" title="Mirror Match">50%</td>`;
        return;
      }

      const matchStats = (matrix[rowDeck.name] && matrix[rowDeck.name][colDeck.name])
        ? matrix[rowDeck.name][colDeck.name]
        : null;

      let cellClass = 'cell-neutral';
      let cellText = '—';
      let tooltipText = `${rowDeck.name} vs ${colDeck.name}: Sem confrontos diretos registrados`;

      if (matchStats && matchStats.total > 0) {
        const wr = matchStats.winRate;
        cellText = `${wr}%`;
        tooltipText = `${rowDeck.name} vs ${colDeck.name}: ${matchStats.wins}V - ${matchStats.losses}D (${wr}% WR em ${matchStats.total} jogos)`;
        if (wr >= 55) cellClass = 'cell-favored';
        else if (wr >= 48) cellClass = 'cell-even';
        else cellClass = 'cell-unfavored';
      } else {
        // Fallback simulation based on individual relative WR if matrix is sparse
        const relWr = Number(((rowDeck.winRate / (rowDeck.winRate + colDeck.winRate)) * 100).toFixed(1)) || 50;
        cellText = `${relWr}%*`;
        tooltipText = `${rowDeck.name} vs ${colDeck.name}: Estimativa baseada no Meta (${relWr}% WR)`;
        if (relWr >= 55) cellClass = 'cell-favored';
        else if (relWr >= 48) cellClass = 'cell-even';
        else cellClass = 'cell-unfavored';
      }

      matrixHtml += `<td class="matrix-cell ${cellClass} ${selectedHighlight === colDeck.name || isRowHighlighted ? 'highlight-focus' : ''}" title="${escape(tooltipText)}">${cellText}</td>`;
    });

    matrixHtml += `</tr>`;
  });

  matrixHtml += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = matrixHtml;
};

// ── SEÇÃO 4: PÓDIOS DOS CAMPEONATOS (TOP 3) ─────────────────────────────────
window.renderTournamentsPodiums = function(data) {
  const container = document.getElementById('metaTournamentsPodiumGrid');
  if (!container || !data) return;

  const tournaments = data.tournaments || [];
  const escape = typeof escapeHtml === 'function' ? escapeHtml : (s) => s;

  if (tournaments.length === 0) {
    container.innerHTML = '<p class="meta-empty-text">Nenhum torneio elegível registrado no período.</p>';
    return;
  }

  let html = '';
  tournaments.forEach(t => {
    const top3 = t.top3 || [];
    
    let top3Html = '';
    if (top3.length > 0) {
      top3.forEach(p => {
        const medal = p.placing === 1 ? '🥇' : (p.placing === 2 ? '🥈' : '🥉');
        const placeClass = p.placing === 1 ? 'first' : (p.placing === 2 ? 'second' : 'third');
        const placeLabel = p.placing === 1 ? '1º Lugar (Campeão)' : (p.placing === 2 ? '2º Lugar (Vice)' : '3º Lugar');

        const iconsHtml = (p.icons && p.icons.length > 0)
          ? p.icons.map(ic => `<img src="${escape(ic)}" alt="${escape(p.deck)}" class="podium-pkmn-icon" loading="lazy" />`).join('')
          : '🃏';

        const decklistBtn = p.decklistUrl
          ? `<a href="${escape(p.decklistUrl)}" target="_blank" rel="noopener noreferrer" class="meta-btn-decklist" title="Ver Decklist">📜 Lista</a>`
          : '<span class="meta-btn-decklist-disabled" title="Lista não informada">📜 Lista</span>';

        top3Html += `
          <div class="meta-podium-row ${placeClass}">
            <div class="meta-podium-badge">${medal} <span class="podium-place-text">${placeLabel}</span></div>
            <div class="meta-podium-player">
              <strong class="podium-player-name">${escape(p.player)}</strong>
            </div>
            <div class="meta-podium-deck">
              <div class="meta-podium-deck-icons">${iconsHtml}</div>
              <span class="podium-deck-name" title="${escape(p.deck)}">${escape(p.deck)}</span>
            </div>
            <div class="meta-podium-action">
              ${decklistBtn}
            </div>
          </div>
        `;
      });
    } else {
      top3Html = '<p class="meta-empty-podium">Classificação detalhada em apuração.</p>';
    }

    html += `
      <div class="meta-tournament-card">
        <div class="meta-tournament-header">
          <div class="meta-tour-info-box">
            <h4 class="meta-tour-title" title="${escape(t.name)}">${escape(t.name)}</h4>
            <div class="meta-tour-meta">
              <span class="meta-tour-org">👤 ${escape(t.organizer || 'Organizador')}</span>
              <span class="meta-tour-players-tag">👥 ${t.players} participantes</span>
            </div>
          </div>
          <a href="${escape(t.url)}" target="_blank" rel="noopener noreferrer" class="meta-btn-limitless" title="Ver torneio completo no Limitless">
            <span>Limitless</span> <i class="fas fa-external-link-alt"></i>
          </a>
        </div>
        <div class="meta-tournament-podium-body">
          ${top3Html}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
};

window.initTournamentsMetaTab = function() {
  const btnRefresh = document.getElementById('btnRefreshTournamentsMeta');
  if (btnRefresh && !btnRefresh.dataset.bound) {
    btnRefresh.dataset.bound = 'true';
    btnRefresh.addEventListener('click', (e) => {
      e.preventDefault();
      window.fetchTournamentsMetaSummary(null, true);
    });
  }

  // Pre-fetch quando a aba de torneios é acionada
  const tabTournamentsNav = document.querySelector('#topNavRouter .nav-link[data-target="tab-tournaments"]');
  if (tabTournamentsNav && !tabTournamentsNav.dataset.metaBound) {
    tabTournamentsNav.dataset.metaBound = 'true';
    tabTournamentsNav.addEventListener('click', () => {
      if (!window.tournamentsMetaData) {
        window.fetchTournamentsMetaSummary();
      } else {
        setTimeout(() => {
          if (window.charts && window.charts['metaShareDistribution']) {
            window.charts['metaShareDistribution'].resize();
          }
          if (window.charts && window.charts['metaWinRate']) {
            window.charts['metaWinRate'].resize();
          }
        }, 60);
      }
    });
  }
};

if (typeof document !== 'undefined') {
  if (document.readyState !== 'loading') {
    window.initTournamentsMetaTab();
  } else {
    document.addEventListener('DOMContentLoaded', window.initTournamentsMetaTab);
  }
}
