# 📝 SPEC_010: RESTRIÇÃO DE CRIAÇÃO DE PARTIDAS AO PRÓPRIO JOGADOR AUTENTICADO

- **Status**: 🟡 EM REVISÃO (Aguardando Aprovação do Usuário)
- **Autor**: Spec-Architect
- **Data**: 2026-08-05
- **Módulos Impactados**: `js/quicklog.js`, `js/manager_forms.js`, `manager.js`, `js/auth.js`

---

## 1. Visão Geral & Motivação
Esta especificação atende à regra de controle de acesso (RBAC) estrita para cadastro de partidas: quando um jogador está autenticado com seu usuário (ex: `GuiVaz` ou `Danilo`), os seletores de jogador para cadastrar nova partida — tanto no **Quick Log** quanto no **Registro Completo** — devem exibir e travar **apenas o próprio jogador vinculado à conta logada**, impedindo o lançamento de partidas em nome de terceiros.

---

## 2. Requisitos Funcionais (RF)

### RF-01: Restrição no Seletor do Quick Log (`#quickLogPlayer`)
- Em `populateQuickLogDropdowns()` em `js/quicklog.js`:
  - Se houver usuário autenticado (`currentUser`), o dropdown `#quickLogPlayer` deve conter **apenas a opção do próprio jogador logado** (`currentUser.linkedPlayer || currentUser.name`).
  - O campo deve ficar fixado no jogador autenticado para garantir que toda partida rápida seja gravada sob seu perfil.

### RF-02: Restrição no Seletor do Registro Completo (`#formMatchPlayer`)
- Em `populatePlayerSelects()` / `js/manager_forms.js` e `manager.js`:
  - Ao abrir a modal de Registro Completo de Partida, se o usuário estiver autenticado, o campo `#formMatchPlayer` deve listar **apenas o jogador logado** (ou travar a seleção no nome do integrante autenticado).

### RF-03: Validação de Segurança no Submit de Partidas
- Em `quickLogMatch()` (`js/quicklog.js`) e `saveMatch()` (`js/manager_forms.js`):
  - Validar se `matchData.Player` é idêntico ao jogador autenticado (`currentUser.linkedPlayer || currentUser.name`).
  - Se houver divergência, abortar o salvamento com toast de erro.

---

## 3. Critérios de Aceite & Validação
- [ ] No Quick Log, apenas o jogador logado aparece como opção para cadastrar partida.
- [ ] No Registro Completo, apenas o jogador logado aparece como opção para cadastrar partida.
- [ ] Tentativas de manipular a requisição para outro jogador são barradas.
- [ ] Suíte automatizada `node scripts/validate.cjs` e `node scripts/validate_auth.cjs` aprovada em 100% dos 61 testes.
