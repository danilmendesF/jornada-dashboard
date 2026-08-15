---
id: SPEC-001
title: Registro de Partidas e Quick Log
status: VERIFIED
version: 1.2.0
tested_by: tests/dom_integration.test.js
updated_at: 2026-08-15
---

# SPEC-001: Registro de Partidas e Quick Log

## 1. Requisitos de Negocio
- O jogador autenticado tem seu nome travado no campo `Player` (`.logged-player-badge`).
- O campo `Adversario` nao pode conter o nome do proprio jogador logado (bloqueio de auto-duelo).
- O campo `Data` nao pode aceitar datas futuras superiores ao dia atual (`max = hoje`).
- Os campos de listas e comentarios possuem altura expandida e rolagem interna suave.

## 2. Invariantes
- Toda nova partida recebe `seqID = max(seqID) + 1`.
- Toda nova partida gera timestamp ISO `createdAt`.
- Toda nova partida e persistida em `localStorage` e despachada para `/api/sync`.
