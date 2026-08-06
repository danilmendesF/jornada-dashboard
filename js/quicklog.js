// ── JS/QUICKLOG.JS ──────────────────────────────────────────────────────────
// Mobile Quick Log Touch-Pill controls

window.quickLogPillState = {};

window.renderQuickLogTouchPills = function() {
  const formato = document.getElementById('quickLogFormato')?.value || 'MD1';
  const placar = document.getElementById('quickLogPlacar')?.value || '1-0';
  const grid = document.getElementById('quickLogPillGrid');
  const countLabel = document.getElementById('quickLogGamesCountLabel');
  const startSelectGroup = document.getElementById('quickLogStartGroup');

  if (!grid) return;

  if (startSelectGroup) {
    startSelectGroup.style.display = formato === 'MD3' ? 'none' : 'block';
  }

  const gameCount = typeof getGameCountFromPlacar === 'function' ? getGameCountFromPlacar(formato, placar) : (formato === 'MD3' ? 2 : 1);
  if (countLabel) {
    countLabel.textContent = formato === 'MD3' ? `(${gameCount} Game${gameCount > 1 ? 's' : ''})` : `(MD1 - 1 Game)`;
  }

  grid.innerHTML = '';
  for (let i = 1; i <= gameCount; i++) {
    if (!window.quickLogPillState[i]) {
      window.quickLogPillState[i] = {
        start: i % 2 === 1 ? '1º' : '2º',
        brick: 'Não',
        brickOp: 'Não'
      };
    }

    const st = window.quickLogPillState[i];
    const row = document.createElement('div');
    row.className = 'pill-game-row';
    row.innerHTML = `
      <div class="pill-game-header">
        <span>🎮 Game ${i}</span>
      </div>
      <div class="pill-btn-group">
        <button type="button" class="pill-btn ${st.start === '1º' ? 'active-start' : ''}" onclick="toggleQuickLogPill(${i}, 'start')">
          🎲 ${st.start === '1º' ? '1º a Jogar' : '2º a Jogar'}
        </button>
        <button type="button" class="pill-btn ${st.brick === 'Sim' ? 'active-brick' : ''}" onclick="toggleQuickLogPill(${i}, 'brick')">
          💥 Meu: ${st.brick === 'Sim' ? 'Brick' : 'OK'}
        </button>
        <button type="button" class="pill-btn ${st.brickOp === 'Sim' ? 'active-brick' : ''}" onclick="toggleQuickLogPill(${i}, 'brickOp')">
          💥 Opp: ${st.brickOp === 'Sim' ? 'Brick' : 'OK'}
        </button>
      </div>
    `;
    grid.appendChild(row);
  }
};

window.toggleQuickLogPill = function(gameNum, field) {
  if (!window.quickLogPillState[gameNum]) return;
  const current = window.quickLogPillState[gameNum][field];

  if (field === 'start') {
    window.quickLogPillState[gameNum].start = current === '1º' ? '2º' : '1º';
  } else if (field === 'brick') {
    window.quickLogPillState[gameNum].brick = current === 'Sim' ? 'Não' : 'Sim';
  } else if (field === 'brickOp') {
    window.quickLogPillState[gameNum].brickOp = current === 'Sim' ? 'Não' : 'Sim';
  }

  renderQuickLogTouchPills();
};

window.quickLogMatch = function(resultado) {
  const player   = document.getElementById('quickLogPlayer')?.value;
  const deckName = document.getElementById('quickLogDeck')?.value;
  const advName  = document.getElementById('quickLogAdvName')?.value.trim();
  const deckAdv  = document.getElementById('quickLogDeckAdv')?.value;
  const formato  = document.getElementById('quickLogFormato')?.value || 'MD1';
  const colecao  = document.getElementById('quickLogColecao')?.value;
  const local    = document.getElementById('quickLogLocal')?.value || 'TCG Live';
  const start    = document.getElementById('quickLogStart')?.value || '1º';
  const conf     = document.getElementById('quickLogConfiabilidade')?.value || 'Alta';

  if (typeof updatePlacarDropdown === 'function') {
    updatePlacarDropdown('quickLogFormato', 'quickLogPlacar', null, resultado);
  }
  const placar = document.getElementById('quickLogPlacar')?.value || (resultado === 'Vitória' ? '1-0' : resultado === 'Empate' ? '0-0' : '0-1');

  if (!player || !deckName || !advName || !deckAdv || !colecao) {
    if (typeof showToast === 'function') showToast('⚠️ Preencha Player, Meu Deck, Oponente, Deck Adv e Coleção!');
    return;
  }

  let gamesDetail = null;
  let derivedStart = start;
  let derivedBrick = 'Não';
  let derivedBrickOp = 'Não';

  if (formato === 'MD3') {
    const count = typeof getGameCountFromPlacar === 'function' ? getGameCountFromPlacar('MD3', placar) : 2;
    gamesDetail = [];
    for (let i = 1; i <= count; i++) {
      const st = window.quickLogPillState[i] || { start: i % 2 === 1 ? '1º' : '2º', brick: 'Não', brickOp: 'Não' };
      gamesDetail.push({
        game: i,
        start: st.start,
        brick: st.brick,
        brickOp: st.brickOp
      });
    }
    derivedStart = gamesDetail.map(g => g.start).join(', ');
    derivedBrick = gamesDetail.some(g => g.brick === 'Sim') ? 'Sim' : 'Não';
    derivedBrickOp = gamesDetail.some(g => g.brickOp === 'Sim') ? 'Sim' : 'Não';
  }

  const allDecks = typeof loadDecks === 'function' ? loadDecks() : [];
  const ownDeckObj = allDecks.find(d => d.name === deckName || d.arquetipo === deckName);
  const advDeckObj = allDecks.find(d => d.name === deckAdv || d.arquetipo === deckAdv);

  const matchData = {
    id:             Date.now().toString() + Math.random().toString(36).substr(2, 4),
    Data:           new Date().toISOString().slice(0, 10),
    Player:         player,
    Deck:           deckName,
    Arquetipo:      ownDeckObj?.arquetipo || deckName,
    Subtipo:        ownDeckObj?.subtipo || '',
    Adversario:     advName,
    DeckAdv:        deckAdv,
    DeckAdvArquetipo: advDeckObj?.arquetipo || deckAdv,
    SubtipoAdv:     advDeckObj?.subtipo || '',
    Luck:           0,
    Formato:        formato,
    Start:          derivedStart,
    Resultado:      resultado,
    Pontos:         resultado === 'Vitória' ? 1 : resultado === 'Empate' ? 0.5 : 0,
    Placar:         placar,
    Local:          local,
    Colecao:        colecao,
    Brick:          derivedBrick,
    BrickOp:        derivedBrickOp,
    Confiabilidade: conf,
    GamesDetail:    gamesDetail,
    Comentarios:    'Registrado via Quick Log (Mobile)',
    _manual:        true
  };

  const currentManual = typeof loadManual === 'function' ? loadManual() : [];
  currentManual.push(matchData);

  let mirrorMatch = null;
  if (typeof buildMirrorMatch === 'function') {
    mirrorMatch = buildMirrorMatch(matchData);
    if (mirrorMatch) {
      matchData._mirrorId = mirrorMatch.id;
      currentManual.push(mirrorMatch);
    }
  }

  if (typeof saveManual === 'function') saveManual(currentManual);

  if (typeof window.allData !== 'undefined') {
    window.allData.push(matchData);
    if (mirrorMatch) window.allData.push(mirrorMatch);
    window.filtered = [...window.allData];
    if (typeof applyFilters === 'function') applyFilters();
  }

  const advInput = document.getElementById('quickLogAdvName');
  if (advInput) advInput.value = '';

  window.quickLogPillState = {};
  renderQuickLogTouchPills();

  if (typeof showToast === 'function') {
    showToast(`⚡ Partida vs ${advName} registrada via Quick Log!`);
  }
};

window.populateQuickLogDropdowns = function() {
  const pSel = document.getElementById('quickLogPlayer');
  if (pSel) {
    const activeName = typeof getActivePlayerName === 'function' ? getActivePlayerName() : null;

    if (activeName) {
      // Authenticated user: RESTRICT dropdown exclusively to the single logged-in player
      pSel.innerHTML = `<option value="${activeName}">👤 ${activeName}</option>`;
      pSel.value = activeName;
      pSel.selectedIndex = 0;
    } else {
      // Unauthenticated instruction
      pSel.innerHTML = `<option value="">🔑 Faça Login para Registrar Partida</option>`;
    }
  }

  if (typeof populateLocalSelects === 'function') populateLocalSelects();
  if (typeof populateColecaoSelects === 'function') populateColecaoSelects();
  if (typeof updatePlacarDropdown === 'function') {
    updatePlacarDropdown('quickLogFormato', 'quickLogPlacar');
    updatePlacarDropdown('formMatchFormato', 'formMatchPlacar');
  }

  if (typeof renderQuickLogTouchPills === 'function') renderQuickLogTouchPills();

  const fmtSel = document.getElementById('quickLogFormato');
  const plcSel = document.getElementById('quickLogPlacar');
  if (fmtSel) {
    fmtSel.addEventListener('change', () => {
      if (typeof updatePlacarDropdown === 'function') updatePlacarDropdown('quickLogFormato', 'quickLogPlacar');
      renderQuickLogTouchPills();
    });
  }
  if (plcSel) {
    plcSel.addEventListener('change', () => renderQuickLogTouchPills());
  }
};
