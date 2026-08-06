# 📝 SPEC_017: TRAVA BLINDADA DE PLAYER ÚNICO LOGADO NO QUICK LOG (#quickLogPlayer)

- **Status**: 🟡 EM REVISÃO (Aguardando Aprovação do Usuário)
- **Autor**: Spec-Architect
- **Data**: 2026-08-06
- **Módulos Impactados**: `js/config.js`, `js/quicklog.js`, `manager.js`, `js/auth.js`

---

## 1. Visão Geral & Motivação
Esta especificação resolve em caráter definitivo o problema reportado no screenshot do usuário: a caixa do Quick Log (`#quickLogPlayer`) exibia a lista de todos os 13 integrantes do time (`Danilo`, `Vini bala`, `Joca`, `André`, `JP`, etc.) mesmo quando o usuário estava logado na sua conta.

### Causa Raiz TÉCNICA:
Em determinadas rotinas de reinicialização ou sincronização em nuvem, o fallback `else` de `populatePlayerSelects()` e `populateQuickLogDropdowns()` re-injetava a lista global `players` no elemento `<select id="quickLogPlayer">`.

---

## 2. Requisitos Funcionais & Arquitetura (RF)

### RF-01: Helper Global Centralizado (`js/config.js`)
- Criar a função `window.getActivePlayerName()`:
  - Tenta resolver o nome do jogador autenticado inspecionando `window.currentUser`, `getCurrentUser()` e fallback direto no `localStorage` (`jornada_user_profile`).
  - Retorna a string do nome (ex: `"Danilo"`) se logado, ou `null` se deslogado.

### RF-02: Trava Blindada do Quick Log (`js/quicklog.js`)
- Em `populateQuickLogDropdowns()`:
  - Consultar `getActivePlayerName()`.
  - Se logado (`activeName` presente), o `<select id="quickLogPlayer">` é sobrescrito **EXCLUSIVAMENTE com 1 única opção**:
    `<option value="${activeName}">👤 ${activeName}</option>`.
  - Se deslogado, exibir a opção de instrução:
    `<option value="">🔑 Faça Login para Registrar Partida</option>`.

### RF-03: Bloqueio contra Re-injeção (`manager.js` - `populatePlayerSelects`)
- Em `populatePlayerSelects()` em `manager.js`:
  - Remover o elemento `#quickLogPlayer` do loop genérico que injeta a lista de todos os players (`players.forEach`).
  - Garantir que `#quickLogPlayer` receba apenas o jogador único `activeName`.

### RF-04: Sincronização em `js/auth.js` (`updateAuthUI`)
- Em `updateAuthUI()`, ao detectar login do usuário, forçar imediatamente a trava de `#quickLogPlayer` para o jogador ativo.

---

## 3. Critérios de Aceite & Validação
- [ ] O dropdown do Quick Log (`#quickLogPlayer`) exibe APENAS o jogador logado (ex: `👤 Danilo`), sem nenhuma opção de outros integrantes da equipe.
- [ ] Suíte automatizada `node scripts/validate.cjs` e `node scripts/validate_auth.cjs` aprovada em 100% dos 61 testes.
