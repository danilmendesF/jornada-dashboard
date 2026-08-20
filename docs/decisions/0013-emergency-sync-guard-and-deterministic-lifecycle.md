# ADR 0013: Emergency Sync Guard e Lifecycle Determinístico de Sincronização Multi-Device

**Status:** ACEITO  
**Data:** 2026-08-18  
**Decisores:** Danilo Mendes / Equipe de Engenharia  
**Contexto:** CHG-005 (Emergency Sync Guard + Lifecycle Determinístico Multi-Device)

---

## 1. Contexto
A auditoria forense identificou um risco crítico de perda silenciosa de dados em cenários multi-device devido à substituição integral cega (`client.set`) no Redis e à emissão indevida de PUSH durante a inicialização local (`initializeData`) antes da resolução do PULL remoto.

## 2. Invariante Fundamental
> **"Uma partida criada em um dispositivo NUNCA pode desaparecer porque outro dispositivo possui um snapshot antigo."**

## 3. Decisão
1. **Fase 0 — Emergency Guard:**
   - Remoção de qualquer disparo de `saveManual()` dentro de `initializeData()` em `app.js`.
   - Bloqueio imediato de PUSH no cliente enquanto `isCloudSyncReady === false` (`pushToCloud`).
   - Implementação de `emergencyServerMerge` em `api/sync.js`, garantindo que o backend nunca destrua partidas preexistentes no Redis se receber snapshots menores ou vazios.
   - Eliminação de rotinas duplicadas e legadas de sincronização em `manager.js`.
2. **Fase 1 — Lifecycle Determinístico & Correções Residuais (CHG-005.1):**
   - Implementação de máquina de estados explícita: `LOGGED_OUT`, `BOOTING`, `PULLING`, `READY`, `OFFLINE`.
   - Ciclo obrigatório de **Pull-Before-Push** no login (`executeLogin()`).
   - **In-Flight Session Guard (CHG-005.1):** Descarte imediato de respostas de `pullFromCloud()` se o token ou a geração da sessão (`_authSessionGen`) mudar durante a requisição na rede, evitando contaminação pós-logout ou entre contas.
   - **Persistent Pending Sync (CHG-005.1):** Persistência da indicação de sync pendente em `localStorage.getItem('jornada_sync_pending')` para garantir que mutações geradas offline sobrevivam a reloads e sejam sincronizadas após a reconexão.
   - No logout (`logoutUser()`): cancelamento de timers de sync, incremento da geração de sessão, interrupção de polling e isolamento de sessão em memória.
   - Tratamento gracioso de offline: mutações locais continuam persistidas com enfileiramento seguro para sincronização posterior.

## 4. Consequências
- **Positivas:**
  - Impossibilidade de um dispositivo antigo sobrescrever partidas mais recentes da nuvem;
  - Eliminação de vazamento de dados de requisições de pull tardias após logout;
  - Preservação da intenção de sincronização mesmo após fechamento/reload do navegador em modo offline;
  - Zero chamadas não-autenticadas (eliminação definitiva de HTTP 401 fantasmas);
  - Preservação total da experiência Local-First mesmo sem conectividade.
- **Próximos Passos (Fase 2 & 3):**
  - Introdução de identificadores universais (UUIDv4), controle de revisões (OCC) e adaptador de migração de schema.
