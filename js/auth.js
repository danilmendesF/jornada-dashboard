// ── JS/AUTH.JS ──────────────────────────────────────────────────────────────
// Client Authentication & Team Session Management (Auth Wall & Modal)

window.currentUser = null;

window.getAuthToken = () => localStorage.getItem('jornada_auth_token') || '';
window.getCurrentUser = () => { try { return JSON.parse(localStorage.getItem('jornada_user_profile')) || null; } catch { return null; } };
window.getClaimedPlayers = () => { try { return JSON.parse(localStorage.getItem('jornada_claimed_players')) || []; } catch { return []; } };

window.addClaimedPlayer = function(playerName) {
  const claimed = getClaimedPlayers();
  if (!claimed.includes(playerName)) {
    claimed.push(playerName);
    localStorage.setItem('jornada_claimed_players', JSON.stringify(claimed));
  }
};

window.populatePlayerRegisterDropdowns = function() {
  const wallSel = document.getElementById('wallRegName');
  const authSel = document.getElementById('authRegName');
  const currentPlayers = typeof loadPlayers === 'function' ? loadPlayers() : ['Danilo', 'GuiVaz', 'Victor', 'Lipe'];
  const claimed = getClaimedPlayers();

  const optionsHtml = currentPlayers.map(p => {
    return claimed.includes(p.trim())
      ? `<option value="${p}" disabled style="color:var(--text2); opacity:0.5;">🔒 ${p} (Já Cadastrado)</option>`
      : `<option value="${p}">👤 ${p}</option>`;
  }).join('') + `<option value="__NEW__">➕ Cadastrar Novo Integrante...</option>`;

  if (wallSel) wallSel.innerHTML = optionsHtml;
  if (authSel) authSel.innerHTML = optionsHtml;
};

window.initAuthSession = function() {
  window.currentUser = getCurrentUser();
  populatePlayerRegisterDropdowns();
  updateAuthUI();
  const token = getAuthToken();
  if (token) verifyAuthToken(token);
};

async function verifyAuthToken(token) {
  try {
    const res = await fetch(`/api/auth?token=${encodeURIComponent(token)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.valid && data.user) {
        window.currentUser = data.user;
        localStorage.setItem('jornada_user_profile', JSON.stringify(data.user));
        updateAuthUI();
      }
    }
  } catch (e) {
    console.warn('Auth token verify offline check:', e);
  }
}

window.updateAuthUI = function() {
  const badge = document.getElementById('userProfileBadge');
  const wall = document.getElementById('authPageWall');
  const dashboard = document.getElementById('appDashboardContainer');
  const quickLogPlayerSel = document.getElementById('quickLogPlayer');

  if (window.currentUser) {
    if (wall) wall.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';

    const activeName = window.currentUser?.linkedPlayer || window.currentUser?.name;
    if (quickLogPlayerSel && activeName) {
      quickLogPlayerSel.innerHTML = `<option value="${activeName}">👤 ${activeName}</option>`;
      quickLogPlayerSel.value = activeName;
    }

    if (badge) {
      badge.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.4rem; background:rgba(124,106,247,0.18); border:1px solid var(--accent); padding:0.35rem 0.75rem; border-radius:50px; font-size:0.8rem; font-weight:700; color:var(--accent2);">
          <span style="font-size:0.9rem;">⚡</span>
          <span>${window.currentUser.name}</span>
          <button onclick="logoutUser()" title="Sair" style="background:none; border:none; color:var(--red); cursor:pointer; font-size:0.85rem; padding:0 0 0 0.3rem;">✕ Sair</button>
        </div>
      `;
    }

    if (typeof populateQuickLogDropdowns === 'function') populateQuickLogDropdowns();
    if (typeof populatePlayerSelects === 'function') populatePlayerSelects();
    if (typeof applyFilters === 'function') applyFilters();
  } else {
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

window.openAuthModal = function(tab = 'login') {
  if (typeof showModal === 'function') showModal('modalAuth');
  switchAuthTab(tab);
};

window.switchAuthTab = function(tab) {
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

window.clearAuthForms = function() {
  const ids = ['wallLoginEmail', 'wallLoginPassword', 'wallRegEmail', 'wallRegPassword', 'wallRegConfirm', 'authLoginEmail', 'authLoginPassword', 'authRegEmail', 'authRegPassword', 'authRegConfirm'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const wH = document.getElementById('wallPasswordMatchHint');
  const aH = document.getElementById('authPasswordMatchHint');
  if (wH) wH.innerHTML = '';
  if (aH) aH.innerHTML = '';
};

window.submitUserLogin = () => executeLogin(document.getElementById('authLoginEmail')?.value?.trim(), document.getElementById('authLoginPassword')?.value?.trim());
window.submitWallLogin = () => executeLogin(document.getElementById('wallLoginEmail')?.value?.trim(), document.getElementById('wallLoginPassword')?.value?.trim());

async function executeLogin(email, password) {
  if (!email || !password) return showToast?.('⚠️ Preencha e-mail e senha!');
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email, password })
    });
    const data = await res.json();
    if (!res.ok || data.error) return showToast?.(`❌ ${data.error || 'Erro ao fazer login.'}`);

    localStorage.setItem('jornada_auth_token', data.token);
    localStorage.setItem('jornada_user_profile', JSON.stringify(data.user));
    window.currentUser = data.user;
    clearAuthForms();
    updateAuthUI();
    if (typeof closeModal === 'function') closeModal('modalAuth');
    showToast?.(`⚡ Bem-vindo de volta, ${data.user.name}!`);
  } catch (e) {
    showToast?.('❌ Erro de conexão com o servidor de autenticação.');
  }
}

window.submitUserRegister = () => executeRegister(document.getElementById('authRegName')?.value?.trim(), document.getElementById('authRegEmail')?.value?.trim(), document.getElementById('authRegPassword')?.value?.trim(), document.getElementById('authRegConfirm')?.value?.trim());
window.submitWallRegister = () => executeRegister(document.getElementById('wallRegName')?.value?.trim(), document.getElementById('wallRegEmail')?.value?.trim(), document.getElementById('wallRegPassword')?.value?.trim(), document.getElementById('wallRegConfirm')?.value?.trim());

async function executeRegister(selectedName, email, password, confirm) {
  let targetName = selectedName;
  if (targetName === '__NEW__') {
    targetName = prompt('Digite o nome do novo integrante do time:');
    if (!targetName || !targetName.trim()) return showToast?.('⚠️ Nome de integrante inválido!');
    targetName = targetName.trim();
  }

  if (!targetName || !email || !password || !confirm) return showToast?.('⚠️ Preencha todos os campos!');
  if (password !== confirm) return showToast?.('⚠️ As senhas não coincidem!');

  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', name: targetName, email, password })
    });

    const data = await res.json();
    if (!res.ok || data.error) return showToast?.(`❌ ${data.error || 'Erro no cadastro.'}`);

    addClaimedPlayer(targetName);
    let players = typeof loadPlayers === 'function' ? loadPlayers() : [];
    if (!players.some(p => p.toLowerCase() === targetName.toLowerCase())) {
      players.push(targetName);
      if (typeof savePlayers === 'function') savePlayers(players);
    }

    clearAuthForms();
    populatePlayerRegisterDropdowns();

    const wallEmail = document.getElementById('wallLoginEmail');
    const authEmail = document.getElementById('authLoginEmail');
    if (wallEmail) wallEmail.value = email;
    if (authEmail) authEmail.value = email;

    switchAuthTab('login');

    let emailMsg = '';
    if (data.emailStatus && data.emailStatus.delivered) {
      emailMsg = ' 📧 E-mail de confirmação enviado!';
    } else if (data.emailStatus && data.emailStatus.reason === 'RESEND_API_KEY_MISSING') {
      emailMsg = ' ⚠️ (E-mail não disparado: adicione RESEND_API_KEY na Vercel).';
    } else if (data.emailStatus && data.emailStatus.error) {
      emailMsg = ` ⚠️ (Resend: ${data.emailStatus.error})`;
    }

    showToast?.(`⚡ Cadastro realizado com sucesso! Digite sua senha para entrar.${emailMsg}`);
  } catch (e) {
    showToast?.('❌ Erro de conexão com o servidor de autenticação.');
  }
}

window.logoutUser = function() {
  localStorage.removeItem('jornada_auth_token');
  localStorage.removeItem('jornada_user_profile');
  window.currentUser = null;
  clearAuthForms();
  updateAuthUI();
  showToast?.('👋 Sessão encerrada.');
};

window.togglePasswordVisibility = function(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.innerHTML = input.type === 'password' ? '👁️' : '🙈';
};

window.checkPasswordMatch = function(prefix) {
  const p1 = document.getElementById(`${prefix}RegPassword`)?.value;
  const p2 = document.getElementById(`${prefix}RegConfirm`)?.value;
  const hint = document.getElementById(`${prefix}PasswordMatchHint`);
  if (!hint) return;
  if (!p2) { hint.innerHTML = ''; return; }
  hint.innerHTML = p1 === p2
    ? '<span style="color:var(--green); font-size:0.78rem; font-weight:600; display:inline-block; margin-top:4px;">✅ Senhas coincidem!</span>'
    : '<span style="color:var(--red); font-size:0.78rem; font-weight:600; display:inline-block; margin-top:4px;">❌ As senhas não coincidem</span>';
};

window.resetAllUserAccounts = async function() {
  if (!confirm('⚠️ Tem certeza que deseja apagar TODAS as contas de usuários e cadastros de jogadores? Todos os e-mails e nomes ficarão liberados para novos cadastros do zero.')) return;
  try {
    await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset_all' }) });
  } catch (e) { console.warn('Reset error:', e); }

  localStorage.removeItem('jornada_claimed_players');
  localStorage.removeItem('jornada_user_profile');
  localStorage.removeItem('jornada_auth_token');
  window.currentUser = null;
  clearAuthForms();
  populatePlayerRegisterDropdowns();
  updateAuthUI();
  showToast?.('🧹 Todas as contas de usuários foram resetadas com sucesso!');
};
