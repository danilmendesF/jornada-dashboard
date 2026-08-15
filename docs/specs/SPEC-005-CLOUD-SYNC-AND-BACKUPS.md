# SPEC-005: Sincronizacao em Nuvem e Snapshots

**Status:** NORMATIVE / VERIFIED  

---

## 1. Regras de Sincronizacao
- Sincronizacao assincrona dispara apos mutacoes locais (`saveManual`, `deleteMatch`).
- Armazenamento em Redis Cloud com proxy resiliente para fallback.
- Geracao diaria de snapshots JSON automaticos no navegador.
