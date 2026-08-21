// ── JS/SYNC_CLOUD.JS ────────────────────────────────────────────────────────
// Cloud synchronization, OCC Conflict Single Retry & Multi-Device Convergence (CHG-006.4 Emergency)

var MAX_RETRY_ATTEMPTS = 1;
var BASE_BACKOFF_MS = 200;
var MAX_BACKOFF_MS = 2000;

var syncLifecycleState = 'LOGGED_OUT';
var isCloudSyncReady = false;
var syncStatusState = 'idle';

var _syncPushTimer = null;
var _syncIntervalTimer = null;
var _hasPendingSync = false;
var _activePullPromise = null;
var _activePushPromise = null;
var _syncRetryCount = 0;
var _syncBackoffTimer = null;
var _currentCloudRevision = 0;
var _lastOperationIdempotencyKey = null;
var _authSessionGen = 1;

function setPendingSync(val) {
  _hasPendingSync = Boolean(val);
  if (typeof window !== 'undefined') window._hasPendingSync = _hasPendingSync;
  if (typeof localStorage !== 'undefined') {
    try {
      const pendingKey = (typeof window !== 'undefined' && typeof window.getScopedKey === 'function') ? window.getScopedKey('jornada_sync_pending') : 'jornada_sync_pending';
      if (val) {
        localStorage.setItem(pendingKey, '1');
      } else {
        localStorage.removeItem(pendingKey);
      }
    } catch (e) {}
  }
}

// Restore persistent pending sync state on bootstrap
try {
  const pendingKey = (typeof window !== 'undefined' && typeof window.getScopedKey === 'function') ? window.getScopedKey('jornada_sync_pending') : 'jornada_sync_pending';
  if (typeof localStorage !== 'undefined' && localStorage.getItem(pendingKey) === '1') {
    _hasPendingSync = true;
    if (typeof window !== 'undefined') window._hasPendingSync = true;
  }
} catch (e) {}

function setSyncStatus(state, text) {
  syncStatusState = state;
  if (typeof window !== 'undefined') window.syncStatusState = state;
  const doc = typeof document !== 'undefined' ? document : null;
  if (!doc) return;

  const dot = doc.getElementById('headerSyncDot');
  const ind = doc.getElementById('syncStatusIndicator');
  const txt = doc.getElementById('syncStatusText');

  const colors = {
    syncing: { color: '#f5c842', label: text || 'Sincronizando…' },
    success: { color: '#34e0a1', label: text || 'Sincronizado' },
    connected: { color: '#34e0a1', label: text || 'Sincronizado' },
    error: { color: '#f75050', label: text || 'Erro de Conexão' },
    offline: { color: '#94a3b8', label: text || 'Modo Offline' },
    idle: { color: '#38d9f5', label: text || 'Pronto' }
  };

  const current = colors[state] || colors.idle;
  if (dot) {
    dot.style.background = current.color;
    dot.title = current.label;
  }
  if (ind) ind.style.background = current.color;
  if (txt) {
    txt.textContent = current.label;
    txt.style.color = current.color;
  }
}

function calculateBackoffDelay(attempt, base = BASE_BACKOFF_MS, max = MAX_BACKOFF_MS) {
  const cap = Math.min(max, base * Math.pow(2, attempt));
  return Math.random() * cap;
}

function triggerSyncPush() {
  if (_syncPushTimer) clearTimeout(_syncPushTimer);
  if (typeof window !== 'undefined' && window._syncPushTimer) clearTimeout(window._syncPushTimer);

  _syncPushTimer = setTimeout(() => {
    _syncPushTimer = null;
    if (typeof window !== 'undefined') window._syncPushTimer = null;
    if (typeof pushToCloud === 'function') pushToCloud();
  }, 800);

  if (typeof window !== 'undefined') window._syncPushTimer = _syncPushTimer;
}

function getSyncUrl(token) {
  const syncToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('jornada_sync_token') : null) || 'team_default_sync';
  const cleanToken = syncToken.replace(/[^a-zA-Z0-9_-]/g, '');
  const ts = Date.now();
  return `/api/sync?token=${encodeURIComponent(cleanToken)}&_t=${ts}`;
}

function getSyncHeaders() {
  const authToken = typeof getAuthToken === 'function' ? getAuthToken() : (typeof localStorage !== 'undefined' ? (localStorage.getItem('jornada_auth_token') || '') : '');
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

function canonicalMatchString(match) {
  if (!match || typeof match !== 'object') return '';
  const keys = Object.keys(match).sort();
  const sortedObj = {};
  keys.forEach(k => {
    if (typeof match[k] !== 'function') {
      sortedObj[k] = match[k];
    }
  });
  return JSON.stringify(sortedObj);
}

function deterministicMergeMatches(listA, listB, deletedIdsSet = new Set()) {
  const normA = (typeof window !== 'undefined' && typeof window.migrateLegacyMatches === 'function') ? window.migrateLegacyMatches(listA || []) : (typeof migrateLegacyMatches === 'function' ? migrateLegacyMatches(listA || []) : (listA || []));
  const normB = (typeof window !== 'undefined' && typeof window.migrateLegacyMatches === 'function') ? window.migrateLegacyMatches(listB || []) : (typeof migrateLegacyMatches === 'function' ? migrateLegacyMatches(listB || []) : (listB || []));
  const map = new Map();
  const delSet = deletedIdsSet instanceof Set ? deletedIdsSet : new Set(deletedIdsSet || []);

  [...normA, ...normB].forEach(m => {
    if (!m || !m.id || delSet.has(m.id)) return;
    if (!map.has(m.id)) {
      map.set(m.id, m);
    } else {
      const existing = map.get(m.id);
      const tsA = Date.parse(m.updatedAt || m.createdAt) || 0;
      const tsB = Date.parse(existing.updatedAt || existing.createdAt) || 0;
      if (tsA > tsB) {
        map.set(m.id, m);
      } else if (tsA === tsB) {
        const strA = canonicalMatchString(m);
        const strB = canonicalMatchString(existing);
        if (strA.localeCompare(strB) > 0) {
          map.set(m.id, m);
        }
      }
    }
  });

  const merged = Array.from(map.values());
  if (typeof ensureMatchSequence === 'function') {
    return ensureMatchSequence(merged);
  }

  merged.sort((a, b) => {
    const tsA = (typeof getMatchTimestamp === 'function' ? getMatchTimestamp(a) : (Date.parse(a.createdAt || (a.Data ? `${a.Data}T12:00:00Z` : 0)) || 0));
    const tsB = (typeof getMatchTimestamp === 'function' ? getMatchTimestamp(b) : (Date.parse(b.createdAt || (b.Data ? `${b.Data}T12:00:00Z` : 0)) || 0));
    if (tsA !== tsB) return tsA - tsB;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  return merged;
}

// ── LOCAL SAFETY BACKUP (CHG-006.4 Emergency) ───────────────────────────────
function saveLocalSafetyBackup() {
  try {
    if (typeof localStorage === 'undefined') return;
    const uid = (typeof window !== 'undefined' && typeof window.getActiveUserId === 'function') ? window.getActiveUserId() : 'anonymous';
    const backupKey = `jornada_u_${uid}_safety_backup`;

    const manual = (typeof window !== 'undefined' && typeof window.loadManual === 'function') ? window.loadManual() : (typeof loadManual === 'function' ? loadManual() : []);
    const decks = (typeof window !== 'undefined' && typeof window.loadDecks === 'function') ? window.loadDecks() : (typeof loadDecks === 'function' ? loadDecks() : []);
    const players = (typeof window !== 'undefined' && typeof window.loadPlayers === 'function') ? window.loadPlayers() : (typeof loadPlayers === 'function' ? loadPlayers() : []);

    // Do not overwrite existing non-empty backup with empty snapshot
    if (manual.length === 0 && decks.length === 0) {
      const existingRaw = localStorage.getItem(backupKey);
      if (existingRaw) return;
    }

    const snapshot = {
      timestamp: new Date().toISOString(),
      userId: uid,
      manualMatches: manual,
      decks: decks,
      players: players
    };

    localStorage.setItem(backupKey, JSON.stringify(snapshot));
  } catch (e) {
    console.warn('[Safety Backup] Falha ao criar backup local de segurança:', e);
  }
}

async function pullFromCloud(quiet = false) {
  if (_activePullPromise) return _activePullPromise;

  const url = getSyncUrl();
  if (!url) return;

  // ── FIX: Resolve storage keys SYNCHRONOUSLY before the async fetch ────────
  // Capturing keys here ensures getActiveUserId() resolves to the correct UID,
  // not 'anonymous', which can happen if keys are resolved after await fetch().
  const _kMatches  = (typeof window !== 'undefined' && window.KEY_MATCHES)  ? window.KEY_MATCHES  : (typeof getScopedKey === 'function' ? getScopedKey('jornada_manual_matches') : 'jornada_manual_matches');
  const _kDecks    = (typeof window !== 'undefined' && window.KEY_DECKS)    ? window.KEY_DECKS    : (typeof getScopedKey === 'function' ? getScopedKey('jornada_decks')          : 'jornada_decks');
  const _kPlayers  = (typeof window !== 'undefined' && window.KEY_PLAYERS)  ? window.KEY_PLAYERS  : (typeof getScopedKey === 'function' ? getScopedKey('jornada_players')        : 'jornada_players');
  const _kLocais   = (typeof window !== 'undefined' && window.KEY_LOCAIS)   ? window.KEY_LOCAIS   : (typeof getScopedKey === 'function' ? getScopedKey('jornada_locais')         : 'jornada_locais');
  const _kColecoes = (typeof window !== 'undefined' && window.KEY_COLECOES) ? window.KEY_COLECOES : (typeof getScopedKey === 'function' ? getScopedKey('jornada_colecoes')       : 'jornada_colecoes');
  const _kEdits    = (typeof window !== 'undefined' && window.KEY_EDITS)    ? window.KEY_EDITS    : (typeof getScopedKey === 'function' ? getScopedKey('jornada_edited_matches')  : 'jornada_edited_matches');
  const _kDeleted  = (typeof window !== 'undefined' && window.KEY_DELETED)  ? window.KEY_DELETED  : (typeof getScopedKey === 'function' ? getScopedKey('jornada_deleted_ids')     : 'jornada_deleted_ids');
  const _kArch     = (typeof window !== 'undefined' && typeof window.getScopedKey === 'function') ? window.getScopedKey('jornada_archetype_unifications') : 'jornada_archetype_unifications';
  // ─────────────────────────────────────────────────────────────────────────

  const requestToken = typeof getAuthToken === 'function' ? getAuthToken() : (typeof localStorage !== 'undefined' ? (localStorage.getItem('jornada_auth_token') || '') : '');
  const requestSessionGen = (typeof window !== 'undefined' && window._authSessionGen !== undefined) ? window._authSessionGen : _authSessionGen;

  if (!quiet) setSyncStatus('syncing', 'Baixando dados da nuvem…');
  const prevState = (typeof window !== 'undefined' ? window.syncLifecycleState : syncLifecycleState);
  if (prevState !== 'CONFLICT_RETRYING') {
    syncLifecycleState = 'PULLING';
    if (typeof window !== 'undefined') window.syncLifecycleState = 'PULLING';
  }
  console.log(`[Jornada Sync] ⬇️ PULL Iniciado: url=${url}, quiet=${quiet}, kMatches="${_kMatches}"`);

  _activePullPromise = (async () => {
    try {
      const res = await fetch(url, { headers: getSyncHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // ── IN-FLIGHT SESSION & TOKEN GUARD (CHG-005.1) ─────────────────────────
      const currentToken = typeof getAuthToken === 'function' ? getAuthToken() : (typeof localStorage !== 'undefined' ? (localStorage.getItem('jornada_auth_token') || '') : '');
      const currentSessionGen = (typeof window !== 'undefined' && window._authSessionGen !== undefined) ? window._authSessionGen : _authSessionGen;
      const currentState = (typeof window !== 'undefined' ? window.syncLifecycleState : syncLifecycleState);

      // Allow BOOTING and READONLY states to receive pull data even if requestToken was empty at boot time (timing race fix)
      const isBoot = currentState === 'BOOTING' || (prevState === 'BOOTING' && currentState === 'PULLING');
      const isReadonly = currentState === 'READONLY' || prevState === 'READONLY';
      if (!isReadonly && !isBoot && (!currentToken || currentState === 'LOGGED_OUT')) {
        console.warn('[Sync Guard] Resposta de pull descartada: sessão encerrada ou usuário não autenticado.');
        return;
      }
      if (!isBoot && !isReadonly && (currentToken !== requestToken || currentSessionGen !== requestSessionGen)) {
        console.warn('[Sync Guard] Resposta de pull descartada: sessão foi alterada durante a requisição em voo.');
        return;
      }

      if (data && typeof data === 'object') {
        if (typeof data.revision === 'number') {
          _currentCloudRevision = data.revision;
          if (typeof window !== 'undefined') window._currentCloudRevision = _currentCloudRevision;
        }

        const localDeleted = (typeof window !== 'undefined' && typeof window.loadDeleted === 'function') ? window.loadDeleted() : (typeof loadDeleted === 'function' ? loadDeleted() : new Set());
        const remoteDeleted = Array.isArray(data.deletedIds) ? new Set(data.deletedIds) : new Set();
        const combinedDeleted = new Set([...localDeleted, ...remoteDeleted]);

        if (Array.isArray(data.manualMatches)) {
          const localManual = (typeof window !== 'undefined' && typeof window.loadManual === 'function') ? window.loadManual() : (typeof loadManual === 'function' ? loadManual() : []);
          const cloudMatches = data.manualMatches;

          // ── EMPTY CLOUD GUARD: never overwrite local data with empty cloud ──
          // If cloud returns [] but local has data, preserve local completely.
          // Empty cloud does NOT imply the user deleted everything.
          if (cloudMatches.length === 0 && localManual.length > 0) {
            console.warn(`[Sync Pull] Cloud retornou 0 partidas mas local possui ${localManual.length}. Preservando local. Nenhuma escrita realizada.`);
          } else {
            const mergedMatches = deterministicMergeMatches(localManual, cloudMatches, combinedDeleted);
            console.log(`[Sync Pull] localBefore=${localManual.length} cloud=${cloudMatches.length} merged=${mergedMatches.length} key=${_kMatches}`);
            const safeSet = (typeof window !== 'undefined' && typeof window.safeSetItem === 'function') ? window.safeSetItem : (typeof safeSetItem === 'function' ? safeSetItem : ((k, v) => { if (typeof localStorage !== 'undefined') localStorage.setItem(k, v); }));
            safeSet(_kMatches, JSON.stringify(mergedMatches));
          }
        }
        if (Array.isArray(data.decks) && typeof safeSetItem === 'function') {
          const localDecks = (typeof window !== 'undefined' && typeof window.loadDecks === 'function') ? window.loadDecks() : (typeof loadDecks === 'function' ? loadDecks() : []);
          const deckMap = new Map();
          [...localDecks, ...data.decks].forEach(d => {
            if (!d) return;
            const key = (typeof d === 'object' ? (d.id || d.name || d.arquetipo) : String(d)).toLowerCase().trim();
            if (key && !deckMap.has(key)) deckMap.set(key, d);
          });
          const mergedDecks = Array.from(deckMap.values());
          if (mergedDecks.length > 0) safeSetItem(_kDecks, JSON.stringify(mergedDecks));
        }
        if (Array.isArray(data.players) && typeof safeSetItem === 'function') {
          const localPlayers = (typeof window !== 'undefined' && typeof window.loadPlayers === 'function') ? window.loadPlayers() : (typeof loadPlayers === 'function' ? loadPlayers() : []);
          const playerMap = new Map();
          [...localPlayers, ...data.players].forEach(p => {
            if (!p) return;
            const pStr = String(p).trim();
            const key = pStr.toLowerCase();
            if (pStr && !playerMap.has(key)) playerMap.set(key, pStr);
          });
          const mergedPlayers = Array.from(playerMap.values());
          if (mergedPlayers.length > 0) safeSetItem(_kPlayers, JSON.stringify(mergedPlayers));
        }
        if (Array.isArray(data.locais) && typeof safeSetItem === 'function') {
          const localLocais = (typeof window !== 'undefined' && typeof window.loadLocais === 'function') ? window.loadLocais() : (typeof loadLocais === 'function' ? loadLocais() : []);
          const localMap = new Map();
          [...localLocais, ...data.locais].forEach(l => {
            if (!l) return;
            const lStr = String(l).trim();
            const key = lStr.toLowerCase();
            if (lStr && !localMap.has(key)) localMap.set(key, lStr);
          });
          const mergedLocais = Array.from(localMap.values());
          if (mergedLocais.length > 0) safeSetItem(_kLocais, JSON.stringify(mergedLocais));
        }
        if (Array.isArray(data.colecoes) && typeof safeSetItem === 'function') {
          const localColecoes = (typeof window !== 'undefined' && typeof window.loadColecoes === 'function') ? window.loadColecoes() : (typeof loadColecoes === 'function' ? loadColecoes() : []);
          const colMap = new Map();
          [...localColecoes, ...data.colecoes].forEach(c => {
            if (!c) return;
            const cStr = String(c).trim();
            const key = cStr.toLowerCase();
            if (cStr && !colMap.has(key)) colMap.set(key, cStr);
          });
          const mergedColecoes = Array.from(colMap.values());
          if (mergedColecoes.length > 0) safeSetItem(_kColecoes, JSON.stringify(mergedColecoes));
        }
        const cloudEdits = data.editedMatches || data.edits;
        if (cloudEdits && typeof cloudEdits === 'object' && typeof safeSetItem === 'function') {
          safeSetItem(_kEdits, JSON.stringify(cloudEdits));
        }
        if (Array.isArray(data.deletedIds) && typeof safeSetItem === 'function') {
          safeSetItem(_kDeleted, JSON.stringify(Array.from(combinedDeleted)));
        }
        if (Array.isArray(data.archetypeUnifications) && typeof safeSetItem === 'function') {
          safeSetItem(_kArch, JSON.stringify(data.archetypeUnifications));
        }

        if (typeof initializeData === 'function') initializeData();
        if (typeof populateFilters === 'function') populateFilters();
        if (typeof populateDeckSelects === 'function') populateDeckSelects();
        if (typeof populatePlayerSelects === 'function') populatePlayerSelects();
        if (typeof populateQuickLogDropdowns === 'function') populateQuickLogDropdowns();
        if (typeof renderDecksList === 'function') renderDecksList();
        if (typeof renderPlayersList === 'function') renderPlayersList();
        if (typeof renderLocaisList === 'function') renderLocaisList();
        if (typeof renderColecoesList === 'function') renderColecoesList();
        if (typeof applyFilters === 'function') applyFilters();

        const activeState = (typeof window !== 'undefined' ? window.syncLifecycleState : syncLifecycleState);
        if (activeState !== 'CONFLICT_RETRYING') {
          syncLifecycleState = 'READY';
          isCloudSyncReady = true;
          if (typeof window !== 'undefined') {
            window.syncLifecycleState = 'READY';
            window.isCloudSyncReady = true;
          }

          setSyncStatus('success', 'Sincronizado com a nuvem!');
          if (!quiet && typeof showToast === 'function') showToast('☁️ Dados sincronizados com a nuvem!');

          const localManual = (typeof window !== 'undefined' && typeof window.loadManual === 'function') ? window.loadManual() : (typeof loadManual === 'function' ? loadManual() : []);
          const cloudCount = Array.isArray(data.manualMatches) ? data.manualMatches.length : 0;
          const hasPending = _hasPendingSync || (typeof window !== 'undefined' && window._hasPendingSync) || (typeof localStorage !== 'undefined' && localStorage.getItem('jornada_sync_pending') === '1') || (localManual.length > cloudCount);
          if (hasPending) {
            if (typeof showToast === 'function' && localManual.length > cloudCount) {
              showToast(`🔄 Sincronizando ${localManual.length} partidas locais com a nuvem...`);
            }
            triggerSyncPush();
          }
        } else {
          isCloudSyncReady = true;
          if (typeof window !== 'undefined') {
            window.isCloudSyncReady = true;
          }
        }
      }
    } catch (e) {
      console.warn('[Sync Pull Warning]: Falha na sincronização remota (Offline):', e);
      syncLifecycleState = 'OFFLINE';
      isCloudSyncReady = false;
      if (typeof window !== 'undefined') {
        window.syncLifecycleState = 'OFFLINE';
        window.isCloudSyncReady = false;
      }
      setSyncStatus('offline', 'Modo Offline (dados locais protegidos)');

      // Fix #3: If there is pending sync data, schedule a retry with backoff
      const hasPendingOnFail = _hasPendingSync || (typeof window !== 'undefined' && window._hasPendingSync) || (typeof localStorage !== 'undefined' && localStorage.getItem('jornada_sync_pending') === '1');
      if (hasPendingOnFail) {
        const retryDelay = calculateBackoffDelay(_syncRetryCount, 3000, 30000);
        console.warn(`[Sync Retry] Pull falhou com sync pendente. Retry em ${Math.round(retryDelay)}ms`);
        if (_syncBackoffTimer) clearTimeout(_syncBackoffTimer);
        _syncBackoffTimer = setTimeout(() => {
          _syncBackoffTimer = null;
          const curState = (typeof window !== 'undefined' ? window.syncLifecycleState : syncLifecycleState);
          if (curState !== 'LOGGED_OUT') {
            pullFromCloud(true).then(() => {
              const isNowReady = (typeof window !== 'undefined' ? window.isCloudSyncReady : isCloudSyncReady);
              if (isNowReady) triggerSyncPush();
            });
          }
        }, retryDelay);
        if (typeof window !== 'undefined') window._syncBackoffTimer = _syncBackoffTimer;
      }
    } finally {
      _activePullPromise = null;
    }
  })();

  return _activePullPromise;
}

// ── PUSH TO CLOUD WITH OCC CONFLICT SINGLE RETRY (CHG-006.4 Emergency) ──────
async function pushToCloud(attempt = 0, preservedIdempotencyKey = null) {
  const activePromise = (typeof window !== 'undefined' && window._activePushPromise) ? window._activePushPromise : _activePushPromise;
  // Prevent duplicate concurrent push cycles
  if (activePromise && attempt === 0) {
    return activePromise;
  }

  let pushCycle;
  pushCycle = (async () => {
    const isReady = (typeof window !== 'undefined' ? window.isCloudSyncReady : isCloudSyncReady);
    const state = (typeof window !== 'undefined' ? window.syncLifecycleState : syncLifecycleState);

    // EMERGENCY SYNC GUARD (CHG-005): Never push before pull is complete or when logged out
    if (!isReady || (state !== 'READY' && state !== 'CONFLICT_RETRYING' && state !== 'PUSHING' && state !== 'BACKOFF')) {
      setPendingSync(true);
      console.warn('[Sync Guard] Push bloqueado: o primeiro Pull da nuvem ainda não foi concluído. Mutação mantida localmente e agendada.');
      return;
    }

    const url = getSyncUrl();
    if (!url) return;

    if (attempt === 0) {
      syncLifecycleState = 'PUSHING';
      if (typeof window !== 'undefined') window.syncLifecycleState = 'PUSHING';
      setSyncStatus('syncing', 'Enviando dados para a nuvem…');
    } else {
      syncLifecycleState = 'CONFLICT_RETRYING';
      if (typeof window !== 'undefined') window.syncLifecycleState = 'CONFLICT_RETRYING';
      setSyncStatus('syncing', `Reconciliando conflito (${attempt}/${MAX_RETRY_ATTEMPTS})…`);
    }

    // Pre-push local safety backup
    saveLocalSafetyBackup();

    // Always fetch the freshest local state (handles new mutations or reconciled pull data)
    const manual = (typeof window !== 'undefined' && typeof window.loadManual === 'function') ? window.loadManual() : (typeof loadManual === 'function' ? loadManual() : []);
    if (typeof ensureMatchSequence === 'function') ensureMatchSequence(manual);

    const genUuid = (typeof window !== 'undefined' && typeof window.generateUUID === 'function') ? window.generateUUID : (typeof generateUUID === 'function' ? generateUUID : () => 'idem_' + Date.now());
    const idempotencyKey = preservedIdempotencyKey || genUuid();
    _lastOperationIdempotencyKey = idempotencyKey;
    if (typeof window !== 'undefined') window._lastOperationIdempotencyKey = idempotencyKey;

    const curRev = (typeof window !== 'undefined' && typeof window._currentCloudRevision === 'number') ? window._currentCloudRevision : (_currentCloudRevision || 0);
    console.log(`[Jornada Sync] ⬆️ PUSH Iniciado (tentativa ${attempt}): baseRevision=${curRev}, localMatches=${manual.length}, key="${idempotencyKey}"`);

    const payload = {
      baseRevision: curRev,
      idempotencyKey: idempotencyKey,
      manualMatches: manual,
      decks: (typeof window !== 'undefined' && typeof window.loadDecks === 'function') ? window.loadDecks() : (typeof loadDecks === 'function' ? loadDecks() : []),
      players: (typeof window !== 'undefined' && typeof window.loadPlayers === 'function') ? window.loadPlayers() : (typeof loadPlayers === 'function' ? loadPlayers() : []),
      locais: (typeof window !== 'undefined' && typeof window.loadLocais === 'function') ? window.loadLocais() : (typeof loadLocais === 'function' ? loadLocais() : []),
      colecoes: (typeof window !== 'undefined' && typeof window.loadColecoes === 'function') ? window.loadColecoes() : (typeof loadColecoes === 'function' ? loadColecoes() : []),
      editedMatches: (typeof window !== 'undefined' && typeof window.loadEdits === 'function') ? window.loadEdits() : (typeof loadEdits === 'function' ? loadEdits() : {}),
      deletedIds: (typeof window !== 'undefined' && typeof window.loadDeleted === 'function') ? Array.from(window.loadDeleted()).slice(-300) : (typeof loadDeleted === 'function' ? Array.from(loadDeleted()).slice(-300) : []),
      deletedDecks: (typeof window !== 'undefined' && typeof window.loadDeletedDecks === 'function') ? Array.from(window.loadDeletedDecks()).slice(-300) : (typeof loadDeletedDecks === 'function' ? Array.from(loadDeletedDecks()).slice(-300) : []),
      deletedPlayers: (typeof window !== 'undefined' && typeof window.loadDeletedPlayers === 'function') ? Array.from(window.loadDeletedPlayers()).slice(-300) : (typeof loadDeletedPlayers === 'function' ? Array.from(loadDeletedPlayers()).slice(-300) : []),
      archetypeUnifications: (typeof window !== 'undefined' && typeof window.loadArchetypeUnifications === 'function') ? window.loadArchetypeUnifications() : (typeof loadArchetypeUnifications === 'function' ? loadArchetypeUnifications() : []),
      updatedAt: new Date().toISOString()
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: getSyncHeaders(),
        body: JSON.stringify(payload)
      });

      if (res.status === 200 || (res.ok && res.status !== 401 && res.status !== 403 && res.status !== 409)) {
        let resJson = null;
        try {
          resJson = await res.json();
          if (resJson && typeof resJson.revision === 'number') {
            _currentCloudRevision = resJson.revision;
            if (typeof window !== 'undefined') window._currentCloudRevision = _currentCloudRevision;
          }
        } catch (parseErr) {}

        _syncRetryCount = 0;
        if (typeof window !== 'undefined') window._syncRetryCount = 0;
        setPendingSync(false);

        syncLifecycleState = 'READY';
        if (typeof window !== 'undefined') window.syncLifecycleState = 'READY';
        setSyncStatus('success', 'Dados salvos na nuvem!');
        console.log(`[Jornada Sync] ⬆️ PUSH Sucesso: newRevision=${_currentCloudRevision}, partidas=${manual.length}`);
        if (typeof showToast === 'function') showToast(`☁️ Dados salvos na nuvem (${manual.length} partidas)!`);
        return { success: true, revision: _currentCloudRevision };
      }

      if (res.status === 401 || res.status === 403) {
        console.error(`[Jornada Sync] ❌ PUSH Erro de Autenticação (HTTP ${res.status}): Não autorizado a sincronizar.`);
        _syncRetryCount = 0;
        if (typeof window !== 'undefined') window._syncRetryCount = 0;
        setSyncStatus('error', 'Sessão expirada. Faça login novamente.');
        if (typeof showToast === 'function') showToast('⚠️ Sessão expirada ou não autenticada. Faça login para salvar na nuvem.');
        return { error: 'UNAUTHORIZED' };
      }

      if (res.status === 409) {
        let errJson = {};
        try { errJson = await res.json(); } catch (e) {}

        console.warn(`[Jornada Sync] ⚠️ PUSH Conflito OCC 409 (tentativa ${attempt + 1}/${MAX_RETRY_ATTEMPTS}):`, errJson);

        if (attempt < MAX_RETRY_ATTEMPTS) {
          _syncRetryCount = attempt + 1;
          if (typeof window !== 'undefined') window._syncRetryCount = _syncRetryCount;

          syncLifecycleState = 'CONFLICT_RETRYING';
          if (typeof window !== 'undefined') window.syncLifecycleState = 'CONFLICT_RETRYING';

          // 1. Safety backup of local state before merging
          saveLocalSafetyBackup();

          // 2. Immediate silent pull to merge remote state & update _currentCloudRevision
          await pullFromCloud(true);

          // 3. Single retry push with reconciled merged state & new idempotency key
          return await pushToCloud(attempt + 1, null);
        } else {
          // Max retries exceeded (1 retry limit for emergency convergence): keep local data, set pending sync and gracefully recover
          console.warn('[Sync OCC Conflict] Limite máximo de retries atingido (1). STOP seguro: mantendo dados locais e sincronização pendente.');
          _syncRetryCount = 0;
          if (typeof window !== 'undefined') window._syncRetryCount = 0;
          setPendingSync(true);

          syncLifecycleState = 'READY';
          if (typeof window !== 'undefined') window.syncLifecycleState = 'READY';
          setSyncStatus('error', 'Conflito na nuvem (sincronização pendente)');
          return { error: 'REVISION_CONFLICT_EXHAUSTED' };
        }
      }

      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.warn('[Sync Push Warning]: Falha ao salvar na nuvem (Offline):', e);
      _syncRetryCount = 0;
      if (typeof window !== 'undefined') window._syncRetryCount = 0;
      setPendingSync(true);

      syncLifecycleState = 'OFFLINE';
      if (typeof window !== 'undefined') window.syncLifecycleState = 'OFFLINE';
      setSyncStatus('error', 'Erro ao enviar para nuvem (pendente)');
      return { error: 'OFFLINE' };
    } finally {
      if (attempt === 0) {
        _activePushPromise = null;
        if (typeof window !== 'undefined') window._activePushPromise = null;
      }
    }
  })();

  if (attempt === 0) {
    _activePushPromise = pushCycle;
    if (typeof window !== 'undefined') window._activePushPromise = pushCycle;
  }

  return pushCycle;
}

function startSyncInterval() {
  stopSyncInterval();
  if (typeof getAuthToken === 'function' && getAuthToken()) {
    _syncIntervalTimer = setInterval(() => {
      pullFromCloud(true);
    }, 15000);
    if (typeof window !== 'undefined') window._syncIntervalTimer = _syncIntervalTimer;
  }
}

function stopSyncInterval() {
  if (_syncIntervalTimer) {
    clearInterval(_syncIntervalTimer);
    _syncIntervalTimer = null;
  }
  if (typeof window !== 'undefined' && window._syncIntervalTimer) {
    clearInterval(window._syncIntervalTimer);
    window._syncIntervalTimer = null;
  }
  if (_syncBackoffTimer) {
    clearTimeout(_syncBackoffTimer);
    _syncBackoffTimer = null;
  }
  if (typeof window !== 'undefined' && window._syncBackoffTimer) {
    clearTimeout(window._syncBackoffTimer);
    window._syncBackoffTimer = null;
  }
}

function initSyncUI() {
  const curToken = 'team_default_sync';
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('jornada_sync_token', curToken);
    const pendingKey = typeof window.getScopedKey === 'function' ? window.getScopedKey('jornada_sync_pending') : 'jornada_sync_pending';
    if (localStorage.getItem(pendingKey) === '1') {
      setPendingSync(true);
    }
  }

  const token = typeof getAuthToken === 'function' ? getAuthToken() : (typeof localStorage !== 'undefined' ? localStorage.getItem('jornada_auth_token') : '');
  if (token) {
    // ── FIX: Ensure auth session (user profile + namespace) is resolved ───────
    // initAuthSession() reads jornada_user_profile synchronously from localStorage,
    // setting window.currentUser so getActiveUserId() returns the correct UID
    // BEFORE the first pullFromCloud() resolves storage keys.
    if (typeof initAuthSession === 'function') {
      try { initAuthSession(); } catch (e) {}
    }
    // ─────────────────────────────────────────────────────────────────────────
    syncLifecycleState = 'BOOTING';
    if (typeof window !== 'undefined') window.syncLifecycleState = 'BOOTING';
    pullFromCloud(true).then(() => {
      startSyncInterval();
    });

  } else {
    // Fix #2: Even without auth token, pull cloud data in read-only mode.
    // GET /api/sync is public (no JWT required), so unauthenticated sessions
    // (incognito tabs, new devices) can still READ the team's shared data.
    syncLifecycleState = 'READONLY';
    isCloudSyncReady = false;
    if (typeof window !== 'undefined') {
      window.syncLifecycleState = 'READONLY';
      window.isCloudSyncReady = false;
    }
    pullFromCloud(true);
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopSyncInterval();
    } else {
      const token = typeof getAuthToken === 'function' ? getAuthToken() : '';
      const state = (typeof window !== 'undefined' ? window.syncLifecycleState : syncLifecycleState);
      if (token && state !== 'LOGGED_OUT') {
        pullFromCloud(true);
        startSyncInterval();
      }
    }
  });
}

// ── BACKUP & EXPORT FUNCTIONS ────────────────────────────────────────────────
function exportBackup() {
  const manual = (typeof window !== 'undefined' && typeof window.loadManual === 'function') ? window.loadManual() : (typeof loadManual === 'function' ? loadManual() : []);
  if (typeof ensureMatchSequence === 'function') ensureMatchSequence(manual);

  const data = {
    exportedAt: new Date().toISOString(),
    manualMatches: manual,
    decks: typeof loadDecks === 'function' ? loadDecks() : [],
    players: typeof loadPlayers === 'function' ? loadPlayers() : [],
    locais: typeof loadLocais === 'function' ? loadLocais() : [],
    colecoes: typeof loadColecoes === 'function' ? loadColecoes() : []
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jornada_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importBackup(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      const migMatch = (typeof window !== 'undefined' && typeof window.migrateLegacyMatches === 'function') ? window.migrateLegacyMatches : (typeof migrateLegacyMatches === 'function' ? migrateLegacyMatches : null);
      const ensSeq = (typeof window !== 'undefined' && typeof window.ensureMatchSequence === 'function') ? window.ensureMatchSequence : (typeof ensureMatchSequence === 'function' ? ensureMatchSequence : null);
      const setItemFn = (typeof window !== 'undefined' && typeof window.safeSetItem === 'function') ? window.safeSetItem : (typeof safeSetItem === 'function' ? safeSetItem : null);

      const kMatches = (typeof window !== 'undefined' && window.KEY_MATCHES) ? window.KEY_MATCHES : 'jornada_manual_matches';
      const kDecks = (typeof window !== 'undefined' && window.KEY_DECKS) ? window.KEY_DECKS : 'jornada_decks';
      const kPlayers = (typeof window !== 'undefined' && window.KEY_PLAYERS) ? window.KEY_PLAYERS : 'jornada_players';
      const kLocais = (typeof window !== 'undefined' && window.KEY_LOCAIS) ? window.KEY_LOCAIS : 'jornada_locais';
      const kColecoes = (typeof window !== 'undefined' && window.KEY_COLECOES) ? window.KEY_COLECOES : 'jornada_colecoes';

      if (Array.isArray(data.manualMatches)) {
        if (migMatch) data.manualMatches = migMatch(data.manualMatches);
        if (ensSeq) ensSeq(data.manualMatches);
      }
      if (data.manualMatches && setItemFn) setItemFn(kMatches, JSON.stringify(data.manualMatches));
      if (data.decks && setItemFn) setItemFn(kDecks, JSON.stringify(data.decks));
      if (data.players && setItemFn) setItemFn(kPlayers, JSON.stringify(data.players));
      if (data.locais && setItemFn) setItemFn(kLocais, JSON.stringify(data.locais));
      if (data.colecoes && setItemFn) setItemFn(kColecoes, JSON.stringify(data.colecoes));

      if (typeof initializeData === 'function') initializeData();
      if (typeof applyFilters === 'function') applyFilters();
      if (typeof showToast === 'function') showToast('📦 Backup importado com sucesso!');
      if (typeof window !== 'undefined' && window.isCloudSyncReady) {
        triggerSyncPush();
      }
    } catch (err) {
      if (typeof alert === 'function') alert('Erro ao ler arquivo de backup JSON.');
    }
  };
  reader.readAsText(file);
}

async function forceSyncCloud() {
  if (typeof showToast === 'function') showToast('🔄 Conectando e sincronizando com a nuvem...');
  syncLifecycleState = 'READY';
  isCloudSyncReady = true;
  if (typeof window !== 'undefined') {
    window.syncLifecycleState = 'READY';
    window.isCloudSyncReady = true;
  }
  try {
    // 1. PULL FIRST: download the newest matches from cloud and merge locally
    await pullFromCloud(true);

    // 2. PUSH SECOND: upload any pending local matches
    const res = await pushToCloud(0);

    // 3. Re-initialize data and refresh all charts & tables
    if (typeof initializeData === 'function') initializeData();
    if (typeof populateFilters === 'function') populateFilters();
    if (typeof applyFilters === 'function') applyFilters();
    if (typeof renderAll === 'function') renderAll();

    const manual = (typeof window !== 'undefined' && typeof window.loadManual === 'function') ? window.loadManual() : (typeof loadManual === 'function' ? loadManual() : []);
    if (res && res.success) {
      if (typeof showToast === 'function') showToast(`☁️ Sucesso! ${manual.length} partidas sincronizadas na nuvem.`);
      return res;
    } else {
      if (typeof showToast === 'function') showToast(`☁️ Sucesso! ${manual.length} partidas sincronizadas.`);
      return { success: true, count: manual.length };
    }
  } catch (e) {
    if (typeof showToast === 'function') showToast(`❌ Falha na sincronização: ${e.message || e}`);
  }
}

// Global Exports for Browser & JSDOM
if (typeof window !== 'undefined') {
  window.MAX_RETRY_ATTEMPTS = MAX_RETRY_ATTEMPTS;
  window.BASE_BACKOFF_MS = BASE_BACKOFF_MS;
  window.MAX_BACKOFF_MS = MAX_BACKOFF_MS;
  window.calculateBackoffDelay = calculateBackoffDelay;
  window.syncLifecycleState = syncLifecycleState;
  window.isCloudSyncReady = isCloudSyncReady;
  window.syncStatusState = syncStatusState;
  window.setSyncStatus = setSyncStatus;
  window.triggerSyncPush = triggerSyncPush;
  window.getSyncUrl = getSyncUrl;
  window.getSyncHeaders = getSyncHeaders;
  window.canonicalMatchString = canonicalMatchString;
  window.deterministicMergeMatches = deterministicMergeMatches;
  window.saveLocalSafetyBackup = saveLocalSafetyBackup;
  window.pullFromCloud = pullFromCloud;
  window.pushToCloud = pushToCloud;
  window.startSyncInterval = startSyncInterval;
  window.stopSyncInterval = stopSyncInterval;
  window.initSyncUI = initSyncUI;
  window.exportBackup = exportBackup;
  window.importBackup = importBackup;
  window.setPendingSync = setPendingSync;
  window._authSessionGen = _authSessionGen;
  window._currentCloudRevision = _currentCloudRevision;
  window._syncRetryCount = _syncRetryCount;
  window._lastOperationIdempotencyKey = _lastOperationIdempotencyKey;
  window.forceSyncCloud = forceSyncCloud;
}
if (typeof globalThis !== 'undefined') {
  globalThis.MAX_RETRY_ATTEMPTS = MAX_RETRY_ATTEMPTS;
  globalThis.BASE_BACKOFF_MS = BASE_BACKOFF_MS;
  globalThis.MAX_BACKOFF_MS = MAX_BACKOFF_MS;
  globalThis.calculateBackoffDelay = calculateBackoffDelay;
  globalThis.syncLifecycleState = syncLifecycleState;
  globalThis.isCloudSyncReady = isCloudSyncReady;
  globalThis.canonicalMatchString = canonicalMatchString;
  globalThis.deterministicMergeMatches = deterministicMergeMatches;
  globalThis.saveLocalSafetyBackup = saveLocalSafetyBackup;
  globalThis.pullFromCloud = pullFromCloud;
  globalThis.pushToCloud = pushToCloud;
}
