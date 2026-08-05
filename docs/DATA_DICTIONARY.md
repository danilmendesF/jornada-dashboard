# 📚 DICIONÁRIO DE DADOS — Jornada Dashboard

## 1. Coleção de Partidas (`jornada_manual_matches`)

| Campo | Tipo | Valores Válidos / Formato | Descrição |
|---|---|---|---|
| `id` | String | `Timestamp + Random` (Ex: `"1722880000000a1b2"`) | Chave primária única da partida |
| `_mirroredFrom` | String | ID de partida | Se preenchido, indica que a partida foi gerada automaticamente como espelho |
| `_mirrorId` | String | ID de partida | ID reservado da partida espelho associada |
| `Data` | String | `YYYY-MM-DD` | Data de realização do duelo |
| `Player` | String | Nome do jogador (Ex: `"Danilo"`) | Jogador principal |
| `Deck` | String | Nome do deck (Ex: `"Charizard ex (Pidgeot)"`) | Nome completo exibido |
| `Arquetipo` | String | Arquétipo principal (Ex: `"Charizard ex"`) | Chave para agrupamento de estatísticas e unificação |
| `Subtipo` | String | Subtipo (Ex: `"Pidgeot"`) | Variante ou lista secundária |
| `Adversario` | String | Nome do oponente | Nome do oponente enfrentado |
| `DeckAdv` | String | Nome do deck oponente | Nome completo do deck do oponente |
| `DeckAdvArquetipo` | String | Arquétipo oponente | Arquétipo do oponente |
| `SubtipoAdv` | String | Subtipo oponente | Variante do deck do oponente |
| `Formato` | String | `"MD1"` ou `"MD3"` | Formato do confronto |
| `Start` | String | `"1º"`, `"2º"` ou `"1º, 2º, 1º"` | Resumo de quem começou |
| `Resultado` | String | `"Vitória"`, `"Empate"`, `"Derrota"` | Resultado consolidado |
| `Pontos` | Number | `1`, `0.5`, `0` | Pontuação para torneio/ranking |
| `Placar` | String | `"1-0"`, `"2-1"`, `"0-0"`, etc. | Placar final do duelo |
| `Local` | String | Ex: `"TCG Live"`, `"Liga Local"` | Local ou ambiente |
| `Colecao` | String | Ex: `"SV05: Temporal Forces"` | Expansão oficial (obrigatória) |
| `Brick` | String | `"Sim"` ou `"Não"` | Flag consolidada de zica própria |
| `BrickOp` | String | `"Sim"` ou `"Não"` | Flag consolidada de zica do oponente |
| `Confiabilidade` | String | `"Alta"` ou `"Baixa"` | Confiabilidade do registro |
| `GamesDetail` | Array | `[{ game, start, brick, brickOp }]` | Detalhamento por game individual em MD3 |
| `ListaMeuDeck` | String | Texto export do PTCGL | Lista de cartas do meu deck |
| `ListaDeckAdv` | String | Texto export do PTCGL | Lista de cartas do deck oponente |
| `Comentarios` | String | Texto livre | Anotações táticas ou observações |

---

## 2. Coleção de Decks (`jornada_decks`)

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | String | ID único do deck no catálogo |
| `name` | String | Nome completo |
| `arquetipo` | String | Arquétipo principal |
| `subtipo` | String | Subtipo |
| `player` | String | Jogador proprietário |
| `list` | String | Lista de cartas PTCGL |
