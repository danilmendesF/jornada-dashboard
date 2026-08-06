# SPEC_029_HIDE_ACTIONS_FOR_NON_OWNERS: Restrição Visual de Edição/Deleção de Partidas

## 1. O Problema
Na aba "Registro de Partidas", as ações de **Editar** (`✏️`) e **Deletar** (`🗑️`) estão disponíveis em todas as linhas da tabela, independentemente de quem seja o dono do registro.
Isso permite que um jogador acidentalmente clique para editar ou excluir partidas que pertencem a outros jogadores. A validação visual não está sendo aplicada durante a renderização da tabela no arquivo `app.js`.

## 2. A Solução
Modificar a função de renderização da tabela principal (`renderTable` / loop de paginação no `app.js`) para calcular a posse da partida (`isOwner`). 

Se a partida não pertencer ao jogador atualmente logado (`getActivePlayerName()`), os botões de edição (`✏️`) e deleção (`🗑️`) não devem ser renderizados na coluna de Ações. O botão de comentários (`💬`), se houver, poderá continuar visível para visualização.

### Regra de Negócio (`isOwner`):
- Extrair o nome do usuário logado: `const currentName = typeof getActivePlayerName === 'function' ? getActivePlayerName() : ''`.
- Comparar (case-insensitive) com `r.Player`.
- Se `isOwner` for falso, a constante `actionsCol` deve omitir as tags `<button>` de Editar e Deletar.

## 3. Plano de Teste (QA Agent)
1. **Compilação**: Rodar o build sem quebras de sintaxe no `app.js`.
2. **Integração SDD**: A suíte `node scripts/validate.cjs` não deve acusar erros.
3. A inspeção visual na aplicação em produção mostrará apenas os botões pertencentes ao usuário logado.
