# SPEC_040_INDIVIDUAL_RESET: Reset de Contas Individual via Gerenciador

## 1. O Problema
Atualmente, o aplicativo possui um botão global "Resetar Contas & Liberar E-mails de Teste" na tela inicial (login) e no Gerenciador. Esse botão possui um comportamento destrutivo em massa (`reset_all`), o que apaga o cadastro e a senha de todos os membros do time de uma só vez. Conforme a aplicação amadurece, os usuários não devem poder esvaziar o banco de dados inteiro da tela de login, e administradores precisam de uma forma cirúrgica de resetar a senha de apenas um membro que a esqueceu.

## 2. A Solução
1. **Remoção do Botão Global**: Excluir a opção de reset em massa tanto do Modal de Login (`index.html`) quanto do Header do Gerenciador de Dados.
2. **Endpoint Individual (`api/auth.js`)**: Criar a ação `reset_single` na Vercel Serverless Function, que recebe o `playerName`, busca seu e-mail atrelado no Redis (`player_claim_X`), deleta o e-mail da `users_list`, exclui o objeto `user_X` e remove o jogador do set `claimed_players`.
3. **UI no Gerenciador (`manager.js`)**: Modificar a função `renderPlayersList` (aba Players do Gerenciador) para incluir um pequeno botão de "chave" (🔑) ao lado de cada jogador. Ao clicar, o Admin (e apenas o Admin) poderá resetar individualmente a conta daquele membro, liberando seu nome para um novo cadastro sem afetar os demais.

## 3. Comandos Injetados
- Na API:
  ```javascript
  if (req.method === 'POST' && action === 'reset_single') {
    const { playerName } = req.body || {};
    if (!playerName) return res.status(400).json({error: 'Nome do jogador não informado.'});
    if (redis) {
      const nameKey = `player_claim_${playerName.toLowerCase().trim()}`;
      const email = await redis.get(nameKey);
      if (email) {
        await redis.del(`user_${email.toLowerCase().trim()}`);
      }
      await redis.del(nameKey);
      await redis.sRem('claimed_players', playerName.trim());
    }
    return res.status(200).json({ success: true, message: `Conta de ${playerName} resetada.` });
  }
  ```
- No Frontend: `window.resetPlayerAccount(playerName)` fará o POST confirmando a ação.

## 4. Testes
Rodar `validate.cjs` para garantir a sintaxe e conformidade SDD.
