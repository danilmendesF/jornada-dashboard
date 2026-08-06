# 📝 SPEC_008: EXIGÊNCIA DE LOGIN PÓS-CADASTRO E DIAGNÓSTICO DE E-MAIL

- **Status**: 🟡 EM REVISÃO (Aguardando Aprovação do Usuário)
- **Autor**: Spec-Architect
- **Data**: 2026-08-05
- **Módulos Impactados**: `js/auth.js`, `api/auth.js`, `api/email.js`, `docs/DEPLOYMENT.md`

---

## 1. Visão Geral & Motivação
Esta especificação atende a dois ajustes fundamentais de regra de negócio:
1. **Obrigatoriedade de Login Pós-Cadastro**: Ao concluir o cadastro, o sistema **não** autentica automaticamente o usuário nem libera o dashboard. O cadastro é salvo, o formulário é limpo, o painel alterna automaticamente para a aba **`🔑 Entrar`** e o usuário é obrigado a fazer o login manual.
2. **Esclarecimento e Diagnóstico de E-mail (Resend Domain Testing)**: Explicar por que o e-mail não chegou (limitação de domínio de teste do Resend `onboarding@resend.dev` que exige que o e-mail de destino seja o mesmo e-mail da conta cadastrada no Resend enquanto não houver domínio próprio) e melhorar o tratamento na API.

---

## 2. Requisitos Funcionais (RF)

### RF-01: Trava de Login Obrigatório Pós-Cadastro (`js/auth.js`)
- Na função `executeRegister()`:
  - Remover a gravação automática do token `jornada_auth_token` e da variável `window.currentUser`.
  - Após o retorno positivo do backend (`200 OK`), limpar os formulários via `clearAuthForms()`.
  - Alternar a interface de login para a aba **`🔑 Entrar`** (`switchAuthTab('login')`).
  - Exibir a notificação: `"⚡ Cadastro realizado com sucesso! Faça login com seu e-mail e senha para acessar o painel."`

### RF-02: Diagnóstico de Envio de E-mail & Regra do Resend (`api/email.js` & `api/auth.js`)
- Retornar na resposta do backend a mensagem de erro exata retornado pela API do Resend se houver falha.
- Nota de Documentação: Na conta gratuita do Resend sem domínio próprio verificado, o remetente gratuito `onboarding@resend.dev` **só permite enviar e-mails de teste para o próprio e-mail cadastrado na conta do Resend**. Para enviar para e-mails de terceiros, é necessário cadastrar um domínio próprio ou enviar para o e-mail do titular da conta Resend.

---

## 3. Critérios de Aceite & Validação
- [ ] Cadastro concluído redireciona obrigatoriamente para a aba de Login sem liberar o dashboard.
- [ ] Usuário precisa digitar e-mail e senha para entrar pós-cadastro.
- [ ] Suíte automatizada `node scripts/validate.cjs` e `node scripts/validate_auth.cjs` aprovada em 100% dos 61 testes.
