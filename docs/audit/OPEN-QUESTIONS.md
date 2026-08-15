# Questões em Aberto & Decisões Arquiteturais — Jornada TCG Team

**Status:** PENDING_DECISIONS  
**Objetivo:** Mapear decisões futuras para a governança contínua do projeto.

---

## 1. Perguntas Arquiteturais

1. **Estratégia de Sincronização Incremental:**
   - *Status:* O sistema atual sincroniza o snapshot completo de partidas via `pushToCloud` / `pullFromCloud`.
   - *Proposta Futura:* Avaliar se no longo prazo (ex: 5.000+ partidas) será necessário sincronização incremental por changelog/eventos para economizar payload de rede.
   - *Classificação:* `ASSUMPTION / FUTURE_ENHANCEMENT`

2. **Formalização de Schemas com Zod/JSON-Schema:**
   - *Status:* Atualmente validações são feitas por funções utilitárias manuais.
   - *Proposta Futura:* Adicionar validação estrita com biblioteca leve no backend para garantir 100% de conformidade de schema em todas as rotas.
   - *Classificação:* `RECOMMENDATION`
