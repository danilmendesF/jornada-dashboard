/**
 * Roteamento SPA do Dashboard (Tabs) e Menu Mobile (CHG-001)
 * Gerencia a alternância de visibilidade entre as abas e o menu hambúrguer responsivo
 */

window.initRouter = function() {
  const navLinks = document.querySelectorAll('#topNavRouter .nav-link');
  const tabPanes = document.querySelectorAll('.page-tab');

  if (navLinks.length && tabPanes.length) {
    navLinks.forEach(link => {
      if (link.dataset.routerBound) return;
      link.dataset.routerBound = 'true';

      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        const targetId = link.getAttribute('data-target');
        if (!targetId) return;

        // Atualiza links
        navLinks.forEach(nav => nav.classList.remove('active'));
        link.classList.add('active');

        // Atualiza abas
        tabPanes.forEach(pane => {
          if (pane.id === targetId) {
            pane.classList.add('active');
            if (targetId === 'tab-analytics') {
              setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
              }, 50);
            }
          } else {
            pane.classList.remove('active');
          }
        });
      });
    });
  }

  // Mobile Hamburger Menu Toggle (CHG-001)
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const topNav = document.getElementById('topNavRouter');
  if (mobileBtn && topNav && !mobileBtn.dataset.menuBound) {
    mobileBtn.dataset.menuBound = 'true';

    mobileBtn.addEventListener('click', () => {
      topNav.classList.toggle('menu-open');
      mobileBtn.classList.toggle('is-active');
      // Close profile dropdown and filters if open
      const profileMenu = document.querySelector('.user-dropdown-menu');
      if (profileMenu) profileMenu.classList.remove('show-dropdown');
      document.getElementById('multiPlayerWrap')?.classList.remove('open');
      document.getElementById('multiDeckWrap')?.classList.remove('open');
      document.querySelectorAll('.searchable-select-wrap.open').forEach(w => w.classList.remove('open'));
    });

    // Fechar menu ao clicar num link
    topNav.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        topNav.classList.remove('menu-open');
        mobileBtn.classList.remove('is-active');
      });
    });
  }
};

if (typeof document !== 'undefined') {
  if (document.readyState !== 'loading') {
    window.initRouter();
  } else {
    document.addEventListener('DOMContentLoaded', window.initRouter);
  }
}

