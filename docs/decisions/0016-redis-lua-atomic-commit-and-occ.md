# ADR 0016: Commit Atômico com Redis Lua Script e Controle Otimista de Concorrência (OCC)

**Status:** ACEITO  
**Data:** 2026-08-19  
**Decisores:** Danilo Mendes / Equipe de Engenharia  
**Contexto:** CHG-006.3 — Phase 2: Sync Protocol v2 (Redis Atomic Commit & OCC Backend)

---

## 1. Contexto
No protocolo v2.1.4 (CHG-005), o endpoint `/api/sync` executava um ciclo de Read-Modify-Write não atômico (`client.get()` -> merge em memória JavaScript -> `client.set()`). Em cenários de múltiplos dispositivos salvando simultaneamente, duas requisições com a mesma revisão base podiam intercalar leituras e sobrescrever dados remotamente.

## 2. Decisão
1. **Controle Otimista de Concorrência (OCC):** Cada snapshot na nuvem possui um contador inteiro monotônico `revision`. Toda mutação do cliente envia `baseRevision`.
2. **Script Lua Atômico no Redis (`LUA_SYNC_COMMIT`):** A verificação de `baseRevision`, verificação de `idempotencyKey`, merge cumulativo, incremento de `revision` e persistência do snapshot são executados como uma única transação atômica indivisível no Redis.
3. **HTTP 409 Conflict:** Caso `baseRevision != currentRevision`, o script rejeita a mutação retornando `REVISION_CONFLICT` e o código HTTP 409.
4. **Idempotência por `idempotencyKey`:** Replays de requisições idênticas retornam sucesso (`IDEMPOTENT_REPLAY`) sem incrementar `revision` nem duplicar registros.
5. **Retrocompatibilidade:** Snapshots antigos sem `revision` assumem `currentRevision = 0` e avançam para `1` no primeiro commit bem-sucedido.

## 3. Consequências
- **Positivas:**
  - Eliminação definitiva de race conditions e sobrescritas cegas no backend;
  - Linearizabilidade de todas as mutações no Redis;
  - Preservação total de dados históricos e snapshots existentes;
  - Preparação completa para a recuperação e retry com backoff no cliente (CHG-006.4).
