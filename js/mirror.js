// ── JS/MIRROR.JS ────────────────────────────────────────────────────────────
// Team Player Mirror Match generation & retro-sync (CHG-006.1 - UUIDv4)

function invertPlacar(placar) {
  if (!placar || typeof placar !== 'string' || !placar.includes('-')) return placar;
  const parts = placar.split('-');
  if (parts.length !== 2) return placar;
  return `${parts[1].trim()}-${parts[0].trim()}`;
}
window.invertPlacar = invertPlacar;

function buildMirrorMatch(primaryMatch) {
  if (!primaryMatch || !primaryMatch.Adversario) return null;
  
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
  const mirrorId = primaryMatch._mirrorId || uuidGen();
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
window.buildMirrorMatch = buildMirrorMatch;

window.syncAllTeamMirrorMatches = function() {
  const getPlayersFn = (typeof window !== 'undefined' && typeof window.loadPlayers === 'function') ? window.loadPlayers : (typeof loadPlayers === 'function' ? loadPlayers : null);
  const currentPlayers = getPlayersFn ? getPlayersFn() : (typeof window !== 'undefined' ? (window.players || []) : []);
  if (!Array.isArray(currentPlayers) || currentPlayers.length === 0) return;

  let manual = typeof loadManual === 'function' ? loadManual() : [];
  let updated = false;

  for (let i = 0; i < manual.length; i++) {
    const m = manual[i];
    if (m._mirroredFrom) continue; // Don't mirror mirrors

    const mirror = buildMirrorMatch(m);
    if (!mirror) continue;

    const exists = manual.some(ex => 
      ex.id === mirror.id || 
      ex._mirroredFrom === m.id || 
      m._mirrorId === ex.id ||
      (ex.Player.toLowerCase() === mirror.Player.toLowerCase() &&
       ex.Adversario.toLowerCase() === mirror.Adversario.toLowerCase() &&
       ex.Data === mirror.Data &&
       ex.Deck === mirror.Deck)
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
};
