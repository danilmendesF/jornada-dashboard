# TASK-1 — Refatoração do getMatchTimestamp e ensureMatchSequence incondicional

**Arquivo alvo:** `app.js`
**Referência SPEC:** Seções 2, 3 e 4 (RF-01, RF-02, RF-03)
**Depende de:** nenhuma

---

## Contexto
Garantir que partidas legadas com ID curto não sejam convertidas para a época de 1970 e que todo carregamento da aplicação re-sequencie incondicionalmente o dataset do `#1` ao `#N`.

## O que fazer
1. Em `app.js`, atualizar `getMatchTimestamp(match)` para a validação em 3 camadas:
   - Camada 1: `match.createdAt` ISO (`> 1000000000000`).
   - Camada 2: 13 dígitos numéricos no `match.id` (`> 1000000000000`).
   - Camada 3: String `match.Data` (`YYYY-MM-DD`).
2. Atualizar `ensureMatchSequence(matches)` para re-ordenar incondicionalmente por `getMatchTimestamp` e atribuir `m.seqID = idx + 1`.
3. Atualizar `getNextSeqID(list)` para executar `ensureMatchSequence` antes de retornar `max(seqID) + 1`.
