# 🚀 Protocolo de Validação Pré-Deploy (RAG Checklist) — Jornada TCG Dashboard

Este documento estabelece a esteira oficial de verificação e auditoria **RAG (Red / Amber / Green)** que DEVE ser seguida sempre antes de realizar o deploy da aplicação em produção.

---

## 🚦 Matriz de Validação RAG

### 🔴 RED (Impeditivo de Deploy — Bloqueia o Deploy se Falhar)
Se qualquer um destes itens falhar, o deploy **NÃO DEVE** ser realizado até que o problema seja corrigido:

1. **Sintaxe JavaScript Íntegra:**
   - [ ] Executar `node scripts/validate.cjs` no terminal.
   - [ ] **Resultado Esperado:** 100% dos 61+ testes aprovados com 0 erros.
2. **Ausência de Código de Testes / Demos:**
   - [ ] Confirmar que nenhum arquivo `sample_data.json` ou função `loadSampleDataDemo()` existe no repositório.
3. **Persistência Segura & Prevenção de Estouro de Quota (LocalStorage):**
   - [ ] Garantir que todas as chamadas de salvamento local utilizam a função encapsulada `safeSetItem()` com suporte a `QuotaExceededError`.
4. **Proteção Contra Colisão Cloud Sync (Vercel Serverless / Redis):**
   - [ ] Verificar se o leme de segurança (`lastWriteTime`) está ativo antes de aceitar *Pulls* da nuvem.

---

### 🟢 GREEN (Pronto para Deploy)
Checklist final de liberação:

- [x] Sintaxe validada sem erros (`node scripts/validate.cjs`).
- [x] Bundle de produção minificado compilado (`dist/app.min.js`).
- [x] Zero chamadas de scripts de amostragem local.
- [x] Matriz de Matchups com cabeçalho fixo (*sticky*) e ordenação funcional.
- [x] Aplicação testada nos navegadores Desktop e Mobile.
