# Changelog — Jornada TCG Team Dashboard

Todas as alteracoes notaveis neste projeto serao documentadas neste arquivo.
O formato e baseado em Keep a Changelog e este projeto adere ao Versionamento Semantico.

---

## [2.1.5] - 2026-08-20
### Adicionado
- **CHG-006.4 Emergency Convergence:** Reconciliação automática de conflitos OCC (`HTTP 409`) com `PULL` imediato, `deterministicMergeMatches` cumulativo (`LOCAL ∪ CLOUD`) e **Retry Único** controlado (`MAX_RETRY_ATTEMPTS = 1`).
- **Pre-Push Local Safety Backup:** Função `saveLocalSafetyBackup()` criando snapshots de segurança escopados (`jornada_u_${uid}_safety_backup`) antes de mutações de reconciliação.
- **Suíte de Testes de Convergência Multi-Device:** 15 cenários de testes automatizados (`TEST-001` a `TEST-015`) em `tests/sync_conflict_retry.test.js`.

### Corrigido
- **Mitigação de Perda de Dados em Produção:** Eliminação de bloqueios de sincronização e divergências entre múltiplos dispositivos simultâneos (ex.: Thales e Danilo).
- **Proteção contra Overwrites Destrutivos:** Garantia estrita de união determinística por identidade estável UUIDv4, impossibilitando que snapshots menores sobrescrevam a Cloud ou apaguem dados locais.

---

## [1.8.0] - 2026-08-14
### Adicionado
- **SDD Specifications:** Especificacoes formais em `docs/specs/` (SPEC-001 a SPEC-006).
- **Architecture Decision Records:** Registros de decisao em `docs/decisions/` (ADR 0001 a ADR 0004).
- **Matriz de Testes Vitest:** Suites automatizadas para `stats.js`, `mirror.js`, `md3.js` e `email.js` (5 suites / 16 testes).
- **CI/CD Quality Gate:** Pipeline de integracao continua em `.github/workflows/ci.yml`.
- **SDD Validation Gate:** Script `scripts/validate_sdd.cjs` validando 32 criterios automatizados.

### Corrigido
- Refatoracao dos escopos em `js/stats.js` e `js/mirror.js` para compatibilidade modular com `window` e execucao sem `ReferenceError`.

---

## [1.7.9] - 2026-08-14
### Adicionado
- **Fase 0 Discovery:** Relatorios de auditoria em `docs/audit/` (`BASELINE.md`, `SYSTEM-MAP.md`, `KNOWLEDGE-RECONCILIATION.md`, `SECURITY-FINDINGS.md`, `DATA-INTEGRITY.md`, `OPEN-QUESTIONS.md`).
- **Governanca de IA:** Diretrizes arquiteturais em `.ai/` (`PROJECT_INDEX.md`, `PROJECT_CONTEXT.md`, `CODING_GUIDELINES.md`, `DO_NOT.md`, `KNOWN_PITFALLS.md`, `CHANGE_WORKFLOW.md`, `KNOWLEDGE_MODEL.md`).
- **Runbooks Operacionais:** Manuais em `docs/operations/` (`deployment.md`, `rollback.md`, `incident-response.md`, `environment.md`).

---

## [1.7.8] - 2026-08-14
### Modificado
- E-mail preview e links de CTA direcionados para o dominio de producao `https://www.jornadatcgteam.com.br`.

---

## [1.7.7] - 2026-08-14
### Adicionado
- Incorporacao do brasao oficial `logo.png` no cabecalho e rodape dos e-mails transacionais.

---

## [1.7.6] - 2026-08-14
### Modificado
- Reformulacao visual dos e-mails para Dark Theme Cyber Pokemon (`#060913`, `#0d1225`, `#7c3aed`, `#00c8f8`).

---

## [1.7.5] - 2026-08-14
### Adicionado
- Novo template responsivo de e-mail de boas-vindas estruturado via Resend API.

---

## [1.7.4] - 2026-08-14
### Adicionado
- Travamento automatico do jogador logado no formulario Quick Log via badge `.logged-player-badge`.

---

## [1.7.3] - 2026-08-14
### Adicionado
- Travamento do jogador logado no formulario de partida completa com bloqueio de auto-duelo.
- Restricao de data maxima permitida para nao ultrapassar a data atual.
- Aumento da area de comentarios e listas com barra de rolagem interna suave.

---

## [1.7.2] - 2026-08-14
### Modificado
- Ajustes de responsividade mobile e remocao do menu do rodape, incluindo disclaimer oficial de marcas Pokemon / RK9.

---

## [1.7.0] - 2026-08-10
### Corrigido
- Implementacao do parser de datas em 3 camadas (`getMatchTimestamp`) e sequenciamento cronologico absoluto (`seqID 1..N`).
