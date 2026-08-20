# ADR 0014: Identificadores Universais Imutáveis (UUIDv4) e Desacoplamento de seqID

**Status:** ACEITO  
**Data:** 2026-08-19  
**Decisores:** Danilo Mendes / Equipe de Engenharia  
**Contexto:** CHG-006.1 — Phase 2: Sync Protocol v2 (Foundation)

---

## 1. Contexto
Na arquitetura v2.1.4, as partidas utilizavam identificadores compostos por timestamps e números aleatórios (`Date.now().toString() + Math.random().toString(36)`), enquanto as partidas espelho utilizavam incremento numérico (`Number(primary.id) + 1`). Essa abordagem apresentava risco de colisão em cenários multi-device de alta escala e acoplava a identidade da entidade ao índice de ordenação `seqID`.

## 2. Decisão
1. **Adoção de UUIDv4:** Todas as novas entidades (partidas primárias e espelhos) utilizam `UUIDv4` canônico (RFC 4122) gerado por `generateUUID()` (`crypto.randomUUID()` com fallback seguro `crypto.getRandomValues()`).
2. **Imutabilidade de Identidade:** O `id` de uma partida nunca é alterado ou regenerado em edições.
3. **Desacoplamento de seqID:** O `seqID` e `_displayId` tornam-se puramente atributos derivados em tempo de renderização em memória.
4. **Ordenação Canônica Determinística:** A ordenação é computada exclusivamente por `SortKey = (timestamp, UUID)`.
5. **Migrador Legado Idempotente:** Implementação de `migrateLegacyMatches()` para converter entidades legadas da v2.1.4 para UUIDv4 uma única vez, reparando referências de espelho (`_mirroredFrom` / `_mirrorId`).
6. **Interoperabilidade de Backups:** `importBackup()` e `exportBackup()` adaptam backups antigos e preservam a identidade estável (`EXPORT -> IMPORT -> EXPORT`).

## 3. Consequências
- **Positivas:**
  - Eliminação definitiva de colisões de identificadores em múltiplos dispositivos;
  - Preparação ideal da camada de dados para o controle otimista de concorrência (OCC / revisões);
  - Preservação total de dados históricos e retrocompatibilidade com backups da v2.1.4;
  - Zero dependência externa adicionada.
