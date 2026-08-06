// ── JS/AUTH.JS ──────────────────────────────────────────────────────────────
// Client Authentication & Team Session Management (Auth Wall & Modal)

window.currentUser = null;

window.getAuthToken = function() {
  return localStorage.getItem('jornada_auth_token') || '';
};

window.getCurrentUser = function() {
  try {
    return JSON.parse(localStorage.getItem('jornada_user_profile')) || null;
  } catch (e) {
    return null;
  }
};

window.getClaimedPlayers = function() {
  try {
    return JSON.parse(localStorage.getItem('jornada_claimed_players')) || [];
  } catch (e) {
    return [];
  }
};

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
    const isClaimed = claimed.includes(p.trim());
    if (isClaimed) {
      return `<option value="${p}" disabled style="color:var(--text2); opacity:0.5;">🔒 ${p} (Já Cadastrado)</option>`;
    }
    return `<option value="${p}">👤 ${p}</option>`;
  }).join('') + `<option value="__NEW__">➕ Cadastrar Novo Integrante...</option>`;

  if (wallSel) wallSel.innerHTML = optionsHtml;
  if (authSel) authSel.innerHTML = optionsHtml;
};

window.initAuthSession = function() {
  window.currentUser = getCurrentUser();
  populatePlayerRegisterDropdowns();
  updateAuthUI();

  const token = getAuthToken();
  if (token) {
    verifyAuthToken(token);
  }
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
    // Authenticated -> Hide Login Wall & Show Dashboard
    if (wall) wall.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';

    if (badge) {
      badge.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.4rem; background:rgba(124,106,247,0.18); border:1px solid var(--accent); padding:0.35rem 0.75rem; border-radius:50px; font-size:0.8rem; font-weight:700; color:var(--accent2);">
          <span style="font-size:0.9rem;">⚡</span>
          <span>${window.currentUser.name}</span>
          <button onclick="logoutUser()" title="Sair" style="background:none; border:none; color:var(--red); cursor:pointer; font-size:0.85rem; padding:0 0 0 0.3rem;">✕ Sair</button>
        </div>
      `;
    }

    if (quickLogPlayerSel) {
      for (let i = 0; i < quickLogPlayerSel.options.length; i++) {
        if (quickLogPlayerSel.options[i].value.toLowerCase() === window.currentUser.name.toLowerCase()) {
          quickLogPlayerSel.selectedIndex = i;
          break;
        }
      }
    }

    if (typeof applyFilters === 'function') applyFilters();
  } else {
    // Unauthenticated -> Show Login Wall & Hide Dashboard
    if (wall) wall.style.display = 'flex';
    if (dashboard) dashboard.style.display = 'none';

    if (badge) {
      badge.innerHTML = `
        <button class="file-btn" onclick="openAuthModal('login')" style="font-size:0.8rem; padding:0.4rem 0.8rem; border-radius:50px; background:linear-gradient(135deg, var(--accent), var(--accent2)); color:#fff; font-weight:700;">
          🔑 Login / Cadastro
        </button>
      `;
    }
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

window.submitUserLogin = function() {
  const email = document.getElementById('authLoginEmail')?.value?.trim();
  const password = document.getElementById('authLoginPassword')?.value?.trim();
  executeLogin(email, password);
};

window.submitWallLogin = function() {
  const email = document.getElementById('wallLoginEmail')?.value?.trim();
  const password = document.getElementById('wallLoginPassword')?.value?.trim();
  executeLogin(email, password);
};

window.clearAuthForms = function() {
  const ids = [
    'wallLoginEmail', 'wallLoginPassword', 'wallRegEmail', 'wallRegPassword', 'wallRegConfirm',
    'authLoginEmail', 'authLoginPassword', 'authRegEmail', 'authRegPassword', 'authRegConfirm'
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  const wallHint = document.getElementById('wallPasswordMatchHint');
  const authHint = document.getElementById('authPasswordMatchHint');
  if (wallHint) wallHint.innerHTML = '';
  if (authHint) authHint.innerHTML = '';
};

async function executeLogin(email, password) {
  if (!email || !password) {
    if (typeof showToast === 'function') showToast('⚠️ Preencha e-mail e senha!');
    return;
  }

  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email, password })
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      if (typeof showToast === 'function') showToast(`❌ ${data.error || 'Erro ao fazer login.'}`);
      return;
    }

    localStorage.setItem('jornada_auth_token', data.token);
    localStorage.setItem('jornada_user_profile', JSON.stringify(data.user));
    window.currentUser = data.user;

    clearAuthForms();
    updateAuthUI();

    if (typeof closeModal === 'function') closeModal('modalAuth');
    if (typeof showToast === 'function') showToast(`⚡ Bem-vindo de volta, ${data.user.name}!`);
  } catch (e) {
    if (typeof showToast === 'function') showToast('❌ Erro de conexão com o servidor de autenticação.');
  }
}

window.submitUserRegister = function() {
  const name = document.getElementById('authRegName')?.value?.trim();
  const email = document.getElementById('authRegEmail')?.value?.trim();
  const password = document.getElementById('authRegPassword')?.value?.trim();
  const confirm = document.getElementById('authRegConfirm')?.value?.trim();
  executeRegister(name, email, password, confirm);
};

window.submitWallRegister = function() {
  const name = document.getElementById('wallRegName')?.value?.trim();
  const email = document.getElementById('wallRegEmail')?.value?.trim();
  const password = document.getElementById('wallRegPassword')?.value?.trim();
  const confirm = document.getElementById('wallRegConfirm')?.value?.trim();
  executeRegister(name, email, password, confirm);
};

async function executeRegister(selectedName, email, password, confirm) {
  let targetName = selectedName;
  if (targetName === '__NEW__') {
    targetName = prompt('Digite o nome do novo integrante do time:');
    if (!targetName || !targetName.trim()) {
      if (typeof showToast === 'function') showToast('⚠️ Nome de integrante inválido!');
      return;
    }
    targetName = targetName.trim();
  }

  if (!targetName || !email || !password || !confirm) {
    if (typeof showToast === 'function') showToast('⚠️ Preencha todos os campos do cadastro!');
    return;
  }

  if (password !== confirm) {
    if (typeof showToast === 'function') showToast('⚠️ As senhas não coincidem!');
    return;
  }

  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', name: targetName, email, password })
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      if (typeof showToast === 'function') showToast(`❌ ${data.error || 'Erro no cadastro.'}`);
      return;
    }

    localStorage.setItem('jornada_auth_token', data.token);
    localStorage.setItem('jornada_user_profile', JSON.stringify(data.user));
    window.currentUser = data.user;

    // Claim the player name & add to team list if new
    addClaimedPlayer(targetName);
    let players = typeof loadPlayers === 'function' ? loadPlayers() : [];
    if (!players.some(p => p.toLowerCase() === targetName.toLowerCase())) {
      players.push(targetName);
      if (typeof savePlayers === 'function') savePlayers(players);
    }

    clearAuthForms();
    populatePlayerRegisterDropdowns();
    updateAuthUI();

    if (typeof closeModal === 'function') closeModal('modalAuth');

    if (data.emailStatus && data.emailStatus.delivered) {
      if (typeof showToast === 'function') showToast(`⚡ Conta associada a "${targetName}"! E-mail de confirmação enviado. 📧`);
    } else {
      if (typeof showToast === 'function') showToast(`⚡ Conta associada a "${targetName}" com sucesso!`);
    }
  } catch (e) {
    if (typeof showToast === 'function') showToast('❌ Erro de conexão com o servidor de autenticação.');
  }
}

window.logoutUser = function() {
  localStorage.removeItem('jornada_auth_token');
  localStorage.removeItem('jornada_user_profile');
  window.currentUser = null;
  clearAuthForms();
  updateAuthUI();
  if (typeof showToast === 'function') showToast('👋 Sessão encerrada.');
};

window.togglePasswordVisibility = function(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = '🙈';
  } else {
    input.type = 'password';
    btn.innerHTML = '👁️';
  }
};

window.checkPasswordMatch = function(prefix) {
  const passEl = document.getElementById(`${prefix}RegPassword`);
  const confEl = document.getElementById(`${prefix}RegConfirm`);
  const hintEl = document.getElementById(`${prefix}PasswordMatchHint`);

  if (!passEl || !confEl || !hintEl) return;

  const p1 = passEl.value;
  const p2 = confEl.value;

  if (!p2) {
    hintEl.innerHTML = '';
    return;
  }

  if (p1 === p2) {
    hintEl.innerHTML = '<span style="color:var(--green); font-size:0.78rem; font-weight:600; display:inline-block; margin-top:4px;">✅ Senhas coincidem!</span>';
  } else {
    hintEl.innerHTML = '<span style="color:var(--red); font-size:0.78rem; font-weight:600; display:inline-block; margin-top:4px;">❌ As senhas não coincidem</span>';
  }
};
