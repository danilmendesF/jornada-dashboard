# 🔄 PROTOCOLO DE TRABALHO: HUMAN-IN-THE-LOOP & APROVAÇÃO OBRIGATÓRIA (SDD)

Este documento estabelece o fluxo inviolável de interação entre o **Usuário** e a **IA** para qualquer solicitação no projeto **Jornada Dashboard**.

---

## 🛑 REGRA DE OURO DO TRABALHO EM PARES

> **NENHUMA LINHA DE CÓDIGO DA APLICAÇÃO PODE SER ALTERADA SEM APROVAÇÃO PRÉVIA DO USUÁRIO EM UM PLANO SDD / SPEC.**

---

## 📋 CICLO DE VIDA DE UMA TAREFA (4 FASES)

```
[1. PESQUISA & SPEC] ➔ [2. PLANO & RESUMO] ➔ [3. APROVAÇÃO DO USUÁRIO] ➔ [4. EXECUÇÃO & VALIDAÇÃO]
```

### FASE 1: PESQUISA E ESPECIFICAÇÃO (RAG Index Lookup)
1. A IA lê `.ai/PROJECT_INDEX.md` para identificar os módulos exatos envolvidos.
2. Se a alteração afetar regras de negócio, a IA consulta `.ai/ARCHITECTURE.md`.
3. Se for uma nova funcionalidade, cria uma spec em `.ai/specs/SPEC_XXX.md`.

### FASE 2: PLANO DE IMPLEMENTAÇÃO E RESUMO EXECUTIVO
1. A IA gera um plano SDD estruturado (`implementation_plan.md`) contendo:
   - Objetivo claro
   - Mudanças propostas por arquivo/módulo
   - Resumo das decisões de design
   - Perguntas abertas ou pontos de atenção (se houver)
   - Plano de validação automatizada

### FASE 3: APROVAÇÃO DO USUÁRIO (Checkpoint Obrigatório)
1. A IA apresenta o plano ao Usuário acompanhado de um resumo executivo em linguagem clara.
2. A IA **interrompe suas ferramentas** e aguarda o botão `Proceed` ou feedback do Usuário.

### FASE 4: EXECUÇÃO, TESTE AUTOMÁTICO E WALKTHROUGH
1. Após a aprovação do Usuário, a IA executa as alterações nos módulos específicos (`js/...`).
2. A IA executa o script de validação automatizada: `node scripts/validate.cjs` e `node scripts/validate_auth.cjs`.
3. A IA executa o auto-atualizador do RAG: `node scripts/update_state.cjs`.
4. A IA gera o relatório final `walkthrough.md` detalhando o que foi feito e os testes realizados.

### FASE 5: APROVAÇÃO EXPLÍCITA PARA DEPLOY (GIT COMMIT & PUSH)
1. A IA **NÃO** deve fazer git push/deploy em produção automaticamente.
2. A IA deve apresentar o resultado da validação automatizada e **perguntar explicitamente ao Usuário**:
   *"Deseja que eu envie as alterações para o GitHub/Vercel (Deploy em Produção) agora ou prefere testar no navegador antes?"*
3. A IA aguarda a confirmação do Usuário antes de rodar os comandos de git commit e push.
