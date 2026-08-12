// ── JS/FILTERS.JS ────────────────────────────────────────────────────────────
// Multi-Select Dropdowns & Global Filters Bar

window.selectedPlayers = new Set();
window.selectedDecks = new Set();

window.populateMultiPlayerFilter = function() {
  const currentPlayers = typeof loadPlayers === 'function' ? loadPlayers() : (window.players || []);
  if (!Array.isArray(currentPlayers)) return;
  window.selectedPlayers = new Set(currentPlayers);
  window.renderMultiPlayerItems(currentPlayers);
  window.updateMultiPlayerBtnText();
};

window.renderMultiPlayerItems = function(playerList) {
  const container = document.getElementById('multiPlayerList');
  if (!container) return;
  container.innerHTML = playerList.map(p => {
    const isChecked = window.selectedPlayers.has(p);
    return `
      <label class="multi-deck-item">
        <input type="checkbox" class="multi-player-checkbox" value="${p}" ${isChecked ? 'checked' : ''} />
        <span class="multi-deck-name">${p}</span>
      </label>
    `;
  }).join('');
};

window.updateMultiPlayerBtnText = function() {
  const textEl = document.getElementById('multiPlayerBtnText');
  const badgeEl = document.getElementById('multiPlayerCountBadge');
  const currentPlayers = typeof loadPlayers === 'function' ? loadPlayers() : (window.players || []);

  if (!textEl || !badgeEl) return;

  const total = currentPlayers.length;
  const selCount = window.selectedPlayers.size;

  if (selCount === total || selCount === 0) {
    textEl.textContent = 'Todos os Players';
    badgeEl.style.display = 'none';
  } else if (selCount === 1) {
    textEl.textContent = Array.from(window.selectedPlayers)[0];
    badgeEl.style.display = 'inline-block';
    badgeEl.textContent = '1';
  } else {
    textEl.textContent = `${selCount} Players Selecionados`;
    badgeEl.style.display = 'inline-block';
    badgeEl.textContent = selCount;
  }
};

window.initMultiPlayerEvents = function() {
  const wrap = document.getElementById('multiPlayerWrap');
  const btn = document.getElementById('multiPlayerBtn');
  const searchInput = document.getElementById('multiPlayerSearch');
  const btnSelectAll = document.getElementById('multiPlayerSelectAll');
  const btnClearAll = document.getElementById('multiPlayerClearAll');
  const listContainer = document.getElementById('multiPlayerList');

  if (!wrap || !btn || !listContainer) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Fechar outros dropdowns
    document.getElementById('multiDeckWrap')?.classList.remove('open');
    document.querySelector('.user-dropdown-menu')?.classList.remove('show-dropdown');
    document.getElementById('mobileMenuBtn')?.classList.remove('is-active');
    document.getElementById('topNavRouter')?.classList.remove('menu-open');

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
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const currentPlayers = typeof loadPlayers === 'function' ? loadPlayers() : (window.players || []);
      const filtered = currentPlayers.filter(p => p.toLowerCase().includes(query));
      window.renderMultiPlayerItems(filtered);
    });
  }

  if (btnSelectAll) {
    btnSelectAll.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentPlayers = typeof loadPlayers === 'function' ? loadPlayers() : (window.players || []);
      window.selectedPlayers = new Set(currentPlayers);
      window.renderMultiPlayerItems(currentPlayers);
      window.updateMultiPlayerBtnText();
      if (typeof applyFilters === 'function') applyFilters();
    });
  }

  if (btnClearAll) {
    btnClearAll.addEventListener('click', (e) => {
      e.stopPropagation();
      window.selectedPlayers.clear();
      const currentPlayers = typeof loadPlayers === 'function' ? loadPlayers() : (window.players || []);
      window.renderMultiPlayerItems(currentPlayers);
      window.updateMultiPlayerBtnText();
      if (typeof applyFilters === 'function') applyFilters();
    });
  }

  listContainer.addEventListener('change', (e) => {
    if (e.target.classList.contains('multi-player-checkbox')) {
      const val = e.target.value;
      if (e.target.checked) window.selectedPlayers.add(val);
      else window.selectedPlayers.delete(val);
      window.updateMultiPlayerBtnText();
      if (typeof applyFilters === 'function') applyFilters();
    }
  });
};

window.populateMultiDeckFilter = function() {
  const currentDecks = typeof loadDecks === 'function' ? loadDecks() : (window.decks || []);
  if (!Array.isArray(currentDecks)) return;
  const deckList = Array.from(new Set(currentDecks.map(d => d.name || d.arquetipo))).sort();
  window.selectedDecks = new Set(deckList);
  window.renderMultiDeckItems(deckList);
  window.updateMultiDeckBtnText();
};

window.renderMultiDeckItems = function(deckList) {
  const container = document.getElementById('multiDeckList');
  if (!container) return;
  container.innerHTML = deckList.map(d => {
    const isChecked = window.selectedDecks.has(d);
    return `
      <label class="multi-deck-item">
        <input type="checkbox" class="multi-deck-checkbox" value="${d}" ${isChecked ? 'checked' : ''} />
        <span class="multi-deck-name">${d}</span>
      </label>
    `;
  }).join('');
};

window.updateMultiDeckBtnText = function() {
  const textEl = document.getElementById('multiDeckBtnText');
  const badgeEl = document.getElementById('multiDeckCountBadge');
  const currentDecks = typeof loadDecks === 'function' ? loadDecks() : (window.decks || []);

  if (!textEl || !badgeEl) return;

  const deckList = Array.from(new Set(currentDecks.map(d => d.name || d.arquetipo)));
  const total = deckList.length;
  const selCount = window.selectedDecks.size;

  if (selCount === total || selCount === 0) {
    textEl.textContent = 'Todos os Decks';
    badgeEl.style.display = 'none';
  } else if (selCount === 1) {
    textEl.textContent = Array.from(window.selectedDecks)[0];
    badgeEl.style.display = 'inline-block';
    badgeEl.textContent = '1';
  } else {
    textEl.textContent = `${selCount} Decks Selecionados`;
    badgeEl.style.display = 'inline-block';
    badgeEl.textContent = selCount;
  }
};

window.initMultiDeckEvents = function() {
  const wrap = document.getElementById('multiDeckWrap');
  const btn = document.getElementById('multiDeckBtn');
  const searchInput = document.getElementById('multiDeckSearch');
  const btnSelectAll = document.getElementById('multiDeckSelectAll');
  const btnClearAll = document.getElementById('multiDeckClearAll');
  const listContainer = document.getElementById('multiDeckList');

  if (!wrap || !btn || !listContainer) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Fechar outros dropdowns
    document.getElementById('multiPlayerWrap')?.classList.remove('open');
    document.querySelector('.user-dropdown-menu')?.classList.remove('show-dropdown');
    document.getElementById('mobileMenuBtn')?.classList.remove('is-active');
    document.getElementById('topNavRouter')?.classList.remove('menu-open');

    wrap.classList.toggle('open');
    if (wrap.classList.contains('open') && searchInput) searchInput.focus();
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) wrap.classList.remove('open');
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const currentDecks = typeof loadDecks === 'function' ? loadDecks() : (window.decks || []);
      const deckList = Array.from(new Set(currentDecks.map(d => d.name || d.arquetipo))).sort();
      const filtered = deckList.filter(d => d.toLowerCase().includes(query));
      window.renderMultiDeckItems(filtered);
    });
  }

  if (btnSelectAll) {
    btnSelectAll.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentDecks = typeof loadDecks === 'function' ? loadDecks() : (window.decks || []);
      const deckList = Array.from(new Set(currentDecks.map(d => d.name || d.arquetipo)));
      window.selectedDecks = new Set(deckList);
      window.renderMultiDeckItems(deckList);
      window.updateMultiDeckBtnText();
      if (typeof applyFilters === 'function') applyFilters();
    });
  }

  if (btnClearAll) {
    btnClearAll.addEventListener('click', (e) => {
      e.stopPropagation();
      window.selectedDecks.clear();
      const currentDecks = typeof loadDecks === 'function' ? loadDecks() : (window.decks || []);
      const deckList = Array.from(new Set(currentDecks.map(d => d.name || d.arquetipo)));
      window.renderMultiDeckItems(deckList);
      window.updateMultiDeckBtnText();
      if (typeof applyFilters === 'function') applyFilters();
    });
  }

  listContainer.addEventListener('change', (e) => {
    if (e.target.classList.contains('multi-deck-checkbox')) {
      const val = e.target.value;
      if (e.target.checked) window.selectedDecks.add(val);
      else window.selectedDecks.delete(val);
      window.updateMultiDeckBtnText();
      if (typeof applyFilters === 'function') applyFilters();
    }
  });
};

window.populateFilters = function() {
  if (typeof populateMultiPlayerFilter === 'function') populateMultiPlayerFilter();
  if (typeof populateMultiDeckFilter === 'function') populateMultiDeckFilter();
  
  const currentLocais = typeof loadLocais === 'function' ? loadLocais() : [];
  const currentColecoes = typeof loadColecoes === 'function' ? loadColecoes() : [];

  const locSel = document.getElementById('filterLocal');
  if (locSel) {
    locSel.innerHTML = '<option value="">Todos os Locais</option>' + 
      currentLocais.map(l => `<option value="${l.toLowerCase()}">${l}</option>`).join('');
  }

  const colSel = document.getElementById('filterColecao');
  if (colSel) {
    colSel.innerHTML = '<option value="">Todas as Coleções</option>' + 
      currentColecoes.map(c => `<option value="${c.toLowerCase()}">${c}</option>`).join('');
  }
};

window.applyFilters = function() {
  if (!Array.isArray(window.allData)) return;

  const formato   = document.getElementById('filterFormato')?.value || '';
  const local     = document.getElementById('filterLocal')?.value || '';
  const colecao   = document.getElementById('filterColecao')?.value || '';
  const dateStart = document.getElementById('filterDateStart')?.value || '';
  const dateEnd   = document.getElementById('filterDateEnd')?.value || '';
  const confAlta  = document.getElementById('filterConfAlta')?.checked ?? true;
  const confBaixa = document.getElementById('filterConfBaixa')?.checked ?? true;

  window.filtered = window.allData.filter(d => {
    const pName = (d.Player || '').trim();
    const matchPlayer = window.selectedPlayers.size === 0 || window.selectedPlayers.has(pName);
    const matchFormato = !formato || (d.Formato || '').toLowerCase() === formato;
    const matchLocal = !local || (d.Local || '').toLowerCase() === local;
    const matchColecao = !colecao || (d.Colecao || '').toLowerCase() === colecao;
    const dName = typeof getMatchDeck === 'function' ? getMatchDeck(d) : d.Deck;
    const matchDeck = window.selectedDecks.size === 0 || window.selectedDecks.has(dName) || window.selectedDecks.has(d.Deck);
    
    const conf = d.Confiabilidade || 'Alta';
    let matchConf = false;
    if (conf === 'Alta' && confAlta) matchConf = true;
    if (conf === 'Baixa' && confBaixa) matchConf = true;

    let matchDate = true;
    if (dateStart && d.Data < dateStart) matchDate = false;
    if (dateEnd && d.Data > dateEnd) matchDate = false;

    return matchPlayer && matchFormato && matchLocal && matchColecao && matchDeck && matchConf && matchDate;
  });

  if (typeof renderAll === 'function') renderAll();
};

window.resetAllFilters = function() {
  const fFormato = document.getElementById('filterFormato');
  const fLocal = document.getElementById('filterLocal');
  const fColecao = document.getElementById('filterColecao');
  const fStart = document.getElementById('filterDateStart');
  const fEnd = document.getElementById('filterDateEnd');
  const fAlta = document.getElementById('filterConfAlta');
  const fBaixa = document.getElementById('filterConfBaixa');

  if (fFormato) fFormato.value = '';
  if (fLocal) fLocal.value = '';
  if (fColecao) fColecao.value = '';
  if (fStart) fStart.value = '';
  if (fEnd) fEnd.value = '';
  if (fAlta) fAlta.checked = true;
  if (fBaixa) fBaixa.checked = true;

  const currentPlayers = typeof loadPlayers === 'function' ? loadPlayers() : (window.players || []);
  const currentDecks = typeof loadDecks === 'function' ? loadDecks() : (window.decks || []);
  const deckList = Array.from(new Set(currentDecks.map(d => d.name || d.arquetipo)));

  window.selectedPlayers = new Set(currentPlayers);
  window.selectedDecks = new Set(deckList);

  window.renderMultiPlayerItems(currentPlayers);
  window.updateMultiPlayerBtnText();
  window.renderMultiDeckItems(deckList);
  window.updateMultiDeckBtnText();

  applyFilters();
};
