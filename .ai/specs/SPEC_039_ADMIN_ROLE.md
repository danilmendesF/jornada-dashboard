# SPEC_039_ADMIN_ROLE: Role-Based Access Control e Fim do PIN

## 1. O Problema
Atualmente, o botão "Gerenciar" e a tela de configurações do Gerenciador de Dados são protegidas por um PIN estático (`adminPin`) legado. Esse modelo se tornou obsoleto com o lançamento do sistema de Login Individual (JWT) implementado nas SPECs anteriores, e, devido à migração forçada de nuvem, o PIN local do administrador se fundiu com o banco da Vercel, trancando a porta do gerente.

## 2. A Solução (RBAC Simples)
Iremos arrancar todo o subsistema de PIN (HTML, JS, LocalStorage e Cloud Sync) e substituí-lo por uma Validação de Identidade baseada no usuário logado no momento.
A regra de negócios: Apenas o e-mail oficial do administrador (`danilmendes@gmail.com`) receberá a "Role" (Permissão) de visualizar o botão e acessar o modal do Gerenciador de Dados.
Os demais jogadores (Victor, Lipe, GuiVaz, etc.) verão o painel, poderão logar partidas, mas o botão "Gerenciar" e seu modal estarão 100% invisíveis/inacessíveis para eles.

## 3. Tarefas de Refatoração
1. **Limpeza do HTML (`index.html`)**:
   - Deletar todas as tags referentes a `<input type="password" id="adminPinInput">`, `<input id="changeAdminPinNew">`, e botões associados dentro do modal do Gerenciador.
2. **Desacoplamento JS (`js/manager_forms.js`, `manager.js`)**:
   - Excluir funções `getAdminPin`, `hasAdminPin`, e listeners de teclado do `#adminPinInput`.
   - Excluir o parâmetro `adminPin` da construção do payload de sincronismo na nuvem (`pushToCloud`).
3. **Trava de Autenticação (`js/auth.js`)**:
   - Na função `updateAuthUI()`, injetar a trava condicional:
     ```javascript
     const btnManager = document.getElementById('btnOpenManager');
     if (btnManager) {
       if (window.currentUser && window.currentUser.email === 'danilmendes@gmail.com') {
         btnManager.style.display = 'inline-flex';
       } else {
         btnManager.style.display = 'none';
       }
     }
     ```

## 4. Plano de QA
A execução de `validate.cjs` assegurará que a remoção das chaves JS do PIN antigo não tenha corrompido ou deixado pontas soltas na renderização do aplicativo.
