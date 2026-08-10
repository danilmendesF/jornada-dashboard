# Project Context

## Resumo do produto

O **Jornada Dashboard** é uma plataforma web para registro, análise estatística e acompanhamento competitivo de partidas de Pokémon TCG. Permite registrar partidas nos formatos MD1 e MD3, gerenciar decks/arquétipos, analisar taxa de vitória (winrates), confrontos (matchups), taxa de zica (brick), confiabilidade e sincronizar os dados entre jogadores e dispositivos em tempo real.

## Objetivo principal

Fornecer uma ferramenta ágil, precisa e visual para jogadores competitivos de Pokémon TCG registrarem seus resultados, analisarem o meta atual e sincronizarem históricos de partidas individuais e espelhadas (mirror matches) com alta integridade de dados e ordenação cronológica contígua.

## Stack e runtime

- **Linguagem:** JavaScript (ES6+), HTML5, CSS3
- **Framework principal:** Vanilla JS / Native Web Platform (sem frameworks pesados no cliente)
- **UI & Estilização:** CSS3 Vanilla (Design System Dark/Neon customizado com tema Cyber Pokémon, totalmente responsivo para desktop e mobile)
- **Backend / API Serverless:** Vercel Serverless Functions (`api/sync.js`, `api/auth.js`, `api/notifyDeck.js`, `api/email.js`) com integração Redis / keyvalue.xyz e autenticação JWT (HMAC-SHA256)
- **Serviço de E-mail:** Resend API para envio de notificações automatizadas de novos decks cadastrados
- **Armazenamento:** LocalStorage (Offline-First) + Cloud Sync (`/api/sync`)
- **Ferramentas de Build e Testes:** Node.js (scripts automatizados em `scripts/`: `build_bundle.cjs`, `bump_version.cjs`, `validate_seqID.cjs`, `validate_auth.cjs`)

## Arquitetura e convenções

- `index.html`: Interface principal contendo formulários, modais de autenticação, tabela de histórico e painel estatístico.
- `app.js`: Ponto de entrada da aplicação, gerenciamento de estado global (`allData`, `filtered`), inicialização e unificação de dados.
- `manager.js`: Gerenciamento do formulário principal de partidas, edição, exclusão e rotinas do painel administrativo.
- `js/`: Módulos Javascript desacoplados:
  - `auth.js`: Autenticação JWT, sessão de usuário e controle de permissões.
  - `table.js`: Renderização da tabela de partidas, paginação e ordenação por colunas.
  - `quicklog.js`: Modal de registro rápido (Quick Log) otimizado para celulares em torneios.
  - `manager_forms.js`: Gestão de formulários de decks, subtipos e unificação de arquétipos em lote.
  - `storage.js`: Camada de persistência local em `localStorage` (`KEY_MATCHES`, `KEY_DECKS`, etc.).
  - `sync_cloud.js`: Sincronização de dados na nuvem (`pushToCloud`, `pullFromCloud`, backups JSON).
  - `stats.js`, `charts.js`, `matchup.js`, `md3.js`: Calculadoras estatísticas e gráficos de desempenho.
  - `filters.js`: Sistema de filtragem dinâmica e busca textual global (`filterSearch`).
  - `mirror.js`: Lógica de espelhamento automático de partidas entre jogadores do mesmo time.
- `api/`: Serverless Functions no padrão Vercel para autenticação, sincronização e notificações.
- `dist/`: Artifacts de produção minificados (`app.min.js`, `style.min.css`) gerados automaticamente.
- `scripts/`: Scripts automatizados para minificação, versão semântica (`version.json`) e validação de integridade.

---

## Fluxo principal da aplicação

1. **Acesso e Autenticação:** O usuário acessa a plataforma e realiza Login/Cadastro no modal de autenticação. A sessão JWT é mantida em `localStorage` e vincula o usuário ao seu nome de jogador oficial.
2. **Carregamento e Normalização dos Dados:** Na inicialização, a aplicação lê o `localStorage` e executa a normalização incondicional `ensureMatchSequence` via `app.js`, ordenando todas as partidas por data real e atribuindo `seqID = 1..N`.
3. **Registro de Partidas:** O jogador autenticado registra uma nova partida pelo formulário completo ou pelo Quick Log Mobile. O sistema calcula o próximo `seqID = max + 1`, cria a partida espelho para o oponente (caso seja do time) e adiciona a nova partida no **topo da Página 1**.
4. **Persistência e Sincronização:** A partida é salva localmente via `saveManual` e enviada em segundo plano para a nuvem via `pushToCloud` (`/api/sync`).
5. **Atualização Reativa:** A tabela de histórico, paginação e todos os dashboards estatísticos (Winrates, MD3, Matchups e Brick Rate) são recalculados instantaneamente de acordo com os filtros selecionados pelo usuário.

---

## Domínio e regras importantes do sistema

### 1. Autenticação, Registro de Usuários e Segurança
- **Login e Registro:** Suportado por JWT emitido via `/api/auth` (assinatura HMAC-SHA256 com segredo em variável de ambiente).
- **Associação Jogador-Usuário:** O cadastro vincula a conta a um nome de jogador oficial cadastrado no sistema.
- **Restrição de Ações:** O registro de partidas é permitido apenas para o jogador logado como ele mesmo. Ações de edição e exclusão na tabela são permitidas apenas para o autor do registro ou administradores (`admin`).

### 2. Registro de Partidas e Sequenciamento (`seqID`)
- **Formatos de Registro:** Suporta partidas MD1 e MD3 com detalhamento de início (`1º`/`2º`), placar (ex: `2-1`), resultado (Vitória/Derrota/Empate), indicativo de zica (`Brick`), confiabilidade (`Alta`/`Baixa`), local e listas de decks.
- **Quick Log Mobile:** Formulário otimizado para registro ágil durante torneios presenciais.
- **Leitura de Datas em 3 Camadas (`getMatchTimestamp`):**
  - *Camada 1:* ISO `createdAt` (`> 1000000000000` - Ano 2001+).
  - *Camada 2:* 13 dígitos numéricos no `id` (`> 1000000000000`).
  - *Camada 3:* Parsing da string `Data` (`YYYY-MM-DD`).
- **Sequenciamento Cronológico Absoluto:** As partidas são indexadas de forma estritamente contígua (`seqID 1..N`). A tabela exibe por padrão em ordem decrescente por `seqID`, garantindo a partida mais recente no **topo da Página 1**.
- **Partida Espelho (Mirror Match):** Ao registrar uma partida contra outro jogador cadastrado no time, o sistema gera automaticamente a partida oposta no histórico do adversário.

### 3. Dashboards e Análise Estatística
- **KPIs Globais:** Total de partidas, taxa global de vitória (% Winrate), winrate jogando de `1º` vs `2º` e taxa geral de zica (`Brick Rate`).
- **Análise Avançada de MD3:** Desempenho específico em partidas MD3 com discriminativo de Vitórias/Derrotas no Game 1, Game 2 e Game 3.
- **Matriz de Matchups:** Tabela de desempenho cruzado por arquétipo adversário, winrate por deck utilizado, locais de torneios e coleções de cartas.

### 4. Filtros e Pesquisa
- **Filtragem Multi-Critério:** Filtros dinâmicos combinando Jogador, Arquétipo, Formato (MD1/MD3), Local, Coleção e Confiabilidade.
- **Busca Textual Global (`filterSearch`):** Pesquisa instantânea por nome de jogador, deck, arquétipo, placar ou resultado.
- **Reatividade Instantânea:** A interface re-calcula tabelas e dashboards em tempo real a cada alteração de filtro.

### 5. Gerenciamento e Unificação de Arquétipos
- **Gestão de Decks:** Cadastro de decks associados a arquétipos e subtipos.
- **Unificação em Lote:** Migração de variações de arquétipos para um arquétipo padronizado com preservação na lixeira histórica (`deletedDecks`).

### 6. Sincronização Cloud e Resiliência
- **Arquitetura Offline-First:** Operação via `localStorage` com envio/recebimento assíncrono para Vercel Serverless (`/api/sync`).
- **Fallback de Armazenamento Nuvem:** Suporte primário a Redis com fallback automático transparente para keyvalue.xyz.
- **Notificações por E-mail:** Envio automatizado de e-mail via Resend API quando novos decks são criados.
- **Auto-Backups:** Geração de snapshots diários automáticos e suporte a exportação/importação manual em formato JSON.
