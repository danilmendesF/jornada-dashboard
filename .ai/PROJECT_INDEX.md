# 🗺️ RAG PROJECT INDEX — Jornada Dashboard

Este índice permite que assistentes de IA localizem instantaneamente arquivos, funções e elementos do DOM sem ler a base de código inteira, reduzindo o uso de tokens em até 95%.

> **Última Atualização**: 2026-08-07T13:01:17.890Z | **Total Módulos js/**: 13 | **Commit**: `5816168`

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
| `js/quicklog.js` | 183 | 🟢 OK | `quickLogPillState, renderQuickLogTouchPills, toggleQuickLogPill, quickLogMatch, filtered...` |
| `js/stats.js` | 81 | 🟢 OK | `pct, avg, getMatchDeck, getMatchOppDeck, groupBy...` |
| `js/storage.js` | 78 | 🟢 OK | `safeSetItem, loadDecks, saveDecks, loadManual, saveManual...` |
| `js/sync_cloud.js` | 161 | 🟢 OK | `syncStatusState, setSyncStatus, syncStatusState, triggerSyncPush, _syncPushTimer...` |
| `js/table.js` | 176 | 🟢 OK | `currentPage, tableSortState, changePage, currentPage, sortTableByColumn...` |


---

## 🏗️ FUNÇÕES CRÍTICAS NOS MONOLITOS (manager.js / app.js)

> ⚠️ NUNCA leia estes arquivos inteiros. Use a linha indicada abaixo para ir diretamente à função.


### 📌 `manager.js` — Funções Críticas (3132 linhas total)

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

### 📌 `app.js` — Funções Críticas (2416 linhas total)

| Função | Linha Aprox. |
|---|---|
| `applyDataOverrides()` | L14 |
| `initializeData()` | L50 |
| `pct()` | L97 |
| `avg()` | L98 |
| `getMatchDeck()` | L100 |
| `getMatchOppDeck()` | L106 |
| `groupBy()` | L112 |
| `isBricked()` | L121 |
| `calculateStats()` | L129 |
| `destroyChart()` | L166 |
| `makeSearchableSelect()` | L171 |
| `updateInputFromSelect()` | L196 |
| `renderOptions()` | L205 |
| `selectOption()` | L239 |
| `openDropdown()` | L247 |
| `closeDropdown()` | L255 |
| `highlightOption()` | L298 |
| `initAllSearchableSelects()` | L329 |
| `populateMultiPlayerFilter()` | L347 |
| `renderMultiPlayerItems()` | L367 |
| `updateMultiPlayerBtnText()` | L401 |
| `initMultiPlayerEvents()` | L418 |
| `populateMultiDeckFilter()` | L481 |
| `renderMultiDeckItems()` | L506 |
| `updateMultiDeckBtnText()` | L538 |
| `initMultiDeckEvents()` | L555 |
| `populateFilters()` | L610 |
| `fillSelect()` | L631 |
| `applyFilters()` | L646 |
| `renderKPIs()` | L682 |
| *(+37 funções adicionais)* | — |


---

## 🧭 REGRA DE LEITURA RAG (PARA A IA)

1. **Sempre consulte este índice ANTES de abrir qualquer arquivo.**
2. **Para funções em `js/*`**: Abra apenas o módulo específico (todos < 350 linhas).
3. **Para funções em `manager.js` ou `app.js`**: Use `view_file` com `StartLine/EndLine` para a linha indicada acima ± 30 linhas.
4. **Para regras de negócio** (mirror, stats, storage): Consulte `.ai/ARCHITECTURE.md`.
5. **Para decisões de design passadas**: Consulte `.ai/DECISION_LOG.md` ANTES de propor mudanças arquiteturais.
