# Project Context

## Resumo do produto

O **Jornada Dashboard** é uma plataforma web completa para registro, análise estatística e acompanhamento competitivo de partidas de Pokémon TCG. Permite registrar partidas nos formatos MD1 e MD3, gerenciar decks/arquétipos, analisar taxa de vitória (winrates), confrontos (matchups), taxa de zica (brick), confiabilidade e sincronizar os dados entre jogadores e dispositivos em tempo real.

## Objetivo principal

Fornecer uma ferramenta ágil, precisa e visual para jogadores competitivos de Pokémon TCG registrarem seus resultados, analisarem o meta atual e sincronizarem históricos de partidas individuais e espelhadas (mirror matches) com alta integridade de dados.

## Stack e runtime

- **Linguagem:** JavaScript (ES6+), HTML5, CSS3
- **Framework principal:** Vanilla JS / Native Web Platform
- **UI:** CSS3 Vanilla (Design System Dark/Neon customizado, layout responsivo para desktop e mobile)
- **Backend/API:** Vercel Serverless Functions (`api/sync.js`, `api/auth.js`, `api/notifyDeck.js`, `api/email.js`) com integração Redis / keyvalue.xyz e autenticação JWT
- **Armazenamento:** LocalStorage (Offline-First) + Cloud Sync (`/api/sync`)
- **Ferramentas de build/test:** Node.js (scripts em `scripts/`: `build_bundle.cjs`, `bump_version.cjs`, `validate_seqID.cjs`)

## Arquitetura e convenções

- `index.html`: Interface principal contendo formulários, modais de autenticação, tabela de histórico e painel estatístico.
- `app.js`: Ponto de entrada da aplicação, gerenciamento de estado global (`allData`, `filtered`), inicialização e unificação de dados.
- `manager.js`: Gerenciamento do formulário principal de partidas, edição, exclusão e rotinas do painel administrativo.
- `js/`: Módulos Javascript desacoplados (`table.js`, `quicklog.js`, `manager_forms.js`, `storage.js`, `sync_cloud.js`, `stats.js`, `auth.js`, `filters.js`, `matchup.js`, `md3.js`, `mirror.js`, `charts.js`).
- `api/`: Serverless Functions no padrão Vercel para autenticação, sincronização na nuvem e envio de e-mails/notificações.
- `scripts/`: Scripts automatizados para minificação (`dist/app.min.js`), incremento de versão semântica (`version.json`) e validações de integridade (`validate_seqID.cjs`).

---

## Domínio e regras importantes do sistema

### 1. Autenticação, Cadastro de Usuários e Segurança
- **Login e Registro:** O sistema conta com modal de autenticação (Login e Cadastre-se) suportado por JWT emitido via `/api/auth`.
- **Associação Jogador-Usuário:** Ao realizar cadastro/login, a conta de usuário é vinculada a um nome de jogador oficial cadastrado no sistema.
- **Restrição de Ações:** O registro de partidas via formulário padrão e Quick Log é restrito ao jogador autenticado. Ações de edição e exclusão na tabela são permitidas apenas para o próprio autor da partida ou usuários com perfil administrador (`admin`).

### 2. Registro de Partidas e Sequenciamento (`seqID`)
- **Formatos de Registro:** Suporta registro completo (MD1/MD3) com detalhes de quem iniciou (`1º` ou `2º`), placar, resultado, indicativo de zica (`Brick`), confiabilidade (`Alta`/`Baixa`), local e listas de deck (Meu Deck / Oponente).
- **Quick Log Mobile:** Interface rápida otimizada para registro de partidas em torneios presenciais em poucos cliques.
- **Identificador Único Incremental (`seqID`):** Todas as partidas possuem um `seqID` numérico inteiro incremental (`1..N`). A ordenação é estritamente cronológica com base no timestamp real de criação (`getMatchTimestamp`). Novas partidas recebem `max(seqID) + 1`.
- **Partida Espelho (Mirror Match):** Ao registrar uma partida contra outro jogador cadastrado no time, o sistema gera automaticamente a partida oposta espelhada no histórico do oponente.

### 3. Dashboards e Análise Estatística
- **Painel Geral:** Exibe KPIs com total de partidas, taxa global de vitória (% Winrate), partidas jogadas de `1º` vs `2º` e taxa geral de zica (`Brick`).
- **Análise de MD3:** Métrica dedicada analisando o desempenho específico em partidas MD3 (Vitórias em Game 1, Game 2 e Game 3).
- **Matchup e Arquétipos:** Matriz de desempenho contra arquétipos adversários, winrates por deck, coleções de cartas e locais de torneios.

### 4. Filtros e Pesquisa
- **Filtragem Multi-Critério:** Filtros combinados por Jogador, Arquétipo, Formato (MD1/MD3), Local, Coleção e Confiabilidade.
- **Busca Textual Global (`filterSearch`):** Campo de busca rápida pesquisando simultaneamente por nome de jogador, deck, arquétipo ou resultado.
- **Reatividade Instantânea:** A aplicação atualiza a tabela, paginação e todos os blocos de estatísticas em tempo real assim que um filtro é alterado.

### 5. Gerenciamento e Unificação de Arquétipos
- **Gestão de Decks e Arquétipos:** Cadastro de decks vinculados a arquétipos e subtipos.
- **Unificação de Arquétipos em Lote:** Permite migrar e unificar variações de nomes de arquétipos para um arquétipo padronizado, preservando o histórico de deletados na lixeira do sistema.

### 6. Sincronização em Nuvem e Persistência
- **Arquitetura Offline-First:** Os dados são armazenados localmente via `localStorage` para carregamento instantâneo.
- **Sincronização Automática (`/api/sync`):** Rotinas de `pushToCloud` e `pullFromCloud` mantém os dados sincronizados entre múltiplos dispositivos usando token de time compartilhado (`team_default_sync`).
- **Auto-Backups:** O sistema gera snapshots automáticos e permite exportação/importação manual em arquivo JSON a qualquer momento.
