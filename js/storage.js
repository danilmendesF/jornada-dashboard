// ── JS/STORAGE.JS ────────────────────────────────────────────────────────────
// Safe LocalStorage wrappers, Legacy Migration & User Storage Namespaces (CHG-006.2)

function safeSetItem(key, val) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val);
    }
  } catch (e) {
    console.error('LocalStorage error:', e);
    if (typeof showToast === 'function') {
      showToast('⚠️ Erro ao salvar dados no navegador!');
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

  // 1. Matches migration
  const legacyMatchesRaw = localStorage.getItem('jornada_manual_matches');
  const targetMatchesRaw = localStorage.getItem(`${targetNs}_matches`);

  if (legacyMatchesRaw && !targetMatchesRaw) {
    try {
      let legacyMatches = JSON.parse(legacyMatchesRaw);
      if (Array.isArray(legacyMatches) && legacyMatches.length > 0) {
        legacyMatches = migrateLegacyMatches(legacyMatches);
        localStorage.setItem(`${targetNs}_matches`, JSON.stringify(legacyMatches));
        localStorage.removeItem('jornada_manual_matches');
      }
    } catch (e) {
      console.warn('[Storage Migration] Erro ao migrar matches legadas:', e);
    }
  }

  // 2. Decks migration
  const legacyDecks = localStorage.getItem('jornada_decks');
  if (legacyDecks && !localStorage.getItem(`${targetNs}_decks`)) {
    localStorage.setItem(`${targetNs}_decks`, legacyDecks);
    localStorage.removeItem('jornada_decks');
  }

  // 3. Players migration
  const legacyPlayers = localStorage.getItem('jornada_players');
  if (legacyPlayers && !localStorage.getItem(`${targetNs}_players`)) {
    localStorage.setItem(`${targetNs}_players`, legacyPlayers);
    localStorage.removeItem('jornada_players');
  }

  // 4. Locais & Colecoes
  const legacyLocais = localStorage.getItem('jornada_locais');
  if (legacyLocais && !localStorage.getItem(`${targetNs}_locais`)) {
    localStorage.setItem(`${targetNs}_locais`, legacyLocais);
    localStorage.removeItem('jornada_locais');
  }
  const legacyColecoes = localStorage.getItem('jornada_colecoes');
  if (legacyColecoes && !localStorage.getItem(`${targetNs}_colecoes`)) {
    localStorage.setItem(`${targetNs}_colecoes`, legacyColecoes);
    localStorage.removeItem('jornada_colecoes');
  }

  // 5. Deleted IDs & Edits
  const legacyDeleted = localStorage.getItem('jornada_deleted_ids');
  if (legacyDeleted && !localStorage.getItem(`${targetNs}_deleted_ids`)) {
    localStorage.setItem(`${targetNs}_deleted_ids`, legacyDeleted);
    localStorage.removeItem('jornada_deleted_ids');
  }
  const legacyEdits = localStorage.getItem('jornada_edited_matches');
  if (legacyEdits && !localStorage.getItem(`${targetNs}_edited_matches`)) {
    localStorage.setItem(`${targetNs}_edited_matches`, legacyEdits);
    localStorage.removeItem('jornada_edited_matches');
  }
}

function loadDecks() {
  const k = (typeof window !== 'undefined' && window.KEY_DECKS) ? window.KEY_DECKS : (typeof getScopedKey === 'function' ? getScopedKey('jornada_decks') : 'jornada_decks');
  try { return JSON.parse(localStorage.getItem(k)) || []; } catch(e) { return []; }
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
      // Primary key has data — apply migrations and return
      const originalJson = JSON.stringify(m);
      m = migrateLegacyMatches(m);
      if (typeof ensureMatchSequence === 'function') ensureMatchSequence(m);
      if (JSON.stringify(m) !== originalJson) safeSetItem(k, JSON.stringify(m));
      return m;
    }

    // ── FALLBACK CHAIN: primary key was empty (likely namespace race on boot) ──
    // Scan localStorage for any jornada_u_*_matches key with data.
    // This handles the case where getActiveUserId() returned 'anonymous'
    // because jornada_user_profile hadn't been written yet by verifyAuthToken().
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
        console.warn(`[loadManual] Primary key "${k}" was empty. Found ${bestData.length} matches in fallback key "${bestKey}". Migrating to primary key.`);
        bestData = migrateLegacyMatches(bestData);
        if (typeof ensureMatchSequence === 'function') ensureMatchSequence(bestData);
        // Migrate data to the current primary key so future reads find it directly
        safeSetItem(k, JSON.stringify(bestData));
        return bestData;
      }
    }
    // ── END FALLBACK CHAIN ────────────────────────────────────────────────────

    return [];
  } catch(e) { return []; }
}

function saveManual(m) {
  const k = (typeof window !== 'undefined' && window.KEY_MATCHES) ? window.KEY_MATCHES : (typeof getScopedKey === 'function' ? getScopedKey('jornada_manual_matches') : 'jornada_manual_matches');
  if (Array.isArray(m)) {
    m = migrateLegacyMatches(m);
    if (typeof ensureMatchSequence === 'function') {
      ensureMatchSequence(m);
    }
  }
  safeSetItem(k, JSON.stringify(m));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
}

function loadPlayers() {
  const k = (typeof window !== 'undefined' && window.KEY_PLAYERS) ? window.KEY_PLAYERS : (typeof getScopedKey === 'function' ? getScopedKey('jornada_players') : 'jornada_players');
  try { return JSON.parse(localStorage.getItem(k)) || ['Danilo', 'GuiVaz', 'Victor', 'Lipe']; } catch(e) { return ['Danilo', 'GuiVaz', 'Victor', 'Lipe']; }
}
function savePlayers(p) {
  const k = (typeof window !== 'undefined' && window.KEY_PLAYERS) ? window.KEY_PLAYERS : (typeof getScopedKey === 'function' ? getScopedKey('jornada_players') : 'jornada_players');
  safeSetItem(k, JSON.stringify(p));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
}

function loadLocais() {
  const k = (typeof window !== 'undefined' && window.KEY_LOCAIS) ? window.KEY_LOCAIS : (typeof getScopedKey === 'function' ? getScopedKey('jornada_locais') : 'jornada_locais');
  try { return JSON.parse(localStorage.getItem(k)) || ['TCG Live', 'Liga Local', 'Regional', 'Treino', 'Outro']; } catch(e) { return ['TCG Live', 'Liga Local', 'Regional', 'Treino', 'Outro']; }
}
function saveLocais(l) {
  const k = (typeof window !== 'undefined' && window.KEY_LOCAIS) ? window.KEY_LOCAIS : (typeof getScopedKey === 'function' ? getScopedKey('jornada_locais') : 'jornada_locais');
  safeSetItem(k, JSON.stringify(l));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
}

function loadColecoes() {
  const k = (typeof window !== 'undefined' && window.KEY_COLECOES) ? window.KEY_COLECOES : (typeof getScopedKey === 'function' ? getScopedKey('jornada_colecoes') : 'jornada_colecoes');
  try { return JSON.parse(localStorage.getItem(k)) || ['SV01: Scarlet & Violet', 'SV02: Paldea Evolved', 'SV03: Obsidian Flames', 'SV04: Paradox Rift', 'SV05: Temporal Forces']; } catch(e) { return ['SV01: Scarlet & Violet', 'SV02: Paldea Evolved', 'SV03: Obsidian Flames', 'SV04: Paradox Rift', 'SV05: Temporal Forces']; }
}
function saveColecoes(c) {
  const k = (typeof window !== 'undefined' && window.KEY_COLECOES) ? window.KEY_COLECOES : (typeof getScopedKey === 'function' ? getScopedKey('jornada_colecoes') : 'jornada_colecoes');
  safeSetItem(k, JSON.stringify(c));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
}

function loadDeleted() {
  const k = (typeof window !== 'undefined' && window.KEY_DELETED) ? window.KEY_DELETED : (typeof getScopedKey === 'function' ? getScopedKey('jornada_deleted_ids') : 'jornada_deleted_ids');
  try { return new Set(JSON.parse(localStorage.getItem(k)) || []); } catch(e) { return new Set(); }
}
function saveDeleted(s) {
  const k = (typeof window !== 'undefined' && window.KEY_DELETED) ? window.KEY_DELETED : (typeof getScopedKey === 'function' ? getScopedKey('jornada_deleted_ids') : 'jornada_deleted_ids');
  safeSetItem(k, JSON.stringify(Array.from(s)));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
}

function loadEdits() {
  const k = (typeof window !== 'undefined' && window.KEY_EDITS) ? window.KEY_EDITS : (typeof getScopedKey === 'function' ? getScopedKey('jornada_edited_matches') : 'jornada_edited_matches');
  try { return JSON.parse(localStorage.getItem(k)) || {}; } catch(e) { return {}; }
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
  globalThis.loadEdits = loadEdits;
  globalThis.saveEdits = saveEdits;
  globalThis.loadArchetypeUnifications = loadArchetypeUnifications;
  globalThis.saveArchetypeUnifications = saveArchetypeUnifications;
}
