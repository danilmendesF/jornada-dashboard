// ── JS/MD3.JS ───────────────────────────────────────────────────────────────
// MD3 format rules & dynamic game card UI

window.getGameCountFromPlacar = function(formato, placar, userOverriddenCount = null) {
  if (formato !== 'MD3') return 1;
  const cleanPlacar = (placar || '').trim();

  if (userOverriddenCount) {
    if ((cleanPlacar === '1-0' || cleanPlacar === '0-1') && (userOverriddenCount === 1 || userOverriddenCount === 2)) {
      return userOverriddenCount;
    }
    if (cleanPlacar === '1-1' && (userOverriddenCount === 2 || userOverriddenCount === 3)) {
      return userOverriddenCount;
    }
  }

  if (cleanPlacar === '0-0') return 1;
  if (cleanPlacar === '1-0' || cleanPlacar === '0-1') return 1;
  if (cleanPlacar === '1-1') return 2;
  if (cleanPlacar === '2-0' || cleanPlacar === '0-2') return 2;
  if (cleanPlacar === '2-1' || cleanPlacar === '1-2') return 3;

  return 2;
};

window.renderMD3GamesUI = function(existingGamesDetail = null, userCountOverride = null) {
  const formato = document.getElementById('formMatchFormato')?.value || 'MD1';
  const placar = document.getElementById('formMatchPlacar')?.value || '';
  const container = document.getElementById('md3GamesSection');
  const grid = document.getElementById('md3GamesGrid');
  const toggleWrap = document.getElementById('md3GamesToggleWrap');
  const singleStartGroup = document.getElementById('formMatchStart')?.parentElement;
  const singleBrickGroup = document.getElementById('singleMatchBrickGroup');
  const singleBrickOpGroup = document.getElementById('singleMatchBrickOpGroup');

  if (!container || !grid) return;

  if (formato !== 'MD3') {
    container.style.display = 'none';
    if (singleStartGroup) singleStartGroup.style.display = '';
    if (singleBrickGroup) singleBrickGroup.style.display = '';
    if (singleBrickOpGroup) singleBrickOpGroup.style.display = '';
    return;
  }

  container.style.display = 'block';
  if (singleStartGroup) singleStartGroup.style.display = 'none';
  if (singleBrickGroup) singleBrickGroup.style.display = 'none';
  if (singleBrickOpGroup) singleBrickOpGroup.style.display = 'none';

  let count = userCountOverride || (existingGamesDetail && existingGamesDetail.length ? existingGamesDetail.length : getGameCountFromPlacar('MD3', placar));
  window._activeMD3GameCount = count;

  if (toggleWrap) {
    const cleanPlacar = (placar || '').trim();
    if (cleanPlacar === '1-0' || cleanPlacar === '0-1') {
      toggleWrap.style.display = 'block';
      toggleWrap.innerHTML = `
        <label class="form-label" style="font-size:0.75rem; color:var(--text2); margin-bottom:0.3rem;">🎮 Quantidade de Games Jogados:</label>
        <div style="display:flex; gap:0.4rem;">
          <button type="button" class="pill-btn ${count === 1 ? 'active-start' : ''}" style="flex:1;" onclick="renderMD3GamesUI(null, 1)">1 Game (Placar Normal)</button>
          <button type="button" class="pill-btn ${count === 2 ? 'active-start' : ''}" style="flex:1;" onclick="renderMD3GamesUI(null, 2)">2 Games (Game 2 não finalizou)</button>
        </div>
      `;
    } else if (cleanPlacar === '1-1') {
      toggleWrap.style.display = 'block';
      toggleWrap.innerHTML = `
        <label class="form-label" style="font-size:0.75rem; color:var(--text2); margin-bottom:0.3rem;">🎮 Quantidade de Games Jogados:</label>
        <div style="display:flex; gap:0.4rem;">
          <button type="button" class="pill-btn ${count === 2 ? 'active-start' : ''}" style="flex:1;" onclick="renderMD3GamesUI(null, 2)">2 Games (Empate nos 2 games)</button>
          <button type="button" class="pill-btn ${count === 3 ? 'active-start' : ''}" style="flex:1;" onclick="renderMD3GamesUI(null, 3)">3 Games (Game 3 não finalizou)</button>
        </div>
      `;
    } else {
      toggleWrap.style.display = 'none';
      toggleWrap.innerHTML = '';
    }
  }

  grid.innerHTML = '';
  for (let i = 1; i <= count; i++) {
    const prev = (existingGamesDetail && existingGamesDetail[i - 1]) || {};
    const defaultStart = prev.start || (i % 2 === 1 ? '1º' : '2º');
    const defaultBrick = prev.brick || 'Não';
    const defaultBrickOp = prev.brickOp || 'Não';

    const card = document.createElement('div');
    card.className = 'md3-game-card';
    card.style.cssText = 'background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; padding: 0.8rem; margin-top: 0.5rem;';
    card.innerHTML = `
      <div style="font-weight: 700; font-size: 0.85rem; color: var(--accent2); margin-bottom: 0.6rem; display: flex; justify-content: space-between; align-items: center;">
        <span>🎮 Game ${i}</span>
      </div>
      <div class="form-row three-col" style="gap: 0.6rem;">
        <div class="form-group">
          <label class="form-label" style="font-size:0.75rem;">🎲 Start</label>
          <select class="form-select sm" id="md3GameStart_${i}">
            <option value="1º" ${defaultStart === '1º' ? 'selected' : ''}>1º a Jogar</option>
            <option value="2º" ${defaultStart === '2º' ? 'selected' : ''}>2º a Jogar</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:0.75rem;">💥 Brickei?</label>
          <select class="form-select sm" id="md3GameBrick_${i}">
            <option value="Não" ${defaultBrick === 'Não' ? 'selected' : ''}>Não</option>
            <option value="Sim" ${defaultBrick === 'Sim' ? 'selected' : ''}>Sim</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:0.75rem;">💥 Opp Brickou?</label>
          <select class="form-select sm" id="md3GameBrickOp_${i}">
            <option value="Não" ${defaultBrickOp === 'Não' ? 'selected' : ''}>Não</option>
            <option value="Sim" ${defaultBrickOp === 'Sim' ? 'selected' : ''}>Sim</option>
          </select>
        </div>
      </div>
    `;
    grid.appendChild(card);
  }
};
