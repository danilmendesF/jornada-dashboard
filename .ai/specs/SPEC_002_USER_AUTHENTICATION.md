# 📝 SPEC_002: SISTEMA DE AUTENTICAÇÃO E CADASTRO DE JOGADORES DO TIME

- **Status**: 🟡 EM REVISÃO (Aguardando Aprovação do Usuário)
- **Autor**: Spec-Architect
- **Data**: 2026-08-05
- **Módulos Impactados**: `js/auth.js` [NEW], `js/config.js`, `js/storage.js`, `index.html`, `style.css`, `api/auth.js` [NEW]

---

## 1. Visão Geral & Motivação
Esta especificação define o sistema de **Autenticação, Cadastro e Controle de Acesso** para os membros do time no **Jornada Dashboard**. O objetivo é permitir que cada jogador se cadastre e faça login na aplicação com uma identidade visual moderna (estilo Pokémon TCG Dark Premium), protegendo a integridade dos dados e impedindo a exposição ou adulteração de informações entre sessões.

---

## 2. Avaliação de Arquitetura & Segurança Backend (Análise de Exposição)

### ⚠️ Risco de Segurança da Abordagem Apenas no Cliente (`localStorage`)
Se o cadastro e o login fossem implementados 100% no navegador via `localStorage`:
- As senhas (mesmo em hash) e os registros de dados ficariam expostos no DevTools do navegador.
- Qualquer jogador poderia modificar os registros de outro jogador ou impersonar membros do time.
- Não haveria garantia de integridade nas partidas espelho nem controle de permissões.

### 🛡️ Arquitetura Backend Recomendada (Vercel Serverless + JWT / Bcrypt)
Para garantir **zero exposição de dados e segurança real**:
1. **Serverless Auth API (`api/auth.js`)**: Endpoints seguros para `/api/auth/register`, `/api/auth/login` e `/api/auth/verify`.
2. **Hash Seguro de Senha (`bcryptjs`)**: As senhas dos jogadores nunca são armazenadas em texto plano.
3. **Sessão via Token JWT**: Token de sessão assinado armazenado de forma segura, validando quem está enviando requisições de sincronização.
4. **Isolamento de Dados por Jogador**: Cada partida é vinculada ao ID do jogador autenticado, mantendo o histórico protegido e sincronizado.

---

## 3. Requisitos Funcionais (RF)

### RF-01: Tela de Login e Cadastro (UI Team Identity)
- Modal/Tela de entrada com estética Premium Dark Mode (efeitos de glassmorphism, gradientes HSL vibrantes e bordas neon).
- Formulário com alternância suave entre as abas **"Entrar"** e **"Cadastrar-se"**.
- Campos: Nome do Jogador (seleção do time ou novo), E-mail, Senha e Confirmação de Senha.

### RF-02: Gestão de Sessão & Estado Autenticado
- Indicador no cabeçalho exibindo o avatar/nome do jogador logado (`#userProfileBadge`).
- Opção de **Sair (Logout)** encerra a sessão com segurança.
- As partidas e quick log são automaticamente pré-preenchidos com o nome do jogador autenticado.

---

## 4. Design System (Identidade do Time)

- **Cores**: Fundo Dark Cyber Space (`#080c18`), destaques em Azul Ciano Neon (`#00c8f8`), Roxo Místico (`#7c6af7`) e Dourado Pokémon (`#f5c842`).
- **Animações**: Transições suaves de entrada, brilho pulsante no botão de Login e efeito de vidro fosco (`backdrop-filter: blur(16px)`).

---

## 5. Critérios de Aceite & Validação Automatizada
- [ ] Formulário de login/cadastro responsivo (320px a 1920px) com touch targets ≥40px.
- [ ] Senhas com hash criptográfico seguro (bcrypt) sem exposição em texto claro.
- [ ] Suíte automatizada `node scripts/validate.cjs` aprovada com 100% dos testes.
