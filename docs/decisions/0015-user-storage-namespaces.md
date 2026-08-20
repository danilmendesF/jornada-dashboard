# ADR 0015: Namespaces Dinâmicos de LocalStorage por Usuário

**Status:** ACEITO  
**Data:** 2026-08-19  
**Decisores:** Danilo Mendes / Equipe de Engenharia  
**Contexto:** CHG-006.2 — Phase 2: Sync Protocol v2 (User Storage Namespace)

---

## 1. Contexto
Na arquitetura v2.1.4, as chaves de `localStorage` eram estáticas e globais (`jornada_manual_matches`, `jornada_decks`, etc.). Quando múltiplos usuários compartilhavam o mesmo navegador ou realizavam logout/login sequencial de contas distintas, ocorria vazamento e compartilhamento indevido de estado e pendências de sincronização (`_hasPendingSync`).

## 2. Decisão
1. **Camada de Namespace Centralizada:** Criação das funções `getStorageNamespace(userId)` e `getStorageKey(resource, userId)` e resolução dinâmica via `getScopedKey()`.
2. **Padrão de Chaves Namespaced:**
   - Usuário Autenticado: `jornada_u_{userId}_*` (ex: `jornada_u_usr_123_matches`)
   - Usuário Não Autenticado: `jornada_u_anonymous_*` (ex: `jornada_u_anonymous_matches`)
3. **Isolamento de Memória no Logout:** No logout, os arrays e variáveis de memória (`allData`, `filtered`) são zerados e o contexto retorna ao namespace `anonymous`, preservando os dados persistidos do usuário em seu respectivo namespace.
4. **Pending Sync Isolado:** `jornada_u_{userId}_sync_pending` pertence estritamente ao usuário, impedindo que uma conta herde uploads pendentes de outra.
5. **Migração Transparente:** Implementação de `migrateLegacyUserStorage(userId)` que migra dados legados globais para o namespace do primeiro usuário autenticado de forma segura e idempotente.

## 3. Consequências
- **Positivas:**
  - Isolamento completo entre contas no mesmo dispositivo;
  - Eliminação definitiva de vazamento cruzado de partidas e pendências de sync;
  - Suporte robusto ao modo anônimo e offline;
  - Zero perda de dados na transição.
