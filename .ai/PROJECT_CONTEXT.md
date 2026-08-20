# AI Project Context — Jornada TCG Team

**Status:** VERIFIED (Phase 2 — Sync Protocol v2 Homologated)  
**Versao Canônica:** `v2.1.4`  
**Ambiente de Execucao:** Single Page Application (Vanilla JS) + Vercel Serverless Functions + Redis KV.  
**Metodologia:** Spec-Driven Development (SDD 2.0 Level 5)  
**Documento de Histórico Completo:** [`docs/PROJECT_HISTORY.md`](../docs/PROJECT_HISTORY.md)

---

## 1. Visao Geral
O **Jornada TCG Team Dashboard** e a plataforma oficial de inteligencia competitiva e registro de partidas da equipe Jornada TCG. A plataforma opera em arquitetura **Local-First com Cloud Sync via OCC**, garantindo que jogadores possam registrar partidas e consultar dados mesmo em locais com sinal instavel durante grandes torneios.

---

## 2. Premissas de Arquitetura & Sync Protocol v2
1. **Zero Framework Bloat:** O frontend nao utiliza frameworks pesados no cliente; utiliza JavaScript nativo altamente otimizado e modularizado em `js/`.
2. **Bundle Unico em Producao:** Em desenvolvimento os scripts rodam modularizados; para deploy, `scripts/build_bundle.cjs` gera `dist/app.min.js` e `dist/style.min.css`.
3. **Identificadores Imutáveis UUIDv4:** Todas as partidas utilizam UUIDv4 imutáveis (`js/util.js: generateUUID`), desacoplados de exibição cronológica.
4. **User Storage Namespaces:** Isolamento hermético de `localStorage` por usuário autenticado (`jornada_u_{userId}_*`).
5. **Redis Lua Atomic Commit & OCC:** Commit atômico via `LUA_SYNC_COMMIT` no Redis com validação de `baseRevision` e `idempotencyKey`.
6. **Conflict Retry & Backoff:** Resposta HTTP 409 aciona máquina de estados com exponential backoff + full jitter, pull forçado, merge determinístico e retry com nova idempotencyKey.
7. **Qualidade & Drift Zero:** 27 suítes no Vitest (154 testes), 0 drifts em `drift_check.cjs`, 49/49 checks em `validate_sdd.cjs`.
