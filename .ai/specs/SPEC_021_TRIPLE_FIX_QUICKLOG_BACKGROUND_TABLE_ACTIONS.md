# 📝 SPEC_021: CORREÇÃO COMPLETA — QUICK LOG LOCK, IMAGEM DE FUNDO, OCULTAÇÃO NA TABELA, CADASTRO SEM DUPLICADOS E SYNC MULTI-SESSÃO

- **Status**: 🟡 EM REVISÃO (Aguardando Aprovação do Usuário)
- **Autor**: Spec-Architect & Lead Dev
- **Data**: 2026-08-06
- **Módulos Impactados**: `js/config.js`, `js/quicklog.js`, `js/auth.js`, `api/auth.js`, `js/table.js`, `style.css`, `scripts/build_bundle.cjs`, `js/sync_cloud.js`, `manager.js`

---

## 1. Visão Geral & Motivação

Esta especificação resolve de forma definitiva todos os pontos reportados pelo usuário:
1. **Quick Log Lock (`#quickLogPlayer`)**: Resolução robusta de `getActivePlayerName()` para objetos planos `{ name }` ou aninhados `{ user: { name } }`, forçando a tag `<select id="quickLogPlayer">` a ter apenas a opção única do jogador logado.
2. **Fundo da Tela de Login (`auth_background.jpg`)**: Cópia de `assets/` para `dist/assets/` no build de minificação, garantindo a exibição do wallpaper celestial na Vercel.
3. **Ocultação de Botões na Tabela (`js/table.js`)**: Partidas de outros integrantes não exibem nenhum botão nem badge (`👁️ Leitura`), mantendo a coluna totalmente limpa.
4. **Remoção de Jogadores Cadastrados no Registro da Login Wall (`#wallRegName`)**: Endpoint `/api/auth?action=claimed` para sincronizar os integrantes que já criaram conta via Redis KV e omiti-los 100% das opções de cadastro.
5. **Validação de Sincronização Multi-Sessão no Gerenciador**: Garantia de fusão bidirecional de `decks`, `players`, `locais`, `colecoes`, `edits`, `deleted*` e `archetypeUnifications` entre múltiplos dispositivos concorrentes.

---

## 2. Requisitos Funcionais (RF)

### RF-01: Resolução Robusta em `getActivePlayerName()` (`js/config.js` & `js/quicklog.js`)
- Desembalar objetos de sessão em formato plano ou aninhado (`user?.linkedPlayer || user?.name || user?.user?.linkedPlayer || user?.user?.name`).
- Forçar `#quickLogPlayer` a exibir exclusivamente 1 opção: `<option value="${activeName}">👤 ${activeName}</option>`.

### RF-02: Endpoint de Integrantes Cadastrados (`api/auth.js` & `js/auth.js`)
- Criar a ação `claimed` no backend Serverless `/api/auth` que consulta o Redis KV e retorna `{ claimed: ['Danilo', ...] }`.
- Em `js/auth.js`, disparar `fetchClaimedPlayers()` na inicialização para omitir todos os integrantes registrados de `#wallRegName` e `#authRegName`.

### RF-03: Assets no Build de Minificação (`scripts/build_bundle.cjs`)
- Adicionar no script `build_bundle.cjs` a cópia recursiva da pasta `assets/` para `dist/assets/`.

### RF-04: Ocultação Total de Ações em Partidas de Terceiros (`js/table.js`)
- Para partidas em que `isOwner` é falso, renderizar `""` na coluna de ações.

---

## 3. Critérios de Aceite & Validação
- [ ] O Quick Log exibe apenas o próprio jogador logado.
- [ ] O papel de parede celestial Pokédex é exibido perfeitamente na tela de login.
- [ ] O cadastro na Login Wall não mostra integrantes que já criaram conta.
- [ ] Partidas de outros jogadores não exibem botões nem texto de leitura.
- [ ] O Gerenciador de Dados sincroniza decks, players, locais, coleções e unificações sem conflitos entre múltiplos aparelhos.
- [ ] Suíte automatizada `node scripts/validate.cjs` e `node scripts/validate_auth.cjs` aprovada em 100% dos 61+ testes.
