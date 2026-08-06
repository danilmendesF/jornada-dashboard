# SPEC_028_MULTI_AGENT_WORKFLOW: Orquestração de Agentes e Correção UI

## 1. O Desafio
**Parte A (Multi-Agent Workflow)**:
Visando otimização de custo (consumo inteligente de tokens) e máxima qualidade técnica, o fluxo SDD (Software Design Document) precisa ser atualizado para adotar um pipeline Multi-Agente:
1. **Planejamento**: O modelo mais robusto (Gemini 3.1 Pro High) atua como Arquiteto, estudando o projeto e montando a SPEC e o Plano de Implementação.
2. **Execução**: Um modelo mais ágil e barato (Gemini 3.6 Flash) atua como Executor, assumindo apenas a edição de arquivos com base no plano validado.
3. **Validação**: Um modelo analítico intermediário (Gemini 3.1 Pro Low) atua como QA, executando a suíte de testes de 51 checkpoints antes do *commit*.

**Parte B (Bug `deletePlayer is not defined`)**:
Na aba de "Gerenciador de Dados", os botões de remoção (X) de Players, Locais e Coleções estão falhando (via `onclick` do HTML) pois as funções `deletePlayer`, `deleteLocal` e `deleteColecao` foram declaradas dentro do escopo fechado do IIFE no arquivo `manager.js`, e não foram expostas ao objeto global `window`.

## 2. A Solução
### 2.1 Atualização Documental
Adicionar a Seção "MULTI-AGENT SDD WORKFLOW" nos arquivos de regra do projeto (`AGENTS.md` e `.cursorrules`), estipulando explicitamente as camadas de agentes e seus respectivos modelos.

### 2.2 Correção JavaScript
Em `manager.js`, substituir as assinaturas:
- `function deletePlayer(name)` -> `window.deletePlayer = function(name)`
- `function deleteLocal(name)` -> `window.deleteLocal = function(name)`
- `function deleteColecao(name)` -> `window.deleteColecao = function(name)`

## 3. Plano de Teste (QA Agent)
1. **Regras**: Inspecionar se `AGENTS.md` possui a regra multi-agent.
2. **Bundle JS**: Compilar com sucesso (`node scripts/build_bundle.cjs`).
3. **Reflexão Scope**: Testar se as variáveis de deleção foram expostas corretamente.
4. Validar suíte com `node scripts/validate.cjs`.
