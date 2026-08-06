// ── JS/CONFIG.JS ─────────────────────────────────────────────────────────────
// Global constants, storage keys, themes, and score rules

window.KEY_DECKS = 'jornada_decks';
window.KEY_MATCHES = 'jornada_manual_matches';
window.KEY_PLAYERS = 'jornada_players';
window.KEY_LOCAIS = 'jornada_locais';
window.KEY_COLECOES = 'jornada_colecoes';
window.KEY_DELETED = 'jornada_deleted_ids';
window.KEY_DELETED_DECKS = 'jornada_deleted_decks';
window.KEY_DELETED_PLAYERS = 'jornada_deleted_players';
window.KEY_DELETED_LOCAIS = 'jornada_deleted_locais';
window.KEY_DELETED_COLECOES = 'jornada_deleted_colecoes';
window.KEY_EDITS = 'jornada_edited_matches';
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
    try { user = JSON.parse(localStorage.getItem('jornada_user_profile')) || null; } catch (e) {}
  }
  const name = user?.linkedPlayer || user?.name;
  if (name && typeof name === 'string' && name.trim()) return name.trim();
  return null;
};
