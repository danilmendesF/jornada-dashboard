const _rootAuth = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global);
// ── JS/AUTH.JS ──────────────────────────────────────────────────────────────
// Client Authentication & Team Session Management (Auth Wall & Modal)

// Immediate Anti-FOUC Session Pre-activation (CHG-001)
try {
  if (typeof localStorage !== 'undefined' && localStorage.getItem('jornada_auth_token') && localStorage.getItem('jornada_user_profile')) {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.classList.add('auth-session-active');
    }
  }
} catch (e) {}

_rootAuth.currentUser = null;


_rootAuth.getAuthToken = () => localStorage.getItem('jornada_auth_token') || '';
_rootAuth.getCurrentUser = () => { try { return JSON.parse(localStorage.getItem('jornada_user_profile')) || null; } catch { return null; } };
_rootAuth.getClaimedPlayers = () => { try { return JSON.parse(localStorage.getItem('jornada_claimed_players')) || []; } catch { return []; } };

_rootAuth.addClaimedPlayer = function(playerName) {
  const claimed = getClaimedPlayers();
  if (!claimed.includes(playerName)) {
    claimed.push(playerName);
    localStorage.setItem('jornada_claimed_players', JSON.stringify(claimed));
  }
};

_rootAuth.populatePlayerRegisterDropdowns = function() {
  const wallSel = document.getElementById('wallRegName');
  const authSel = document.getElementById('authRegName');
  const currentPlayers = typeof loadPlayers === 'function' ? loadPlayers() : ['Danilo', 'GuiVaz', 'Victor', 'Lipe'];
  const claimed = getClaimedPlayers();

  const availablePlayers = currentPlayers.filter(p => !claimed.includes(p.trim()));
  const optionsHtml = availablePlayers.map(p => `<option value="${p}">👤 ${p}</option>`).join('') +
    `<option value="__NEW__">➕ Cadastrar Novo Integrante...</option>`;

  if (wallSel) wallSel.innerHTML = optionsHtml;
  if (authSel) authSel.innerHTML = optionsHtml;
};

_rootAuth.fetchClaimedPlayers = async function() {
  try {
    const res = await fetch('/api/auth?action=claimed');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.claimed)) {
        localStorage.setItem('jornada_claimed_players', JSON.stringify(data.claimed));
        if (typeof populatePlayerRegisterDropdowns === 'function') populatePlayerRegisterDropdowns();
      }
    }
  } catch (e) {}
};

_rootAuth.initAuthSession = function() {
  _rootAuth.currentUser = getCurrentUser();
  populatePlayerRegisterDropdowns();
  updateAuthUI();
  fetchClaimedPlayers();
  const token = getAuthToken();
  if (token) verifyAuthToken(token);
};

// ── AUTH WALL INLINE FEEDBACK ────────────────────────────────────────────────
_rootAuth.showAuthWallFeedback = function(feedbackId, btnId, message, type, duration) {
  const el = document.getElementById(feedbackId);
  const btn = document.getElementById(btnId);
  if (!el) return;

  const colors = {
    success: { bg: 'rgba(46,232,160,0.12)', border: '#2ee8a0', color: '#2ee8a0', icon: '✅' },
    error:   { bg: 'rgba(247,80,80,0.12)',  border: '#f75050', color: '#f75050', icon: '❌' },
    loading: { bg: 'rgba(0,200,248,0.10)',  border: '#00c8f8', color: '#00c8f8', icon: '⏳' },
  };
  const c = colors[type] || colors.error;

  el.innerHTML = `<span>${c.icon} ${message}</span>`;
  el.style.cssText = [
    'display:flex', 'align-items:center', 'gap:0.4rem',
    `background:${c.bg}`, `border:1px solid ${c.bg === colors.loading.bg ? c.border : c.border}`,
    `color:${c.color}`, 'border-radius:8px', 'padding:0.55rem 0.8rem',
    'font-size:0.85rem', 'font-weight:600', 'margin-bottom:0.2rem',
    'animation:fadeInUp 0.25s ease',
  ].join(';');

  if (btn) {
    if (type === 'loading') {
      btn.disabled = true;
      btn.style.opacity = '0.6';
    } else {
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  }

  if (duration && duration > 0) {
    setTimeout(() => {
      el.style.display = 'none';
      el.innerHTML = '';
    }, duration);
  }
};

_rootAuth.clearAuthWallFeedback = function(feedbackId, btnId) {
  const el = document.getElementById(feedbackId);
  const btn = document.getElementById(btnId);
  if (el) { el.style.display = 'none'; el.innerHTML = ''; }
  if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
};

async function verifyAuthToken(token) {
  try {
    const res = await fetch(`/api/auth?token=${encodeURIComponent(token)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.valid && data.user) {
        _rootAuth.currentUser = data.user;
        localStorage.setItem('jornada_user_profile', JSON.stringify(data.user));
        console.log(`[Jornada Auth] Token de sessão verificado: user="${data.user.name}", id="${data.user.id}"`);
        updateAuthUI();
      }
    }
  } catch (e) {
    console.warn('[Jornada Auth] Falha na verificação offline do token:', e);
  }
}

_rootAuth.updateAuthUI = function() {
  const badge = document.getElementById('userProfileBadge');
  const wall = document.getElementById('authPageWall');
  const dashboard = document.getElementById('appDashboardContainer');

  const activeName = typeof getActivePlayerName === 'function' ? getActivePlayerName() : null;

  if (_rootAuth.currentUser || activeName) {
    document.documentElement.classList.add('auth-session-active');
    if (wall) wall.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';

    if (badge && _rootAuth.currentUser) {
      const isDanil = _rootAuth.currentUser.email === 'danilmendes@gmail.com';
      badge.innerHTML = `
        <div class="user-dropdown-container" id="profileDropdownContainer">
          <div class="user-dropdown-trigger">
            <img src="assets/trainer-avatar.svg" alt="Treinador" class="user-avatar" />
            <span class="user-name hide-on-mobile">${_rootAuth.currentUser.name}</span>
            <span class="dropdown-arrow hide-on-mobile">▼</span>
          </div>
          <div class="user-dropdown-menu">
            <div class="dropdown-header">
              <strong style="display:block;color:var(--text);">${_rootAuth.currentUser.name}</strong>
              <small style="color:var(--text2);font-size:0.75rem;">${_rootAuth.currentUser.email}</small>
            </div>
            <a href="#" class="dropdown-item">👤 Meu Perfil</a>
            <a href="#" class="dropdown-item" onclick="if(typeof forceSyncCloud==='function')forceSyncCloud();return false;">🔄 Sincronizar Nuvem</a>
            ${isDanil ? '<a href="#" class="dropdown-item" onclick="document.getElementById(\'btnOpenManager\').click()">📋 Gerenciar</a>' : ''}
            <div class="dropdown-divider"></div>
            <a href="#" class="dropdown-item text-red" onclick="logoutUser()">🚪 Sair</a>
          </div>
        </div>
      `;
    }

    if (typeof populateFilters === 'function') populateFilters();
    if (typeof populateQuickLogDropdowns === 'function') populateQuickLogDropdowns();
    if (typeof populatePlayerSelects === 'function') populatePlayerSelects();
    if (typeof populateDeckSelects === 'function') populateDeckSelects();
    if (typeof renderDecksList === 'function') renderDecksList();
    if (typeof renderPlayersList === 'function') renderPlayersList();
    if (typeof renderLocaisList === 'function') renderLocaisList();
    if (typeof renderColecoesList === 'function') renderColecoesList();
    if (typeof applyFilters === 'function') applyFilters();

    const btnManager = document.getElementById('btnOpenManager');
    if (btnManager) {
      btnManager.style.display = 'none';
    }

    const profileContainer = document.getElementById('profileDropdownContainer');
    if (profileContainer) {
      const trigger = profileContainer.querySelector('.user-dropdown-trigger');
      const menu = profileContainer.querySelector('.user-dropdown-menu');
      if (trigger && menu) {
        trigger.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          menu.classList.toggle('show-dropdown');
          
          // Fecha o menu hamburguer e filtros se estiverem abertos
          const mobileBtn = document.getElementById('mobileMenuBtn');
          const topNav = document.getElementById('topNavRouter');
          if (mobileBtn && topNav) {
            mobileBtn.classList.remove('is-active');
            topNav.classList.remove('menu-open');
          }
          document.getElementById('multiPlayerWrap')?.classList.remove('open');
          document.getElementById('multiDeckWrap')?.classList.remove('open');
          document.querySelectorAll('.searchable-select-wrap.open').forEach(w => w.classList.remove('open'));
        });
        document.addEventListener('click', (e) => {
          if (!profileContainer.contains(e.target)) {
            menu.classList.remove('show-dropdown');
          }
        });
      }
    }
  } else {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.classList.remove('auth-session-active');
    }
    if (wall) wall.style.display = 'flex';
    if (dashboard) dashboard.style.display = 'none';

    if (badge) {
      badge.innerHTML = `
        <button class="file-btn" onclick="openAuthModal('login')" style="font-size:0.8rem; padding:0.4rem 0.8rem; border-radius:50px; background:linear-gradient(135deg, var(--accent), var(--accent2)); color:#fff; font-weight:700;">
          🔑 Login / Cadastro
        </button>
      `;
    }

    if (typeof populateQuickLogDropdowns === 'function') populateQuickLogDropdowns();
    if (typeof populatePlayerSelects === 'function') populatePlayerSelects();
  }
};

_rootAuth.openAuthModal = function(tab = 'login') {
  if (typeof showModal === 'function') showModal('modalAuth');
  switchAuthTab(tab);
};

_rootAuth.switchAuthTab = function(tab) {
  const tabs = ['tabAuthLogin', 'tabAuthRegister', 'tabWallLogin', 'tabWallRegister'];
  const loginForms = [document.getElementById('authLoginForm'), document.getElementById('wallLoginForm')];
  const regForms = [document.getElementById('authRegisterForm'), document.getElementById('wallRegisterForm')];

  tabs.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id.toLowerCase().includes(tab)) el.classList.add('active');
    else el.classList.remove('active');
  });

  if (tab === 'login') {
    loginForms.forEach(f => { if (f) f.style.display = 'flex'; });
    regForms.forEach(f => { if (f) f.style.display = 'none'; });
  } else {
    loginForms.forEach(f => { if (f) f.style.display = 'none'; });
    regForms.forEach(f => { if (f) f.style.display = 'flex'; });
  }
};

_rootAuth.clearAuthForms = function() {
  const ids = ['wallLoginEmail', 'wallLoginPassword', 'wallRegEmail', 'wallRegPassword', 'wallRegConfirm', 'authLoginEmail', 'authLoginPassword', 'authRegEmail', 'authRegPassword', 'authRegConfirm'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const wH = document.getElementById('wallPasswordMatchHint');
  const aH = document.getElementById('authPasswordMatchHint');
  if (wH) wH.innerHTML = '';
  if (aH) aH.innerHTML = '';
};

_rootAuth.submitUserLogin = () => executeLogin(document.getElementById('authLoginEmail')?.value?.trim(), document.getElementById('authLoginPassword')?.value?.trim());
_rootAuth.submitWallLogin = () => executeLogin(document.getElementById('wallLoginEmail')?.value?.trim(), document.getElementById('wallLoginPassword')?.value?.trim());

async function executeLogin(email, password) {
  if (!email || !password) {
    showAuthWallFeedback('wallLoginFeedback', 'btnWallLogin', 'Preencha e-mail e senha!', 'error');
    return;
  }
  showAuthWallFeedback('wallLoginFeedback', 'btnWallLogin', 'Verificando credenciais...', 'loading');
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email, password })
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      showAuthWallFeedback('wallLoginFeedback', 'btnWallLogin', data.error || 'E-mail ou senha incorretos.', 'error');
      return;
    }

    localStorage.setItem('jornada_auth_token', data.token);
    localStorage.setItem('jornada_user_profile', JSON.stringify(data.user));
    _rootAuth.currentUser = data.user;
    console.log(`[Jornada Auth] Login realizado com sucesso: user="${data.user.name}", id="${data.user.id}", role="${data.user.role}"`);

    // CHG-006.2: Migrate legacy & anonymous storage to user namespace and re-initialize data
    if (typeof _rootAuth.migrateLegacyUserStorage === 'function') {
      _rootAuth.migrateLegacyUserStorage(data.user.id);
    }
    if (typeof _rootAuth.initializeData === 'function') {
      _rootAuth.initializeData();
    }

    showAuthWallFeedback('wallLoginFeedback', 'btnWallLogin', `Bem-vindo de volta, ${data.user.name}!`, 'success', 1200);

    // Pre-Pull Obrigatório antes de declarar READY (CHG-005)
    if (typeof _rootAuth.pullFromCloud === 'function') {
      try {
        console.log(`[Jornada Auth] Iniciando Pre-Pull obrigatório pós-login para o usuário "${data.user.name}"`);
        await _rootAuth.pullFromCloud(false);
      } catch (err) {
        console.warn('[Jornada Auth] Pre-Pull offline fallback pós-login:', err);
      }
    }
    if (typeof _rootAuth.startSyncInterval === 'function') {
      _rootAuth.startSyncInterval();
    }

    setTimeout(() => {
      clearAuthForms();
      updateAuthUI();
      if (typeof closeModal === 'function') closeModal('modalAuth');
    }, 900);
  } catch (e) {
    showAuthWallFeedback('wallLoginFeedback', 'btnWallLogin', 'Erro de conexão com o servidor.', 'error');
  }
}

_rootAuth.submitUserRegister = () => executeRegister(document.getElementById('authRegName')?.value?.trim(), document.getElementById('authRegEmail')?.value?.trim(), document.getElementById('authRegPassword')?.value?.trim(), document.getElementById('authRegConfirm')?.value?.trim());
_rootAuth.submitWallRegister = () => executeRegister(document.getElementById('wallRegName')?.value?.trim(), document.getElementById('wallRegEmail')?.value?.trim(), document.getElementById('wallRegPassword')?.value?.trim(), document.getElementById('wallRegConfirm')?.value?.trim());

async function executeRegister(selectedName, email, password, confirm) {
  let targetName = selectedName;
  if (targetName === '__NEW__') {
    targetName = prompt('Digite o nome do novo integrante do time:');
    if (!targetName || !targetName.trim()) {
      showAuthWallFeedback('wallRegFeedback', 'btnWallRegister', 'Nome de integrante inválido!', 'error');
      return;
    }
    targetName = targetName.trim();
  }

  if (!targetName || !email || !password || !confirm) {
    showAuthWallFeedback('wallRegFeedback', 'btnWallRegister', 'Preencha todos os campos obrigatórios!', 'error');
    return;
  }
  if (password !== confirm) {
    showAuthWallFeedback('wallRegFeedback', 'btnWallRegister', 'As senhas não coincidem!', 'error');
    return;
  }

  showAuthWallFeedback('wallRegFeedback', 'btnWallRegister', 'Criando sua conta...', 'loading');

  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', name: targetName, email, password })
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      showAuthWallFeedback('wallRegFeedback', 'btnWallRegister', data.error || 'Erro ao criar conta. Tente novamente.', 'error');
      return;
    }

    addClaimedPlayer(targetName);
    let players = typeof loadPlayers === 'function' ? loadPlayers() : [];
    if (!players.some(p => p.toLowerCase() === targetName.toLowerCase())) {
      players.push(targetName);
      if (typeof savePlayers === 'function') savePlayers(players);
    }

    let emailMsg = '';
    if (data.emailStatus?.delivered) emailMsg = ' 📧 E-mail de confirmação enviado!';

    showAuthWallFeedback('wallRegFeedback', 'btnWallRegister',
      `Cadastro realizado com sucesso!${emailMsg} Redirecionando para o login...`, 'success');

    setTimeout(() => {
      clearAuthForms();
      populatePlayerRegisterDropdowns();
      const wallEmail = document.getElementById('wallLoginEmail');
      const authEmail = document.getElementById('authLoginEmail');
      if (wallEmail) wallEmail.value = email;
      if (authEmail) authEmail.value = email;
      clearAuthWallFeedback('wallRegFeedback', 'btnWallRegister');
      switchAuthTab('login');
      showAuthWallFeedback('wallLoginFeedback', 'btnWallLogin',
        `Conta criada! Digite sua senha para entrar.`, 'success', 4000);
    }, 1800);

  } catch (e) {
    showAuthWallFeedback('wallRegFeedback', 'btnWallRegister', 'Erro de conexão com o servidor.', 'error');
  }
}

function logoutUser() {
  const _root = _rootAuth;
  if (typeof _root !== 'undefined') {
    _root._authSessionGen = ((_root._authSessionGen || 0) + 1);
  }
  if (_root._syncPushTimer) {
    clearTimeout(_root._syncPushTimer);
    _root._syncPushTimer = null;
  }
  if (typeof _root.stopSyncInterval === 'function') {
    _root.stopSyncInterval();
  }
  _root.syncLifecycleState = 'LOGGED_OUT';
  _root.isCloudSyncReady = false;
  _root._hasPendingSync = false;

  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('jornada_auth_token');
    localStorage.removeItem('jornada_user_profile');
  }
  _root.currentUser = null;
  console.log('[Jornada Auth] 👋 Sessão encerrada (Logout). State -> LOGGED_OUT');

  if (typeof allData !== 'undefined') allData = [];
  if (typeof filtered !== 'undefined') filtered = [];
  if (typeof _root.allData !== 'undefined') _root.allData = [];
  if (typeof _root.filtered !== 'undefined') _root.filtered = [];

  if (typeof clearAuthForms === 'function') clearAuthForms();
  if (typeof updateAuthUI === 'function') updateAuthUI();
  if (typeof showToast === 'function') showToast('👋 Sessão encerrada.');
}
_rootAuth.logoutUser = logoutUser;

function _oldLogoutUnused() {
  if (_rootAuth._syncPushTimer) {
    clearTimeout(_rootAuth._syncPushTimer);
    _rootAuth._syncPushTimer = null;
  }
  if (typeof _rootAuth.stopSyncInterval === 'function') {
    _rootAuth.stopSyncInterval();
  }
  _rootAuth.syncLifecycleState = 'LOGGED_OUT';
  _rootAuth.isCloudSyncReady = false;
  _rootAuth._hasPendingSync = false;

  localStorage.removeItem('jornada_auth_token');
  localStorage.removeItem('jornada_user_profile');
  _rootAuth.currentUser = null;

  if (typeof allData !== 'undefined') allData = [];
  if (typeof filtered !== 'undefined') filtered = [];
  if (typeof _rootAuth.allData !== 'undefined') _rootAuth.allData = [];
  if (typeof _rootAuth.filtered !== 'undefined') _rootAuth.filtered = [];

  clearAuthForms();
  updateAuthUI();
  showToast?.('👋 Sessão encerrada.');
};

_rootAuth.togglePasswordVisibility = function(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.innerHTML = input.type === 'password' ? '👁️' : '🙈';
};

_rootAuth.checkPasswordMatch = function(prefix) {
  const p1 = document.getElementById(`${prefix}RegPassword`)?.value;
  const p2 = document.getElementById(`${prefix}RegConfirm`)?.value;
  const hint = document.getElementById(`${prefix}PasswordMatchHint`);
  if (!hint) return;
  if (!p2) { hint.innerHTML = ''; return; }
  hint.innerHTML = p1 === p2
    ? '<span style="color:var(--green); font-size:0.78rem; font-weight:600; display:inline-block; margin-top:4px;">✅ Senhas coincidem!</span>'
    : '<span style="color:var(--red); font-size:0.78rem; font-weight:600; display:inline-block; margin-top:4px;">❌ As senhas não coincidem</span>';
};



if (typeof window !== 'undefined') window.logoutUser = logoutUser;
if (typeof globalThis !== 'undefined') globalThis.logoutUser = logoutUser;
