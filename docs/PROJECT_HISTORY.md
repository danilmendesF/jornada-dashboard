# 📜 Histórico Completo do Projeto — Jornada TCG Team / Dashboard
## Transição de Contexto & Guia de Continuidade (Antigravity IDE)

---

## 1. Visão Geral do Sistema

* **Projeto:** Jornada TCG Team / Jornada Dashboard
* **Versão Canônica:** `v2.1.4` (Single Source of Truth em `package.json`, `version.json`, `dist/app.min.js`, `public/index.html`)
* **Metodologia de Engenharia:** Spec-Driven Development (SDD 2.0 Level 5 — Governança Máxima)
* **Arquitetura Base:** Local-First + Serverless Cloud Sync (Optimistic Concurrency Control — OCC)
* **Stack Tecnológico:**
  * **Frontend:** Vanilla JS modular (`js/`), bundling e minificação com Terser (`scripts/build_bundle.cjs`), CSS Cyber-Pokémon.
  * **Backend:** Vercel Serverless Functions (`api/sync.js`, `api/auth.js`, `api/email.js`, `api/tournaments_meta.js`).
  * **Storage / Nuvem:** LocalStorage no navegador (namespaced por usuário) + Upstash Redis Cluster (scripting atômico Lua).
  * **Testes & Quality Gates:** Vitest (27 suítes, 154 testes), AST Drift Detector (`scripts/drift_check.cjs`), SDD Validator (`scripts/validate_sdd.cjs` — 49/49 verificações).

---

## 2. Linha do Tempo das Mudanças & Entregas (Change Requests)

### 🔹 Ciclo CHG-001 a CHG-004 (Fase Inicial & Estabilização)
* **CHG-001:** Migração de inline scripts para bundle compilado, fortalecimento de CSP e restauração de menus mobile.
* **CHG-002:** Sincronização de nós DOM de versão (`#appVersion`) e prevenção por gates SDD.
* **CHG-003:** Estabelecimento do `package.json` como Single Source of Truth para versionamento automático em build.
* **CHG-004:** Implementação da agregação diária de meta dos torneios online (`api/tournaments_meta.js` / SPEC-009).

---

### 🔹 Ciclo CHG-005 / CHG-005.1 / CHG-005.2 / CHG-005.3 (Multi-Device Lifecycle & Guards)
* **CHG-005:** Introdução da máquina de ciclo de vida de sincronização (`syncLifecycleState`: `LOGGED_OUT`, `BOOTING`, `PULLING`, `READY`, `PUSHING`, `OFFLINE`).
* **CHG-005.1:** Implementação do **Pull-Before-Push**, **In-Flight Session Guard** (`_authSessionGen`) para descartar requisições após logout, e **Persistent Pending Sync** (`jornada_sync_pending`).
* **CHG-005.2 & CHG-005.3:** Auditoria e homologação E2E multi-device do bug de reversão de partidas entre dispositivos desatualizados.

---

### 🔹 Ciclo Fase 2: Sync Protocol v2 (CHG-006.1 a CHG-006.6)

#### 1. CHG-006.1 — UUIDv4 & Identificadores Imutáveis
* **ADR:** [`docs/decisions/0014-uuidv4-immutable-identities-and-seqid-decoupling.md`](docs/decisions/0014-uuidv4-immutable-identities-and-seqid-decoupling.md)
* **Escopo:** Substituição de IDs sequenciais/timestamp frágeis por UUIDv4 universais (`js/util.js: generateUUID`).
* **Migração:** Função `migrateLegacyMatches()` com desacoplamento retrocompatível de `seqID` para exibição cronológica.

#### 2. CHG-006.2 — User Storage Namespaces
* **ADR:** [`docs/decisions/0015-user-storage-namespaces.md`](docs/decisions/0015-user-storage-namespaces.md)
* **Escopo:** Eliminação do LocalStorage global compartilhado. Cada usuário autenticado agora possui namespace próprio: `jornada_u_{userId}_matches`, `jornada_u_{userId}_decks`, etc.
* **Isolamento:** `getStorageNamespace()` e `getScopedKey()` garantem isolamento hermético entre contas no mesmo navegador.

#### 3. CHG-006.3 — Redis Atomic Commit & OCC Backend
* **ADR:** [`docs/decisions/0016-redis-lua-atomic-commit-and-occ.md`](docs/decisions/0016-redis-lua-atomic-commit-and-occ.md)
* **Escopo:** Substituição do fluxo frágil de GET/SET por commit atômico via **Redis Lua Script (`LUA_SYNC_COMMIT`)**.
* **Mecanismos:** Validação de `baseRevision` enviada pelo cliente (retornando HTTP 409 em conflitos), incremento monotônico de `revision`, proteção contra snapshots vazios e suporte a `idempotencyKey`.

#### 4. CHG-006.4 — HTTP 409 Conflict Retry, Backoff & State Machine
* **ADR:** [`docs/decisions/0017-sync-conflict-retry-and-backoff.md`](docs/decisions/0017-sync-conflict-retry-and-backoff.md)
* **Escopo:** Tratamento automático de conflito 409 no cliente com estado `CONFLICT_RETRYING`, exponential backoff com full jitter (teto $MAX=3$), pull forçado, merge determinístico e retry com novo UUID de idempotência.

#### 5. CHG-006.5 — E2E Multi-Device Concurrency & Stress Homologation
* **ADR:** [`docs/decisions/0018-e2e-multi-device-concurrency-homologation.md`](docs/decisions/0018-e2e-multi-device-concurrency-homologation.md)
* **Suíte:** [`tests/sync_e2e_homologation.test.js`](tests/sync_e2e_homologation.test.js) (16 cenários: E2E-001 a E2E-016).
* **Conquistas:** Comprovação de convergência de 100% de identidade canônica (`canonicalizeSnapshot`) em rajadas de até 20 dispositivos e 400 mutações simultâneas.
* **Fixes Críticos Resolvidos:**
  * União cumulativa de tombstones (`deletedIds`) no backend Lua e JS.
  * Limpeza de `window._activePushPromise = null` no bloco `finally`.

#### 6. CHG-006.6 — Real Infrastructure E2E Validation Framework
* **ADR:** [`docs/decisions/0019-real-infrastructure-e2e-validation.md`](docs/decisions/0019-real-infrastructure-e2e-validation.md)
* **Suíte:** [`tests/sync_real_infrastructure.test.js`](tests/sync_real_infrastructure.test.js) (10 cenários reais: TEST REAL 001 a 010).
* **Mecanismo de Opt-in:** Protegido por flag de ambiente (`E2E_REAL=1` e `E2E_BASE_URL`), reportando status auditável e sem mocks artificiais.

---

## 3. Matriz de Invariantes Arquiteturais (INV-001 a INV-010)

```text
================================================================================
INVARIANTE | DESCRIÇÃO | STATUS
--------------------------------------------------------------------------------
INV-001    | Unicidade estrita de UUIDv4 em todos os registros       | PROVEN
INV-002    | Zero perda de mutações confirmadas sob alta contenção    | PROVEN
INV-003    | Monotonicidade da revision (R_{n+1} > R_n)               | PROVEN
INV-004    | Idempotência via idempotencyKey (Replay sem incremento) | PROVEN
INV-005    | Isolamento hermético de namespaces por usuário/token    | PROVEN
INV-006    | In-Flight Session Guard impede vazamentos pós-logout    | PROVEN
INV-007    | Tombstones prevalecem sobre edições (LWW Delete)        | PROVEN
INV-008    | Retries limitados a MAX=3 com Full Jitter               | PROVEN
INV-009    | Serialização de ciclo de push por sessão                | PROVEN
INV-010    | Convergência canônica determinística entre clientes     | PROVEN
================================================================================
```

---

## 4. Estrutura de Arquivos do Projeto

```text
jornada-dashboard/
├── .ai/                      # Contexto de IA, Workflows e Regras SDD
├── api/                      # Vercel Serverless Functions
│   ├── auth.js               # Autenticação JWT, Rate Limiting, Revogação
│   ├── email.js              # Envio de e-mails transacionais (Resend)
│   ├── sync.js               # OCC, Lua Atomic Commit, BOLA Authorization
│   └── tournaments_meta.js   # Agregação do Meta de Torneios
├── dist/                     # Bundles de Produção (app.min.js, style.min.css)
├── docs/
│   ├── contracts/            # Schemas JSON (match, sync-payload, jwt, etc.)
│   ├── decisions/            # ADRs 0001 a 0019 (Architecture Decision Records)
│   ├── specs/                # SPEC-001 a SPEC-009 (Especificações Formais)
│   └── operations/           # Runbooks de Deploy, Rollback, Incidents
├── js/                       # Módulos Vanilla JS do Frontend
│   ├── auth.js               # UI e Lifecycle de Autenticação
│   ├── config.js             # Constantes, Namespaces e Scoped Keys
│   ├── storage.js            # Safe LocalStorage, Migrações Legadas
│   ├── sync_cloud.js         # OCC State Machine, Backoff, Pull/Push
│   └── util.js               # UUIDv4, Sanitização XSS, Formatação
├── scripts/
│   ├── build_bundle.cjs      # Compilação e Minificação Terser
│   ├── drift_check.cjs       # Deep AST & Symbol Drift Detector
│   └── validate_sdd.cjs      # Validador de Governança SDD 2.0
└── tests/                    # Suítes de Teste Vitest (27 suítes / 154 testes)
```

---

## 5. Comandos de Operação e Quality Gates

Para validar o projeto a qualquer momento na IDE:

```bash
# 1. Compilação de Produção
npm run build

# 2. Execução de Todos os Testes
npx vitest run

# 3. Verificação de Integridade de Símbolos (Zero Drift)
node scripts/drift_check.cjs

# 4. Auditoria de Governança SDD 2.0 (49/49 Checks)
node scripts/validate_sdd.cjs

# 5. Execução de Homologação Real em Nuvem (Opt-in)
E2E_REAL=1 E2E_BASE_URL=https://sua-url.vercel.app JWT_SECRET=sua_chave npx vitest run tests/sync_real_infrastructure.test.js
```

---

## 6. Próximos Passos Recomendados

1. **Deploy para Ambiente de Staging / Produção na Vercel:**
   * Garantir injeção das variáveis `JWT_SECRET` e `REDIS_URL` no painel da Vercel.
2. **Execução de Homologação Live Opt-in:**
   * Rodar a suíte `tests/sync_real_infrastructure.test.js` contra a URL de staging para obter a chancela `FULLY VERIFIED — REAL INFRASTRUCTURE`.
3. **Novas Funcionalidades / Features:**
   * Seguir rigorosamente o fluxo de SDD 2.0 Level 5 (ADR $	o$ SPEC $	o$ Testes $	o$ Implementação $	o$ Quality Gates).
