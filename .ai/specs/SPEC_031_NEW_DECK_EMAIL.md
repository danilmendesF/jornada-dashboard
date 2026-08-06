# SPEC_031_NEW_DECK_EMAIL: Notificação de Novo Deck

## 1. O Desafio
O administrador do sistema (Danilo) precisa ser notificado por e-mail sempre que qualquer jogador cadastrar um novo deck no sistema, para monitorar a evolução do meta interno da equipe. A notificação precisa conter o nome do jogador que adicionou e qual deck (arquétipo e subtipo) foi adicionado.

## 2. A Solução
### 2.1 Backend: Novo E-mail e Endpoint (`api/email.js` & `api/notifyDeck.js`)
- Criar a função `sendNewDeckEmail(playerName, deckName)` no módulo de e-mails (`api/email.js`), utilizando o template HTML do Resend.
- O destinatário será fixado como `danilomendes_12@hotmail.com` (o e-mail do Danilo, conforme consta na base).
- Criar um novo arquivo Serverless Vercel `api/notifyDeck.js` para receber o POST via HTTP e disparar o e-mail.

### 2.2 Frontend: Gatilho no Gerenciador (`manager.js`)
- Localizar a função `saveDeckForm()` e injetar uma requisição `fetch('/api/notifyDeck')`.
- O disparo deve ocorrer **apenas** quando for um cadastro novo (quando `editingDeckId` for vazio ou nulo). Edições de decks existentes não devem engatilhar e-mail de notificação (spam-prevention).

## 3. Plano de Teste (QA Agent)
1. **Inspeção de Sintaxe**: Verificar os novos arquivos JS e o `manager.js`.
2. **Integração SDD**: `validate.cjs` precisa rodar liso.
3. **Teste de Mesa**: Certificar-se de que o `fetch` é assíncrono e falhas na rede não devem impedir o salvamento do deck no localStorage.
