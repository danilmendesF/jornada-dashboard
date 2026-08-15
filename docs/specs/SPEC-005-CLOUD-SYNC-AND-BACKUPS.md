---
id: SPEC-005
title: Sincronizacao em Nuvem e Merge Deterministico
status: VERIFIED
version: 2.0.0
tested_by: tests/merge_tiebreak.test.js
updated_at: 2026-08-15
---

# SPEC-005: Sincronizacao em Nuvem e Merge Deterministico

## 1. Requisitos de Negocio
- Persistencia hibrida offline-first: gravacao sincrona em `localStorage` e assincrona no Redis.
- Algoritmo de merge deterministico comutativo, associativo e idempotente.
- Desempate em caso de empate perfeito de timestamp realizado por comparacao lexicografica canonica.

## 2. Invariantes
- `Merge(A, B) == Merge(B, A)` para qualquer conjunto de partidas.
- Registros presentes em `deletedIds` (tombstones) sao descartados permanentemente na fusao.
