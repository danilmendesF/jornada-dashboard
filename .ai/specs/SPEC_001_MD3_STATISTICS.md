# 📝 SPEC_001: ESTATÍSTICAS E REGRAS DE GAMES MD3

- **Status**: 🟢 APROVADO E IMPLEMENTADO
- **Autor**: Spec-Architect
- **Data**: 2026-08-05
- **Módulos Impactados**: `js/stats.js`, `js/md3.js`, `js/charts.js`, `js/quicklog.js`

---

## 1. Visão Geral
Define as regras oficiais de contabilização de games individuais para partidas no formato MD3 (Melhor de 3), garantindo precisão matemática no cálculo de Win Rate por Start e Taxa de Zica (Brick).

## 2. Requisitos Funcionais

### RF-01: Contabilização da Taxa de Brick por Game
- Uma partida MD3 com placar 2-1 que possui zica no Game 2 deve registrar **1 game zicado em 3 games jogados (33%)**.
- A KPI `Taxa de Brick` e o gráfico `Brick Analysis por Deck` devem utilizar `totalGameBricksCount / totalGamesCount`.

### RF-02: Expansão de Games no Gráfico 1º vs 2º a Jogar
- Cada partida MD3 deve ser desmembrada em seus games individuais armazenados em `GamesDetail`.
- O gráfico deve computar vitórias, empates e derrotas separando as ocorrências de `1º` e `2º` por game.

### RF-03: Quick Log Mobile com Pílulas Táteis
- O formulário rápido deve exibir botões táteis de 3 colunas por game para alternar `Start` (1º/2º), `Meu Brick` (OK/Brick) e `Opp Brick` (OK/Brick).

## 3. Critérios de Aceite
- [x] Sintaxe validada via `node -c`
- [x] Validação automatizada aprovada via `node scripts/validate.js`
