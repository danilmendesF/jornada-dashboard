# Project Context

## Resumo do produto

O **Jornada Dashboard** é uma plataforma web completa para registro, análise estatística e acompanhamento competitivo de partidas de Pokémon TCG. Permite registrar partidas (MD1 e MD3), gerenciar decks/arquétipos, analisar taxa de vitória (winrates), confrontos (matchups), taxa de zica (brick), confiabilidade e sincronizar os dados entre jogadores e dispositivos.

## Objetivo principal

Fornecer uma ferramenta ágil, precisa e visual para jogadores competitivos de Pokémon TCG registrarem seus resultados, analisarem o meta atual e sincronizarem históricos de partidas individuais e espelhadas (mirror matches) em tempo real.

## Stack e runtime

- **Linguagem:** JavaScript (ES6+), HTML5, CSS3
- **Framework principal:** Vanilla JS / Native Web Platform
- **UI:** CSS3 Vanilla (Design System Dark/Neon customizado, layout responsivo)
- **Backend/API:** Vercel Serverless Functions (`api/sync.js`, `api/auth.js`, `api/notifyDeck.js`, `api/email.js`) com integração Redis / keyvalue.xyz e JWT authentication
- **Armazenamento:** LocalStorage + Cloud Sync (`/api/sync`)
- **Ferramentas de build/test:** Node.js (scripts em `scripts/`: `build_bundle.cjs`, `bump_version.cjs`, `validate_seqID.cjs`)

## Arquitetura e convenções

- `index.html`: Interface principal contendo formulários, modais, tabela de histórico e painel estatístico.
- `app.js`: Ponto de entrada da aplicação, gerenciamento de estado global (`allData`, `filtered`), inicialização e unificação de dados.
- `manager.js`: Gerenciamento do formulário principal de partidas, edição, exclusão e rotinas do painel administrativo.
- `js/`: Módulos Javascript desacoplados (`table.js`, `quicklog.js`, `manager_forms.js`, `storage.js`, `sync_cloud.js`, `stats.js`, `auth.js`, etc.).
- `api/`: Serverless Functions no padrão Vercel para autenticação, sincronização na nuvem e notificações.
- `scripts/`: Scripts automatizados para minificação (`dist/app.min.js`), incremento de versão semântica (`version.json`) e validações de integridade.

## Domínio e regras importantes

- **Partidas e Sequenciamento:** Cada partida possui um identificador sequencial `seqID` numérico inteiro positivo. As partidas são sequenciadas cronologicamente a partir do surgimento do sistema (`#1`) e novas partidas recebem `max(seqID) + 1`.
- **Match Espelho (Mirror Match):** Ao registrar partidas no modo time, o sistema cria automaticamente a partida oposta com o ID espelho.
- **Visualização Padrão:** A tabela de histórico ordena as partidas por padrão por `seqID` decrescente (`desc`), exibindo a partida mais recente no topo.
