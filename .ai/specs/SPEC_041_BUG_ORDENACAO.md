# SPEC_041: Bug Ordenação de Partidas

## Status
- **Status**: 🟢 IMPLEMENTADO
- A partida mais recente adicionada não aparece no topo.
- O campo `#` (que é numérico posicional com base no index, e.g., 357, 356) está designando o número maior (#357) para a partida mais antiga do mesmo dia, e colocando ela acima da partida mais nova (#356).

## Contexto e Evolução
1. **v1.0.27 e anteriores**: O fallback da ordenação em `js/table.js` tentava fazer `parseInt` no ID e gerava comportamentos instáveis ou usava string `localeCompare`.
2. **v1.0.28**: Inserimos um campo `createdAt: new Date().toISOString()` em `manager.js` (no cadastro) para ser a Fonte da Verdade do momento da criação. Em `table.js`, alteramos o desempate para usar `tB > tA ? 1 : -1`, o que matematicamente deve forçar o item mais novo a ficar no topo. Também alteramos o renderizador para usar `idxDisplay = totalItems - (startIdx + i)`, tornando o campo `#` estritamente posicional (baseado na ordem final do array `toRender`).
3. **v1.0.30**: Foi adicionado Cache-Busting no `index.html` para os arquivos `app.min.js` e `style.min.css` (para quebrar o cache de clientes rodando js antigo).

## Análise de Causa (A Continuar no Novo Chat)
Apesar do cache-busting e da regra `tB > tA`, o usuário adicionou uma nova partida e ela continua caindo pra baixo da lista do dia.
O sistema adiciona as partidas usando `allData.push(match)` (inserindo no final do array). 
Se a ordenação estivesse funcionando 100%, o `sort` moveria ela para o index 0 (topo) e ela receberia `#358`.
O fato de ela não ir para o topo indica um possível bug residual em:
- Como `tableSortState` está inicializado vs interagido.
- A lógica do `valA.localeCompare(valB)` e sua passagem para o tiebreaker.
- Ou o DOM está exibindo um elemento `r.id` de forma inconsistente por um erro de escopo não detectado.

## Instrução para o Próximo Chat
- Inicie a sessão lendo esta spec.
- Siga as diretrizes rígidas do SDD (crie o plano, exiba no artefato e aguarde o "Proceed" antes de mexer no código).
- Concentre a investigação nos arquivos `js/table.js` (sort logic e renderTable) e verifique novamente todo o loop de renderização após a submissão.
