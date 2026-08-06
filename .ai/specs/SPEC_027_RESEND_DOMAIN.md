# SPEC_027_RESEND_DOMAIN: Correção do Erro 403 no Envio de E-mails (Resend)

## 1. O Problema
Ao tentar enviar e-mails via API do Resend no ambiente de produção, a plataforma retorna o erro HTTP `403 Forbidden` com a seguinte mensagem:
> "Testing domain restriction: The resend.dev domain is for testing and can only send to your own email address. To send to other recipients, verify a domain and update the from address to use it."

A causa raiz é que o arquivo `api/email.js` tem o endereço de remetente (*from*) chumbado (hardcoded) como `onboarding@resend.dev` (como fallback da variável de ambiente). Como o domínio customizado do projeto (`jornadatcgteam.com.br`) já foi verificado com sucesso no painel da Resend, o e-mail de envio deve obrigatoriamente utilizar este domínio aprovado.

## 2. A Solução
Modificar o fallback no arquivo `api/email.js` para utilizar um endereço pertencente ao domínio validado: `contato@jornadatcgteam.com.br` ou `nao-responda@jornadatcgteam.com.br`.

### Alteração Específica:
- Arquivo: `api/email.js` (Linha 7)
- **De:** `const FROM_EMAIL = process.env.FROM_EMAIL || 'Jornada TCG Team <onboarding@resend.dev>';`
- **Para:** `const FROM_EMAIL = process.env.FROM_EMAIL || 'Jornada TCG Team <nao-responda@jornadatcgteam.com.br>';`

## 3. Plano de Teste
1. Efetuar a alteração.
2. Fazer o deploy para a Vercel.
3. Solicitar que o usuário realize um cadastro no sistema.
4. O cadastro deve concluir com sucesso e o log da Vercel/Resend deve registrar status `200 OK`, com o e-mail chegando à caixa de entrada do destinatário sem restrição.
