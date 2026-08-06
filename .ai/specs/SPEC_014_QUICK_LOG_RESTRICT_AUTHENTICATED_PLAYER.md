# 📝 SPEC_014: RESTRIÇÃO ESTRITA DE PLAYER LOGADO NO QUICK LOG (#quickLogPlayer)

- **Status**: 🟡 EM REVISÃO (Aguardando Aprovação do Usuário)
- **Autor**: Spec-Architect
- **Data**: 2026-08-06
- **Módulos Impactados**: `js/quicklog.js`, `manager.js`, `js/auth.js`

---

## 1. Visão Geral & Motivação
Esta especificação atende ao bug informado pelo usuário: o formulário de Quick Log (`#quickLogPlayer`) estava exibindo a lista de todos os jogadores do time (`['Danilo', 'GuiVaz', 'Victor', 'Lipe']`) em vez de restringir exclusivamente ao jogador autenticado (`👤 ${activeName}`).

A causa identificada é a inicialização de `populateQuickLogDropdowns()` antes da resolução completa do perfil `window.currentUser` no `localStorage`, além do fallback que recarregava a lista global em execuções de sincronização.

---

## 2. Requisitos Funcionais (RF)

### RF-01: Restrição Tripla no Dropdown Quick Log (`#quickLogPlayer`)
- **Em `js/quicklog.js` (`populateQuickLogDropdowns`)**:
  - Tentar resolver o perfil do usuário logado via `getCurrentUser()`, `window.currentUser` ou fallback direto no `localStorage.getItem('jornada_user_profile')`.
  - Se houver usuário autenticado (`activeName`), a tag `<select id="quickLogPlayer">` é renderizada **EXCLUSIVAMENTE com a opção do jogador logado**:
    `<option value="${activeName}">👤 ${activeName}</option>`
  - Desabilitar a opção de trocar de player no Quick Log quando autenticado.

### RF-02: Sincronização em `manager.js` (`populatePlayerSelects`)
- Incluir `#quickLogPlayer` no encadeamento de população de seletores em `manager.js`.
- Garantir que tanto `#formMatchPlayer` quanto `#quickLogPlayer` respeitem o jogador autenticado `activeName`.

### RF-03: Sincronização em `js/auth.js` (`updateAuthUI`)
- Toda vez que a interface de autenticação atualizar (`updateAuthUI()`), o dropdown `#quickLogPlayer` é imediatamente forçado a conter apenas o jogador autenticado.

---

## 3. Critérios de Aceite & Validação
- [ ] No Quick Log (`#quickLogPlayer`), a única opção visível é o jogador logado (ex: `👤 Danilo`).
- [ ] Usuários deslogados (modo visitante) continuam visualizando a lista completa para fins de teste.
- [ ] Suíte automatizada `node scripts/validate.cjs` e `node scripts/validate_auth.cjs` aprovada em 100% dos 61 testes.
