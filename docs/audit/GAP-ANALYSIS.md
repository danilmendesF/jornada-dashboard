# Gap Analysis Independente — Jornada TCG Team

**Data:** 2026-08-14  
**Auditado por:** Independent Engineering Auditor  

---

## 1. Classificacao de Gaps por Severidade

### P1 — Alta / Seguranca & Operacoes
- **GAP-01: Validacao de Payload no Endpoint `/api/sync` (POST)**
  - *Descricao:* O endpoint `/api/sync` aceita payloads de snapshot substituindo os dados no Redis. Se a requisicao vier sem token, ha um fallback padrao para `team_default_sync`.
  - *Evidencia:* `api/sync.js` linhas 53-57.
  - *Impacto:* Risco de sobrescrita acidental se chaves publicas forem manipuladas.
  - *Recomendacao:* Exigir token JWT obrigatorio com claim de escrita para requisicoes de mutacao (POST).
  - *Esforco:* Medio (2h).
  - *Classificacao:* `P1 - HIGH`

### P2 — Media / Arquitetura & Testes
- **GAP-02: Cobertura de Testes E2E no DOM**
  - *Descricao:* A suite atual no Vitest cobre unitariamente a logica de calculo (`stats.js`), manipulacao de dados (`mirror.js`), parsing de MD3 (`md3.js`) e templates de e-mail (`email.js`), mas formularios DOM complexos (`manager.js`, `quicklog.js`) usam mock leve de DOM.
  - *Evidencia:* `tests/app.test.js`.
  - *Impacto:* Mudancas em IDs HTML podem quebrar seletores DOM sem falha imediata no Vitest.
  - *Recomendacao:* Adicionar testes de integracao DOM com `jsdom` simulando eventos de formulario.
  - *Esforco:* Medio (4h).
  - *Classificacao:* `P2 - MEDIUM`

- **GAP-03: Resolucao de Conflitos em Sincronizacao Concorrente**
  - *Descricao:* A sincronizacao substitui o snapshot inteiro (`matches`) em vez de aplicar merge incremental por timestamp/ID.
  - *Evidencia:* `js/sync_cloud.js` e `api/sync.js`.
  - *Impacto:* Se dois usuarios registrarem partidas simultaneamente offline e sincronizarem, o ultimo push pode sobrescrever registros locais do outro se nao houver pull previo.
  - *Recomendacao:* Implementar merge deterministico por ID unico e `createdAt` antes de salvar snapshot no Redis.
  - *Esforco:* Alto (8h).
  - *Classificacao:* `P2 - MEDIUM`

### P3 — Baixa / Qualidade & DX
- **GAP-04: Centralizacao de Variaveis CSS Duplicadas**
  - *Descricao:* `style.css` e templates de e-mail possuem cores repetidas em codigo estatico em vez de tokens centralizados.
  - *Impacto:* Baixo (manutencao visual).
  - *Classificacao:* `P3 - LOW`
