# SPEC_033_FIX_SYNC_UNIFY: Correção da Ressurreição de Decks Renomeados/Unificados

## 1. O Bug 
O usuário relatou que, ao corrigir ou unificar o nome de um deck, o deck com o nome antigo reaparece pouco tempo depois.
A raiz do problema encontra-se no mecanismo de mesclagem da nuvem (`pullFromCloud` no `manager.js`).
Quando um deck é renomeado ou unificado, o nome novo é salvo localmente. Contudo, o nome *antigo* não é registrado na lista de deleções (`deletedDecks`).
A mesclagem da nuvem (`manager.js`, linha 2214+) desduplica os decks pelo `name` (nome). Como o nome antigo ainda existe na nuvem e não está marcado como deletado, o `pullFromCloud` baixa o deck antigo e o reinsere no armazenamento local ao lado do deck renomeado. Em seguida, o `pushToCloud` salva ambos na nuvem, consolidando a "ressurreição" do deck.

## 2. A Solução
Devemos instruir a nuvem de que o nome antigo não é mais válido. Faremos isso adicionando os nomes antigos à `Set` de deleções de decks (`deletedDecks`) sempre que houver uma alteração destrutiva (renomeação ou unificação).

### Modificações:
1. **No `manager.js` (Função `saveDeckForm`)**:
   - Capturar o `oldName` e `oldArquetipo` antes de aplicar a modificação.
   - Se os nomes forem diferentes (houve renomeação), adicionar `oldName` e `oldArquetipo` ao conjunto `delDecks`.
2. **No `js/manager_forms.js` (Função `submitUnifyArchetypes`)**:
   - O arquétipo de origem (`fromDeck`) está sendo substituído e deixará de existir.
   - Portanto, ele deve ser adicionado ao conjunto de decks deletados: `const delDecks = loadDeletedDecks(); delDecks.add(fromDeck); saveDeletedDecks(delDecks);`.

## 3. Plano de Teste (QA Agent)
1. **Inspeção Estática**: `scripts/validate.cjs` para garantir que o Javascript permanece sintaticamente válido.
2. Nenhuma regra estrutural será quebrada, apenas a inclusão de strings na Set de deleções.
