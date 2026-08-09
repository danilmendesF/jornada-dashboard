// ── JS/STORAGE.JS ────────────────────────────────────────────────────────────
// Safe LocalStorage wrappers & CRUD helper functions

window.safeSetItem = function(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch (e) {
    console.error('LocalStorage error:', e);
    if (typeof showToast === 'function') {
      showToast('⚠️ Erro ao salvar dados no navegador!');
    }
  }
};

window.loadDecks = function() {
  try { return JSON.parse(localStorage.getItem(KEY_DECKS)) || []; } catch(e) { return []; }
};
window.saveDecks = function(d) {
  safeSetItem(KEY_DECKS, JSON.stringify(d));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
};

window.loadManual = function() {
  try {
    const m = JSON.parse(localStorage.getItem(KEY_MATCHES)) || [];
    if (Array.isArray(m) && typeof ensureMatchSequence === 'function') {
      ensureMatchSequence(m);
    }
    return m;
  } catch(e) { return []; }
};
window.saveManual = function(m) {
  if (Array.isArray(m) && typeof ensureMatchSequence === 'function') {
    ensureMatchSequence(m);
  }
  safeSetItem(KEY_MATCHES, JSON.stringify(m));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
};

window.loadPlayers = function() {
  try { return JSON.parse(localStorage.getItem(KEY_PLAYERS)) || ['Danilo', 'GuiVaz', 'Victor', 'Lipe']; } catch(e) { return ['Danilo', 'GuiVaz', 'Victor', 'Lipe']; }
};
window.savePlayers = function(p) {
  safeSetItem(KEY_PLAYERS, JSON.stringify(p));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
};

window.loadLocais = function() {
  try { return JSON.parse(localStorage.getItem(KEY_LOCAIS)) || ['TCG Live', 'Liga Local', 'Regional', 'Treino', 'Outro']; } catch(e) { return ['TCG Live', 'Liga Local', 'Regional', 'Treino', 'Outro']; }
};
window.saveLocais = function(l) {
  safeSetItem(KEY_LOCAIS, JSON.stringify(l));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
};

window.loadColecoes = function() {
  try { return JSON.parse(localStorage.getItem(KEY_COLECOES)) || ['SV01: Scarlet & Violet', 'SV02: Paldea Evolved', 'SV03: Obsidian Flames', 'SV04: Paradox Rift', 'SV05: Temporal Forces']; } catch(e) { return ['SV01: Scarlet & Violet', 'SV02: Paldea Evolved', 'SV03: Obsidian Flames', 'SV04: Paradox Rift', 'SV05: Temporal Forces']; }
};
window.saveColecoes = function(c) {
  safeSetItem(KEY_COLECOES, JSON.stringify(c));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
};

window.loadDeleted = function() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY_DELETED)) || []); } catch(e) { return new Set(); }
};
window.saveDeleted = function(s) {
  safeSetItem(KEY_DELETED, JSON.stringify(Array.from(s)));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
};

window.loadEdits = function() {
  try { return JSON.parse(localStorage.getItem(KEY_EDITS)) || {}; } catch(e) { return {}; }
};
window.saveEdits = function(e) {
  safeSetItem(KEY_EDITS, JSON.stringify(e));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
};

window.loadArchetypeUnifications = function() {
  try { return JSON.parse(localStorage.getItem('jornada_archetype_unifications')) || []; } catch(e) { return []; }
};
window.saveArchetypeUnifications = function(rules) {
  safeSetItem('jornada_archetype_unifications', JSON.stringify(rules));
  if (typeof triggerSyncPush === 'function') triggerSyncPush();
};
