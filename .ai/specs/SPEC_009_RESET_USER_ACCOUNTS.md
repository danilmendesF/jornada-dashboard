# 📝 SPEC_009: FERRAMENTA DE RESET TOTAL DE CONTAS E JOGADORES CADASTRAIS

- **Status**: 🟡 EM REVISÃO (Aguardando Aprovação do Usuário)
- **Autor**: Spec-Architect
- **Data**: 2026-08-05
- **Módulos Impactados**: `api/auth.js`, `js/auth.js`, `manager.js`, `index.html`

---

## 1. Visão Geral & Motivação
Esta especificação define uma funcionalidade para **resetar/limpar todas as contas de usuários e vínculos de jogadores cadastrados** tanto no banco de dados na nuvem (Vercel KV / Redis) quanto no ambiente local. Isso permite liberar imediatamente e-mails e nomes de integrantes (`Danilo`, `GuiVaz`, `Victor`, `Lipe`) para novos testes de cadastro do zero.

---

## 2. Requisitos Funcionais (RF)

### RF-01: Endpoint Backend de Reset Total (`POST /api/auth?action=reset_all`)
- O backend Node.js (`api/auth.js`) aceitará a ação `reset_all`.
- Ao receber a requisição de reset:
  - Varre e remove todas as chaves `user_*` e `player_claim_*` do Redis.
  - Limpa o conjunto `users_list`.
  - Retorna a confirmação de que todos os cadastros foram removidos do servidor.

### RF-02: Limpeza Local e Interface (`js/auth.js` & `manager.js`)
- Criar a função `resetAllUserAccounts()` acessível no painel do Gerenciador de Dados.
- Ao ser executada:
  - Envia a requisição `POST /api/auth?action=reset_all` ao servidor.
  - Limpa `jornada_claimed_players`, `jornada_user_profile` e `jornada_auth_token` do `localStorage`.
  - Re-popula os seletores de cadastro com todos os jogadores 100% liberados.
  - Exibe toast: `"🧹 Todas as contas e vínculos de jogadores foram resetados com sucesso!"`

---

## 3. Critérios de Aceite & Validação
- [ ] Botão/comando de Reset limpa com sucesso contas no Redis e no LocalStorage.
- [ ] Todos os nomes de integrantes (`Danilo`, `GuiVaz`, etc.) ficam destravados para novo cadastro.
- [ ] Suíte automatizada `node scripts/validate.cjs` e `node scripts/validate_auth.cjs` aprovada em 100% dos 61 testes.
