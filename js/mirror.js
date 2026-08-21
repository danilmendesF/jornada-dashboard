// ── JS/MIRROR.JS ────────────────────────────────────────────────────────────
// Team Player Mirror Match generation, deduplication & retro-sync (CHG-006.1 - UUIDv4)

function invertPlacar(placar) {
  if (!placar || typeof placar !== 'string' || !placar.includes('-')) return placar;
  const parts = placar.split(/[-:]/);
  if (parts.length !== 2) return placar;
  return `${parts[1].trim()}-${parts[0].trim()}`;
}

function deduplicateMatches(matches) {
  if (!Array.isArray(matches) || matches.length === 0) return matches;

  const primarySignatures = new Map(); // sig -> canonical match
  const idToCanonicalId = new Map();   // duplicateId -> canonicalId
  const uniquePrimary = [];
  const rawMirrors = [];

  const getSig = (m) => {
    const p = String(m.Player || '').trim().toLowerCase();
    const a = String(m.Adversario || '').trim().toLowerCase();
    const d = String(m.Data || '').trim();
    const dk = String(m.Deck || m.Arquetipo || '').trim().toLowerCase();
    const dka = String(m.DeckAdv || m.DeckAdvArquetipo || '').trim().toLowerCase();
    const r = String(m.Resultado || '').trim();
    const pl = String(m.Placar || '').trim();
    return `${p}|${a}|${d}|${dk}|${dka}|${r}|${pl}`;
  };

  matches.forEach(m => {
    if (!m || !m.id) return;
    if (m._mirroredFrom) {
      rawMirrors.push(m);
    } else {
      const sig = getSig(m);
      if (!primarySignatures.has(sig)) {
        primarySignatures.set(sig, m);
        idToCanonicalId.set(String(m.id), m.id);
        uniquePrimary.push(m);
      } else {
        const canonical = primarySignatures.get(sig);
        idToCanonicalId.set(String(m.id), canonical.id);
      }
    }
  });

  // Mirror deduplication
  const mirrorByPrimaryId = new Map(); // primaryId -> mirror match
  rawMirrors.forEach(m => {
    const rootId = String(m._mirroredFrom);
    const canonicalRootId = idToCanonicalId.get(rootId) || rootId;
    
    // Check if canonical primary exists
    const hasPrimary = uniquePrimary.some(p => String(p.id) === canonicalRootId);
    if (!hasPrimary) return; // Prune orphaned mirror

    if (!mirrorByPrimaryId.has(canonicalRootId)) {
      m._mirroredFrom = canonicalRootId;
      mirrorByPrimaryId.set(canonicalRootId, m);
      const parent = uniquePrimary.find(p => String(p.id) === canonicalRootId);
      if (parent) parent._mirrorId = m.id;
    }
  });

  const result = [...uniquePrimary, ...mirrorByPrimaryId.values()];
  if (typeof ensureMatchSequence === 'function') {
    ensureMatchSequence(result);
  }
  return result;
}

function buildMirrorMatch(primaryMatch) {
  if (!primaryMatch || !primaryMatch.Adversario || primaryMatch._mirroredFrom) return null;
  
  const getPlayersFn = (typeof window !== 'undefined' && typeof window.loadPlayers === 'function') ? window.loadPlayers : (typeof loadPlayers === 'function' ? loadPlayers : null);
  const currentPlayers = getPlayersFn ? getPlayersFn() : (typeof window !== 'undefined' ? (window.players || []) : []);
  const advNameLower = primaryMatch.Adversario.trim().toLowerCase();
  
  const isTeamMember = currentPlayers.some(p => p.trim().toLowerCase() === advNameLower);
  if (!isTeamMember) return null;

  if (primaryMatch.Player && primaryMatch.Player.trim().toLowerCase() === advNameLower) {
    return null; // Don't mirror against self
  }

  const teamPlayerName = currentPlayers.find(p => p.trim().toLowerCase() === advNameLower) || primaryMatch.Adversario.trim();

  let mirrorRes = 'Empate';
  let mirrorPontos = 0.5;
  if (primaryMatch.Resultado === 'Vitória') {
    mirrorRes = 'Derrota';
    mirrorPontos = 0;
  } else if (primaryMatch.Resultado === 'Derrota') {
    mirrorRes = 'Vitória';
    mirrorPontos = 1;
  }

  const mirrorPlacar = invertPlacar(primaryMatch.Placar);

  let mirrorGamesDetail = null;
  let mirrorStart = primaryMatch.Start === '1º' ? '2º' : primaryMatch.Start === '2º' ? '1º' : primaryMatch.Start;
  let mirrorBrick = primaryMatch.BrickOp || 'Não';
  let mirrorBrickOp = primaryMatch.Brick || 'Não';

  if (primaryMatch.GamesDetail && Array.isArray(primaryMatch.GamesDetail) && primaryMatch.GamesDetail.length > 0) {
    mirrorGamesDetail = primaryMatch.GamesDetail.map(g => ({
      game: g.game,
      start: g.start === '1º' ? '2º' : g.start === '2º' ? '1º' : g.start,
      brick: g.brickOp || 'Não',
      brickOp: g.brick || 'Não'
    }));
    mirrorStart = mirrorGamesDetail.map(g => g.start).join(', ');
    mirrorBrick = mirrorGamesDetail.some(g => g.brick === 'Sim') ? 'Sim' : 'Não';
    mirrorBrickOp = mirrorGamesDetail.some(g => g.brickOp === 'Sim') ? 'Sim' : 'Não';
  }

  const uuidGen = typeof window !== 'undefined' && window.generateUUID ? window.generateUUID : (typeof generateUUID === 'function' ? generateUUID : () => 'uuid_mirror_' + Date.now());
  const isValidUuidFn = typeof window !== 'undefined' && window.isValidUUID ? window.isValidUUID : (typeof isValidUUID === 'function' ? isValidUUID : null);

  let mirrorId = primaryMatch._mirrorId;
  if (!mirrorId || (isValidUuidFn && !isValidUuidFn(mirrorId))) {
    mirrorId = uuidGen();
  }
  primaryMatch._mirrorId = mirrorId;

  return {
    id:               mirrorId,
    _mirroredFrom:    primaryMatch.id,
    Data:             primaryMatch.Data,
    Player:           teamPlayerName,
    Deck:             primaryMatch.DeckAdv,
    Arquetipo:        primaryMatch.DeckAdvArquetipo || primaryMatch.DeckAdv,
    Subtipo:          primaryMatch.SubtipoAdv || '',
    Adversario:       primaryMatch.Player,
    DeckAdv:          primaryMatch.Deck,
    DeckAdvArquetipo: primaryMatch.Arquetipo || primaryMatch.Deck,
    SubtipoAdv:       primaryMatch.Subtipo || '',
    Luck:             primaryMatch.Luck || 0,
    Formato:          primaryMatch.Formato || 'MD1',
    Start:            mirrorStart,
    Resultado:        mirrorRes,
    Pontos:           mirrorPontos,
    Placar:           mirrorPlacar,
    Local:            primaryMatch.Local || '—',
    Colecao:          primaryMatch.Colecao || '—',
    Brick:            mirrorBrick,
    BrickOp:          mirrorBrickOp,
    Confiabilidade:   primaryMatch.Confiabilidade || 'Alta',
    GamesDetail:      mirrorGamesDetail,
    ListaMeuDeck:     primaryMatch.ListaDeckAdv || '',
    ListaDeckAdv:     primaryMatch.ListaMeuDeck || '',
    Comentarios:      primaryMatch.Comentarios ? `[Espelho vs ${primaryMatch.Player}] ${primaryMatch.Comentarios}` : `Partida interna vs ${primaryMatch.Player}`,
    createdAt:        primaryMatch.createdAt || new Date().toISOString(),
    updatedAt:        primaryMatch.updatedAt || new Date().toISOString(),
    _manual:          true
  };
}

function syncAllTeamMirrorMatches() {
  const getPlayersFn = (typeof window !== 'undefined' && typeof window.loadPlayers === 'function') ? window.loadPlayers : (typeof loadPlayers === 'function' ? loadPlayers : null);
  const currentPlayers = getPlayersFn ? getPlayersFn() : (typeof window !== 'undefined' ? (window.players || []) : []);
  if (!Array.isArray(currentPlayers) || currentPlayers.length === 0) return;

  let manual = typeof loadManual === 'function' ? loadManual() : [];
  let updated = false;

  // Deduplicate before creating mirrors
  const originalLen = manual.length;
  manual = deduplicateMatches(manual);
  if (manual.length !== originalLen) {
    updated = true;
  }

  for (let i = 0; i < manual.length; i++) {
    const m = manual[i];
    if (m._mirroredFrom) continue; // NEVER mirror a mirror!

    const mirror = buildMirrorMatch(m);
    if (!mirror) continue;

    const exists = manual.some(ex => 
      ex.id === mirror.id || 
      ex._mirroredFrom === m.id || 
      m._mirrorId === ex.id ||
      (ex.Player.toLowerCase() === mirror.Player.toLowerCase() &&
       ex.Adversario.toLowerCase() === mirror.Adversario.toLowerCase() &&
       ex.Data === mirror.Data &&
       ex.Deck === mirror.Deck &&
       ex.Resultado === mirror.Resultado)
    );

    if (!exists) {
      m._mirrorId = mirror.id;
      manual.push(mirror);
      updated = true;
    }
  }

  if (updated && typeof saveManual === 'function') {
    saveManual(manual);
  }
}

if (typeof window !== 'undefined') {
  window.invertPlacar = invertPlacar;
  window.deduplicateMatches = deduplicateMatches;
  window.buildMirrorMatch = buildMirrorMatch;
  window.syncAllTeamMirrorMatches = syncAllTeamMirrorMatches;
}
if (typeof globalThis !== 'undefined') {
  globalThis.invertPlacar = invertPlacar;
  globalThis.deduplicateMatches = deduplicateMatches;
  globalThis.buildMirrorMatch = buildMirrorMatch;
  globalThis.syncAllTeamMirrorMatches = syncAllTeamMirrorMatches;
}
