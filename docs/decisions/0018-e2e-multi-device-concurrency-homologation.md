# ADR 0018: Homologação E2E de Concorrência Multi-Device e Stress Testing (Sync Protocol v2)

## Status
ACCEPTED (Fase 2 Homologada)

## Data
2026-08-19

## Contexto
Com a conclusão da Fase 2 do **Sync Protocol v2** (CHG-006.1 a CHG-006.4), foi introduzida uma nova arquitetura de persistência e sincronização em nuvem composta por:
1. **Identificadores Imutáveis UUIDv4** (CHG-006.1 / ADR-0014);
2. **User Storage Namespaces** com isolamento estrito de LocalStorage por usuário (CHG-006.2 / ADR-0015);
3. **Redis Lua Atomic Commit & Optimistic Concurrency Control (OCC)** monotônico com detecção de `baseRevision` e `idempotencyKey` (CHG-006.3 / ADR-0016);
4. **HTTP 409 Conflict Retry, Exponential Backoff + Full Jitter & Sync State Machine** no cliente (CHG-006.4 / ADR-0017).

O objetivo do **CHG-006.5** foi executar a **homologação formal E2E de concorrência e estresse**, submetendo o sistema a baterias de múltiplos clientes simultâneos sob condições de alta contenção, falhas de rede simuladas, tombstoning e concorrência no mesmo registro.

## Decisões Tomadas

1. **Abstração Linearizável de Simulação E2E Multi-Device:**
   - Criada a suíte `tests/sync_e2e_homologation.test.js` com instâncias desacopladas `SimulatedDevice`, cada qual com sandbox de LocalStorage independente, ciclo de vida próprio e conexão concorrente com a fila atômica do backend OCC (`executeAtomicCommit`).

2. **Garantia de Tombstones Cumulativos Monotônicos no Backend:**
   - O backend Redis Lua e o fallback em JS foram aprimorados para realizar a união cumulativa dos `deletedIds` recebidos com os já persistidos na nuvem (`consolidated.deletedIds = Set(existingDeleted ∪ incomingDeleted)`).
   - Impede que snapshots enviados por clientes sem exclusões locais apaguem tombstones previamente registrados por outros dispositivos.

3. **Validação de Invariantes Estruturais (INV-001 a INV-010):**
   - **INV-001:** Unicidade estrita de UUIDv4 em todos os cenários.
   - **INV-002:** Zero perda de mutações confirmadas sob contenção de 10 a 20 dispositivos.
   - **INV-003:** Monotonicidade da `revision` ($R_{n+1} > R_n$).
   - **INV-004:** Idempotência via `idempotencyKey` — replays idênticos não incrementam revision nem duplicam registros.
   - **INV-005:** Isolamento hermético de namespaces por usuário/token.
   - **INV-006:** In-flight session guard — logout bloqueia pushes e pulls em voo.
   - **INV-007:** Precedência de Tombstones sobre edições concorrentes (LWW delete rule).
   - **INV-008:** Limite estrito de retries ($MAX=3$) impedindo loops infinitos e tempestades de requisições.
   - **INV-009:** Serialização e unicidade de ciclo de push ativo por sessão.
   - **INV-010:** Convergência canônica determinística ($100\%$ identidade de snapshot entre todos os dispositivos).

4. **Matriz de Cenários Homologados:**
   - `E2E-001`: Single Device (Login -> Pull -> Mutation -> Push 200 -> Pull).
   - `E2E-002`: Two Device Concurrent Insert (Reconciliação 409 + Convergência).
   - `E2E-003`: 4 Devices Concorrentes (Promise.all -> Convergência canônica).
   - `E2E-004`: High Concurrency (10 devices, 100 partidas únicas, 0 perdas).
   - `E2E-005`: Stress & Chaos (20 devices, 400 mutações aleatórias com inserts/updates/deletes).
   - `E2E-006`: Concurrent Update Same Record (Last-Write-Wins respeita timestamp e tie-break).
   - `E2E-007`: Delete vs Update (Tombstone prevalece sobre edição e impede ressurreição).
   - `E2E-008`: Offline Device Convergence (Criação offline e sincronização limpa ao reconectar).
   - `E2E-009`: Network Interruption (Timeout preserva dados e idempotencyKey).
   - `E2E-010`: Idempotency Replay (Replay idempotente não avança revision).
   - `E2E-011`: User & Namespace Isolation (Isolamento total entre usuários).
   - `E2E-012`: Logout / Login Lifecycle (Isolamento de sessão e restauração correta).
   - `E2E-013`: Rapid Login / Logout (Sem vazamentos ou requisições fantasmas).
   - `E2E-014`: Retry Storm Resistance (Teto de 3 retries impede tempestades).
   - `E2E-015`: Mutation During Retry (Mutação adicionada durante `CONFLICT_RETRYING` é preservada).
   - `E2E-016`: Multi-Wave Convergence (4 ondas de grupos alternados convergem com 100% de identidade).

## Consequências
- A Fase 2 do Sync Protocol v2 está integralmente homologada e comprovada contra concorrência real multi-device.
- Todos os Quality Gates do SDD 2.0 Level 5 aprovados.
