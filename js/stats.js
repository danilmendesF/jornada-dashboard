// ── JS/STATS.JS ─────────────────────────────────────────────────────────────
// Mathematical & Statistical Engine

window.pct = function(n, d) {
  return d === 0 ? 0 : Math.round((n / d) * 100);
};

window.avg = function(arr) {
  return arr.length === 0 ? 0 : (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
};

window.getMatchDeck = function(d) {
  if (!d) return 'Desconhecido';
  if (d.Arquetipo) return d.Subtipo ? `${d.Arquetipo} (${d.Subtipo})` : d.Arquetipo;
  return d.Deck || 'Desconhecido';
};

window.getMatchOppDeck = function(d) {
  if (!d) return 'Desconhecido';
  if (d.DeckAdvArquetipo) return d.SubtipoAdv ? `${d.DeckAdvArquetipo} (${d.SubtipoAdv})` : d.DeckAdvArquetipo;
  return d.DeckAdv || 'Desconhecido';
};

window.groupBy = function(data, keyOrFn) {
  const fn = typeof keyOrFn === 'function' ? keyOrFn : item => item[keyOrFn];
  return data.reduce((acc, item) => {
    const key = fn(item) ?? 'Outros';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
};

window.isBricked = function(r) {
  if (!r) return false;
  if (r.GamesDetail && Array.isArray(r.GamesDetail) && r.GamesDetail.length > 0) {
    return r.GamesDetail.some(g => g.brick === 'Sim');
  }
  return r.Brick === 'Sim' || (r.Brick && r.Brick !== 'Nenhum' && r.Brick !== 'Não');
};

window.calculateStats = function(matches) {
  if (!Array.isArray(matches) || matches.length === 0) {
    return { wins: 0, draws: 0, losses: 0, total: 0, wr: 0, brickWins: 0, totalBricks: 0, totalGamesCount: 0, totalGameBricksCount: 0 };
  }

  const total  = matches.length;
  const wins   = matches.filter(m => m.Resultado === 'Vitória').length;
  const draws  = matches.filter(m => m.Resultado === 'Empate').length;
  const losses = matches.filter(m => m.Resultado === 'Derrota').length;
  const wr     = pct(wins, total);

  const brickMatches = matches.filter(m => isBricked(m));
  const brickWins    = brickMatches.filter(m => m.Resultado === 'Vitória').length;

  let totalGamesCount = 0;
  let totalGameBricksCount = 0;

  matches.forEach(m => {
    if (m.GamesDetail && Array.isArray(m.GamesDetail) && m.GamesDetail.length > 0) {
      totalGamesCount += m.GamesDetail.length;
      totalGameBricksCount += m.GamesDetail.filter(g => g.brick === 'Sim').length;
    } else {
      totalGamesCount += 1;
      if (isBricked(m)) totalGameBricksCount += 1;
    }
  });

  return {
    wins,
    draws,
    losses,
    total,
    wr,
    brickWins,
    totalBricks: brickMatches.length,
    totalGamesCount,
    totalGameBricksCount
  };
};
