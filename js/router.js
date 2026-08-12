/**
 * Roteamento SPA do Dashboard (Tabs)
 * Gerencia a alternância de visibilidade entre as abas e o redimensionamento de gráficos
 */
document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('#topNavRouter .nav-link');
  const tabPanes = document.querySelectorAll('.page-tab');

  if (!navLinks.length || !tabPanes.length) return;

  navLinks.forEach(link => {
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
          
          // Se for a aba de analytics, forçar um resize do window para o Chart.js recalcular larguras
          // pois canvas ocultos costumam ter width 0.
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
});
