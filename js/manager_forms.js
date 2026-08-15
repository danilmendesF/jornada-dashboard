// ── JS/MANAGER_FORMS.JS ──────────────────────────────────────────────────────
// Modals, Match & Deck CRUD, Archetypes Unification

window.editingMatchId = null;

window.showModal = function(id) {
  const el = document.getElementById(id);
  if (el) {
    el.style.display = 'flex';
    el.classList.add('open');
  }
};

window.closeModal = function(id) {
  const el = document.getElementById(id);
  if (el) {
    el.style.display = 'none';
    el.classList.remove('open');
  }
};

window.openMatchForm = function(matchData = null) {
  if (typeof populatePlayerSelects === 'function') populatePlayerSelects();

  const title = document.getElementById('modalMatchFormTitle');
  if (title) title.textContent = matchData ? '✏️ Editar Partida' : '⚔️ Registrar Partida';

  window.editingMatchId = matchData?.id || null;

  const getVal = (id) => document.getElementById(id)?.value || '';
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val ?? '';
  };

  const currentUserObj = typeof getCurrentUser === 'function' ? getCurrentUser() : window.currentUser;
  const activeName = (typeof getActivePlayerName === 'function' ? getActivePlayerName() : null) || currentUserObj?.linkedPlayer || currentUserObj?.name || '';
  const playerName = matchData?.Player || activeName;
  const today = new Date().toISOString().slice(0, 10);

  const dataInput = document.getElementById('formMatchData');
  if (dataInput) {
    dataInput.max = today;
    dataInput.value = matchData?.Data || today;
  }

  setVal('formMatchPlayer', playerName);
  const pDisplay = document.getElementById('formMatchPlayerDisplay');
  if (pDisplay) pDisplay.textContent = playerName ? `${playerName}` : 'Treinador não identificado';

  const dlAdv = document.getElementById('playerOptionsAdv');
  if (dlAdv && typeof players !== 'undefined') {
    dlAdv.innerHTML = '';
    (players || []).filter(p => !playerName || p.trim().toLowerCase() !== playerName.trim().toLowerCase()).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      dlAdv.appendChild(opt);
    });
  }

  setVal('formMatchAdv', matchData?.Adversario || '');
  setVal('formMatchDeckAdv', matchData?.DeckAdvArquetipo || matchData?.DeckAdv || '');
  setVal('formMatchSubtipoAdv', matchData?.SubtipoAdv || '');
  setVal('formMatchFormato', matchData?.Formato || 'MD1');
  setVal('formMatchStart', matchData?.Start || '1º');
  setVal('formMatchResultado', matchData?.Resultado || 'Vitória');
  setVal('formMatchComentarios', matchData?.Comentarios || '');

  if (typeof updatePlacarDropdown === 'function') {
    updatePlacarDropdown('formMatchFormato', 'formMatchPlacar', matchData?.Placar);
  }

  setVal('formMatchColecao', matchData?.Colecao || '');
  setVal('formMatchLocal', matchData?.Local || 'TCG Live');
  setVal('formMatchDeck', matchData?.Arquetipo || matchData?.Deck || '');
  setVal('formMatchSubtipo', matchData?.Subtipo || '');
  setVal('formMatchDeckOwnList', matchData?.ListaMeuDeck || '');
  setVal('formMatchDeckAdvList', matchData?.ListaDeckAdv || '');

  if (typeof renderMD3GamesUI === 'function') {
    renderMD3GamesUI(matchData?.GamesDetail);
  }

  showModal('modalMatchForm');
};

window.saveMatchForm = function() {
  const getVal = (id) => document.getElementById(id)?.value?.trim() || '';

  const player = getVal('formMatchPlayer') || (typeof getActivePlayerName === 'function' ? getActivePlayerName() : '') || '';
  const deckArquetipo = getVal('formMatchDeck');
  const deckSubtipo = getVal('formMatchSubtipo');
  const deckAdvArquetipo = getVal('formMatchDeckAdv');
  const deckAdvSubtipo = getVal('formMatchSubtipoAdv');
  const colecao = getVal('formMatchColecao');
  const dataStr = getVal('formMatchData') || new Date().toISOString().slice(0, 10);
  const adversario = getVal('formMatchAdv');

  const today = new Date().toISOString().slice(0, 10);
  if (dataStr > today) {
    if (typeof showToast === 'function') showToast('⚠️ A data da partida não pode ser futura!');
    return;
  }
  if (!player || !deckArquetipo || !deckAdvArquetipo || !colecao) {
    if (typeof showToast === 'function') showToast('⚠️ Preencha Meu Deck, Deck Adv e Coleção!');
    return;
  }
  if (adversario && player && adversario.trim().toLowerCase() === player.trim().toLowerCase()) {
    if (typeof showToast === 'function') showToast('⚠️ O adversário não pode ser você mesmo!');
    return;
  }

  const formato = getVal('formMatchFormato') || 'MD1';
  const placar = getVal('formMatchPlacar') || '1-0';
  const resultado = getVal('formMatchResultado') || 'Vitória';
  const local = getVal('formMatchLocal') || 'TCG Live';

  const ownDeckName = deckSubtipo ? `${deckArquetipo} (${deckSubtipo})` : deckArquetipo;
  const advDeckName = deckAdvSubtipo ? `${deckAdvArquetipo} (${deckAdvSubtipo})` : deckAdvArquetipo;

  let gamesDetail = null;
  let derivedStart = getVal('formMatchStart') || '1º';
  let derivedBrick = 'Não';
  let derivedBrickOp = 'Não';

  if (formato === 'MD3') {
    const count = typeof getGameCountFromPlacar === 'function' ? getGameCountFromPlacar('MD3', placar) : 2;
    gamesDetail = [];
    for (let i = 1; i <= count; i++) {
      const st = document.getElementById(`md3GameStart_${i}`)?.value || (i % 2 === 1 ? '1º' : '2º');
      const br = document.getElementById(`md3GameBrick_${i}`)?.value || 'Não';
      const bo = document.getElementById(`md3GameBrickOp_${i}`)?.value || 'Não';
      gamesDetail.push({ game: i, start: st, brick: br, brickOp: bo });
    }
    derivedStart = gamesDetail.map(g => g.start).join(', ');
    derivedBrick = gamesDetail.some(g => g.brick === 'Sim') ? 'Sim' : 'Não';
    derivedBrickOp = gamesDetail.some(g => g.brickOp === 'Sim') ? 'Sim' : 'Não';
  }

  const matchData = {
    id:               window.editingMatchId || (Date.now().toString() + Math.random().toString(36).substr(2, 4)),
    Data:             dataStr,
    Player:           player,
    Deck:             ownDeckName,
    Arquetipo:        deckArquetipo,
    Subtipo:          deckSubtipo,
    Adversario:       getVal('formMatchAdv'),
    DeckAdv:          advDeckName,
    DeckAdvArquetipo: deckAdvArquetipo,
    SubtipoAdv:       deckAdvSubtipo,
    Luck:             0,
    Formato:          formato,
    Start:            derivedStart,
    Resultado:        resultado,
    Pontos:           resultado === 'Vitória' ? 1 : resultado === 'Empate' ? 0.5 : 0,
    Placar:           placar,
    Local:            local,
    Colecao:          colecao,
    Brick:            derivedBrick,
    BrickOp:          derivedBrickOp,
    Confiabilidade:   'Alta',
    GamesDetail:      gamesDetail,
    ListaMeuDeck:     getVal('formMatchDeckOwnList'),
    ListaDeckAdv:     getVal('formMatchDeckAdvList'),
    Comentarios:      getVal('formMatchComentarios'),
    _manual:          true
  };

  let manual = typeof loadManual === 'function' ? loadManual() : [];
  if (window.editingMatchId) {
    manual = manual.filter(m => m.id !== window.editingMatchId && m._mirroredFrom !== window.editingMatchId);
  }

  manual.push(matchData);

  let mirrorMatch = null;
  if (typeof buildMirrorMatch === 'function') {
    mirrorMatch = buildMirrorMatch(matchData);
    if (mirrorMatch) {
      matchData._mirrorId = mirrorMatch.id;
      manual.push(mirrorMatch);
    }
  }

  if (typeof saveManual === 'function') saveManual(manual);

  if (typeof window.allData !== 'undefined') {
    window.allData = typeof applyDataOverrides === 'function' ? applyDataOverrides(manual) : [...manual];
    window.filtered = [...window.allData];
    if (typeof applyFilters === 'function') applyFilters();
  }

  closeModal('modalMatchForm');
  window.editingMatchId = null;

  if (typeof showToast === 'function') {
    showToast(`✅ Partida salva com sucesso!`);
  }
};

window.deleteMatch = function(matchId) {
  let manual = typeof loadManual === 'function' ? loadManual() : [];
  const target = manual.find(m => m.id === matchId);

  const currentUserObj = typeof getCurrentUser === 'function' ? getCurrentUser() : window.currentUser;
  const currentName = currentUserObj?.linkedPlayer || currentUserObj?.name || '';

  if (target && currentName && target.Player.trim().toLowerCase() !== currentName.trim().toLowerCase()) {
    if (typeof showToast === 'function') showToast('⚠️ Você só possui permissão para apagar suas próprias partidas!');
    return;
  }

  if (!confirm('Tem certeza que deseja deletar esta partida?')) return;
  const mirrorId = target?._mirrorId || target?._mirroredFrom;

  manual = manual.filter(m => m.id !== matchId && m.id !== mirrorId && m._mirroredFrom !== matchId);
  if (typeof saveManual === 'function') saveManual(manual);

  const deleted = typeof loadDeleted === 'function' ? loadDeleted() : new Set();
  deleted.add(matchId);
  if (mirrorId) deleted.add(mirrorId);
  if (typeof saveDeleted === 'function') saveDeleted(deleted);

  if (typeof window.allData !== 'undefined') {
    window.allData = window.allData.filter(m => m.id !== matchId && m.id !== mirrorId && m._mirroredFrom !== matchId);
    window.filtered = [...window.allData];
    if (typeof applyFilters === 'function') applyFilters();
  }

  if (typeof showToast === 'function') showToast('🗑️ Partida deletada.');
};

window.openUnifyArchetypesModal = function() {
  const fromSel = document.getElementById('unifyFromDeckSelect');
  if (fromSel && typeof loadDecks === 'function') {
    const decks = loadDecks();
    const uniqueArchetypes = Array.from(new Set(decks.map(d => d.arquetipo || d.name))).sort();
    fromSel.innerHTML = uniqueArchetypes.map(a => `<option value="${(typeof escapeHtml === 'function' ? escapeHtml(a) : a)}">${(typeof escapeHtml === 'function' ? escapeHtml(a) : a)}</option>`).join('');
  }
  showModal('modalUnifyArchetypes');
};

window.submitUnifyArchetypes = function() {
  const fromDeck = document.getElementById('unifyFromDeckSelect')?.value;
  const targetArquetipo = document.getElementById('unifyTargetArchetypeInput')?.value?.trim();

  if (!fromDeck || !targetArquetipo) {
    if (typeof showToast === 'function') showToast('⚠️ Selecione o deck de origem e digite o arquétipo de destino!');
    return;
  }

  if (!confirm(`Confirmar unificação de todos os registros de "${fromDeck}" para o arquétipo "${targetArquetipo}"?`)) return;

  let manual = typeof loadManual === 'function' ? loadManual() : [];
  manual.forEach(m => {
    if (m.Arquetipo === fromDeck || m.Deck === fromDeck) {
      m.Arquetipo = targetArquetipo;
      m.Deck = m.Subtipo ? `${targetArquetipo} (${m.Subtipo})` : targetArquetipo;
    }
    if (m.DeckAdvArquetipo === fromDeck || m.DeckAdv === fromDeck) {
      m.DeckAdvArquetipo = targetArquetipo;
      m.DeckAdv = m.SubtipoAdv ? `${targetArquetipo} (${m.SubtipoAdv})` : targetArquetipo;
    }
  });
  if (typeof saveManual === 'function') saveManual(manual);

  const delDecks = typeof loadDeletedDecks === 'function' ? loadDeletedDecks() : new Set();
  delDecks.add(fromDeck);

  let decks = typeof loadDecks === 'function' ? loadDecks() : [];
  decks.forEach(d => {
    if (d.arquetipo === fromDeck || d.name === fromDeck) {
      if (d.name) delDecks.add(d.name); // <--- Adicionar o nome antigo completo à lixeira
      d.arquetipo = targetArquetipo;
      d.name = d.subtipo ? `${targetArquetipo} (${d.subtipo})` : targetArquetipo;
    }
  });
  if (typeof saveDecks === 'function') saveDecks(decks);
  if (typeof saveDeletedDecks === 'function') saveDeletedDecks(delDecks);

  if (typeof window.allData !== 'undefined') {
    window.allData = typeof applyDataOverrides === 'function' ? applyDataOverrides(manual) : [...manual];
    window.filtered = [...window.allData];
    if (typeof populateFilters === 'function') populateFilters();
    if (typeof applyFilters === 'function') applyFilters();
  }

  // if (typeof closeModal === 'function') closeModal('modalUnifyArchetypes');
  document.getElementById('unifyTargetArchetypeInput').value = '';
  
  const fromSel = document.getElementById('unifyFromDeckSelect');
  if (fromSel) {
    const uniqueArchetypes = Array.from(new Set(decks.map(d => d.arquetipo || d.name))).sort();
    fromSel.innerHTML = '<option value="">Selecione o deck para unificar…</option>' + uniqueArchetypes.map(a => `<option value="${a}">${a}</option>`).join('');
  }

  if (typeof showToast === 'function') showToast(`✅ Unificação concluída! "${fromDeck}" movido.`);
};
