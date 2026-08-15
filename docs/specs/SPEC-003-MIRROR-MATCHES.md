---
id: SPEC-003
title: Partidas Espelho e Inversao de Ponto de Vista
status: VERIFIED
version: 1.1.0
tested_by: tests/mirror.test.js
updated_at: 2026-08-15
---

# SPEC-003: Partidas Espelho e Inversao de Ponto de Vista

## 1. Requisitos de Negocio
- Quando dois jogadores do time se enfrentam, o sistema permite inverter a perspectiva do duelo (jogador A vs jogador B <-> jogador B vs jogador A).
- Inversao automatica do placar (ex: 2x1 vira 1x2) e do resultado (Vitoria vira Derrota).

## 2. Invariantes
- Auto-duelo (jogador contra ele mesmo) e terminantemente bloqueado no formulario.
