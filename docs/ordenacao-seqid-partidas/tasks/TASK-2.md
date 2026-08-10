# TASK-2 — Persistência e Serialização do seqID no LocalStorage, JSON Backup e Cloud Sync

**Arquivo alvo:** `js/storage.js`, `js/sync_cloud.js`, `manager.js`
**Referência SPEC:** Seções 2, 3 e 4 (RF-04)
**Depende de:** TASK-1

---

## Contexto
Garantir que a propriedade `"seqID": <numero>` seja gravada de forma persistente em cada objeto no `localStorage`, no payload do `/api/sync` e nos backups baixados.

## O que fazer
1. Em `app.js` (`initializeData`), chamar `saveManual(allData)` para persistir a lista re-sequenciada no `localStorage`.
2. Em `js/sync_cloud.js`, garantir que `exportBackup`, `pushToCloud` e `importBackup` executem `ensureMatchSequence` e serializem o campo `"seqID": <numero>` no JSON.
