# Changelog — Jornada TCG Team Dashboard

Todas as alteracoes notaveis neste projeto serao documentadas neste arquivo.
O formato e baseado em Keep a Changelog e este projeto adere ao Versionamento Semantico.

## [2.1.11] - 2026-08-21
### Corrigido (Causas Raiz — Sincronização Multi-Device e Aba Anônima)
- **🔴 Campo `edits` vs `editedMatches` Mismatch (BUG CRÍTICO):** O `pushToCloud()` enviava o campo como `edits`, mas o Redis armazenava como `editedMatches`. O `pullFromCloud()` verificava `data.edits` que era sempre `undefined`. Resultado: edições de partidas nunca eram sincronizadas entre dispositivos. Corrigido em `js/sync_cloud.js` (push envia `editedMatches`, pull lê `data.editedMatches || data.edits`) e `api/sync.js` (Lua aceita ambos os nomes).
- **🔴 Aba Anônima Sem Pull da Nuvem (BUG CRÍTICO):** `initSyncUI()` entrava em `LOGGED_OUT` sem token e nunca chamava `pullFromCloud()`, mesmo que o GET `/api/sync` seja público. Aba anônima exibia 0 partidas. Corrigido: novo estado `READONLY` que faz pull read-only sem exigir JWT.
- **Sync Guard Bloqueava Dados em Modo READONLY:** O guard em `pullFromCloud()` descartava respostas quando `!currentToken`. Agora estados `READONLY` e `BOOTING` são isentos do guard de token.
- **Retry com Backoff para Sync Pendente após Pull Failure:** Se o pull falhasse com sync pendente, os dados ficavam presos no localStorage indefinidamente. Agora agenda retry automático com backoff exponencial (3s-30s).

---

## [2.1.10] - 2026-08-20
### Corrigido (Convergência Multi-Device, Auto-Push e Blindagem de Filtros)
- **Auto-Upload de Partidas Pendentes:** Adicionada verificação no `pullFromCloud()` que detecta se a base local possui mais partidas que a nuvem (`localManual.length > cloudCount`) e dispara automaticamente o `pushToCloud()`, convergindo as 692 partidas na nuvem.
- **Auto-Recuperação e Blindagem dos Filtros de Tela:** Adicionada auto-seleção em `populateMultiDeckFilter()` e `populateMultiPlayerFilter()` quando `selectedDecks` ou `selectedPlayers` iniciam vazios em aba anônima, e blindagem no `applyFilters()` para não descartar partidas na inicialização limpa.
- **Fallback Multi-Namespace para Decks e Players:** Implementada cadeia de busca em `loadDecks()` e `loadPlayers()` em `js/storage.js` para recuperar coleções de decks existentes em outros namespaces no `localStorage`.

---

## [2.1.9] - 2026-08-20
### Corrigido (Produção — Assets Estáticos, CSP, Aba Anônima & Multi-Device Sync)
- **Cópia de Assets Estáticos na Raiz Pública:** Atualizado `scripts/build_bundle.cjs` para copiar recursivamente `rootDir/assets` e `logo.png` diretamente para `public/assets/` e `public/logo.png`. Corrige o erro 404 de `/assets/trainer-avatar.svg` e `auth_background.jpg` na Vercel.
- **CSP Permissão de Sourcemaps:** Adicionado `https://cdn.jsdelivr.net` à diretiva `connect-src` no `vercel.json`, eliminando violações de CSP no carregamento de sourcemaps do Chart.js.
- **Reatividade de Filtros em Aba Anônima:** Inclusão de `populateFilters()`, `populateDeckSelects()`, `populatePlayerSelects()` e `populateQuickLogDropdowns()` após o `pullFromCloud()` e no `updateAuthUI()`, garantindo que novos logins em aba anônima populam `window.selectedDecks` e `window.selectedPlayers` e renderizam todas as partidas imediatamente.
- **Fusão Atômica e Deduplicada de Entidades Multi-Device:**
  - Substituída a comparação destrutiva `.length >= .length` no cliente (`pullFromCloud`) por fusão comutativa e deduplicada de `decks`, `players`, `locais` e `colecoes`.
  - Atualizado o script Lua do Redis (`LUA_SYNC_COMMIT`) e o fallback JS (`executeAtomicCommit`) no `api/sync.js` para mesclar decks, players, locais e coleções sem sobrescrever cadastros de outros integrantes do time.
  - Implementado cruzamento bidirecional de tombstones (`deletedIds`) no Redis e cliente para impedir ressuscitação de partidas deletadas.
- **Payload Completo no Push:** Inclusão de `locais` e `colecoes` customizados no payload de `pushToCloud()`.

---

## [2.1.8] - 2026-08-20
### Corrigido
- **`loadManual()` Fallback Chain:** Quando a chave primária retorna `[]` (namespace `anonymous` por race condition no boot), o sistema agora varre todas as chaves `jornada_u_*_matches` no localStorage e retorna o maior conjunto encontrado. Ao encontrar dados via fallback, migra automaticamente para a chave primária. Elimina definitivamente o bug `511 → 0`.
- **`executeForcedLogout` preserva auth no reload de versão:** O reload automático por nova versão detectada **não remove mais** `jornada_auth_token` nem `jornada_user_profile` do localStorage. Isso era uma causa raiz secundária do bug: o reload de versão forçava um boot sem perfil → namespace `anonymous` → dados invisíveis. Agora apenas limpa dados de sessão transitórios.
- **Detecção de versão imediata no boot:** `checkAppVersion()` agora roda 3 segundos após o carregamento da página, além do intervalo normal de 60s. Novas versões são detectadas assim que o usuário abre o app.

---

## [2.1.7] - 2026-08-20
### Corrigido (P0 Incident — Data Preservation)
- **FIX 1 — Namespace Race Condition no `pullFromCloud`:** As chaves de storage (`KEY_MATCHES`, `KEY_DECKS`, etc.) eram resolvidas de forma assíncrona após o `await fetch()`, quando `getActiveUserId()` ainda podia retornar `'anonymous'`. Resultado: o merge era salvo na chave errada (`jornada_u_anonymous_matches`), causando 511 → 0 na UI. Corrigido capturando todos os `_k*` de forma **síncrona antes do `fetch()`**, garantindo o UID correto.
- **FIX 2 — Auto-backup destruindo snapshot válido com snapshot vazio:** O `checkAndRunDailyAutoBackup` rodava 1500ms após o boot (estado transitório `allData=[]`) e sobrescrevia o snapshot do mesmo dia — apagando o backup de 511 partidas. Adicionado guard: se `matchesCount === 0` e existe qualquer backup anterior com dados, o snapshot é abortado.
- **FIX 3 — `initSyncUI` sem namespace resolvido:** `initAuthSession()` era chamado dentro de `initializeData()`, mas `initializeData()` era disparado pelo `pullFromCloud` após o fetch. Agora `initAuthSession()` é chamado **antes** de `pullFromCloud()` em `initSyncUI`, garantindo `window.currentUser` e o namespace correto no momento da captura das chaves.
- **Empty Cloud Guard:** Se Cloud retorna `[]` mas o local tem dados, o merge **não é executado** e nenhuma escrita é feita (Cloud vazia ≠ "usuário apagou tudo").
- **Logs de diagnóstico:** `[Sync Pull]` loga `localBefore`, `cloud`, `merged` e `key` para rastreabilidade futura.
- **Testes INCIDENT-001 a INCIDENT-012:** Suite completa de testes de regressão cobrindo todos os cenários do incidente de produção.

---

## [2.1.6] - 2026-08-20
### Corrigido (Hotfix de Produção)
- **Race Condition no Session Guard do Boot:** O `pullFromCloud` durante o BOOTING capturava `requestToken` antes do JWT estar disponível no localStorage. O Session Guard descartava silenciosamente toda a resposta do PULL, resultando em 0 partidas exibidas na Visão Geral. Corrigido com verificação `isBoot` que bypassa a checagem de igualdade de token durante o estado de inicialização.
- **Overwrite Destrutivo de Decks/Players no PULL:** `decks` e `players` retornados pela Cloud sobrescreviam diretamente os dados locais sem merge, podendo apagar dados locais com um payload menor da Cloud. Corrigido com merge não-destrutivo (preserva o conjunto maior).
- **CSP bloqueando Upstash Redis:** Adicionados `https://*.upstash.io` e `https://api.upstash.com` à diretiva `connect-src` do `vercel.json`.

---

## [2.1.5] - 2026-08-20
### Adicionado
- **CHG-006.4 Emergency Convergence:** Reconciliação automática de conflitos OCC (`HTTP 409`) com `PULL` imediato, `deterministicMergeMatches` cumulativo (`LOCAL ∪ CLOUD`) e **Retry Único** controlado (`MAX_RETRY_ATTEMPTS = 1`).
- **Pre-Push Local Safety Backup:** Função `saveLocalSafetyBackup()` criando snapshots de segurança escopados (`jornada_u_${uid}_safety_backup`) antes de mutações de reconciliação.
- **Suíte de Testes de Convergência Multi-Device:** 15 cenários de testes automatizados (`TEST-001` a `TEST-015`) em `tests/sync_conflict_retry.test.js`.

### Corrigido
- **Mitigação de Perda de Dados em Produção:** Eliminação de bloqueios de sincronização e divergências entre múltiplos dispositivos simultâneos (ex.: Thales e Danilo).
- **Proteção contra Overwrites Destrutivos:** Garantia estrita de união determinística por identidade estável UUIDv4, impossibilitando que snapshots menores sobrescrevam a Cloud ou apaguem dados locais.

---

## [1.8.0] - 2026-08-14
### Adicionado
- **SDD Specifications:** Especificacoes formais em `docs/specs/` (SPEC-001 a SPEC-006).
- **Architecture Decision Records:** Registros de decisao em `docs/decisions/` (ADR 0001 a ADR 0004).
- **Matriz de Testes Vitest:** Suites automatizadas para `stats.js`, `mirror.js`, `md3.js` e `email.js` (5 suites / 16 testes).
- **CI/CD Quality Gate:** Pipeline de integracao continua em `.github/workflows/ci.yml`.
- **SDD Validation Gate:** Script `scripts/validate_sdd.cjs` validando 32 criterios automatizados.

### Corrigido
- Refatoracao dos escopos em `js/stats.js` e `js/mirror.js` para compatibilidade modular com `window` e execucao sem `ReferenceError`.

---

## [1.7.9] - 2026-08-14
### Adicionado
- **Fase 0 Discovery:** Relatorios de auditoria em `docs/audit/` (`BASELINE.md`, `SYSTEM-MAP.md`, `KNOWLEDGE-RECONCILIATION.md`, `SECURITY-FINDINGS.md`, `DATA-INTEGRITY.md`, `OPEN-QUESTIONS.md`).
- **Governanca de IA:** Diretrizes arquiteturais em `.ai/` (`PROJECT_INDEX.md`, `PROJECT_CONTEXT.md`, `CODING_GUIDELINES.md`, `DO_NOT.md`, `KNOWN_PITFALLS.md`, `CHANGE_WORKFLOW.md`, `KNOWLEDGE_MODEL.md`).
- **Runbooks Operacionais:** Manuais em `docs/operations/` (`deployment.md`, `rollback.md`, `incident-response.md`, `environment.md`).

---

## [1.7.8] - 2026-08-14
### Modificado
- E-mail preview e links de CTA direcionados para o dominio de producao `https://www.jornadatcgteam.com.br`.

---

## [1.7.7] - 2026-08-14
### Adicionado
- Incorporacao do brasao oficial `logo.png` no cabecalho e rodape dos e-mails transacionais.

---

## [1.7.6] - 2026-08-14
### Modificado
- Reformulacao visual dos e-mails para Dark Theme Cyber Pokemon (`#060913`, `#0d1225`, `#7c3aed`, `#00c8f8`).

---

## [1.7.5] - 2026-08-14
### Adicionado
- Novo template responsivo de e-mail de boas-vindas estruturado via Resend API.

---

## [1.7.4] - 2026-08-14
### Adicionado
- Travamento automatico do jogador logado no formulario Quick Log via badge `.logged-player-badge`.

---

## [1.7.3] - 2026-08-14
### Adicionado
- Travamento do jogador logado no formulario de partida completa com bloqueio de auto-duelo.
- Restricao de data maxima permitida para nao ultrapassar a data atual.
- Aumento da area de comentarios e listas com barra de rolagem interna suave.

---

## [1.7.2] - 2026-08-14
### Modificado
- Ajustes de responsividade mobile e remocao do menu do rodape, incluindo disclaimer oficial de marcas Pokemon / RK9.

---

## [1.7.0] - 2026-08-10
### Corrigido
- Implementacao do parser de datas em 3 camadas (`getMatchTimestamp`) e sequenciamento cronologico absoluto (`seqID 1..N`).
