---
id: SPEC-002
title: Sequenciamento Cronologico, Identificadores UUIDv4 e seqID Desacoplado
status: VERIFIED
version: 2.0.0
tested_by: tests/sync_protocol_v2.test.js
updated_at: 2026-08-19
---

# SPEC-002: Sequenciamento Cronologico, Identificadores UUIDv4 e seqID Desacoplado (CHG-006.1)

## 1. Requisitos de Negocio
- Toda entidade de partida possui como chave primária persistente e imutável um `UUIDv4` universal (RFC 4122).
- O índice sequencial `seqID` / `_displayId` é estritamente derivado em runtime para exibição na interface visual, iniciando em 1 até N.
- A ordenação canônica é primariamente cronológica por timestamp semântico (`SortKey = (timestamp, UUID)`).

## 2. Invariantes
- `match.id` é um UUIDv4 único, universal e imutável.
- Edições de partida preservam obrigatoriamente o `id` original, alterando apenas campos de conteúdo e `updatedAt`.
- Partidas espelho (`mirrorMatches`) possuem UUIDv4 próprio e independente, mantendo a integridade referencial via `_mirroredFrom` e `_mirrorId`.
- `seqID` e `_displayId` nunca são utilizados como identidade persistente nem desempate em sincronização.
- Migrações de dados legados convertem IDs numéricos para UUIDv4 de forma idempotente e estável.
