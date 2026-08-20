# ADR 0017: Emergency Convergence Strategy for OCC Conflicts & Multi-Device Sync

**Status:** ACEITO  
**Data:** 2026-08-20  
**Decisores:** Danilo Mendes / Equipe de Engenharia  
**Contexto:** CHG-006.4 Emergency — Data Loss Mitigation & Multi-Device Convergence (HTTP 409 -> PULL -> MERGE -> RETRY ÚNICO)

---

## 1. Contexto
Durante a operação multi-dispositivo em produção, ocorrem cenários onde múltiplos integrantes (ou o mesmo usuário em abas/dispositivos distintos) registram partidas concorrentes. No CHG-006.3, o backend passou a rejeitar concorrência obsoleta com código HTTP 409 (`REVISION_CONFLICT`). No entanto, o cliente necessitava de uma recuperação determinística imediata para fundir os dados locais com os remotos e restabelecer a convergência sem sobrescrita destrutiva e sem loops infinitos.

## 2. Decisão
1. **Tratamento Explícito de HTTP 409:** O cliente reconhece o payload `{ error: "REVISION_CONFLICT", currentRevision, baseRevision }` e inicia reconciliação ativa imediata.
2. **Estratégia Emergency Convergence (Single Retry):**
   - Ao receber `409`, o cliente transiciona para `CONFLICT_RETRYING`.
   - Cria um backup local de segurança namespaced (`saveLocalSafetyBackup()`).
   - Executa `pullFromCloud(true)` silencioso para obter o snapshot mais recente da nuvem.
   - Executa o merge determinístico cumulativo `LOCAL ∪ CLOUD` (`deterministicMergeMatches`), preservando partidas por identidade UUIDv4.
   - Atualiza `_currentCloudRevision` local para a revisão obtida na nuvem.
   - Dispara um **retry único** (`MAX_RETRY_ATTEMPTS = 1`) com nova `baseRevision` e nova `idempotencyKey`.
3. **STOP Seguro no Segundo Conflito:**
   - Caso o segundo PUSH resulte em `409` novamente, o cliente interrompe os envios imediatamente (sem 3º push e sem loops).
   - O estado local e o merge são mantidos intactos, `_hasPendingSync = true` é marcado, e o estado retorna a `READY`.
4. **Pull-Before-Push Obrigatório:**
   - No boot (`initSyncUI`) e no login (`executeLogin`), o PULL deve ser concluído com sucesso antes de permitir qualquer PUSH local.
5. **Proteção contra Snapshots Vazios:**
   - Um snapshot vazio local nunca pode apagar dados existentes na nuvem.

## 3. Consequências
- **Positivas:**
  - Resolução imediata de divergências multi-dispositivo (ex.: 20 partidas locais de Thales + 10 locais de Danilo convergem para as 30 partidas na nuvem e em ambos os dispositivos);
  - Eliminação total de perdas silenciosas de dados;
  - Proteção estrita contra tempestades de requisições e loops de sincronização através do teto de 1 retry emergencial;
  - Preservação integral do OCC e commits atômicos via Redis Lua Script.
- **Evolução Futura:**
  - O algoritmo de backoff exponencial adaptativo com filas de reconciliação assíncrona permanece planejado como refinamento para o CHG-006.5 / versões subsequentes.
