// ── JS/MATCHUP.JS ───────────────────────────────────────────────────────────
// Deck vs Deck Matchup Matrix & Detailed Archetype Breakdown

window.buildMatchupData = function(data) {
  const map = {};
  (data || []).forEach(m => {
    const myDeck = typeof getMatchDeck === 'function' ? getMatchDeck(m) : m.Deck;
    const oppDeck = typeof getMatchOppDeck === 'function' ? getMatchOppDeck(m) : m.DeckAdv;

    if (!myDeck || !oppDeck) return;

    if (!map[myDeck]) map[myDeck] = {};
    if (!map[myDeck][oppDeck]) map[myDeck][oppDeck] = { wins: 0, draws: 0, losses: 0, total: 0 };

    const entry = map[myDeck][oppDeck];
    entry.total += 1;
    if (m.Resultado === 'Vitória') entry.wins += 1;
    else if (m.Resultado === 'Empate') entry.draws += 1;
    else if (m.Resultado === 'Derrota') entry.losses += 1;
  });
  return map;
};

window.showDeckMatchupOverview = function(myDeck, mode = 'desc') {
  const container = document.getElementById('matchupDetail');
  if (!container) return;

  const dataset = (window.filtered || []).filter(m => {
    const d = typeof getMatchDeck === 'function' ? getMatchDeck(m) : m.Deck;
    return d === myDeck || m.Arquetipo === myDeck || m.Deck === myDeck;
  });

  if (dataset.length === 0) {
    container.style.display = 'none';
    return;
  }

  const byOpponent = typeof groupBy === 'function' ? groupBy(dataset, m => (typeof getMatchOppDeck === 'function' ? getMatchOppDeck(m) : m.DeckAdv)) : {};

  const oppStats = Object.keys(byOpponent).map(opp => {
    const matches = byOpponent[opp];
    const st = typeof calculateStats === 'function' ? calculateStats(matches) : { wr: 0, total: matches.length };
    return { opp, matches, wr: st.wr, total: st.total };
  });

  oppStats.sort((a, b) => mode === 'desc' ? (b.wr - a.wr || b.total - a.total) : (a.wr - b.wr || a.total - b.total));

  const totalStats = typeof calculateStats === 'function' ? calculateStats(dataset) : { wr: 0, total: dataset.length };

  container.style.display = 'block';
  container.innerHTML = `
    <div style="background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; margin-top: 1rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
        <h3 style="margin:0; font-size:1.1rem; color:var(--accent2);">⚔️ Resumo de Matchups: ${(typeof escapeHtml === "function" ? escapeHtml(myDeck) : myDeck)}</h3>
        <span class="badge ${totalStats.wr >= 50 ? 'res-win' : 'res-loss'}">${totalStats.wr}% WR (${totalStats.total} jogos)</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.6rem;">
        ${oppStats.map(s => `
          <div style="background: var(--bg3); border: 1px solid var(--border); padding: 0.6rem 0.8rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 700; font-size: 0.84rem; color: var(--text);">${s.opp}</div>
              <div style="font-size: 0.72rem; color: var(--text2);">${s.total} partida${s.total > 1 ? 's' : ''}</div>
            </div>
            <span class="badge sm ${s.wr >= 50 ? 'res-win' : 'res-loss'}">${s.wr}%</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

window.renderMatchupMatrix = function() {
  const container = document.getElementById('matchupMatrixContainer');
  if (!container) return;

  const data = window.filtered || [];
  const matrixData = buildMatchupData(data);

  const myDecks = Object.keys(matrixData).sort();
  const oppDecks = Array.from(new Set(data.map(m => typeof getMatchOppDeck === 'function' ? getMatchOppDeck(m) : m.DeckAdv))).sort();

  if (myDecks.length === 0 || oppDecks.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text2); padding:1rem;">Dados insuficientes para a matriz.</div>`;
    return;
  }

  let html = `<div class="matrix-scroll"><table class="matrix-table"><thead><tr><th>Meu Deck \\ Deck Adv</th>`;
  oppDecks.forEach(opp => {
    html += `<th>${opp}</th>`;
  });
  html += `</tr></thead><tbody>`;

  myDecks.forEach(my => {
    html += `<tr><td style="font-weight:700; color:var(--accent2);">${my}</td>`;
    oppDecks.forEach(opp => {
      const cell = matrixData[my] && matrixData[my][opp];
      if (!cell || cell.total === 0) {
        html += `<td style="color:var(--text2); opacity:0.3;">—</td>`;
      } else {
        const wr = Math.round((cell.wins / cell.total) * 100);
        const bg = wr >= 60 ? 'rgba(52,224,161,0.2)' : wr >= 45 ? 'rgba(245,200,66,0.2)' : 'rgba(247,80,80,0.2)';
        html += `<td style="background:${bg}; font-weight:700;">${wr}% <span style="font-size:0.68rem; opacity:0.8;">(${cell.wins}/${cell.total})</span></td>`;
      }
    });
    html += `</tr>`;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
};
