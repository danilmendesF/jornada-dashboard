# SPEC_032_NOTIFY_DECK_FIX: Correção do Erro 400 no Disparo de E-mail

## 1. A Causa do Problema
O usuário relatou um erro `400 (Bad Request)` na rota `/api/notifyDeck` ao salvar um deck.
Analisando o código, a API foi construída (na SPEC_031) com uma validação rígida de segurança:
```javascript
if (!playerName || !deckName) { return res.status(400).json({ error: 'Invalid data' }); }
```
Ocorre que, no formulário de cadastro de deck do front-end (`manager.js`), o campo `player` é **opcional**. Se o usuário deixar o campo "Player" em branco, a variável envia uma string vazia `""` para o backend. O backend avalia `!playerName` como verdadeiro e recusa a requisição com status `400`, impedindo o envio do e-mail.

## 2. A Solução
A correção deve ser feita no gatilho do front-end (`manager.js`).
Ao invés de enviar a variável `player` crua (que pode estar vazia), devemos enriquecê-la com o nome do jogador que está logado no sistema ou um fallback.

### Modificação no `manager.js` (Função `saveDeckForm`):
**De:**
```javascript
body: JSON.stringify({playerName: player, deckName: name})
```
**Para:**
```javascript
const activeUser = typeof getActivePlayerName === 'function' ? getActivePlayerName() : '';
const finalPlayerName = player || activeUser || 'Um jogador';
...
body: JSON.stringify({playerName: finalPlayerName, deckName: name})
```

## 3. Plano de Teste (QA Agent)
1. **Inspeção Estática**: Verificar se o `manager.js` não gerou quebras de sintaxe (via `validate.cjs`).
2. Testar que `!playerName` nunca será nulo com o fallback ativo, eliminando a chance do HTTP `400`.
