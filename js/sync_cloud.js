// ── JS/SYNC_CLOUD.JS ────────────────────────────────────────────────────────
// Cloud synchronization & backup helpers with JWT Auth Header support

window.syncStatusState = 'idle';

window.setSyncStatus = function(state, text) {
  window.syncStatusState = state;
  const dot = document.getElementById('headerSyncDot');
  if (!dot) return;
  dot.title = text || state;

  if (state === 'syncing') {
    dot.style.background = '#f5c842';
  } else if (state === 'success') {
    dot.style.background = '#34e0a1';
  } else if (state === 'error') {
    dot.style.background = '#f75050';
  } else {
    dot.style.background = '#38d9f5';
  }
};

window.triggerSyncPush = function() {
  if (window._syncPushTimer) clearTimeout(window._syncPushTimer);
  window._syncPushTimer = setTimeout(() => {
    if (typeof pushToCloud === 'function') pushToCloud();
  }, 1500);
};

window.getSyncUrl = function(token) {
  const authToken = typeof getAuthToken === 'function' ? getAuthToken() : '';
  const syncToken = token || localStorage.getItem('jornada_sync_token') || 'team_default_sync';
  
  const url = `/api/sync?token=${encodeURIComponent(syncToken)}`;
  return url;
};

window.getSyncHeaders = function() {
  const authToken = typeof getAuthToken === 'function' ? getAuthToken() : '';
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
};

function deterministicMergeMatches(listA, listB, deletedIdsSet = new Set()) {
  const map = new Map();
  const delSet = deletedIdsSet instanceof Set ? deletedIdsSet : new Set(deletedIdsSet || []);

  [...(listA || []), ...(listB || [])].forEach(m => {
    if (!m || !m.id || delSet.has(m.id)) return;
    if (!map.has(m.id)) {
      map.set(m.id, m);
    } else {
      const existing = map.get(m.id);
      const tsA = Date.parse(m.updatedAt || m.createdAt) || 0;
      const tsB = Date.parse(existing.updatedAt || existing.createdAt) || 0;
      if (tsA > tsB) map.set(m.id, m);
    }
  });

  const merged = Array.from(map.values());
  if (typeof ensureMatchSequence === 'function') {
    return ensureMatchSequence(merged);
  }

  merged.sort((a, b) => {
    const tsA = (typeof getMatchTimestamp === 'function' ? getMatchTimestamp(a) : (Date.parse(a.Data || a.createdAt) || 0));
    const tsB = (typeof getMatchTimestamp === 'function' ? getMatchTimestamp(b) : (Date.parse(b.Data || b.createdAt) || 0));
    if (tsA !== tsB) return tsA - tsB;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  return merged;
}
window.deterministicMergeMatches = deterministicMergeMatches;

window.pullFromCloud = async function(quiet = false) {
  const url = getSyncUrl();
  if (!url) return;

  setSyncStatus('syncing', 'Baixando dados da nuvem…');

  try {
    const res = await fetch(url, { headers: getSyncHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data && typeof data === 'object') {
      if (Array.isArray(data.manualMatches) && typeof saveManual === 'function') {
        const localManual = typeof loadManual === 'function' ? loadManual() : [];
        const localDeleted = typeof loadDeleted === 'function' ? loadDeleted() : new Set();
        const remoteDeleted = Array.isArray(data.deletedIds) ? new Set(data.deletedIds) : new Set();
        const combinedDeleted = new Set([...localDeleted, ...remoteDeleted]);
        const mergedMatches = deterministicMergeMatches(localManual, data.manualMatches, combinedDeleted);
        saveManual(mergedMatches);
      }
      if (Array.isArray(data.decks) && typeof saveDecks === 'function') {
        saveDecks(data.decks);
      }
      if (Array.isArray(data.players) && typeof savePlayers === 'function') {
        savePlayers(data.players);
      }
      if (data.edits && typeof data.edits === 'object' && typeof saveEdits === 'function') {
        saveEdits(data.edits);
      }
      if (Array.isArray(data.deletedIds) && typeof saveDeleted === 'function') {
        saveDeleted(new Set(data.deletedIds));
      }
      if (Array.isArray(data.archetypeUnifications) && typeof saveArchetypeUnifications === 'function') {
        saveArchetypeUnifications(data.archetypeUnifications);
      }
      if (typeof initializeData === 'function') initializeData();
      if (typeof applyFilters === 'function') applyFilters();

      setSyncStatus('success', 'Sincronizado com a nuvem!');
      if (!quiet && typeof showToast === 'function') showToast('☁️ Dados sincronizados com a nuvem!');
    }
  } catch (e) {
    console.warn('Pull Cloud failure:', e);
    setSyncStatus('error', 'Falha ao sincronizar com nuvem');
  }
};

window.pushToCloud = async function() {
  const url = getSyncUrl();
  if (!url) return;

  setSyncStatus('syncing', 'Enviando dados para a nuvem…');

  const manual = typeof loadManual === 'function' ? loadManual() : [];
  if (typeof ensureMatchSequence === 'function') ensureMatchSequence(manual);

  const payload = {
    manualMatches: manual,
    decks: typeof loadDecks === 'function' ? loadDecks() : [],
    players: typeof loadPlayers === 'function' ? loadPlayers() : [],
    edits: typeof loadEdits === 'function' ? loadEdits() : {},
    deletedIds: typeof loadDeleted === 'function' ? Array.from(loadDeleted()).slice(-300) : [],
    deletedDecks: typeof loadDeletedDecks === 'function' ? Array.from(loadDeletedDecks()).slice(-300) : [],
    deletedPlayers: typeof loadDeletedPlayers === 'function' ? Array.from(loadDeletedPlayers()).slice(-300) : [],
    archetypeUnifications: typeof loadArchetypeUnifications === 'function' ? loadArchetypeUnifications() : [],
    updatedAt: new Date().toISOString()
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: getSyncHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setSyncStatus('success', 'Dados salvos na nuvem!');
  } catch (e) {
    console.warn('Push Cloud failure:', e);
    setSyncStatus('error', 'Erro ao salvar na nuvem');
  }
};

window.exportBackup = function() {
  const manual = typeof loadManual === 'function' ? loadManual() : [];
  if (typeof ensureMatchSequence === 'function') ensureMatchSequence(manual);

  const data = {
    manualMatches: manual,
    decks: typeof loadDecks === 'function' ? loadDecks() : [],
    players: typeof loadPlayers === 'function' ? loadPlayers() : [],
    locais: typeof loadLocais === 'function' ? loadLocais() : [],
    colecoes: typeof loadColecoes === 'function' ? loadColecoes() : [],
    exportedAt: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jornada_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

window.importBackup = function(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data.manualMatches) && typeof ensureMatchSequence === 'function') {
        ensureMatchSequence(data.manualMatches);
      }
      if (data.manualMatches && typeof saveManual === 'function') saveManual(data.manualMatches);
      if (data.decks && typeof saveDecks === 'function') saveDecks(data.decks);
      if (data.players && typeof savePlayers === 'function') savePlayers(data.players);
      if (data.locais && typeof saveLocais === 'function') saveLocais(data.locais);
      if (data.colecoes && typeof saveColecoes === 'function') saveColecoes(data.colecoes);
      
      if (typeof initializeData === 'function') initializeData();
      if (typeof applyFilters === 'function') applyFilters();
      if (typeof showToast === 'function') showToast('📦 Backup importado com sucesso!');
    } catch (err) {
      alert('Erro ao ler arquivo de backup JSON.');
    }
  };
  reader.readAsText(file);
};
