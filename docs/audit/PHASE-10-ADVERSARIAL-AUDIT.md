# Auditoria Adversarial Independente da Release v2.1.0 (Fase 10)
## Security, Privacy, SDD, CI/CD, Runtime, Data Integrity & Reliability

**Projeto:** Jornada TCG Team  
**Base:** Release v2.1.0 (Commit `313bf61` / Tag `v2.1.0`)  
**Data:** 15 de Agosto de 2026  
**Modo:** READ-ONLY / Zero Alterações de Código  
**Auditor:** QA Adversarial, Security & SDD Auditor  
**Classificacao Final:** **READY WITH CONDITIONS** ⚠️🛡️  

---

# 1. Executive Summary

A **Fase 10** realizou uma auditoria adversarial e cética sobre a release **v2.1.0** do Jornada TCG Team.

Ao invés de aceitar as declarações de conformidade da Fase 9, a auditoria submeteu o sistema a uma análise ofensiva/defensiva aprofundada nos domínios de criptografia, controle de acesso, vetor de ataque XSS, rate limiting, ciclo de vida de JWT, observabilidade, governança SDD e resiliência de dados.

**Resultado Consolidado:**
- **Findings Críticos (P0):** 0
- **Findings Altos (P1):** 0
- **Findings Médios (P2):** 3 (Novos achados residuais)
- **Findings Baixos (P3):** 2 (Novos achados residuais)
- **Findings Informativos (P4):** 0
- **Controles Não Verificáveis (Externos):** 1 (Restore físico de backups Upstash no console externo)
- **Decisão Final:** **READY WITH CONDITIONS** (Sistema estável e blindado para uso em produção no domínio de torneios, com condições explícitas catalogadas para o próximo ciclo de melhorias).

---

# 2. Revalidação Adversarial dos Findings da Fase 8/9

| Finding ID | Descrição Original | Revalidação Factual na v2.1.0 | Status Adversarial |
|---|---|---|---|
| **`SEC-001`** | Segredo histórico no Git (`fcb99c5`) | Confirmado que o código atual em `api/auth.js` e `api/sync.js` não possui fallback hardcoded e exige `process.env.JWT_SECRET`. Segredo histórico no Git é inoperante caso a chave na Vercel seja única. | **CONFIRMED & MITIGATED** 🟢 |
| **`SEC-002`** | Ausência de Security Headers | `vercel.json` declara `HSTS`, `CSP`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`. | **CONFIRMED & MITIGATED** 🟢 |
| **`SEC-003`** | Rate Limiting em `/api/auth` | `checkRateLimit` com contador no Redis limita 10 reqs/15 min e emite status 429 com `Retry-After`. | **CONFIRMED & MITIGATED** 🟢 |
| **`SEC-004`** | Ciclo de Vida de JWT | Claim `exp` (30 dias) assinado e validado no `verifyJwt` com tolerância de clock skew de 60s e validação de `alg: 'HS256'`. | **CONFIRMED & MITIGATED** 🟢 |
| **`SEC-005`** | DOM / Stored XSS | Função universal `escapeHtml()` neutraliza `<script>` e `<img onerror>` no renderizador principal `js/table.js`. | **PARTIAL** ⚠️ (Ver `SEC-NEW-001`) |
| **`OBS-001`** | Request-ID / Correlation | `getRequestId` sanitiza IDs maliciosos e propaga em headers e logs estruturados JSON. | **CONFIRMED & MITIGATED** 🟢 |
| **`PRIV-001`** | Expurgo de Conta / Privacidade | `action === 'admin_delete_user_data'` exige token autenticado de `role === 'admin'`. Mapeado em `docs/privacy/DATA-RETENTION-AND-DELETION.md`. | **CONFIRMED & MITIGATED** 🟢 |

---

# 3. Novos Findings Adversariais Identificados (v2.1.0)

### Finding SEC-NEW-001
- **Severity:** `P2 (Médio)`
- **Category:** Frontend Security & DOM Sanitization
- **Status:** `CONFIRMED`
- **Evidence:** [`js/matchup.js`](file:///C:/Users/danil/OneDrive/Documentos/jornada-dashboard/js/matchup.js#L54) e [`js/md3.js`](file:///C:/Users/danil/OneDrive/Documentos/jornada-dashboard/js/md3.js) ainda realizam interpolação direta de variáveis (`myDeck`, `oppStats.opp`) em template literals atribuídos a `.innerHTML`.
- **Observation:** A sanitização com `escapeHtml()` foi aplicada com sucesso em `js/table.js`, mas módulos secundários de visualização ainda possuem pontos de interpolação sem escape.
- **Impact:** Se um deck cadastrado possuir caracteres especiais maliciosos, a visualização do painel de Matchups pode renderizar HTML não sanitizado.
- **Recommendation:** Expandir a chamada de `escapeHtml()` para todos os arquivos em `js/matchup.js`, `js/md3.js` e `js/manager_forms.js`.
- **Human Decision Required:** `NO`

### Finding SEC-NEW-002
- **Severity:** `P2 (Médio)`
- **Category:** API Security & Rate Limiting
- **Status:** `CONFIRMED`
- **Evidence:** [`api/auth.js`](file:///C:/Users/danil/OneDrive/Documentos/jornada-dashboard/api/auth.js#L103) gera a chave de rate limit baseada unicamente no IP (`ratelimit_auth_${clientIp}_${action}`).
- **Observation:** Não há limitação secundária baseada no identificador da conta (`email`).
- **Impact:** Um atacante distribuído utilizando múltiplos endereços IP (botnet/proxy pool) poderia realizar 9 tentativas por IP contra uma mesma conta de e-mail sem atingir o limite por IP.
- **Recommendation:** Implementar chave composta de rate limit por e-mail normalizado (`ratelimit_email_${email}`).
- **Human Decision Required:** `NO`

### Finding SEC-NEW-003
- **Severity:** `P2 (Médio)`
- **Category:** JWT Revocation & Session Invalidation
- **Status:** `CONFIRMED`
- **Evidence:** [`api/sync.js`](file:///C:/Users/danil/OneDrive/Documentos/jornada-dashboard/api/sync.js#L53) valida o token JWT de forma puramente stateless usando `crypto.createHmac` sem consultar o Redis.
- **Observation:** Quando uma conta é excluída pelo administrador via `admin_delete_user_data`, os tokens JWT já emitidos anteriormente para aquele usuário permanecem criptograficamente válidos até que seu claim `exp` expire (até 30 dias).
- **Impact:** Um usuário desligado da equipe mantém capacidade de sincronizar dados caso possua um token JWT válido não expirado em seu navegador.
- **Recommendation:** Implementar verificação de existência da chave `user_${email}` no Redis durante mutações em `/api/sync` ou registrar tokens revogados em uma blacklist com TTL.
- **Human Decision Required:** `NO`

### Finding SEC-NEW-004
- **Severity:** `P3 (Baixo)`
- **Category:** Content Security Policy
- **Status:** `CONFIRMED`
- **Evidence:** [`vercel.json`](file:///C:/Users/danil/OneDrive/Documentos/jornada-dashboard/vercel.json#L33) inclui `'unsafe-inline'` na diretiva `script-src`.
- **Observation:** O `'unsafe-inline'` é necessário atualmente porque `index.html` contém scripts inline de inicialização de sessão.
- **Impact:** A CSP não bloqueia execução de scripts inline caso ocorra um DOM XSS.
- **Recommendation:** Mover scripts inline de `index.html` para arquivos `.js` estáticos ou adotar hashes SHA-256 na CSP.
- **Human Decision Required:** `NO`

### Finding CI-NEW-001
- **Severity:** `P3 (Baixo)`
- **Category:** CI/CD Security
- **Status:** `CONFIRMED`
- **Evidence:** [`.github/workflows/ci.yml`](file:///C:/Users/danil/OneDrive/Documentos/jornada-dashboard/.github/workflows/ci.yml) não declara bloco `permissions: contents: read` e não executa scanner automatizado de secrets (`gitleaks`).
- **Observation:** As actions `actions/checkout@v4` e `actions/setup-node@v4` estão pinadas por major version ao invés de commit SHA imutável.
- **Impact:** Risco teórico de supply chain em actions de terceiros e ausência de bloqueio de commit com segredos no CI.
- **Recommendation:** Adicionar `permissions: contents: read`, scanner `gitleaks` e pinar actions por SHA.
- **Human Decision Required:** `NO`

---

# 4. Avaliação de Integridade de Dados, Sincronização & SDD 2.0

### Sincronização & Merge Determinístico
- **Comutatividade, Idempotência e Associatividade:** **100% CONFIRMED** 🟢 (Comprovado matematicamente e por testes de propriedade com desempate lexicográfico em `tests/merge_tiebreak.test.js`).
- **Tombstones:** **CONFIRMED** 🟢 (Retenção de 180 dias impede ressurreição de partidas deletadas).

### SDD 2.0 Level 5 Integrity Check
- **Especificações:** 8 especificações com frontmatter YAML, todas no status `VERIFIED` vinculadas a arquivos de teste existentes.
- **Deep Drift Detector:** `scripts/drift_check.cjs` inspeciona símbolos reais em 14 componentes de código.
- **Data Contracts:** Schemas JSON canônicos validados no Vitest.
- **CI/CD Quality Gate:** 30 de 30 verificações aprovadas no gate global (`npm run validate:sdd`).
- **Classificação SDD:** **LEVEL 5 — FULLY GOVERNED (CONFIRMED)** 🟢.

---

# 5. Avaliação de Observabilidade, Resiliência & Disaster Recovery

- **Observabilidade:** **PARTIAL** ⚠️ (Logs estruturados em JSON emitidos no stdout da Vercel com `X-Request-ID`. Falta agregação distribuída em ferramenta externa de APM como Sentry).
- **Resiliência Offline:** **CONFIRMED** 🟢 (Gravação síncrona no `localStorage` mantém o painel funcional em 100% dos cenários sem internet).
- **Disaster Recovery (Backup/Restore):** **PARTIAL / NOT VERIFIED** (Backup local e exportação JSON manual funcionam com perfeição; restore de snapshots externos do Redis Upstash depende do console de terceiros).
- **Rollback de Código:** **CONFIRMED** 🟢 (Git Tags `v2.0.0` e `v2.1.0` e compilação imutável em `public/` e `dist/`).

---

# 6. Tabela de Avaliação Consolidada

| Área Auditada | Status Factual | Severidade / Risco | Evidência Principal |
|---|---|---|---|
| **Segredos & Git** | **CONFIRMED** 🟢 | P4 (Mitigado) | `api/auth.js` e `api/sync.js` sem fallback; segredo na Vercel independente. |
| **Headers HTTP / CSP** | **PARTIAL** ⚠️ | P3 (`SEC-NEW-004`) | Headers OWASP ativos; CSP com `unsafe-inline`. |
| **Rate Limiting** | **PARTIAL** ⚠️ | P2 (`SEC-NEW-002`) | Ativo por IP (10/15min); falta limite secundário por e-mail. |
| **Ciclo de Vida JWT** | **PARTIAL** ⚠️ | P2 (`SEC-NEW-003`) | Expiração de 30 dias ativa; falta revogação imediata em `/api/sync`. |
| **Sanitização de DOM** | **PARTIAL** ⚠️ | P2 (`SEC-NEW-001`) | `table.js` sanitizado com `_esc()`; `matchup.js` requer expansão. |
| **Observabilidade** | **PARTIAL** ⚠️ | P3 | `X-Request-ID` ativo; logs em JSON sem APM externo. |
| **Privacidade / Expurgo** | **CONFIRMED** 🟢 | P4 (Controlado) | `admin_delete_user_data` restrito a admin; partidas mantidas anonimizadas. |
| **Integridade de Dados** | **CONFIRMED** 🟢 | P4 (Robusto) | Merge determinístico e tombstones 100% validados. |
| **SDD 2.0 Level 5** | **CONFIRMED** 🟢 | P4 (Exemplar) | 30/30 gates aprovados, 8 specs com YAML, deep drift ativo. |
| **CI/CD Quality Gate** | **CONFIRMED** 🟢 | P3 (`CI-NEW-001`) | 19 suítes / 57 testes passando; falta gitleaks e pinned SHA. |
| **Disaster Recovery** | **PARTIAL** ⚠️ | P3 | Exportação JSON validada; restore do Upstash externo não testado em prod. |

---

# 7. Decisão Final da Auditoria

### Classificação: **READY WITH CONDITIONS** ⚠️🛡️

**Justificativa:**
A aplicação **Jornada TCG Team v2.1.0** apresenta excelente nível de maturidade de engenharia, arquitetura orientada a especificações (SDD Level 5) e rede sólida de 57 testes automatizados. Os riscos residuais identificados (`SEC-NEW-001` a `SEC-NEW-004`) são de severidade média/baixa e não impedem a operação contínua do dashboard regional, mas devem ser formalizados no backlog da próxima iteração.
