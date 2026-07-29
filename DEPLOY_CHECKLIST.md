# 🚀 Protocolo de Validação Pré-Deploy (RAG Checklist) — Jornada TCG Dashboard

Este documento estabelece a esteira oficial de verificação e auditoria **RAG (Red / Amber / Green)** que DEVE ser seguida sempre antes de realizar o deploy da aplicação em produção.

---

## 🚦 Matriz de Validação RAG

### 🔴 RED (Impeditivo de Deploy — Bloqueia o Deploy se Falhar)
Se qualquer um destes itens falhar, o deploy **NÃO DEVE** ser realizado até que o problema seja corrigido:

1. **Sintaxe JavaScript Íntegra:**
   - [ ] Executar `node -c app.js manager.js` no terminal.
   - [ ] **Resultado Esperado:** 0 erros de compilação ou sintaxe.
2. **Ausência de Código de Testes / Demos:**
   - [ ] Confirmar que nenhum arquivo `sample_data.json` ou função `loadSampleDataDemo()` existe no repositório.
   - [ ] Garantir que o botão de carregar amostragem de teste não está visível no HTML.
3. **Persistência Segura & Prevenção de Estouro de Quota (LocalStorage):**
   - [ ] Garantir que todas as chamadas de salvamento local utilizam a função encapsulada `safeSetItem()` com suporte a `QuotaExceededError`.
4. **Proteção Contra Colisão Cloud Sync (Vercel Serverless / Redis):**
   - [ ] Verificar se o leme de segurança de 15 segundos (`lastWriteTime`) está ativo antes de aceitar *Pulls* da nuvem, prevenindo que dados locais recentes sejam sobrescritos.
5. **Desincronização de Seletores Customizados (*Searchable Selects*):**
   - [ ] Garantir que a função `openMatchForm()` chama obrigatoriamente `syncSearchableSelect()` em todos os seletores ao resetar o formulário.

---

### 🟡 AMBER (Pontos de Atenção & Qualidade)
Itens que exigem verificação cuidadosa durante o teste manual antes de liberar:

1. **Visão Geral vs Visão Individual (Subtipos):**
   - [ ] O painel de detalhamento por subtipo/variante DEVE aparecer **apenas quando 1 player estiver selecionado** (`selectedPlayers.size === 1`).
   - [ ] Quando múltiplos players ou "Todos" estiverem selecionados, o painel deve ser ocultado automaticamente para manter a visualização limpa.
2. **Campos Omitidos Visualmente (Adversário e Coleção):**
   - [ ] Confirmar que as colunas `Adversário` e `Coleção` estão ocultas na tabela principal (`#matchTable`).
   - [ ] Garantir que novas partidas utilizam fallbacks padrão (`Oponente` / `Geral`) sem exigir preenchimento do usuário.
3. **Autocompletar Inteligente de Subtipos (`Datalist`):**
   - [ ] Testar ao selecionar um Player e Arquétipo no formulário se os subtipos previamente usados por aquele jogador aparecem no dropdown.
4. **Sincronização Bidirecional de Listas PTCGL:**
   - [ ] Verificar se ao escolher um Arquétipo + Subtipo cadastrado no Gerenciador, a lista de 60 cartas é puxada automaticamente para a textarea de partida.
   - [ ] Verificar se ao colar uma lista no formulário de partida, o Gerenciador registra/atualiza aquela variante no catálogo `decks`.

---

### 🟢 GREEN (Pronto para Deploy)
Checklist final de liberação:

- [x] Sintaxe validada sem erros (`node -c app.js manager.js`).
- [x] Zero chamadas de scripts de amostragem local.
- [x] 7 abas do Gerenciador de Dados com rolagem horizontal fluida.
- [x] Matriz de Matchups com cabeçalho fixo (*sticky*) e ordenação funcional.
- [x] Backups diários automáticos de 7 dias operacionais.
- [x] Aplicação testada nos navegadores Desktop e Mobile.

---

### ⚙️ Comando Rápido de Pré-Voo:
Antes de fazer `git push` ou `vercel --prod`, rode no PowerShell:
```powershell
node -c app.js manager.js
```
*Se retornar vazio sem erros, o código está pronto para o servidor!*
