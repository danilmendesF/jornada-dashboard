# Registro Centralizado de Divida Tecnica & Riscos Aceitos (SDD 2.0)

**Projeto:** Jornada TCG Team  
**Ultima Atualizacao:** 15 de Agosto de 2026  
**Governanca:** Spec-Driven Development 2.0  

---

## 1. Riscos Arquiteturais Aceitos (Accepted Risks)

| ID | Dominio | Descricao | Justificativa de Negocio | Mitigacao Vigente |
|---|---|---|---|---|
| **`AR-001`** | **Merge** | Serializacao canonica nao recursiva (`canonicalMatchString`). | O dominio do Jornada TCG utiliza apenas objetos planos de partidas (`Match`), tornando desnecessaria a complexidade de ordenacao recursiva profunda. | Teste `tests/merge_tiebreak.test.js` e propriedades algebricas 100% validadas. |
| **`AR-002`** | **Tombstones** | Janela de retencao de exclusoes em 180 dias. | Previne crescimento indefinido de tombstones no `localStorage` do navegador e no Redis. | TTL de 180 dias e mais que suficiente para o ciclo de torneios e temporadas ativas. |
| **`AR-003`** | **Autorizacao** | Edicao colaborativa de partidas entre membros do mesmo time. | Reduz atrito no registro e correcao de placares em tempo real durante torneios presenciais. | Documentado em `docs/audit/HUMAN-DECISIONS-AUTHORIZATION.md`. |
| **`AR-004`** | **Rate Limiting** | Fail-Open em caso de falha ou timeout do Redis (`checkRateLimit`). | Garante que indisponibilidades temporarias de conexao nao impecam jogadores de acessarem o dashboard em regionais. | ADR 0005 e logs estruturados de aviso. |
| **`AR-005`** | **Privacidade / LGPD** | Expurgo de contas com preservacao de historico competitivo do time. | Mantem a integridade estatistica dos graficos de matchups desvinculando os dados pessoais (nome/email/hash). | SPEC-008 e `docs/privacy/DATA-RETENTION-AND-DELETION.md`. |

---

## 2. Backlog de Evolucao Tecnica (Future Improvements)

| ID | Prioridade | Item | Descricao |
|---|---|---|---|
| **`TD-001`** | **P3** | Validador Ajv em Runtime | Integrar o validador Ajv diretamente nas rotas Serverless da Vercel para validar requests com JSON Schema antes de processar. |
| **`TD-002`** | **P3** | Multi-Team Public SaaS Isolation | Caso o Jornada Dashboard seja oferecido para times externos, implementar isolamento estrito de permissao por usuario (`match.Player === user.name`). |
| **`TD-003`** | **P3** | Service Worker Offline Cache | Expandir a aplicacao para PWA instalavel com Service Worker para cache estatico de assets. |

### AR-006: Exclusão Administrativa Desvinculada de Partidas Coletivas
- **Status:** ACEITO
- **Severidade:** P3
- **Justificativa:** Partidas históricas em torneios coletivos pertencem ao histórico esportivo da equipe. A exclusão de um jogador desassocia a credencial de login e o claim de nome (`player_claim_`), mantendo os registros de partidas anonimizados para preservar o cálculo de matchup e win-rate do time.
