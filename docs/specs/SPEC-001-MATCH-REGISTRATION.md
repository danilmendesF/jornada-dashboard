# SPEC-001: Registro de Partidas e Quick Log

**Status:** NORMATIVE / VERIFIED  

---

## 1. Requisitos de Negocio
- O jogador autenticado tem seu nome travado no campo `Player` (`.logged-player-badge`).
- O campo `Adversario` nao pode conter o nome do proprio jogador logado (bloqueio de auto-duelo).
- O campo `Data` nao pode aceitar datas futuras superiores ao dia atual (`max = hoje`).
- Os campos de listas e comentarios possuem altura expandida e rolagem interna suave.

## 2. Invariantes
- Toda nova partida recebe `seqID = max(seqID) + 1`.
- Toda nova partida gera timestamp ISO `createdAt`.
- Toda nova partida e persistida em `localStorage` e despachada para `/api/sync`.
