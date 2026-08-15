---
id: SPEC-002
title: Sequenciamento Cronologico e seqID
status: VERIFIED
version: 1.1.0
tested_by: tests/app.test.js
updated_at: 2026-08-15
---

# SPEC-002: Sequenciamento Cronologico e seqID

## 1. Requisitos de Negocio
- Toda partida cadastrada no sistema deve possuir um indice sequencial visual `seqID` iniciando em 1.
- A ordenacao e primariamente cronologica ascendente por data (`Data` / `createdAt`).

## 2. Invariantes
- `match.id` e o identificador persistente e unico global.
- `seqID` e recalculado dinamicamente no carregamento e merge para garantir sequencia continua 1..N.
