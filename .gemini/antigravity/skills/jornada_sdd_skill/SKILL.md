---
name: jornada-sdd
description: Governança SDD, RAG Index Lookup e Validação Automatizada de Regressão para a aplicação Jornada Dashboard (Pokémon TCG Match Tracker)
---

# Jornada Dashboard SDD & RAG Skill

Esta habilidade ensina o agente de IA a seguir rigorosamente o padrão SDD (Specification-Driven Development) e RAG (Retrieval-Augmented Generation) ao trabalhar na aplicação Jornada Dashboard.

---

## 🎯 FLUXO DE EXECUÇÃO OBRIGATÓRIO

### 1. RAG Index Lookup (Economia de Tokens)
Antes de ler ou modificar qualquer código, consulte [.ai/PROJECT_INDEX.md](file:///.ai/PROJECT_INDEX.md) e [.ai/ARCHITECTURE.md](file:///.ai/ARCHITECTURE.md) para identificar os módulos exatos em `js/` envolvidos na tarefa. Nunca leia os arquivos monolíticos inteiros.

### 2. Validação dos Contratos de Dados
Sempre respeite as regras de negócio definidas em [.ai/ARCHITECTURE.md](file:///.ai/ARCHITECTURE.md):
- **Partidas Espelho (`buildMirrorMatch`)**: Inversão automática de resultado, placar, start, bricks e games em duelos de membros do time.
- **Formato MD3 (`getGameCountFromPlacar`)**: 0-0/1-0 (1 game), 1-1/2-0 (2 games), 2-1 (3 games).
- **Taxa de Brick**: Calculada estritamente por game individual (`totalGameBricksCount / totalGamesCount`).

### 3. Human-in-the-Loop & Aprovação Prévia
1. Escreva ou atualize o plano de implementação em `implementation_plan.md`.
2. Apresente um resumo executivo com as decisões técnicas e perguntas abertas ao usuário.
3. **Interrompa chamadas de ferramentas** e aguarde a aprovação explícita do usuário antes de realizar alterações no código.

### 4. Bateria de ValidaçãoAutomatizada
Após realizar alterações, execute:
```bash
node scripts/validate.js
node scripts/update_state.js
```
Garantir que a suíte passe em 100% dos testes sem nenhuma regressão de sintaxe, contratos ou touch targets.
