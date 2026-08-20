// ── JS/CONFIG.JS ─────────────────────────────────────────────────────────────
// Global constants, storage keys, namespaces, themes, and score rules (CHG-006.2)

window.getActiveUserId = function() {
  let user = typeof getCurrentUser === 'function' ? getCurrentUser() : window.currentUser;
  if (!user) {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('jornada_user_profile');
        if (raw) {
          const parsed = JSON.parse(raw);
          user = parsed?.user ? parsed.user : parsed;
        }
      }
    } catch (e) {}
  }
  if (user?.user) user = user.user;
  const rawId = user?.id || user?.userId || user?._id;
  if (rawId && typeof rawId === 'string' && rawId.trim()) {
    return rawId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  return 'anonymous';
};

window.getStorageNamespace = function(userId) {
  const uid = userId || window.getActiveUserId();
  return `jornada_u_${uid}`;
};

window.getStorageKey = function(resource, userId) {
  const ns = window.getStorageNamespace(userId);
  const cleanRes = String(resource || '').replace(/^jornada_(u_[a-zA-Z0-9_-]+_)?(manual_)?/, '');
  return `${ns}_${cleanRes}`;
};

window.getScopedKey = function(baseKey) {
  const uid = window.getActiveUserId();
  const map = {
    'jornada_manual_matches': `jornada_u_${uid}_matches`,
    'jornada_decks': `jornada_u_${uid}_decks`,
    'jornada_players': `jornada_u_${uid}_players`,
    'jornada_locais': `jornada_u_${uid}_locais`,
    'jornada_colecoes': `jornada_u_${uid}_colecoes`,
    'jornada_deleted_ids': `jornada_u_${uid}_deleted_ids`,
    'jornada_deleted_decks': `jornada_u_${uid}_deleted_decks`,
    'jornada_deleted_players': `jornada_u_${uid}_deleted_players`,
    'jornada_deleted_locais': `jornada_u_${uid}_deleted_locais`,
    'jornada_deleted_colecoes': `jornada_u_${uid}_deleted_colecoes`,
    'jornada_edited_matches': `jornada_u_${uid}_edited_matches`,
    'jornada_sync_pending': `jornada_u_${uid}_sync_pending`,
    'jornada_archetype_unifications': `jornada_u_${uid}_archetype_unifications`
  };
  return map[baseKey] || window.getStorageKey(baseKey, uid);
};

// Scoped property getters for dynamic active user keys
const defineScopedKey = (prop, baseKey) => {
  Object.defineProperty(window, prop, {
    get: () => window.getScopedKey(baseKey),
    configurable: true,
    enumerable: true
  });
};

defineScopedKey('KEY_MATCHES', 'jornada_manual_matches');
defineScopedKey('KEY_DECKS', 'jornada_decks');
defineScopedKey('KEY_PLAYERS', 'jornada_players');
defineScopedKey('KEY_LOCAIS', 'jornada_locais');
defineScopedKey('KEY_COLECOES', 'jornada_colecoes');
defineScopedKey('KEY_DELETED', 'jornada_deleted_ids');
defineScopedKey('KEY_DELETED_DECKS', 'jornada_deleted_decks');
defineScopedKey('KEY_DELETED_PLAYERS', 'jornada_deleted_players');
defineScopedKey('KEY_DELETED_LOCAIS', 'jornada_deleted_locais');
defineScopedKey('KEY_DELETED_COLECOES', 'jornada_deleted_colecoes');
defineScopedKey('KEY_EDITS', 'jornada_edited_matches');

window.KEY_ADMIN_PIN = 'jornada_admin_pin';
window.KEY_AUTO_BACKUPS = 'jornada_auto_backups';
window.KEY_LAST_AUTO_BACKUP_DATE = 'jornada_last_auto_backup_date';

window.PALETTE = ['#7c6af7','#c56af7','#34e0a1','#f5c842','#f75050','#38d9f5','#ff9f43','#54a0ff','#a29bfe','#fd79a8'];
window.WIN_COLOR  = '#34e0a1';
window.DRAW_COLOR = '#f5c842';
window.LOSS_COLOR = '#f75050';

window.PAGE_SIZE = 15;

window.PLACAR_RULES = {
  MD1: {
    'ALL':     ['1-0', '0-1', '0-0'],
    'Vitória': ['1-0'],
    'Empate':  ['0-0'],
    'Derrota': ['0-1']
  },
  MD3: {
    'ALL':     ['2-0', '2-1', '1-1', '1-0', '0-0', '0-1', '1-2', '0-2'],
    'Vitória': ['2-0', '2-1', '1-0'],
    'Empate':  ['1-1', '0-0'],
    'Derrota': ['0-2', '1-2', '0-1']
  }
};

window.getActivePlayerName = function() {
  let user = typeof getCurrentUser === 'function' ? getCurrentUser() : window.currentUser;
  if (!user) {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('jornada_user_profile');
        if (raw) {
          const parsed = JSON.parse(raw);
          user = parsed?.user ? parsed.user : parsed;
        }
      }
    } catch (e) {}
  }
  if (user?.user) user = user.user;
  const name = user?.linkedPlayer || user?.name;
  if (name && typeof name === 'string' && name.trim()) return name.trim();
  return null;
};

window.sanitizeHTML = function(str) {
  if (typeof str !== 'string') return str || '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
