# SPEC-002: Sequenciamento Cronologico Absoluto (seqID)

**Status:** NORMATIVE / VERIFIED  

---

## 1. Regra de Parsing de Datas (`getMatchTimestamp`)
1. **Camada 1:** `createdAt` em formato ISO string valido (> 1000000000000).
2. **Camada 2:** 13 primeiros digitos numericos do `id` (> 1000000000000).
3. **Camada 3:** String `Data` (`YYYY-MM-DD` as 12:00:00Z) com desempate por `seqID`.

## 2. Invariantes
- Todas as partidas possuem `seqID` contiguo unico no intervalo `1..N`.
- A ordenacao padrao na tabela e decrescente (`seqID desc`), exibindo o maior ID no topo da Pagina 1.
