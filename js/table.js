// ── JS/TABLE.JS ─────────────────────────────────────────────────────────────
// Match History Table Rendering, Sort & Pagination

window.currentPage = 1;
window.tableSortState = { column: 'Data', dir: 'desc' };

window.changePage = function(page) {
  window.currentPage = page;
  if (typeof renderTable === 'function' && Array.isArray(window.filtered)) {
    renderTable(window.filtered, false);
  }
};

window.sortTableByColumn = function(colKey) {
  if (colKey === 'listas' || colKey === 'acoes') return;
  if (window.tableSortState.column === colKey) {
    window.tableSortState.dir = window.tableSortState.dir === 'asc' ? 'desc' : 'asc';
  } else {
    window.tableSortState.column = colKey;
    window.tableSortState.dir = (colKey === 'id' || colKey === 'Data' || colKey === 'Placar') ? 'desc' : 'asc';
  }
  if (typeof renderTable === 'function' && Array.isArray(window.filtered)) {
    renderTable(window.filtered, true);
  }
};

window.renderTable = function(rows, resetPage = false) {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;

  if (resetPage) window.currentPage = 1;

  const searchQuery = (document.getElementById('tableSearch')?.value || '').toLowerCase().trim();
  let toRender = [...rows];

  if (searchQuery) {
    toRender = toRender.filter(r => {
      const p = (r.Player || '').toLowerCase();
      const d = (r.Deck || '').toLowerCase();
      const da = (r.DeckAdv || '').toLowerCase();
      const adv = (r.Adversario || '').toLowerCase();
      const plc = (r.Placar || '').toLowerCase();
      const loc = (r.Local || '').toLowerCase();
      const col = (r.Colecao || '').toLowerCase();
      return p.includes(searchQuery) || d.includes(searchQuery) || da.includes(searchQuery) || 
             adv.includes(searchQuery) || plc.includes(searchQuery) || loc.includes(searchQuery) || col.includes(searchQuery);
    });
  }

  const { column, dir } = window.tableSortState || { column: 'Data', dir: 'desc' };
  const mult = dir === 'asc' ? 1 : -1;

  toRender.sort((a, b) => {
    let res = 0;
    if (column === 'id') {
      res = (Number(a.id) || 0) - (Number(b.id) || 0);
    } else if (column === 'Resultado') {
      const rank = { 'Vitória': 2, 'Empate': 1, 'Derrota': 0 };
      res = (rank[a.Resultado] ?? 0) - (rank[b.Resultado] ?? 0);
    } else if (column === 'Brick') {
      const bA = typeof isBricked === 'function' && isBricked(a) ? 1 : 0;
      const bB = typeof isBricked === 'function' && isBricked(b) ? 1 : 0;
      res = bA - bB;
    } else {
      const valA = String(a[column] || '');
      const valB = String(b[column] || '');
      res = valA.localeCompare(valB, 'pt-BR', { numeric: true });
    }

    if (res !== 0) return res * mult;

    // Tie-breaker by numeric ID desc
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });

  const totalItems = toRender.length;
  const pageSize = window.PAGE_SIZE || 15;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (window.currentPage > totalPages) window.currentPage = totalPages;
  if (window.currentPage < 1) window.currentPage = 1;

  const startIdx = (window.currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalItems);
  const pagedRows = toRender.slice(startIdx, endIdx);

  renderPaginationControls(totalItems, startIdx, endIdx, totalPages);

  if (pagedRows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="15" style="text-align:center; padding:2rem; color:var(--text2);">Nenhuma partida encontrada.</td></tr>`;
    return;
  }

  tbody.innerHTML = pagedRows.map((r, i) => {
    const idxDisplay = totalItems - (startIdx + i);
    const resClass = r.Resultado === 'Vitória' ? 'res-win' : r.Resultado === 'Empate' ? 'res-draw' : 'res-loss';
    const isBrk = typeof isBricked === 'function' ? isBricked(r) : r.Brick === 'Sim';

    const currentUserObj = typeof getCurrentUser === 'function' ? getCurrentUser() : window.currentUser;
    const currentName = currentUserObj?.linkedPlayer || currentUserObj?.name || '';
    const isOwner = currentName && (r.Player || '').trim().toLowerCase() === currentName.trim().toLowerCase();

    return `
      <tr>
        <td style="font-weight:700; color:var(--accent2);">${r.id || idxDisplay}</td>
        <td>${r.Data || '—'}</td>
        <td style="font-weight:600;">${r.Player || '—'}</td>
        <td style="color:var(--text);">${r.Deck || '—'}</td>
        <td style="color:var(--text2);">${r.DeckAdv || '—'}</td>
        <td><span class="badge sm">${r.Formato || 'MD1'}</span></td>
        <td style="font-size:0.78rem;">${r.Colecao || '—'}</td>
        <td><span class="badge sm ${r.Confiabilidade === 'Baixa' ? 'badge-warn' : 'badge-info'}">${r.Confiabilidade || 'Alta'}</span></td>
        <td>${r.Start || '—'}</td>
        <td style="font-weight:700;">${r.Placar || '—'}</td>
        <td><span class="badge ${resClass}">${r.Resultado || '—'}</span></td>
        <td>${isBrk ? '💥 Sim' : '🟢 Não'}</td>
        <td>${r.Local || '—'}</td>
        <td style="text-align:center;">
          ${r.ListaMeuDeck || r.ListaDeckAdv ? `<button class="action-btn sm" onclick="openMatchDeckList('${r.id}', 'own')" title="Ver Lista">📋 Listas</button>` : '—'}
        </td>
        <td style="text-align:center; white-space:nowrap;">
          ${isOwner ? `
            <button class="action-btn sm" onclick="editMatch('${r.id}')" title="Editar">✏️</button>
            <button class="action-btn sm danger" onclick="deleteMatch('${r.id}')" title="Deletar">🗑️</button>
          ` : `<span style="font-size:0.72rem; color:var(--text2); opacity:0.6;">👁️ Leitura</span>`}
        </td>
      </tr>
    `;
  }).join('');
};

function renderPaginationControls(totalItems, startIdx, endIdx, totalPages) {
  const infoEl = document.getElementById('paginationInfo');
  const ctrlEl = document.getElementById('paginationControls');

  if (infoEl) {
    infoEl.textContent = totalItems === 0 ? 'Mostrando 0 partidas' : `Mostrando ${startIdx + 1}–${endIdx} de ${totalItems} partidas`;
  }

  if (!ctrlEl) return;

  if (totalPages <= 1) {
    ctrlEl.innerHTML = '';
    return;
  }

  let html = `<button class="page-btn" onclick="changePage(${window.currentPage - 1})" ${window.currentPage === 1 ? 'disabled' : ''}>‹ Ant</button>`;

  const maxButtons = 5;
  let startPage = Math.max(1, window.currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  if (startPage > 1) {
    html += `<button class="page-btn" onclick="changePage(1)">1</button>`;
    if (startPage > 2) html += `<span style="color:var(--text2); padding:0 0.2rem;">…</span>`;
  }

  for (let p = startPage; p <= endPage; p++) {
    html += `<button class="page-btn ${p === window.currentPage ? 'active' : ''}" onclick="changePage(${p})">${p}</button>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += `<span style="color:var(--text2); padding:0 0.2rem;">…</span>`;
    html += `<button class="page-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
  }

  html += `<button class="page-btn" onclick="changePage(${window.currentPage + 1})" ${window.currentPage === totalPages ? 'disabled' : ''}>Próx ›</button>`;

  ctrlEl.innerHTML = html;
}
