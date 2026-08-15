# Baseline do Sistema — Jornada TCG Team

**Data da Auditoria Inicial:** 2026-08-14  
**Versão Atual:** 1.7.8  
**Repositório:** jornada-dashboard  
**Status da Baseline:** VERIFIED

---

## 1. Stack Tecnológica e Runtime

| Componente | Tecnologia | Detalhes / Versão | Status |
|---|---|---|---|
| **Runtime Backend** | Node.js (ES Modules) | Vercel Serverless Functions (`/api`) | VERIFIED |
| **Frontend** | Vanilla JavaScript (ES6+), HTML5, CSS3 | Single Page Application sem build-step obrigatório no dev | VERIFIED |
| **Estilização** | CSS3 Custom Properties (Dark / Cyber Pokémon) | `style.css` + Minificação Terser | VERIFIED |
| **Database / KV** | Redis (ioredis / `redis@^4.6.10`) | Fallback automático para keyvalue.xyz em dev/proxy | VERIFIED |
| **Autenticação** | JWT Customizado (HMAC-SHA256) | Assinatura e verificação manual em `api/auth.js` e `api/sync.js` | VERIFIED |
| **Persistência Local** | Web Storage API (`localStorage`) | Arquitetura Offline-First (`jornada_matches_v1`, etc.) | VERIFIED |
| **Envio de E-mail** | Resend API (HTTP REST) | `https://api.resend.com/emails` com fallback de simulação local | VERIFIED |
| **Test Runner** | Vitest v4.1.10 | `@vitest/coverage-v8`, `jsdom` | VERIFIED |
| **Deploy & Hosting** | Vercel (Edge / Serverless) | Deploy automatizado via Git push (`main`) | VERIFIED |

---

## 2. Estrutura de Arquivos e Módulos

- **`index.html`**: Entrypoint da UI (tabelas, gráficos, modais, autenticação e layout responsivo).
- **`style.css`**: Estilos completos (Design system Dark/Neon, regras responsivas e componentes).
- **`app.js`**: Inicialização global, reatividade, filtros combinados, normalização de dados e gráficos.
- **`manager.js`**: Gestão de formulários de registro completo de partidas, edição, exclusão e rotinas administrativas.
- **`js/` (Módulos de Domínio e UI)**:
  - `auth.js`: Gestão de sessão, token JWT no cliente e controle de visibilidade de ações.
  - `charts.js`: Renderização dos gráficos de barras, pizza, volume e winrates.
  - `config.js`: Configurações globais e constantes do sistema.
  - `filters.js`: Lógica de filtros dinâmicos (decks, formatos, datas, jogadores, busca textual).
  - `manager_forms.js`: Formulários de arquétipos, subtipos e unificação em lote de decks.
  - `matchup.js`: Matriz de confrontos (Matchups) e cálculo de win rates cruzados.
  - `md3.js`: Lógica de cálculo e detalhamento de partidas MD3 (Game 1, 2 e 3).
  - `mirror.js`: Criação e sincronização automática de partidas espelho entre companheiros de time.
  - `quicklog.js`: Formulário de registro rápido (Quick Log) com player logado travado via badge.
  - `router.js`: Roteamento e transição de abas/visões.
  - `stats.js`: Calculadoras de KPIs (Winrate, Brick Rate, 1º/2º).
  - `storage.js`: Operações de leitura/escrita no `localStorage`.
  - `sync_cloud.js`: Sincronização cloud assíncrona, backups JSON e import/export.
  - `table.js`: Tabela paginada, ordenação por colunas e renderização de linhas de partidas.
- **`api/` (Serverless Functions)**:
  - `api/auth.js`: Endpoints de registro, login, verificação de JWT e reset de contas.
  - `api/sync.js`: Endpoint de sincronização cloud via Redis/KV.
  - `api/email.js`: Módulo de templates e despacho de e-mails via Resend API (com preview HTTP).
  - `api/notifyDeck.js`: Notificação por e-mail de novo deck cadastrado.
- **`scripts/`**:
  - `build_bundle.cjs`: Minificação e compilação do bundle único para produção (`dist/`).
  - `bump_version.cjs`: Versionamento semântico (`package.json`, `version.json` e cache-busting do `index.html`).
  - `validate_seqID.cjs`: Validação automatizada de integridade do sequenciamento contíguo.

---

## 3. Estado Atual dos Testes e Cobertura

- **Testes Unitários:** 1 arquivo (`tests/app.test.js`) com 4 testes passando.
- **Scripts de Validação:** `scripts/validate_seqID.cjs` e `scripts/validate_auth.cjs` (testes funcionais via Node.js).
- **Cobertura de Código Atual:** Baixa formalização no Vitest (apenas funções essenciais de timestamp e ordenação sequencial cobertas no mock), necessitando expansão para cobrir toda a regra de negócio e APIs.

---

## 4. Riscos Críticos e Dívida Técnica Identificados

1. **Dependência de Globais (`window`):** Módulos dependem de propriedades no objeto `window` para comunicação mútua.
2. **Autorização no Backend de Sincronização:** `api/sync.js` valida JWT, mas possui fallback para `team_default_sync` se nenhum token for enviado. Recomenda-se exigir token válido para mutações (POST).
3. **Validação Estrita de Schemas:** Importações de JSON e payloads POST em APIs precisam de validação semântica profunda de schema para evitar injeções ou corrupção de tipos.
4. **Resolução de Conflitos em Sincronização:** Sistema usa estratégia de substituição total de snapshot na nuvem em vez de merge incremental/eventual por ID/timestamp.
