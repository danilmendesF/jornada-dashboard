# PRD — Ordenação por seqID Decrescente no Registro de Partidas

## Contexto de produto *

Hoje o dashboard possui uma tabela de registro de partidas que exibe os registros de forma sequencial pelo atributo `seqID` de forma incremental (`i + 1` a cada nova partida inserida) para que sempre que uma nova partida for registrada, a partida mais recente seja exibida na Página 1 no topo da lista com o `seqID` mais alto.

## Problema *

No cenário de produção, partidas registradas entre 05/08/2026 e 07/08/2026 (e partidas com IDs em formato numérico curto) estão recebendo `seqID` entre 1 e 77 e sendo exibidas nas últimas páginas da tabela. Além disso, ao cadastrar uma nova partida, ela recebe o `seqID 1` ao invés do maior número sequencial, ficando no final da tabela em vez do topo da Página 1.

## Objetivo *

Garantir que todas as partidas (legadas e novas) sejam ordenadas e exibidas em ordem decrescente por `seqID`, onde a partida mais recente sempre fica no topo da Página 1. Ajustar o sequenciamento para que `seqID = 1` corresponda à partida mais antiga e `seqID = N` à partida mais recente, eliminando inconsistências decorrentes da leitura de datas ou cache desatualizado no `localStorage`.

---

## Histórias de usuário *

- **Como** jogador/administrador do dashboard, **quero** visualizar minhas partidas mais recentes no topo da Página 1 em ordem decrescente, **para** acompanhar de forma imediata e clara os meus últimos resultados.
- **Como** usuário registrando uma nova partida, **quero** que ela receba o maior `seqID` subsequente (`N + 1`), **para** ser inserida automaticamente no topo do histórico.

---

## Requisitos de produto *

| ID | Requisito de produto | Tipo | Prioridade |
|---|---|---|---|
| PR-01 | A tabela de registros deve exibir as partidas ordenadas por `seqID` decrescente com a mais recente no topo. | Funcional / UX | Alta |
| PR-02 | O `seqID` de todas as partidas legadas e novas deve corresponder estritamente à sua ordem cronológica real de criação. | Regra de Negócio | Alta |
| PR-03 | Novas partidas cadastradas devem receber `max(seqID) + 1` e aparecer no topo da Página 1. | Funcional / UX | Alta |
| PR-04 | O atributo `seqID` deve ser gravado de forma persistente no `localStorage`, nos backups JSON e na sincronização na nuvem. | Persistência | Alta |

---

## Fora de escopo

- Alterações na tela de login/autenticação.
- Alterações nos filtros ou seletores da página.
- Alterações nos cálculos estatísticos funcionais dos dashboards.
- Exclusão ou perda de qualquer registro de partida.

---

## Critérios de aceite *

- [x] Ao carregar a tabela, as partidas mais recentes possuem o maior `seqID` e aparecem no topo da Página 1 (ordem decrescente por padrão).
- [x] O `seqID` de cada partida reflete com 100% de precisão a sua data/hora real de criação (da partida `#1` em 23/07/2026 até `#N` em 09/08/2026+).
- [x] Validação automatizada contra o backup de produção `jornada_backup_2026-08-09 (1).json` aprovando sem nenhuma falha de ordenação.
- [x] O atributo `"seqID": <numero>` está explicitamente presente e gravado nos arquivos JSON exportados e no `localStorage`.
