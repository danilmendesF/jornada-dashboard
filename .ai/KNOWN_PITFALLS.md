# Known Pitfalls & Edge Cases — Jornada TCG Team

**Status:** VERIFIED  

---

1. **Parser de Timestamp (Epoca 1970 vs 2001+):**
   - *Pitfall:* IDs legados em string curta (ex: `"380"`) se convertidos diretamente com `parseInt("380")` resultavam no ano 1970.
   - *Solucao:* Utilizar sempre o parser em 3 camadas `getMatchTimestamp(match)` que valida timestamps `>= 1000000000000`.

2. **Player Travado no Registro:**
   - *Pitfall:* Trocar de jogador manualmente no dropdown permitia registrar partidas em nome de terceiros.
   - *Solucao:* Campo de jogador travado no usuario logado (`.logged-player-badge`).

3. **Searchable Selects em IDs Ocultos:**
   - *Pitfall:* Inicializar `initSearchableSelect` em elementos `<input type="hidden">` ou badges gera erros de DOM.
   - *Solucao:* Apenas tags `<select>` visiveis devem constar no array de inicializacao em `app.js`.
