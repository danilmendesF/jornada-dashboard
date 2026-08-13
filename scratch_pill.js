function renderActiveFilters() {
  const container = document.getElementById('activeFiltersContainer');
  if (!container) return;

  const pills = [];

  // Formato
  const formatoEl = document.getElementById('filterFormato');
  if (formatoEl && formatoEl.value) {
    pills.push({ label: '<b>Formato:</b> ' + formatoEl.value, remove: () => { formatoEl.value = ''; if(formatoEl.syncSearchableSelect) formatoEl.syncSearchableSelect(); } });
  }

  // Local
  const localEl = document.getElementById('filterLocal');
  if (localEl && localEl.value) {
    pills.push({ label: '<b>Local:</b> ' + localEl.value, remove: () => { localEl.value = ''; if(localEl.syncSearchableSelect) localEl.syncSearchableSelect(); } });
  }

  // Coleção
  const colecaoEl = document.getElementById('filterColecao');
  if (colecaoEl && colecaoEl.value) {
    pills.push({ label: '<b>Coleção:</b> ' + colecaoEl.value, remove: () => { colecaoEl.value = ''; if(colecaoEl.syncSearchableSelect) colecaoEl.syncSearchableSelect(); } });
  }

  // Data de Criação
  const { dStart, dEnd } = typeof getDateFilters === 'function' ? getDateFilters() : {dStart:'',dEnd:''};
  if (dStart || dEnd) {
    let dateStr = '';
    const presetLabel = document.querySelector('.date-preset-option.selected')?.textContent;
    if (presetLabel && presetLabel !== 'Todo o Período' && presetLabel !== 'Personalizado...') {
      dateStr = presetLabel;
    } else {
      dateStr = (dStart ? dStart.split('-').reverse().join('/') : 'Início') + ' - ' + (dEnd ? dEnd.split('-').reverse().join('/') : 'Fim');
    }
    pills.push({ 
      label: '<b>Data:</b> ' + dateStr, 
      remove: () => { 
        document.querySelectorAll('.date-preset-option').forEach(el => el.classList.remove('selected'));
        const allOpt = document.querySelector('.date-preset-option[data-value="all"]');
        if(allOpt) allOpt.classList.add('selected');
        const customDateLabel = document.getElementById('customDateLabel');
        if(customDateLabel) customDateLabel.textContent = 'Todo o Período';
        const calStart = document.getElementById('calInputStart');
        const calEnd = document.getElementById('calInputEnd');
        if(calStart) calStart.value = '';
        if(calEnd) calEnd.value = '';
        const clearBtn = document.getElementById('customDateClear');
        if(clearBtn) clearBtn.style.display = 'none';
      } 
    });
  }

  // Confiabilidade
  const confAlta = document.getElementById('filterConfAlta');
  const confBaixa = document.getElementById('filterConfBaixa');
  if (confAlta && confBaixa) {
    if (confAlta.checked && !confBaixa.checked) {
      pills.push({ label: '<b>Confiabilidade:</b> Alta', remove: () => { confBaixa.checked = true; document.getElementById('multiConfBtnText').textContent = 'Todas'; } });
    } else if (!confAlta.checked && confBaixa.checked) {
      pills.push({ label: '<b>Confiabilidade:</b> Baixa', remove: () => { confAlta.checked = true; document.getElementById('multiConfBtnText').textContent = 'Todas'; } });
    } else if (!confAlta.checked && !confBaixa.checked) {
      pills.push({ label: '<b>Confiabilidade:</b> Nenhuma', remove: () => { confAlta.checked = true; confBaixa.checked = true; document.getElementById('multiConfBtnText').textContent = 'Todas'; } });
    }
  }

  // Players
  if (typeof allAvailablePlayers !== 'undefined' && typeof selectedPlayers !== 'undefined') {
    if (selectedPlayers.size < allAvailablePlayers.length) {
      if (selectedPlayers.size <= 3 && selectedPlayers.size > 0) {
        selectedPlayers.forEach(p => {
          pills.push({ 
            label: '<b>Player:</b> ' + p, 
            remove: () => { 
              selectedPlayers.delete(p); 
              if (typeof renderMultiPlayerItems === 'function') {
                renderMultiPlayerItems(allAvailablePlayers);
                updateMultiPlayerBtnText();
              }
            } 
          });
        });
      } else {
        pills.push({ 
          label: '<b>Players:</b> ' + selectedPlayers.size + ' selecionados', 
          remove: () => { 
            selectedPlayers = new Set(allAvailablePlayers); 
            if (typeof renderMultiPlayerItems === 'function') {
              renderMultiPlayerItems(allAvailablePlayers);
              updateMultiPlayerBtnText();
            }
          } 
        });
      }
    }
  }

  // Decks
  if (typeof allAvailableDecks !== 'undefined' && typeof selectedDecks !== 'undefined') {
    if (selectedDecks.size < allAvailableDecks.length) {
      if (selectedDecks.size <= 3 && selectedDecks.size > 0) {
        selectedDecks.forEach(d => {
          pills.push({ 
            label: '<b>Deck:</b> ' + d, 
            remove: () => { 
              selectedDecks.delete(d); 
              if (typeof renderMultiDeckItems === 'function') {
                renderMultiDeckItems(allAvailableDecks);
                updateMultiDeckBtnText();
              }
            } 
          });
        });
      } else {
        pills.push({ 
          label: '<b>Decks:</b> ' + selectedDecks.size + ' selecionados', 
          remove: () => { 
            selectedDecks = new Set(allAvailableDecks); 
            if (typeof renderMultiDeckItems === 'function') {
              renderMultiDeckItems(allAvailableDecks);
              updateMultiDeckBtnText();
            }
          } 
        });
      }
    }
  }

  if (pills.length === 0) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  container.style.display = 'flex';
  container.innerHTML = '';
  pills.forEach(pill => {
    const el = document.createElement('div');
    el.className = 'active-filter-pill';
    el.innerHTML = '<span>' + pill.label + '</span>';
    
    const closeBtn = document.createElement('div');
    closeBtn.className = 'active-filter-close';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.onclick = () => {
      pill.remove();
      applyFilters();
    };
    
    el.appendChild(closeBtn);
    container.appendChild(el);
  });
}
