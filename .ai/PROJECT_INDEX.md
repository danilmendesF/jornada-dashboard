# 🗺️ RAG PROJECT INDEX — Jornada Dashboard

Este índice permite que assistentes de IA localizem instantaneamente arquivos, funções e elementos do DOM sem ler a base de código inteira, reduzindo o uso de tokens em até 95%.

> **Última Atualização**: 2026-08-09T12:16:58.145Z | **Total Módulos js/**: 13 | **Commit**: `00dddf5`

---

## 📂 MÓDULOS MODULARIZADOS EM `js/`

| Arquivo Módulo | Linhas | Status | window.* Exports (primeiros 5) |
|---|---|---|---|
| `js/auth.js` | 340 | 🟢 OK | `currentUser, getAuthToken, getCurrentUser, getClaimedPlayers, addClaimedPlayer...` |
| `js/charts.js` | 182 | 🟢 OK | `charts, destroyChart, renderKPIs, renderDeckWR, renderPlayerPerf...` |
| `js/config.js` | 67 | 🟢 OK | `KEY_DECKS, KEY_MATCHES, KEY_PLAYERS, KEY_LOCAIS, KEY_COLECOES...` |
| `js/filters.js` | 318 | 🟢 OK | `selectedPlayers, selectedDecks, populateMultiPlayerFilter, selectedPlayers, renderMultiPlayerItems...` |
| `js/manager_forms.js` | 269 | 🟢 OK | `editingMatchId, showModal, closeModal, openMatchForm, editingMatchId...` |
| `js/matchup.js` | 111 | 🟢 OK | `buildMatchupData, showDeckMatchupOverview, renderMatchupMatrix` |
| `js/md3.js` | 121 | 🟢 OK | `getGameCountFromPlacar, renderMD3GamesUI, _activeMD3GameCount` |
| `js/mirror.js` | 127 | 🟢 OK | `invertPlacar, buildMirrorMatch, syncAllTeamMirrorMatches` |
| `js/quicklog.js` | 193 | 🟢 OK | `quickLogPillState, renderQuickLogTouchPills, toggleQuickLogPill, quickLogMatch, filtered...` |
| `js/stats.js` | 81 | 🟢 OK | `pct, avg, getMatchDeck, getMatchOppDeck, groupBy...` |
| `js/storage.js` | 87 | 🟢 OK | `safeSetItem, loadDecks, saveDecks, loadManual, saveManual...` |
| `js/sync_cloud.js` | 161 | 🟢 OK | `syncStatusState, setSyncStatus, syncStatusState, triggerSyncPush, _syncPushTimer...` |
| `js/table.js` | 188 | 🟢 OK | `currentPage, tableSortState, changePage, currentPage, sortTableByColumn...` |


---

## 🏗️ FUNÇÕES CRÍTICAS NOS MONOLITOS (manager.js / app.js)

> ⚠️ NUNCA leia estes arquivos inteiros. Use a linha indicada abaixo para ir diretamente à função.


### 📌 `manager.js` — Funções Críticas (3156 linhas total)

| Função | Linha Aprox. |
|---|---|
| `loadDecks()` | L22 |
| `loadManual()` | L23 |
| `loadPlayers()` | L24 |
| `loadLocais()` | L25 |
| `loadColecoes()` | L26 |
| `safeSetItem()` | L28 |
| `saveDecks()` | L41 |
| `saveManual()` | L42 |
| `savePlayers()` | L43 |
| `saveLocais()` | L44 |
| `saveColecoes()` | L45 |
| `loadDeleted()` | L47 |
| `loadDeletedDecks()` | L48 |
| `loadDeletedPlayers()` | L49 |
| `loadDeletedLocais()` | L50 |
| `loadDeletedColecoes()` | L51 |
| `loadEdits()` | L53 |
| `saveDeleted()` | L55 |
| `saveDeletedDecks()` | L56 |
| `saveDeletedPlayers()` | L57 |
| `saveDeletedLocais()` | L58 |
| `saveDeletedColecoes()` | L59 |
| `saveEdits()` | L60 |
| `parsePTCGL()` | L69 |
| `countCards()` | L105 |
| `showModal()` | L107 |
| `getMatchFormStateSnapshot()` | L116 |
| `isMatchFormDirty()` | L142 |
| `closeModal()` | L148 |
| `populatePlayerSelects()` | L167 |
| *(+66 funções adicionais)* | — |

### 📌 `app.js` — Funções Críticas (2463 linhas total)

| Função | Linha Aprox. |
|---|---|
| `applyDataOverrides()` | L14 |
| `getMatchTimestamp()` | L55 |
| `ensureMatchSequence()` | L65 |
| `getNextSeqId()` | L87 |
| `initializeData()` | L97 |
| `pct()` | L144 |
| `avg()` | L145 |
| `getMatchDeck()` | L147 |
| `getMatchOppDeck()` | L153 |
| `groupBy()` | L159 |
| `isBricked()` | L168 |
| `calculateStats()` | L176 |
| `destroyChart()` | L213 |
| `makeSearchableSelect()` | L218 |
| `updateInputFromSelect()` | L243 |
| `renderOptions()` | L252 |
| `selectOption()` | L286 |
| `openDropdown()` | L294 |
| `closeDropdown()` | L302 |
| `highlightOption()` | L345 |
| `initAllSearchableSelects()` | L376 |
| `populateMultiPlayerFilter()` | L394 |
| `renderMultiPlayerItems()` | L414 |
| `updateMultiPlayerBtnText()` | L448 |
| `initMultiPlayerEvents()` | L465 |
| `populateMultiDeckFilter()` | L528 |
| `renderMultiDeckItems()` | L553 |
| `updateMultiDeckBtnText()` | L585 |
| `initMultiDeckEvents()` | L602 |
| `populateFilters()` | L657 |
| *(+40 funções adicionais)* | — |


---

## 🧭 REGRA DE LEITURA RAG (PARA A IA)

1. **Sempre consulte este índice ANTES de abrir qualquer arquivo.**
2. **Para funções em `js/*`**: Abra apenas o módulo específico (todos < 350 linhas).
3. **Para funções em `manager.js` ou `app.js`**: Use `view_file` com `StartLine/EndLine` para a linha indicada acima ± 30 linhas.
4. **Para regras de negócio** (mirror, stats, storage): Consulte `.ai/ARCHITECTURE.md`.
5. **Para decisões de design passadas**: Consulte `.ai/DECISION_LOG.md` ANTES de propor mudanças arquiteturais.
