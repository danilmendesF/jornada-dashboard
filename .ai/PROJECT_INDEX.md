# AI Project Index — Jornada TCG Team

**Status:** NORMATIVE / VERIFIED  
**Finalidade:** Indice de navegacao rapida para desenvolvedores humanos e agentes de IA.

---

## 1. Mapeamento de Dominios e Arquivos Criticos

| Dominio | Arquivos Principais | Responsabilidade | Invariantes |
|---|---|---|---|
| **Entrypoint & Shell** | `index.html`, `style.css` | UI, Layout Dark/Neon, Modais | Preservar IDs dos componentes DOM |
| **Orquestracao Global** | `app.js` | Estado global (`allData`), reatividade e normalizacao | `ensureMatchSequence` incondicional |
| **Formularios & Matches** | `manager.js`, `js/quicklog.js` | Formularios de partida completa e Quick Log | Player travado no usuario logado; Sem auto-duelo |
| **Sequenciamento & Cronologia** | `app.js` (`getMatchTimestamp`, `getNextSeqID`) | Calculo e persistencia de `seqID 1..N` | Partida mais recente no topo com maior seqID |
| **Autenticacao & Sessao** | `js/auth.js`, `api/auth.js` | Login, Registro, JWT e vinculo de conta | PBKDF2 salt unico; JWT HMAC-SHA256 |
| **Sincronizacao & Nuvem** | `js/sync_cloud.js`, `api/sync.js` | Sync assincrono com Redis e backups | Offline-first com fallback resiliente |
| **Estatisticas & Dashboards** | `js/stats.js`, `js/charts.js`, `js/matchup.js`, `js/md3.js` | Calculos de Winrate, Brick, MD3 e graficos | Formulas matematicas com contorno de contraste |
| **Filtros Dinamicos** | `js/filters.js` | Busca textual e filtros multi-criterio | Reatividade em tempo real sobre `filtered` |
| **E-mails & Notificacoes** | `api/email.js`, `api/notifyDeck.js` | Templates Dark e despacho Resend | Dominio oficial `www.jornadatcgteam.com.br` |
| **Build & Deploy** | `scripts/build_bundle.cjs`, `scripts/bump_version.cjs` | Minificacao Terser e release | `dist/app.min.js`, `dist/style.min.css` |

---

## 2. Onde Procurar Informacao

- **Auditoria e Estado Real:** `docs/audit/`
- **Diretrizes para IA:** `.ai/`
- **Especificacoes de Dominio:** `docs/specs/` ou `docs/ordenacao-seqid-partidas/`
