function cleanStorageQuota() {
  if (typeof localStorage === 'undefined') return;
  console.warn('[Jornada Storage] 🧹 Limpando dados redundantes do LocalStorage para liberar cota...');

  // 1. Clean old auto backups (keep only 1 latest)
  try {
    const backupsRaw = localStorage.getItem('jornada_auto_backups');
    if (backupsRaw) {
      const backups = JSON.parse(backupsRaw);
      if (Array.isArray(backups) && backups.length > 1) {
        localStorage.setItem('jornada_auto_backups', JSON.stringify([backups[backups.length - 1]]));
      }
    }
  } catch (e) {}

  // 2. Remove orphan/temporary namespaces and safety backups
  const keysToRemove = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith('jornada_u_anonymous_') || k.includes('_safety_backup') || k === 'jornada_safety_backup') {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => {
      try { localStorage.removeItem(k); } catch (e) {}
    });
  } catch (e) {}

  // 3. Remove legacy unprefixed keys if active user namespace exists
  const activeUid = (typeof window !== 'undefined' && typeof window.getActiveUserId === 'function') 
    ? window.getActiveUserId() 
    : (typeof getActiveUserId === 'function' ? getActiveUserId() : null);
  if (activeUid && activeUid !== 'anonymous') {
    const legacyKeys = ['jornada_manual_matches', 'jornada_decks', 'jornada_players', 'jornada_locais', 'jornada_colecoes', 'jornada_deleted_ids', 'jornada_edited_matches'];
    legacyKeys.forEach(k => {
      try { localStorage.removeItem(k); } catch (e) {}
    });
  }
}

function safeSetItem(key, val) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val);
    }
    return true;
  } catch (e) {
    console.warn('[Jornada Storage] Erro ao salvar chave no localStorage, executando recuperação de cota:', key, e);
    try {
      cleanStorageQuota();
      // If val is matches array, deduplicate before retrying
      if (typeof key === 'string' && key.includes('_matches')) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            const dedupFn = (typeof window !== 'undefined' && typeof window.deduplicateMatches === 'function')
              ? window.deduplicateMatches
              : (typeof deduplicateMatches === 'function' ? deduplicateMatches : null);
            if (dedupFn) {
              val = JSON.stringify(dedupFn(parsed));
            }
          }
        } catch (pe) {}
      }
      localStorage.setItem(key, val);
      console.log('[Jornada Storage] ✅ Recuperação de cota com sucesso para chave:', key);
      return true;
    } catch (retryErr) {
      console.error('[Jornada Storage] Falha crítica de cota no LocalStorage:', key, retryErr);
      if (typeof showToast === 'function') {
        showToast('⚠️ Armazenamento local do navegador cheio.');
      }
      return false;
    }
  }
}

function migrateLegacyMatches(matches) {
  if (!Array.isArray(matches) || matches.length === 0) return matches;

  const isValidUuidFn = typeof isValidUUID === 'function' ? isValidUUID : (typeof window !== 'undefined' ? window.isValidUUID : null);
  const genUuidFn = typeof generateUUID === 'function' ? generateUUID : (typeof window !== 'undefined' ? window.generateUUID : () => 'uuid_' + Date.now());

  let needsMigration = false;
  for (let i = 0; i < matches.length; i++) {
    if (matches[i] && isValidUuidFn && !isValidUuidFn(matches[i].id)) {
      needsMigration = true;
      break;
    }
  }

  if (!needsMigration) return matches;

  const idMap = new Map();
  matches.forEach(m => {
    if (!m) return;
    const oldId = String(m.id || '');
    if (isValidUuidFn && !isValidUuidFn(oldId)) {
      const newId = genUuidFn();
      idMap.set(oldId, newId);
      m.id = newId;
      if (!m.createdAt) {
        m.createdAt = m.Data ? `${m.Data}T12:00:00.000Z` : new Date().toISOString();
      }
      if (!m.updatedAt) {
        m.updatedAt = m.createdAt;
      }
    } else {
      idMap.set(oldId, oldId);
    }
  });

  // Repair mirror references
  matches.forEach(m => {
    if (!m) return;
    if (m._mirroredFrom && idMap.has(String(m._mirroredFrom))) {
      m._mirroredFrom = idMap.get(String(m._mirroredFrom));
    }
    if (m._mirrorId && idMap.has(String(m._mirrorId))) {
      m._mirrorId = idMap.get(String(m._mirrorId));
    }
  });

  return matches;
}

function migrateLegacyUserStorage(userId) {
  if (!userId || userId === 'anonymous' || typeof localStorage === 'undefined') return;
  const targetNs = `jornada_u_${userId}`;
  console.log(`[Jornada Storage] Executando migração de namespaces para o usuário "${userId}" (${targetNs})`);

  const copyIfMissing = (sourceKey, targetKey, isMatches = false) => {
    const srcRaw = localStorage.getItem(sourceKey);
    const tgtRaw = localStorage.getItem(targetKey);
    if (srcRaw) {
      if (!tgtRaw) {
        try {
          if (isMatches) {
            let parsed = JSON.parse(srcRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              parsed = migrateLegacyMatches(parsed);
              localStorage.setItem(targetKey, JSON.stringify(parsed));
            }
          } else {
            localStorage.setItem(targetKey, srcRaw);
          }
          console.log(`[Jornada Storage] Migrado "${sourceKey}" ➔ "${targetKey}"`);
        } catch (e) {
          console.warn(`[Jornada Storage] Erro ao migrar "${sourceKey}" para "${targetKey}":`, e);
        }
      }
      try {
        localStorage.removeItem(sourceKey);
      } catch (e) {}
    }
  };

  // 1. Matches migration (from legacy key and anonymous namespace)
  copyIfMissing('jornada_manual_matches', `${targetNs}_matches`, true);
  copyIfMissing('jornada_u_anonymous_matches', `${targetNs}_matches`, true);

  // 2. Decks migration
  copyIfMissing('jornada_decks', `${targetNs}_decks`);
  copyIfMissing('jornada_u_anonymous_decks', `${targetNs}_decks`);

  // 3. Players migration
  copyIfMissing('jornada_players', `${targetNs}_players`);
  copyIfMissing('jornada_u_anonymous_players', `${targetNs}_players`);

  // 4. Locais & Colecoes
  copyIfMissing('jornada_locais', `${targetNs}_locais`);
  copyIfMissing('jornada_u_anonymous_locais', `${targetNs}_locais`);
  copyIfMissing('jornada_colecoes', `${targetNs}_colecoes`);
  copyIfMissing('jornada_u_anonymous_colecoes', `${targetNs}_colecoes`);

  // 5. Deleted IDs & Edits & Archetype Unifications
  copyIfMissing('jornada_deleted_ids', `${targetNs}_deleted_ids`);
  copyIfMissing('jornada_u_anonymous_deleted_ids', `${targetNs}_deleted_ids`);
  copyIfMissing('jornada_deleted_decks', `${targetNs}_deleted_decks`);
  copyIfMissing('jornada_u_anonymous_deleted_decks', `${targetNs}_deleted_decks`);
  copyIfMissing('jornada_deleted_players', `${targetNs}_deleted_players`);
  copyIfMissing('jornada_u_anonymous_deleted_players', `${targetNs}_deleted_players`);
  copyIfMissing('jornada_deleted_locais', `${targetNs}_deleted_locais`);
  copyIfMissing('jornada_u_anonymous_deleted_locais', `${targetNs}_deleted_locais`);
  copyIfMissing('jornada_deleted_colecoes', `${targetNs}_deleted_colecoes`);
  copyIfMissing('jornada_u_anonymous_deleted_colecoes', `${targetNs}_deleted_colecoes`);
  copyIfMissing('jornada_edited_matches', `${targetNs}_edited_matches`);
  copyIfMissing('jornada_u_anonymous_edited_matches', `${targetNs}_edited_matches`);
  copyIfMissing('jornada_archetype_unifications', `${targetNs}_archetype_unifications`);
  copyIfMissing('jornada_u_anonymous_archetype_unifications', `${targetNs}_archetype_unifications`);
}

function loadDecks() {
  const k = (typeof window !== 'undefined' && window.KEY_DECKS) ? window.KEY_DECKS : (typeof getScopedKey === 'function' ? getScopedKey('jornada_decks') : 'jornada_decks');
  try {
    const raw = localStorage.getItem(k);
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d) && d.length > 0) return d;
    }
    // Fallback chain across user namespaces
    if (typeof localStorage !== 'undefined') {
      let bestData = [];
      const legacyRaw = localStorage.getItem('jornada_decks');
      if (legacyRaw) {
        try {
          const lData = JSON.parse(legacyRaw);
          if (Array.isArray(lData) && lData.length > bestData.length) bestData = lData;
        } catch(e) {}
      }
      for (let i = 0; i < localStorage.length; i++) {
        const candidateKey = localStorage.key(i);
        if (candidateKey && candidateKey !== k && /^jornada_u_.+_decks$/.test(candidateKey)) {
          try {
            const cData = JSON.parse(localStorage.getItem(candidateKey)) || [];
            if (Array.isArray(cData) && cData.length > bestData.length) bestData = cData;
          } catch(e) {}
        }
      }
      if (bestData.length > 0) {
        safeSetItem(k, JSON.stringify(bestData));
        return bestData;
      }
    }
    return [];
  } catch(e) { return []; }
}
function saveDecks(d) {
  const k = (typeof window !== 'undefined' && window.KEY_DECKS) ? window.KEY_DECKS : (typeof getScopedKey === 'function' ? getScopedKey('jornada_decks') : 'jornada_decks');
  safeSetItem(k, JSON.stringify(d));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
}

function loadManual() {
  const k = (typeof window !== 'undefined' && window.KEY_MATCHES) ? window.KEY_MATCHES : (typeof getScopedKey === 'function' ? getScopedKey('jornada_manual_matches') : 'jornada_manual_matches');
  try {
    let m = JSON.parse(localStorage.getItem(k)) || [];
    if (Array.isArray(m) && m.length > 0) {
      // Primary key has data — apply migrations, deduplicate and return
      const originalJson = JSON.stringify(m);
      m = migrateLegacyMatches(m);
      const dedupFn = (typeof window !== 'undefined' && typeof window.deduplicateMatches === 'function')
        ? window.deduplicateMatches
        : (typeof deduplicateMatches === 'function' ? deduplicateMatches : null);
      if (dedupFn) m = dedupFn(m);
      if (typeof ensureMatchSequence === 'function') ensureMatchSequence(m);
      if (JSON.stringify(m) !== originalJson) safeSetItem(k, JSON.stringify(m));
      return m;
    }

    // ── FALLBACK CHAIN: primary key was empty (likely namespace race on boot) ──
    if (typeof localStorage !== 'undefined') {
      let bestKey = null;
      let bestData = [];

      // 1. Check legacy key
      try {
        const legacyRaw = localStorage.getItem('jornada_manual_matches');
        if (legacyRaw) {
          const legacyData = JSON.parse(legacyRaw) || [];
          if (Array.isArray(legacyData) && legacyData.length > bestData.length) {
            bestData = legacyData;
            bestKey = 'jornada_manual_matches';
          }
        }
      } catch (e) {}

      // 2. Scan all jornada_u_*_matches keys (multi-user, multi-device)
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const candidateKey = localStorage.key(i);
          if (!candidateKey) continue;
          if (candidateKey === k) continue; // already checked
          if (/^jornada_u_.+_matches$/.test(candidateKey)) {
            try {
              const candidateData = JSON.parse(localStorage.getItem(candidateKey)) || [];
              if (Array.isArray(candidateData) && candidateData.length > bestData.length) {
                bestData = candidateData;
                bestKey = candidateKey;
              }
            } catch (e) {}
          }
        }
      } catch (e) {}

      if (bestData.length > 0) {
        console.warn(`[Jornada Storage] Primary key "${k}" vazia. Encontradas ${bestData.length} partidas no fallback "${bestKey}". Migrando.`);
        bestData = migrateLegacyMatches(bestData);
        const dedupFn = (typeof window !== 'undefined' && typeof window.deduplicateMatches === 'function')
          ? window.deduplicateMatches
          : (typeof deduplicateMatches === 'function' ? deduplicateMatches : null);
        if (dedupFn) bestData = dedupFn(bestData);
        if (typeof ensureMatchSequence === 'function') ensureMatchSequence(bestData);
        safeSetItem(k, JSON.stringify(bestData));
        return bestData;
      }
    }

    return [];
  } catch(e) { return []; }
}

function saveManual(m) {
  const k = (typeof window !== 'undefined' && window.KEY_MATCHES) ? window.KEY_MATCHES : (typeof getScopedKey === 'function' ? getScopedKey('jornada_manual_matches') : 'jornada_manual_matches');
  if (Array.isArray(m)) {
    m = migrateLegacyMatches(m);
    const dedupFn = (typeof window !== 'undefined' && typeof window.deduplicateMatches === 'function')
      ? window.deduplicateMatches
      : (typeof deduplicateMatches === 'function' ? deduplicateMatches : null);
    if (dedupFn) m = dedupFn(m);
    if (typeof ensureMatchSequence === 'function') {
      ensureMatchSequence(m);
    }
  }
  safeSetItem(k, JSON.stringify(m));
  console.log(`[Jornada Storage] saveManual: ${Array.isArray(m) ? m.length : 0} partidas salvas na chave "${k}"`);
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
}

function loadPlayers() {
  const k = (typeof window !== 'undefined' && window.KEY_PLAYERS) ? window.KEY_PLAYERS : (typeof getScopedKey === 'function' ? getScopedKey('jornada_players') : 'jornada_players');
  try {
    const raw = localStorage.getItem(k);
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p) && p.length > 0) return p;
    }
    // Fallback chain across user namespaces
    if (typeof localStorage !== 'undefined') {
      let bestData = [];
      const legacyRaw = localStorage.getItem('jornada_players');
      if (legacyRaw) {
        try {
          const lData = JSON.parse(legacyRaw);
          if (Array.isArray(lData) && lData.length > bestData.length) bestData = lData;
        } catch(e) {}
      }
      for (let i = 0; i < localStorage.length; i++) {
        const candidateKey = localStorage.key(i);
        if (candidateKey && candidateKey !== k && /^jornada_u_.+_players$/.test(candidateKey)) {
          try {
            const cData = JSON.parse(localStorage.getItem(candidateKey)) || [];
            if (Array.isArray(cData) && cData.length > bestData.length) bestData = cData;
          } catch(e) {}
        }
      }
      if (bestData.length > 0) {
        safeSetItem(k, JSON.stringify(bestData));
        return bestData;
      }
    }
    return ['Danilo', 'GuiVaz', 'Victor', 'Lipe'];
  } catch(e) { return ['Danilo', 'GuiVaz', 'Victor', 'Lipe']; }
}
function savePlayers(p) {
  const k = (typeof window !== 'undefined' && window.KEY_PLAYERS) ? window.KEY_PLAYERS : (typeof getScopedKey === 'function' ? getScopedKey('jornada_players') : 'jornada_players');
  safeSetItem(k, JSON.stringify(p));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
}

function loadLocais() {
  const k = (typeof window !== 'undefined' && window.KEY_LOCAIS) ? window.KEY_LOCAIS : (typeof getScopedKey === 'function' ? getScopedKey('jornada_locais') : 'jornada_locais');
  try {
    const raw = localStorage.getItem(k);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    if (typeof localStorage !== 'undefined') {
      const anonRaw = localStorage.getItem('jornada_u_anonymous_locais') || localStorage.getItem('jornada_locais');
      if (anonRaw) {
        const aData = JSON.parse(anonRaw);
        if (Array.isArray(aData) && aData.length > 0) {
          safeSetItem(k, JSON.stringify(aData));
          return aData;
        }
      }
    }
    return ['TCG Live', 'Liga Local', 'Regional', 'Treino', 'Outro'];
  } catch(e) { return ['TCG Live', 'Liga Local', 'Regional', 'Treino', 'Outro']; }
}
function saveLocais(l) {
  const k = (typeof window !== 'undefined' && window.KEY_LOCAIS) ? window.KEY_LOCAIS : (typeof getScopedKey === 'function' ? getScopedKey('jornada_locais') : 'jornada_locais');
  safeSetItem(k, JSON.stringify(l));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
}

function loadColecoes() {
  const k = (typeof window !== 'undefined' && window.KEY_COLECOES) ? window.KEY_COLECOES : (typeof getScopedKey === 'function' ? getScopedKey('jornada_colecoes') : 'jornada_colecoes');
  try {
    const raw = localStorage.getItem(k);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    if (typeof localStorage !== 'undefined') {
      const anonRaw = localStorage.getItem('jornada_u_anonymous_colecoes') || localStorage.getItem('jornada_colecoes');
      if (anonRaw) {
        const aData = JSON.parse(anonRaw);
        if (Array.isArray(aData) && aData.length > 0) {
          safeSetItem(k, JSON.stringify(aData));
          return aData;
        }
      }
    }
    return ['SV01: Scarlet & Violet', 'SV02: Paldea Evolved', 'SV03: Obsidian Flames', 'SV04: Paradox Rift', 'SV05: Temporal Forces'];
  } catch(e) { return ['SV01: Scarlet & Violet', 'SV02: Paldea Evolved', 'SV03: Obsidian Flames', 'SV04: Paradox Rift', 'SV05: Temporal Forces']; }
}
function saveColecoes(c) {
  const k = (typeof window !== 'undefined' && window.KEY_COLECOES) ? window.KEY_COLECOES : (typeof getScopedKey === 'function' ? getScopedKey('jornada_colecoes') : 'jornada_colecoes');
  safeSetItem(k, JSON.stringify(c));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
}

function loadDeleted() {
  const k = (typeof window !== 'undefined' && window.KEY_DELETED) ? window.KEY_DELETED : (typeof getScopedKey === 'function' ? getScopedKey('jornada_deleted_ids') : 'jornada_deleted_ids');
  try {
    const raw = localStorage.getItem(k);
    if (raw) return new Set(JSON.parse(raw) || []);
    if (typeof localStorage !== 'undefined') {
      const anonRaw = localStorage.getItem('jornada_u_anonymous_deleted_ids') || localStorage.getItem('jornada_deleted_ids');
      if (anonRaw) {
        const aSet = new Set(JSON.parse(anonRaw) || []);
        if (aSet.size > 0) {
          safeSetItem(k, JSON.stringify(Array.from(aSet)));
          return aSet;
        }
      }
    }
    return new Set();
  } catch(e) { return new Set(); }
}
function saveDeleted(s) {
  const k = (typeof window !== 'undefined' && window.KEY_DELETED) ? window.KEY_DELETED : (typeof getScopedKey === 'function' ? getScopedKey('jornada_deleted_ids') : 'jornada_deleted_ids');
  safeSetItem(k, JSON.stringify(Array.from(s)));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
}

function loadDeletedDecks() {
  const k = (typeof window !== 'undefined' && window.KEY_DELETED_DECKS) ? window.KEY_DELETED_DECKS : (typeof getScopedKey === 'function' ? getScopedKey('jornada_deleted_decks') : 'jornada_deleted_decks');
  try { return new Set(JSON.parse(localStorage.getItem(k)) || []); } catch(e) { return new Set(); }
}
function saveDeletedDecks(s) {
  const k = (typeof window !== 'undefined' && window.KEY_DELETED_DECKS) ? window.KEY_DELETED_DECKS : (typeof getScopedKey === 'function' ? getScopedKey('jornada_deleted_decks') : 'jornada_deleted_decks');
  safeSetItem(k, JSON.stringify(Array.from(s)));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
}

function loadDeletedPlayers() {
  const k = (typeof window !== 'undefined' && window.KEY_DELETED_PLAYERS) ? window.KEY_DELETED_PLAYERS : (typeof getScopedKey === 'function' ? getScopedKey('jornada_deleted_players') : 'jornada_deleted_players');
  try { return new Set(JSON.parse(localStorage.getItem(k)) || []); } catch(e) { return new Set(); }
}
function saveDeletedPlayers(s) {
  const k = (typeof window !== 'undefined' && window.KEY_DELETED_PLAYERS) ? window.KEY_DELETED_PLAYERS : (typeof getScopedKey === 'function' ? getScopedKey('jornada_deleted_players') : 'jornada_deleted_players');
  safeSetItem(k, JSON.stringify(Array.from(s)));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
}

function loadDeletedLocais() {
  const k = (typeof window !== 'undefined' && window.KEY_LOCAIS ? window.KEY_DELETED_LOCAIS : null) || (typeof getScopedKey === 'function' ? getScopedKey('jornada_deleted_locais') : 'jornada_deleted_locais');
  try { return new Set(JSON.parse(localStorage.getItem(k)) || []); } catch(e) { return new Set(); }
}
function saveDeletedLocais(s) {
  const k = (typeof window !== 'undefined' && window.KEY_LOCAIS ? window.KEY_DELETED_LOCAIS : null) || (typeof getScopedKey === 'function' ? getScopedKey('jornada_deleted_locais') : 'jornada_deleted_locais');
  safeSetItem(k, JSON.stringify(Array.from(s)));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
}

function loadDeletedColecoes() {
  const k = (typeof window !== 'undefined' && window.KEY_COLECOES ? window.KEY_DELETED_COLECOES : null) || (typeof getScopedKey === 'function' ? getScopedKey('jornada_deleted_colecoes') : 'jornada_deleted_colecoes');
  try { return new Set(JSON.parse(localStorage.getItem(k)) || []); } catch(e) { return new Set(); }
}
function saveDeletedColecoes(s) {
  const k = (typeof window !== 'undefined' && window.KEY_COLECOES ? window.KEY_DELETED_COLECOES : null) || (typeof getScopedKey === 'function' ? getScopedKey('jornada_deleted_colecoes') : 'jornada_deleted_colecoes');
  safeSetItem(k, JSON.stringify(Array.from(s)));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
}

function loadEdits() {
  const k = (typeof window !== 'undefined' && window.KEY_EDITS) ? window.KEY_EDITS : (typeof getScopedKey === 'function' ? getScopedKey('jornada_edited_matches') : 'jornada_edited_matches');
  try {
    const raw = localStorage.getItem(k);
    if (raw) return JSON.parse(raw) || {};
    if (typeof localStorage !== 'undefined') {
      const anonRaw = localStorage.getItem('jornada_u_anonymous_edited_matches') || localStorage.getItem('jornada_edited_matches');
      if (anonRaw) {
        const aEdits = JSON.parse(anonRaw) || {};
        if (Object.keys(aEdits).length > 0) {
          safeSetItem(k, JSON.stringify(aEdits));
          return aEdits;
        }
      }
    }
    return {};
  } catch(e) { return {}; }
}
function saveEdits(e) {
  const k = (typeof window !== 'undefined' && window.KEY_EDITS) ? window.KEY_EDITS : (typeof getScopedKey === 'function' ? getScopedKey('jornada_edited_matches') : 'jornada_edited_matches');
  safeSetItem(k, JSON.stringify(e));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
}

function loadArchetypeUnifications() {
  const k = (typeof window !== 'undefined' && typeof window.getScopedKey === 'function') ? window.getScopedKey('jornada_archetype_unifications') : 'jornada_archetype_unifications';
  try { return JSON.parse(localStorage.getItem(k)) || []; } catch(e) { return []; }
}
function saveArchetypeUnifications(rules) {
  const k = (typeof window !== 'undefined' && typeof window.getScopedKey === 'function') ? window.getScopedKey('jornada_archetype_unifications') : 'jornada_archetype_unifications';
  safeSetItem(k, JSON.stringify(rules));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
}

if (typeof window !== 'undefined') {
  window.safeSetItem = safeSetItem;
  window.migrateLegacyMatches = migrateLegacyMatches;
  window.migrateLegacyUserStorage = migrateLegacyUserStorage;
  window.loadDecks = loadDecks;
  window.saveDecks = saveDecks;
  window.loadManual = loadManual;
  window.saveManual = saveManual;
  window.loadPlayers = loadPlayers;
  window.savePlayers = savePlayers;
  window.loadLocais = loadLocais;
  window.saveLocais = saveLocais;
  window.loadColecoes = loadColecoes;
  window.saveColecoes = saveColecoes;
  window.loadDeleted = loadDeleted;
  window.saveDeleted = saveDeleted;
  window.loadDeletedDecks = loadDeletedDecks;
  window.saveDeletedDecks = saveDeletedDecks;
  window.loadDeletedPlayers = loadDeletedPlayers;
  window.saveDeletedPlayers = saveDeletedPlayers;
  window.loadDeletedLocais = loadDeletedLocais;
  window.saveDeletedLocais = saveDeletedLocais;
  window.loadDeletedColecoes = loadDeletedColecoes;
  window.saveDeletedColecoes = saveDeletedColecoes;
  window.loadEdits = loadEdits;
  window.saveEdits = saveEdits;
  window.loadArchetypeUnifications = loadArchetypeUnifications;
  window.saveArchetypeUnifications = saveArchetypeUnifications;
}
if (typeof globalThis !== 'undefined') {
  globalThis.safeSetItem = safeSetItem;
  globalThis.migrateLegacyMatches = migrateLegacyMatches;
  globalThis.migrateLegacyUserStorage = migrateLegacyUserStorage;
  globalThis.loadDecks = loadDecks;
  globalThis.saveDecks = saveDecks;
  globalThis.loadManual = loadManual;
  globalThis.saveManual = saveManual;
  globalThis.loadPlayers = loadPlayers;
  globalThis.savePlayers = savePlayers;
  globalThis.loadLocais = loadLocais;
  globalThis.saveLocais = saveLocais;
  globalThis.loadColecoes = loadColecoes;
  globalThis.saveColecoes = saveColecoes;
  globalThis.loadDeleted = loadDeleted;
  globalThis.saveDeleted = saveDeleted;
  globalThis.loadDeletedDecks = loadDeletedDecks;
  globalThis.saveDeletedDecks = saveDeletedDecks;
  globalThis.loadDeletedPlayers = loadDeletedPlayers;
  globalThis.saveDeletedPlayers = saveDeletedPlayers;
  globalThis.loadDeletedLocais = loadDeletedLocais;
  globalThis.saveDeletedLocais = saveDeletedLocais;
  globalThis.loadDeletedColecoes = loadDeletedColecoes;
  globalThis.saveDeletedColecoes = saveDeletedColecoes;
  globalThis.loadEdits = loadEdits;
  globalThis.saveEdits = saveEdits;
  globalThis.loadArchetypeUnifications = loadArchetypeUnifications;
  globalThis.saveArchetypeUnifications = saveArchetypeUnifications;
}
