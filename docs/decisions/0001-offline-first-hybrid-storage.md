# ADR 0001: Arquitetura de Persistencia Hibrida Offline-First

**Status:** ACEITO  
**Data:** 2026-08-14  
**Decisores:** Danilo Mendes / Equipe de Engenharia  

---

## 1. Contexto
Jogadores participam de torneios presenciais em locais com conectividade instavel de internet. A perda de dados ao salvar uma partida durante o torneio e inaceitavel.

## 2. Decisao
Adotar persistencia primaria e sincrona no `localStorage` do navegador, com sincronizacao em segundo plano assincrona para Redis via Vercel Serverless Function (`/api/sync`).

## 3. Consequencias
- **Positivas:** Operacao instantanea com zero latencia percebida pelo usuario; funcionalidade total mesmo offline.
- **Trade-offs:** Necessidade de rotinas de merge e auto-backup JSON diario para evitar discrepancias locais.
