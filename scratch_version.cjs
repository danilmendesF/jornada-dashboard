const fs = require('fs');
const jsCode = \

// ---------- POLÍTICA DE ATUALIZAÇÃO DE VERSÃO ---------- //
let versionInterval = null;
window.pendingVersionReload = false;

function checkAppVersion() {
  const currentVersionEl = document.getElementById('appVersion');
  if (!currentVersionEl) return;
  const currentVersion = currentVersionEl.textContent.trim();
  
  // Usamos timestamp para forçar bypass no cache do navegador/CDN
  fetch('version.json?t=' + Date.now())
    .then(r => r.json())
    .then(data => {
      if (data.version && data.version !== currentVersion) {
        handleVersionUpdate();
      }
    })
    .catch(err => {});
}

function handleVersionUpdate() {
  if (window.pendingVersionReload) return;

  const isMatchModalOpen = document.getElementById('modalMatchForm')?.style.display === 'flex';
  const isDeckModalOpen = document.getElementById('modalDeckForm')?.style.display === 'flex';
  const quickLogDeckVal = document.getElementById('quickLogDeck')?.value;
  const isQuickLogActive = quickLogDeckVal && quickLogDeckVal !== '';

  if (isMatchModalOpen || isDeckModalOpen || isQuickLogActive) {
    window.pendingVersionReload = true;
  } else {
    executeForcedLogout();
  }
}

window.executeForcedLogout = function() {
  const overlay = document.getElementById('versionReloadOverlay');
  if (overlay) overlay.classList.add('show');
  
  // Força logout removendo os tokens vitais
  localStorage.removeItem('jornada_sync_token');
  localStorage.removeItem(KEY_ADMIN_PIN);
  sessionStorage.removeItem('jornada_admin_unlocked');
  
  setTimeout(() => {
    location.reload(true);
  }, 2000);
}

function startVersionInterval() {
  if (versionInterval) clearInterval(versionInterval);
  // Checagem a cada 60 segundos
  versionInterval = setInterval(checkAppVersion, 60000);
}

// Loop contínuo para ejetar o usuário assim que ele terminar de preencher dados
setInterval(() => {
  if (window.pendingVersionReload) {
    const isMatchModalOpen = document.getElementById('modalMatchForm')?.style.display === 'flex';
    const isDeckModalOpen = document.getElementById('modalDeckForm')?.style.display === 'flex';
    const quickLogDeckVal = document.getElementById('quickLogDeck')?.value;
    const isQuickLogActive = quickLogDeckVal && quickLogDeckVal !== '';

    if (!isMatchModalOpen && !isDeckModalOpen && !isQuickLogActive) {
      window.executeForcedLogout();
    }
  }
}, 3000);

startVersionInterval();
\;

fs.appendFileSync('manager.js', jsCode);
