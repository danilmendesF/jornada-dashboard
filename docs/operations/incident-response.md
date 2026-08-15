# Resposta a Incidentes — Jornada TCG Team

**Status:** VERIFIED  

---

## 1. Classificacao de Incidentes
- **SEV-1 (Critico):** Impossibilidade total de registrar partidas ou login quebrado durante torneio ao vivo.
- **SEV-2 (Alto):** Falha no sync com Redis ou erro no calculo de estatisticas.
- **SEV-3 (Medio):** Falha visual ou inconsistencia em filtros secundarios.

---

## 2. Fluxo de Atuacao
1. **Identificar:** Checar logs no Vercel Functions Log (`/api/*`).
2. **Mitigar:** Se SEV-1, acionar Rollback imediato no painel Vercel.
3. **Reproduzir Localmente:** Usar backup JSON da raiz e simular em ambiente isolado.
4. **Corrigir & Validar:** Rodar suíte de testes unitarios e script de sequenciamento antes de republicar.
