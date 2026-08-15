# Auditoria de Integridade de Dados — Jornada TCG Team

**Status:** VERIFIED  
**Foco:** Preservação Histórica, Sequenciamento `seqID`, Mirror Matches e Backups

---

## 1. Regras Fundamentais de Integridade de Dados

1. **Preservação Histórica Absoluta:** Partidas antigas (2025/2026) jamais são excluídas ou sobrescritas silenciosamente durante migrações ou novos builds.
2. **Sequenciamento Contíguo (`seqID`):**
   - Ordenação cronológica estrita calculada via parser de 3 camadas (`getMatchTimestamp`):
     1. `createdAt` (ISO Date String).
     2. 13 dígitos numéricos no `id`.
     3. String `Data` (`YYYY-MM-DD`).
   - Cada partida possui um índice sequencial único (`1..N`) gravado de forma persistente.
3. **Partidas Espelho (Mirror Matches):**
   - Quando Jogador A registra vitória contra Jogador B (membro do time), o sistema gera a partida recíproca (Derrota para Jogador B contra Jogador A) com identificador correspondente.
4. **Resiliência de Backups:**
   - O sistema gera backups automáticos diários em `localStorage` e permite exportação/importação de snapshots completos em JSON (`jornada_backup_*.json`).
