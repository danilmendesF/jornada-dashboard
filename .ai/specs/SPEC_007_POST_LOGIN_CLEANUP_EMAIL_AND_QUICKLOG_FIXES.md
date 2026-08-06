# 📝 SPEC_007: LIMPEZA PÓS-CADASTRO, DIAGNÓSTICO DE E-MAIL E UNIFICAÇÃO DE LISTA DE PLAYERS

- **Status**: 🟡 EM REVISÃO (Aguardando Aprovação do Usuário)
- **Autor**: Spec-Architect
- **Data**: 2026-08-05
- **Módulos Impactados**: `js/auth.js`, `js/quicklog.js`, `js/manager_forms.js`, `api/email.js`, `api/auth.js`, `docs/DEPLOYMENT.md`

---

## 1. Visão Geral & Motivação
Esta especificação corrige três apontamentos pós-homologação de deploy:
1. **Limpeza de Formulários**: Limpar automaticamente campos de senha e e-mail após concluir cadastro ou login, evitando que dados sensíveis permaneçam visíveis.
2. **Envio e Feedback de E-mail de Confirmação**: Fornecer diagnóstico transparente e feedback no cadastro sobre a entrega do e-mail de confirmação (Resend API Key na Vercel).
3. **Unificação da Lista de Players**: Corrigir a discrepância entre a lista de jogadores do Quick Log e do Formulário Completo, garantindo que ambos exibam todos os integrantes da equipe (`Danilo`, `GuiVaz`, `Victor`, `Lipe`), com o jogador logado pré-selecionado.

---

## 2. Requisitos Funcionais (RF)

### RF-01: Limpeza Automática dos Campos (`js/auth.js`)
- Criar a função `clearAuthForms()` executada imediatamente após `executeLogin()`, `executeRegister()` ou `logoutUser()`.
- Reseta todos os inputs de e-mail e senha (`wallRegEmail`, `wallRegPassword`, `wallRegConfirm`, `wallLoginPassword`, `authRegEmail`, `authRegPassword`, etc.).
- Limpa o indicador visual de coincidência de senhas (`#wallPasswordMatchHint` e `#authPasswordMatchHint`).

### RF-02: Diagnóstico e Transparência no Envio de E-mail (`api/email.js` & `api/auth.js`)
- Atualizar a resposta do backend Node.js (`POST /api/auth?action=register`) para indicar se o e-mail real foi enviado via Resend (`emailSent: true`) ou se correu em modo de simulação por falta de chave (`emailSent: false`).
- Exibir toast informativo para o usuário sobre a confirmação do e-mail.

### RF-03: Unificação da Lista de Players (`js/quicklog.js` & `js/manager_forms.js`)
- Unificar o array padrão de jogadores em todos os módulos para `['Danilo', 'GuiVaz', 'Victor', 'Lipe']`.
- Em `populateQuickLogDropdowns()`, renderizar todos os jogadores cadastrados na equipe e selecionar por padrão o jogador logado (`currentUser.linkedPlayer || currentUser.name`).

---

## 3. Critérios de Aceite & Validação
- [ ] Formulários de login e cadastro são limpos imediatamente após a conclusão.
- [ ] Mensagem clara de feedback é exibida sobre o e-mail de confirmação.
- [ ] Quick Log e Formulário Completo exibem exatamente a mesma lista unificada de jogadores.
- [ ] Suíte automatizada `node scripts/validate.cjs` e `node scripts/validate_auth.cjs` aprovada em 100% dos 61 testes.
