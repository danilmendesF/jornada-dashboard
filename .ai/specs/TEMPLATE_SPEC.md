# 📝 SPEC_XXX: [NOME DA FUNCIONALIDADE / BUG / REFATORAÇÃO]

- **Status**: 🟡 EM REVISÃO (Aguardando Aprovação) / 🟢 IMPLEMENTADO / 🔴 CANCELADO
- **Tipo**: FEATURE / FIX / REFACTOR / DOC
- **Autor**: Spec-Architect
- **Data**: YYYY-MM-DD
- **Commit**: `N/A` (preencher após deploy)
- **Módulos Impactados**: `js/module.js`, `manager.js:L???`, `style.css`
- **Módulos PROIBIDOS de Tocar**: `js/mirror.js`, `api/auth.js` (listar o que NÃO pode ser alterado)

---

## 1. Visão Geral & Motivação
Descreva o problema que esta spec resolve e o benefício gerado para o usuário final.
**Comportamento Atual**: O que acontece hoje (errado ou incompleto).
**Comportamento Esperado**: O que deve acontecer após a implementação.

---

## 2. Causa Raiz Técnica (obrigatório para /fix)
> Descreva a causa raiz com evidência de arquivo e número de linha.
> Ex: "A função `populateQuickLogDropdowns` em `manager.js:L1805` sobrescreve a versão correta de `js/quicklog.js` devido ao hoisting de declarações `function` dentro do IIFE do bundle."
> Se for uma feature nova, substitua esta seção por "N/A — Nova funcionalidade".

---

## 3. Requisitos Funcionais (RF)

### RF-01: [Nome do Requisito]
- Descrição técnica precisa do que deve ser implementado.
- Inclua o nome exato da função, ID do elemento DOM ou chave de localStorage afetado.

### RF-02: [Nome do Requisito]
- ...

---

## 4. UI & Design System (se aplicável)

- **Desktop (≥ 900px)**: Comportamento esperado.
- **Mobile (320px–480px)**: Touch targets ≥ 40px. Comportamento esperado.
- **Paleta Semântica**: Usar apenas tokens definidos em `WORKFLOW.md` (Verde=Vitória, Vermelho=Derrota, etc.).

---

## 5. Impacto em Dados & Contratos (se aplicável)

- **localStorage**: Nova chave `jornada_xxx` adicionada/removida? Atualizar `ARCHITECTURE.md`.
- **MatchData**: Novo campo adicionado? Atualizar interface em `ARCHITECTURE.md`.
- **buildMirrorMatch()**: Esta mudança impacta a lógica de espelho? (`js/mirror.js`)
- **Cloud Sync**: Esta mudança precisa ser sincronizada via `pushToCloud()`/`pullFromCloud()`?

---

## 6. Checklist de Efeitos Colaterais

Antes de implementar, verifique se as funções abaixo são afetadas:
- [ ] `buildMirrorMatch()` em `js/mirror.js`
- [ ] `applyDataOverrides()` em `app.js`
- [ ] `calculateStats()` em `js/stats.js`
- [ ] `populatePlayerSelects()` em `manager.js`
- [ ] `updateAuthUI()` em `js/auth.js`
- [ ] `pushToCloud()` / `pullFromCloud()` em `js/sync_cloud.js`

---

## 7. Critérios de Aceite & Validação Automatizada

- [ ] Critério funcional 1: [descrição objetiva e testável].
- [ ] Critério funcional 2: [descrição objetiva e testável].
- [ ] Suíte automatizada `node scripts/validate.cjs` aprovada em 100% (37 testes).
- [ ] Suíte de auth `node scripts/validate_auth.cjs` aprovada em 100% (24 testes).
- [ ] RAG re-indexado com `node scripts/update_state.cjs`.
