# 🗺️ RAG PROJECT INDEX — Jornada Dashboard

Este índice permite que assistentes de IA localizem instantaneamente arquivos, funções e elementos do DOM sem ler a base de código inteira, reduzindo o uso de tokens em até 95%.

> **Última Atualização**: 2026-08-06T20:27:54.200Z | **Total Módulos js/**: 13 | **Commit**: `eaec99d`

---

## 📂 MÓDULOS MODULARIZADOS EM `js/`

| Arquivo Módulo | Linhas | Status | window.* Exports (primeiros 5) |
|---|---|---|---|
| `js/auth.js` | 347 | 🟢 OK | `currentUser, getAuthToken, getCurrentUser, getClaimedPlayers, addClaimedPlayer...` |
| `js/charts.js` | 182 | 🟢 OK | `charts, destroyChart, renderKPIs, renderDeckWR, renderPlayerPerf...` |
| `js/config.js` | 67 | 🟢 OK | `KEY_DECKS, KEY_MATCHES, KEY_PLAYERS, KEY_LOCAIS, KEY_COLECOES...` |
| `js/filters.js` | 318 | 🟢 OK | `selectedPlayers, selectedDecks, populateMultiPlayerFilter, selectedPlayers, renderMultiPlayerItems...` |
| `js/manager_forms.js` | 269 | 🟢 OK | `editingMatchId, showModal, closeModal, openMatchForm, editingMatchId...` |
| `js/matchup.js` | 111 | 🟢 OK | `buildMatchupData, showDeckMatchupOverview, renderMatchupMatrix` |
| `js/md3.js` | 121 | 🟢 OK | `getGameCountFromPlacar, renderMD3GamesUI, _activeMD3GameCount` |
| `js/mirror.js` | 127 | 🟢 OK | `invertPlacar, buildMirrorMatch, syncAllTeamMirrorMatches` |
| `js/quicklog.js` | 183 | 🟢 OK | `quickLogPillState, renderQuickLogTouchPills, toggleQuickLogPill, quickLogMatch, filtered...` |
| `js/stats.js` | 81 | 🟢 OK | `pct, avg, getMatchDeck, getMatchOppDeck, groupBy...` |
| `js/storage.js` | 78 | 🟢 OK | `safeSetItem, loadDecks, saveDecks, loadManual, saveManual...` |
| `js/sync_cloud.js` | 161 | 🟢 OK | `syncStatusState, setSyncStatus, syncStatusState, triggerSyncPush, _syncPushTimer...` |
| `js/table.js` | 175 | 🟢 OK | `currentPage, tableSortState, changePage, currentPage, sortTableByColumn...` |


---

## 🏗️ FUNÇÕES CRÍTICAS NOS MONOLITOS (manager.js / app.js)

> ⚠️ NUNCA leia estes arquivos inteiros. Use a linha indicada abaixo para ir diretamente à função.


### 📌 `manager.js` — Funções Críticas (3188 linhas total)

| Função | Linha Aprox. |
|---|---|
| `getAdminPin()` | L22 |
| `hasAdminPin()` | L23 |
| `isAdminUnlocked()` | L24 |
| `loadDecks()` | L29 |
| `loadManual()` | L30 |
| `loadPlayers()` | L31 |
| `loadLocais()` | L32 |
| `loadColecoes()` | L33 |
| `safeSetItem()` | L35 |
| `saveDecks()` | L48 |
| `saveManual()` | L49 |
| `savePlayers()` | L50 |
| `saveLocais()` | L51 |
| `saveColecoes()` | L52 |
| `loadDeleted()` | L54 |
| `loadDeletedDecks()` | L55 |
| `loadDeletedPlayers()` | L56 |
| `loadDeletedLocais()` | L57 |
| `loadDeletedColecoes()` | L58 |
| `loadEdits()` | L60 |
| `saveDeleted()` | L62 |
| `saveDeletedDecks()` | L63 |
| `saveDeletedPlayers()` | L64 |
| `saveDeletedLocais()` | L65 |
| `saveDeletedColecoes()` | L66 |
| `saveEdits()` | L67 |
| `parsePTCGL()` | L76 |
| `countCards()` | L112 |
| `showModal()` | L114 |
| `getMatchFormStateSnapshot()` | L123 |
| *(+70 funções adicionais)* | — |

### 📌 `app.js` — Funções Críticas (2415 linhas total)

| Função | Linha Aprox. |
|---|---|
| `applyDataOverrides()` | L14 |
| `initializeData()` | L50 |
| `pct()` | L96 |
| `avg()` | L97 |
| `getMatchDeck()` | L99 |
| `getMatchOppDeck()` | L105 |
| `groupBy()` | L111 |
| `isBricked()` | L120 |
| `calculateStats()` | L128 |
| `destroyChart()` | L165 |
| `makeSearchableSelect()` | L170 |
| `updateInputFromSelect()` | L195 |
| `renderOptions()` | L204 |
| `selectOption()` | L238 |
| `openDropdown()` | L246 |
| `closeDropdown()` | L254 |
| `highlightOption()` | L297 |
| `initAllSearchableSelects()` | L328 |
| `populateMultiPlayerFilter()` | L346 |
| `renderMultiPlayerItems()` | L366 |
| `updateMultiPlayerBtnText()` | L400 |
| `initMultiPlayerEvents()` | L417 |
| `populateMultiDeckFilter()` | L480 |
| `renderMultiDeckItems()` | L505 |
| `updateMultiDeckBtnText()` | L537 |
| `initMultiDeckEvents()` | L554 |
| `populateFilters()` | L609 |
| `fillSelect()` | L630 |
| `applyFilters()` | L645 |
| `renderKPIs()` | L681 |
| *(+37 funções adicionais)* | — |


---

## 🧭 REGRA DE LEITURA RAG (PARA A IA)

1. **Sempre consulte este índice ANTES de abrir qualquer arquivo.**
2. **Para funções em `js/*`**: Abra apenas o módulo específico (todos < 350 linhas).
3. **Para funções em `manager.js` ou `app.js`**: Use `view_file` com `StartLine/EndLine` para a linha indicada acima ± 30 linhas.
4. **Para regras de negócio** (mirror, stats, storage): Consulte `.ai/ARCHITECTURE.md`.
5. **Para decisões de design passadas**: Consulte `.ai/DECISION_LOG.md` ANTES de propor mudanças arquiteturais.
