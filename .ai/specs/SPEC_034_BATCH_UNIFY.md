# SPEC_034_BATCH_UNIFY: Unificações em Lote e Correção de Cache de Nomes

## 1. O Problema
Na última atualização, nós adicionamos a variável `fromDeck` à lista de deleções (`deletedDecks`). No entanto, `fromDeck` representa apenas o **Arquétipo** selecionado no dropdown (ex: `Trevonas`).
Quando a nuvem (`pullFromCloud`) funde os decks, ela busca os decks no banco. Se na nuvem houver um deck chamado `Trevonas (Dark)` (com subtipo), a variável de deleção `Trevonas` **não** bloqueia o deck `Trevonas (Dark)`, porque a string inteira do nome não bate. Como o nome é diferente, o sistema baixa esse "novo" deck pra máquina local. Na máquina local, como as partidas já tinham sido convertidas para `Trevosas`, esse deck reaparece vazio e entra nos filtros e dropdowns.
Além disso, o modal de unificação se fecha automaticamente após o uso, impedindo que o administrador faça limpezas rápidas de múltiplos arquétipos.

## 2. A Solução
### 2.1 Correção do Cache de Nomes
No `js/manager_forms.js` (`submitUnifyArchetypes`), antes de aplicar a modificação no objeto do deck, o sistema deverá iterar e adicionar o **nome completo** atual (`d.name`) de todos os decks afetados à lista de deleções (`delDecks`). Isso garantirá que nenhuma variante do nome antigo volte a aparecer, matando o problema pela raiz.

### 2.2 Unificações em Lote (Batch Unification)
Ao invés de fechar o modal (`closeModal`) após a unificação:
- O modal permanecerá aberto.
- O campo alvo (`unifyTargetArchetypeInput`) será limpo.
- A lista suspensa de arquétipos (`unifyFromDeckSelect`) será re-renderizada automaticamente (com os dados atualizados), fazendo o arquétipo recém-unificado sumir da lista para o usuário selecionar o próximo da fila.
- A notificação toast confirmará o sucesso de cada unificação individualmente.

## 3. Plano de Teste (QA Agent)
1. Rodar `validate.cjs` para garantir que o Javascript permanece sintaticamente válido após as alterações.
2. Validar que as funções de repopular o select do modal funcionam sem erros.
