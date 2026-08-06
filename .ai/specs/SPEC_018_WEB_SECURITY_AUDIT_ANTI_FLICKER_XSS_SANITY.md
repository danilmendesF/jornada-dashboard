# 📝 SPEC_018: AUDITORIA DE SEGURANÇA WEB, ANTI-FLICKER, SANITIZAÇÃO E FILTRO DE JOGADORES CADASTRADOS

- **Status**: 🟡 EM REVISÃO (Aguardando Aprovação do Usuário)
- **Autor**: Security Architect & Lead Dev
- **Data**: 2026-08-06
- **Módulos Impactados**: `index.html`, `js/auth.js`, `api/sync.js`, `js/config.js`, `style.css`, `manager.js`

---

## 1. Visão Geral & Objetivos de Segurança

Esta especificação implementa a blindagem arquitetural, de vazamento de dados e de experiência de usuário no Jornada Dashboard:
1. **Eliminação do Login Flash/Flicker**: Garantir que usuários logados não vejam a tela de login nem por 1 milissegundo durante o Refresh (`F5`).
2. **Remoção Total de Jogadores Já Cadastrados no Registro**: Filtrar 100% os integrantes que já criaram conta para que **NÃO APAREÇAM** no dropdown de cadastro (`#wallRegName` e `#authRegName`).
3. **Prevenção de Vazamento de Dados via Console DevTools**: Sanitizar e remover qualquer `console.log` que exiba tokens, e-mails, hashes de senha ou payloads de rede no console do navegador.
4. **Sanitização contra XSS (Cross-Site Scripting)**: Sanitizar todo input de texto livre (`Comentarios`, nomes de decks e adversários) antes da renderização em tabelas.
5. **Validação de Assinatura JWT no Backend (`api/sync.js`)**: Garantir que apenas payloads autenticados com chave HMAC-SHA256 possam realizar escritas na nuvem.

---

## 2. Requisitos Funcionais & Segurança (RF)

### RF-01: Trava Anti-Flicker Síncrona no `<head>` (`index.html`)
- Inserir um script inline síncrono no `<head>` que lê `localStorage.getItem('jornada_auth_token')` e `jornada_user_profile`.
- Se o token existir, aplicar a classe CSS `auth-session-active` imediatamente no `<html>` antes do navegador desenhar a tela, ocultando `#authPageWall` no 1º frame.

### RF-02: Remoção Estrita de Jogadores Já Cadastrados (`js/auth.js`)
- Em `populatePlayerRegisterDropdowns()` (`js/auth.js`):
  - Filtrar a lista `currentPlayers` excluindo todos os nomes presentes em `getClaimedPlayers()`.
  - Os jogadores que já possuem conta cadastrada **NÃO APARECERÃO MAIS** de nenhuma forma na caixa de seleção.

### RF-03: Sanitização de Logs de Console (Prevenção de Leaks)
- Auditar e remover qualquer output de `console.log` que exponha senhas, tokens JWT ou hashes de usuário nas ferramentas de desenvolvedor.

### RF-04: Helper de Sanitização XSS (`js/config.js`)
- Criar `window.sanitizeHTML(str)` e aplicá-lo em `js/table.js` para renderização segura de textos e comentários.

---

## 3. Critérios de Aceite & Validação
- [ ] No cadastro (`🔑 Registre-se`), jogadores que já possuem conta cadastrada NÃO aparecem mais na caixa de seleção.
- [ ] O console do navegador não exibe nenhum token, e-mail privado ou hash de senha.
- [ ] Ao recarregar a página (`F5`) estando logado, a tela do Dashboard aparece instantaneamente sem piscar a tela de login.
- [ ] Suíte automatizada `node scripts/validate.cjs` e `node scripts/validate_auth.cjs` aprovada em 100% dos 61+ testes.
