# 📐 ESPECIFICAÇÃO DE ARQUITETURA TÉCNICA (SDD) — Jornada Dashboard

## 1. CONTRATOS DE DADOS E ARMAZENAMENTO

### Chaves de LocalStorage
- `jornada_manual_matches` — Lista JSON de partidas registradas manualmente (`_manual: true`).
- `jornada_decks` — Catálogo JSON de decks cadastrados (`{ id, name, arquetipo, subtipo, player, list }`).
- `jornada_players` — Lista de jogadores cadastrados (padrão: 4 jogadores).
- `jornada_locais` — Lista de locais cadastrados.
- `jornada_colecoes` — Lista de coleções/expansões cadastradas.
- `jornada_deleted_ids` — Array serializado de Set com IDs de partidas deletadas.
- `jornada_edited_matches` — Objeto JSON com edições em partidas históricas.
- `jornada_archetype_unifications` — Array de regras `{ from, to }` de unificação de arquétipos.
- `jornada_auth_token` — JWT do usuário logado.
- `jornada_user_profile` — Objeto JSON do perfil do usuário `{ id, name, email, linkedPlayer }`.
- `jornada_claimed_players` — Array de nomes de jogadores que já criaram conta.
- `jornada_sync_token` — Token de sincronização com a nuvem (Redis KV).

### Estrutura de Objeto de Partida (`MatchData`)
```typescript
interface MatchData {
  id: string;                 // ID numérico único + sufixo aleatório
  _mirroredFrom?: string;     // ID da partida primária (se esta for um espelho)
  _mirrorId?: string;         // ID reservado para a partida espelho vinculada
  Data: string;               // Formato YYYY-MM-DD
  Player: string;             // Nome do jogador principal
  Deck: string;               // Nome completo do deck (Ex: "Charizard ex (Pidgeot)")
  Arquetipo: string;          // Arquétipo principal (Ex: "Charizard ex")
  Subtipo?: string;           // Subtipo/Variante (Ex: "Pidgeot")
  Adversario: string;         // Nome do oponente
  DeckAdv: string;            // Nome completo do deck oponente
  DeckAdvArquetipo: string;   // Arquétipo oponente
  SubtipoAdv?: string;        // Subtipo oponente
  Formato: 'MD1' | 'MD3';     // Formato do duelo
  Start: string;              // "1º", "2º" ou string concatenada "1º, 2º, 1º"
  Resultado: 'Vitória' | 'Empate' | 'Derrota';
  Pontos: number;             // 1 (Vitória), 0.5 (Empate), 0 (Derrota)
  Placar: string;             // "1-0", "2-1", "0-0", etc.
  Local: string;              // Local ou torneio
  Colecao: string;            // Expansão válida (obrigatória, nunca "Todas")
  Brick: 'Sim' | 'Não';       // Resumo de zica própria
  BrickOp: 'Sim' | 'Não';     // Resumo de zica do oponente
  Confiabilidade: 'Alta' | 'Baixa';
  GamesDetail?: Array<{      // Detalhamento individual por game (estritamente para MD3)
    game: number;             // 1, 2 ou 3
    start: '1º' | '2º';      // Quem começou no game
    brick: 'Sim' | 'Não';     // Zica própria no game
    brickOp: 'Sim' | 'Não';   // Zica oponente no game
  }>;
  ListaMeuDeck?: string;      // Decklist PTCGL export do meu deck
  ListaDeckAdv?: string;      // Decklist PTCGL export do deck oponente
  Comentarios?: string;       // Anotações da partida
  _manual: true;              // Flag de partida manual
}
```

---

## 2. REGRAS INVIOLÁVEIS DE NEGÓCIO

### 2.1 Partidas Espelho (Mirror Matches)
- Ocorrem quando `Adversario` é um jogador do time cadastrado em `players`.
- `Resultado` invertido: Vitória ↔ Derrota, Empate ↔ Empate.
- `Pontos` invertidos: 1 ↔ 0, 0.5 ↔ 0.5.
- `Placar` invertido via `invertPlacar()`: "2-1" ↔ "1-2".
- `Start`, `Brick` e `BrickOp` invertidos game a game em `GamesDetail`.
- `id` espelho é estritamente numérico (`ID_Principal + 1` ou `Timestamp + 1`).
- Exclusão de partida deve remover **em cascata** a partida espelho vinculada.

### 2.2 Regras de Games por Placar (MD3)
- `0-0` → 1 Game.
- `1-0` / `0-1` → 1 ou 2 Games (com override manual do usuário).
- `1-1` → 2 ou 3 Games (com override manual do usuário).
- `2-0` / `0-2` → 2 Games.
- `2-1` / `1-2` → 3 Games.

### 2.3 Estatísticas Globais (`calculateStats`)
- Win Rate Geral: `Math.round((wins / total) * 100)`.
- Taxa de Brick: calculada por **game individual** (`totalGameBricksCount / totalGamesCount`), garantindo precisão matemática em MD3.
- Win Rate por Start: expande cada game de partidas MD3 individualmente.

---

## 3. CONCORRÊNCIA E SINCRONIZAÇÃO MULTI-SESSÃO
- Qualquer alteração no `localStorage` dispara evento `storage`.
- O listener recarrega dados globais e re-renderiza filtros, tabelas e gráficos reativamente.
- **Payload de Sync Redis KV**: `{ edits, deletedIds, archetypeUnifications, decks, players, locais, colecoes, adminPin }`.
- Regra: Novos dados compartilhados entre dispositivos DEVEM ser adicionados ao payload em `js/sync_cloud.js`.

---

## 4. MAPA DE DEPENDÊNCIAS ENTRE MÓDULOS

> Use esta seção para entender "quem chama quem" antes de modificar qualquer função.

| Função / Módulo | Chamado Por | Chama |
|---|---|---|
| `getActivePlayerName()` — `js/config.js` | `manager.js:populateQuickLogDropdowns`, `manager.js:populatePlayerSelects`, `js/auth.js:updateAuthUI`, `js/table.js:renderTableRows` | `getCurrentUser()`, `localStorage` |
| `populateQuickLogDropdowns()` — `manager.js:L1804` | `populatePlayerSelects()`, `initDashboard()`, `updateAuthUI()` | `getActivePlayerName()`, `populateLocalSelects()`, `populateColecaoSelects()`, `updatePlacarDropdown()`, `renderQuickLogTouchPills()` |
| `buildMirrorMatch()` — `js/mirror.js` | `manager.js:submitMatchForm`, `js/quicklog.js:quickLogMatch` | `invertPlacar()`, `loadPlayers()` |
| `applyDataOverrides()` — `app.js` | `initDashboard()`, `pullFromCloud()` | `loadArchetypeUnifications()`, `loadEdits()`, `loadDeletedIds()` |
| `calculateStats()` — `js/stats.js` | `js/charts.js:renderKPIs`, `js/charts.js:renderDeckWR`, `js/charts.js:renderPlayerPerf` | `pct()`, `avg()`, `groupBy()` |
| `pushToCloud()` — `js/sync_cloud.js` | `triggerSyncPush()` (debounced 2s) | `fetch('/api/sync')` |
| `pullFromCloud()` — `js/sync_cloud.js` | `initDashboard()`, `openProtectedManager()` | `applyDataOverrides()` |
| `updateAuthUI()` — `js/auth.js` | `verifyAuthToken()`, `logoutUser()`, `initAuthSession()` | `getActivePlayerName()`, `populatePlayerRegisterDropdowns()`, `populateQuickLogDropdowns()` |
| `populatePlayerSelects()` — `manager.js:L174` | `initDashboard()`, `renderDecksList()` | `populateQuickLogDropdowns()`, `loadPlayers()` |
| `renderTableRows()` — `js/table.js` | `applyFilters()` | `getActivePlayerName()` (para `isOwner`) |

---

## 5. FLUXO DE INICIALIZAÇÃO DA APLICAÇÃO

```
index.html carregado
  └─► Anti-Flicker Script (inline)
  └─► dist/app.min.js carregado
        ├─► js/config.js → define constantes e getActivePlayerName()
        ├─► js/storage.js → define loadDecks(), loadManual(), etc.
        ├─► js/stats.js → define calculateStats()
        ├─► js/mirror.js → define buildMirrorMatch()
        ├─► js/md3.js → define getGameCountFromPlacar()
        ├─► js/quicklog.js → define quickLogMatch() + stub populateQuickLogDropdowns()
        ├─► js/filters.js → define applyFilters(), populateMultiPlayerFilter()
        ├─► js/table.js → define renderTableRows(), changePage()
        ├─► js/charts.js → define renderKPIs(), renderDeckWR()
        ├─► js/matchup.js → define buildMatchupData()
        ├─► js/manager_forms.js → define openMatchForm(), closeModal()
        ├─► js/sync_cloud.js → define pushToCloud(), pullFromCloud()
        ├─► js/auth.js → define initAuthSession(), updateAuthUI()
        ├─► app.js → define initDashboard(), applyDataOverrides()
        └─► manager.js → define populatePlayerSelects(), populateQuickLogDropdowns() [CANÔNICO]
              └─► DOMContentLoaded → initDashboard() → initAuthSession() → populatePlayerSelects()
```
