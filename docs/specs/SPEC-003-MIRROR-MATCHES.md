# SPEC-003: Espelhamento Automatico de Partidas (Mirror Matches)

**Status:** NORMATIVE / VERIFIED  

---

## 1. Regra de Negocio
- Ao registrar uma partida contra um jogador cadastrado na lista oficial do time (`window.players`), o sistema cria automaticamente a partida correspondente no historico do companheiro.
- O resultado e invertido (Vitoria -> Derrota; Derrota -> Vitoria; Empate -> Empate).
- O placar e invertido (`2-1` -> `1-2`).
- A ordem de inicio (`Start`) e condicoes de zica (`Brick`) sao espelhadas corretamente.
