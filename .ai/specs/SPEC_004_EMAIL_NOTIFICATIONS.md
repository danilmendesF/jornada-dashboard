# 📝 SPEC_004: ENVIO DE E-MAIL DE BOAS-VINDAS E CONFIRMAÇÃO DE CADASTRO

- **Status**: 🟡 EM REVISÃO (Aguardando Aprovação do Usuário)
- **Autor**: Spec-Architect
- **Data**: 2026-08-05
- **Módulos Impactados**: `api/auth.js`, `api/email.js` [NEW], `docs/DEPLOYMENT.md`

---

## 1. Visão Geral & Motivação
Esta especificação define o envio automático de **e-mails de confirmação e boas-vindas** sempre que um jogador concluir o cadastro no **Jornada Dashboard**. O e-mail reforça a identidade visual do time (Pokémon TCG Dark Cyber Space) e confirma a liberação do acesso ao painel regional.

---

## 2. Requisitos Funcionais (RF)

### RF-01: Disparo Automático Pós-Cadastro
- Sempre que a API backend `POST /api/auth?action=register` criar um novo usuário com sucesso, dispara uma requisição assíncrona de e-mail de boas-vindas.
- O e-mail será enviado para o endereço fornecido no formulário (`authRegEmail` / `wallRegEmail`).

### RF-02: Template HTML do E-mail do Time
- **Assunto**: `⚡ Cadastro Confirmado! Bem-vindo ao Jornada TCG Team 🎮`
- **Conteúdo HTML**:
  - Logo do Jornada TCG Team.
  - Mensagem personalizada com o nome do jogador.
  - Instruções de acesso e confirmação do cadastro.
  - Design responsivo Dark Cyber com cores do time (Ciano `#00c8f8` e Roxo `#7c6af7`).

### RF-03: Provedor de E-mail Assíncrono (Resend / SMTP com Fallback)
- Utiliza serviço de e-mail de alta entregabilidade (como **Resend** ou **Nodemailer/SMTP**).
- Se a chave `RESEND_API_KEY` ou `SMTP_URL` estiver configurada na Vercel, o e-mail real é entregue.
- Se executado em ambiente local sem chaves de e-mail, o sistema gera log simulado sem interromper a experiência do usuário.

---

## 3. Critérios de Aceite & Validação
- [ ] Cadastro gera disparo de e-mail com template HTML personalizado.
- [ ] Suíte automatizada `node scripts/validate.cjs` aprovada com 100% dos testes.
