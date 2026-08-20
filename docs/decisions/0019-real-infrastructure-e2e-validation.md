# ADR 0019: Real Infrastructure E2E Validation Framework (Sync Protocol v2)

## Status
ACCEPTED (Framework Implemented & Governed)

## Data
2026-08-19

## Contexto
O ciclo de desenvolvimento do **Sync Protocol v2** (Fase 2: CHG-006.1 a CHG-006.5) estabeleceu:
1. **Identificadores Imutáveis UUIDv4** (ADR 0014);
2. **User Storage Namespaces** isolados no LocalStorage (ADR 0015);
3. **Redis Lua Atomic Commit & OCC Monotônico** no backend (ADR 0016);
4. **HTTP 409 Conflict Retry, Exponential Backoff + Jitter & Sync State Machine** no cliente (ADR 0017);
5. **Homologação E2E de Concorrência e Estresse Multi-Device** em ambiente simulado linearizável (ADR 0018).

Para assegurar a completude da governança e permitir a validação contínua contra a infraestrutura de produção/homologação real (Vercel Serverless `/api/sync` + Upstash Redis Cluster), é necessário um framework formal de testes E2E reais com mecanismo estrito de opt-in.

## Decisões Tomadas

1. **Framework de Testes Reais (`tests/sync_real_infrastructure.test.js`):**
   - Criada suíte formal cobrindo os 10 cenários reais de infraestrutura (`TEST REAL 001` a `TEST REAL 010`).
   - O framework exercita a pilha completa de produção:
     $$	ext{Client HTTP} \longrightarrow 	ext{Vercel /api/sync} \longrightarrow 	ext{JWT Auth (BOLA)} \longrightarrow 	ext{Upstash Redis} \longrightarrow 	ext{LUA\_SYNC\_COMMIT} \longrightarrow 	ext{HTTP Response}$$

2. **Mecanismo de Opt-in Estrito de Segurança (`E2E_REAL` / `E2E_BASE_URL`):**
   - Para evitar execuções acidentais em runners locais ou CI sem credenciais, os testes de infraestrutura real são ativados exclusivamente mediante opt-in explícito via variáveis de ambiente (`E2E_REAL=1` e `E2E_BASE_URL`).
   - Na ausência dessas variáveis, a suíte reporta formalmente `SKIPPED (Missing live credentials / Base URL)` sem recorrer a fakes ou mocks para fingir execução real.

3. **Matriz de Cenários Reais:**
   - `TEST REAL 001`: Health / Authentication (GET/POST real com validação JWT e rejeição BOLA).
   - `TEST REAL 002`: Real Redis Commit (Commit atômico via EVAL real e verificação de persistência).
   - `TEST REAL 003`: Real OCC Conflict (Concorrência real de múltiplos clientes HTTP resultando em 200 + 409).
   - `TEST REAL 004`: Real Conflict Retry (Reconciliação e retry após 409 real).
   - `TEST REAL 005`: Real Idempotency Replay (Verificação de não-incremento de revision em replays).
   - `TEST REAL 006`: Real Network Unknown Outcome (Replay seguro após timeout/interrupção).
   - `TEST REAL 007`: Real Multi-Device Stress (Ondas concorrentes de dispositivos em rede real).
   - `TEST REAL 008`: Real Delete vs Update (Concorrência real entre tombstone e edição).
   - `TEST REAL 009`: Real User Isolation (Isolamento hermético entre múltiplos usuários e rejeição BOLA).
   - `TEST REAL 010`: Real Logout / Login (Isolamento de sessão sem vazamento de estado).

4. **Classificação Rigorosa de Evidências:**
   - O sistema diferencia estritamente:
     - `PROVEN_REAL`: Testes executados comprovadamente contra Vercel + Upstash Redis real.
     - `SIMULATED`: Testes executados no simulador linearizável (`MockCloudBackend`).
     - `BLOCKED`: Testes reais cujo ambiente de execução não dispõe de credenciais ativas.

## Consequências
- A infraestrutura de testes reais está formalmente integrada ao repositório e protegida contra execução acidental.
- A integridade da governança SDD 2.0 Level 5 é preservada com transparência absoluta sobre o nível de evidência disponível.
