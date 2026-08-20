---
id: SPEC-005
title: Sincronizacao em Nuvem, OCC, Conflict Retry e Multi-Device Convergence
status: VERIFIED
version: 3.2.0
tested_by: tests/sync_conflict_retry.test.js
updated_at: 2026-08-20
---

# SPEC-005: Sincronizacao em Nuvem, OCC, Conflict Retry e Multi-Device Convergence (CHG-006.4 Emergency)

## 1. Requisitos de Negocio
- Persistencia hibrida Local-First: gravacao sincrona em `localStorage` namespaced e replicacao assincrona no Redis.
- Controle Otimista de Concorrencia (OCC) via revisoes monotonicas (`revision`) e validacao de `baseRevision`.
- Commit atomico no Redis executado via script Lua (`LUA_SYNC_COMMIT`), eliminando condicoes de corrida Read-Modify-Write.
- Deteccao automatica de conflito HTTP 409 (`REVISION_CONFLICT`) com reconciliacao automatica imediata no cliente.
- Maquina de estados explicita: `LOGGED_OUT`, `BOOTING`, `PULLING`, `READY`, `PUSHING`, `CONFLICT_RETRYING`, `BACKOFF`, `OFFLINE`.
- Estrategia Emergency Convergence: `409 -> PULL -> MERGE (LOCAL ∪ CLOUD) -> RETRY UNICO -> STOP SEGURO` (`MAX_RETRY_ATTEMPTS = 1`).
- Pre-push local safety backup (`jornada_u_${uid}_safety_backup`) criado antes de mutacoes de sincronizacao, sem tokens/JWTs.
- Pull imediato silencioso apos 409 para obter o snapshot mais recente da nuvem e atualizar `_currentCloudRevision`.
- Algoritmo de merge deterministico comutativo, associativo e idempotente com desempate LWW e tombstones (`deletedIds`).
- Semantica de idempotencia estrita (`idempotencyKey`): nova chave para retries reconciliados, preservacao de chave para timeouts e falhas de rede.
- Ciclo obrigatorio de Pull-Before-Push em boot (`initSyncUI`) e login (`executeLogin`), bloqueando pushes de snapshots locais obsoletos.

## 2. Invariantes
- Toda mutacao na nuvem e indivisivel e atomica no Redis (`GET + OCC check + Idempotency + Merge + revision++ + SET`).
- Se `baseRevision != currentRevision`, o cliente entra em `CONFLICT_RETRYING`, puxa dados remotos, funde local e remoto via merge deterministico e executa um unico retry com a `baseRevision` atualizada.
- Mutações locais e remotas nunca sao descartadas; o resultado e sempre a uniao consistente de partidas identificadas por UUIDv4.
- Apos 1 retry com conflito persistente (segundo 409), o cliente executa STOP SEGURO: mantem os dados locais intactos, marca `_hasPendingSync = true` e retorna para `READY` sem entrar em loops infinitos.
- Snapshot vazio local nunca sobrescreve ou apaga dataset populado na nuvem (`EMPTY_SNAPSHOT_REJECTED`).
- Falhas de rede transitorias marcam o estado `OFFLINE` e agendam sync pendente sem entrar em loop rapido.
