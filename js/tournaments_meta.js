// ── JS/TOURNAMENTS_META.JS ──────────────────────────────────────────────────
// Resumo Diário do Meta de Torneios Online (Limitless TCG) — CHG-004

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
    if (kpiTopDeckSub) kpiTopDeckSub.textContent = `${topDeck1.metaShare}% · ${topDeck1.players} players`;
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

  // 2. Renderizar Cards dos Top Decks
  const topDecksGrid = document.getElementById('metaTopDecksGrid');
  if (topDecksGrid) {
    let decksHtml = '';
    (data.topDecks || []).forEach((deck, idx) => {
      const escape = typeof escapeHtml === 'function' ? escapeHtml : (s) => s;
      const rank = idx + 1;
      const iconHtml = (deck.icons && deck.icons.length > 0)
        ? deck.icons.map(ic => `<img src="${escape(ic)}" alt="${escape(deck.name)}" class="meta-pkmn-icon" loading="lazy" />`).join('')
        : '<span class="meta-pkmn-fallback">🃏</span>';

      const winBadge = deck.wins > 0
        ? `<span class="meta-deck-wins-badge">🏆 ${deck.wins} ${deck.wins > 1 ? 'vitórias' : 'vitória'}</span>`
        : '';

      decksHtml += `
        <div class="meta-deck-card rank-${rank}">
          <div class="meta-deck-card-header">
            <span class="meta-rank-tag">#${rank}</span>
            <div class="meta-deck-icons">${iconHtml}</div>
            <div class="meta-deck-info">
              <h4 class="meta-deck-title">${escape(deck.name)}</h4>
              <span class="meta-deck-players">${deck.players.toLocaleString('pt-BR')} jogadores</span>
            </div>
            <div class="meta-deck-share-badge">${deck.metaShare}%</div>
          </div>
          <div class="meta-progress-bar-bg">
            <div class="meta-progress-bar-fill" style="width: ${Math.min(100, deck.metaShare * 3)}%"></div>
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

  // 3. Renderizar Gráfico Chart.js
  window.renderMetaShareChart(data);

  // 4. Renderizar Campeões
  const championsGrid = document.getElementById('metaChampionsGrid');
  if (championsGrid) {
    let champHtml = '';
    const escape = typeof escapeHtml === 'function' ? escapeHtml : (s) => s;

    (data.champions || []).forEach(c => {
      const iconHtml = (c.icons && c.icons.length > 0)
        ? c.icons.map(ic => `<img src="${escape(ic)}" alt="${escape(c.deck)}" class="meta-champ-pkmn-icon" loading="lazy" />`).join('')
        : '🃏';

      const decklistBtn = c.decklistUrl
        ? `<a href="${escape(c.decklistUrl)}" target="_blank" rel="noopener noreferrer" class="meta-btn-decklist" title="Ver Decklist">📜 Decklist</a>`
        : '';

      champHtml += `
        <div class="meta-champ-card">
          <div class="meta-champ-header">
            <div class="meta-champ-trophy">🏆</div>
            <div class="meta-champ-tour-info">
              <h5 class="meta-champ-tour-name" title="${escape(c.tournament)}">${escape(c.tournament)}</h5>
              <span class="meta-champ-tour-players">👥 ${c.players} participantes</span>
            </div>
          </div>
          <div class="meta-champ-body">
            <div class="meta-champ-player-row">
              <span class="meta-champ-label">Campeão:</span>
              <strong class="meta-champ-player-name">${escape(c.player)}</strong>
            </div>
            <div class="meta-champ-deck-row">
              <div class="meta-champ-deck-icon">${iconHtml}</div>
              <div class="meta-champ-deck-text">
                <span class="meta-champ-label">Deck:</span>
                <span class="meta-champ-deck-name">${escape(c.deck)}</span>
              </div>
            </div>
          </div>
          <div class="meta-champ-actions">
            ${decklistBtn}
            <a href="${escape(c.tournamentUrl)}" target="_blank" rel="noopener noreferrer" class="meta-btn-limitless">
              <span>Limitless</span> <i class="fas fa-external-link-alt"></i>
            </a>
          </div>
        </div>
      `;
    });

    championsGrid.innerHTML = champHtml || '<p class="meta-empty-text">Nenhum campeão registrado.</p>';
  }
};

window.renderMetaShareChart = function(data) {
  if (typeof destroyChart === 'function') {
    destroyChart('metaShareDistribution');
  }

  const canvas = document.getElementById('chartMetaShareDistribution');
  if (!canvas || typeof Chart === 'undefined' || !data || !data.topDecks) return;

  const labels = data.topDecks.map(d => d.name);
  const shares = data.topDecks.map(d => d.metaShare);

  if (data.other && data.other.metaShare > 0) {
    labels.push('Outros');
    shares.push(data.other.metaShare);
  }

  const colors = [
    '#34e0a1', '#2dd4bf', '#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#64748b'
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
          ticks: { color: '#f8fafc', font: { family: 'Outfit, sans-serif', weight: '600' } }
        }
      }
    }
  });
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
