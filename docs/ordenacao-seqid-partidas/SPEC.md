# SPEC — Ordenação e Sequenciamento Cronológico Absoluto por `seqID`

## 1. Contexto da solicitação

### 1.1 História do Usuário
- **Solicitante:** Desenvolvedor / Usuário Competitivo
- **Tipo:** Bugfix / Refatoração de Regra de Negócio e Persistência
- **História:** Garantir que o histórico de partidas no dashboard seja sempre ordenado em modo decrescente pelo atributo `seqID`, exibindo a partida mais recente no topo da Página 1 com o maior número sequencial.
- **Valor esperado:** Visualização imediata e confiável dos resultados mais recentes pelo jogador, sem partidas de agosto perdidas em páginas finais ou novas partidas recebendo ID `#1`.

### 1.2 Problema Observado
1. Partidas legadas registradas entre 05/08/2026 e 07/08/2026 (e partidas com ID em string numérico curto como `"380"`, `"381"`) recebiam `seqID` entre 1 e 77 devido ao parser de milissegundos converter `"380"` para a época **01/01/1970 (Ano 1970)**.
2. `ensureMatchSequence` calculava o `seqID` apenas em memória na tabela, sem forçar a gravação persistente da propriedade `"seqID": <numero>` no `localStorage`, no backup JSON ou na nuvem (`/api/sync`).
3. Ao cadastrar uma nova partida, a função `getNextSeqID` lia os dados do `localStorage` sem o atributo `seqID`, obtinha `max(seqID) = 0`, calculava `0 + 1 = 1` e atribuía `seqID = 1` à partida nova, enviando-a para a última página da tabela.

### 1.3 Objetivo da Entrega
Garantir o re-sequenciamento incondicional e a persistência absoluta do `seqID` em todo o ciclo de vida da aplicação (carga inicial, criação, importação e sincronização cloud).

---

## 2. Objetivo Técnico

1. **Parser de Datas em 3 Camadas (`getMatchTimestamp`)**: Evitar que qualquer ID curto seja interpretado como ano 1970, utilizando `createdAt` ISO -> 13 dígitos numéricos no `id` -> string `Data` (`YYYY-MM-DD`).
2. **Re-Sequenciamento Incondicional (`ensureMatchSequence`)**: Ordenar todas as partidas cronologicamente e re-indexar `1..N` incondicionalmente no carregamento.
3. **Persistência Garantida (`saveManual`, `loadManual`, `exportBackup`, `pushToCloud`)**: Gravar explicitamente a propriedade `"seqID": <numero>` no `localStorage`, nos backups JSON e nas requisições da nuvem.

---

## 3. Estado Atual vs Estado Esperado

| Arquivo / Módulo | Estado Anterior | Estado Esperado | Impacto |
|---|---|---|---|
| `app.js` (`getMatchTimestamp`) | Tinha fallback frágil com `parseInt("380") = 380` (Ano 1970) | Parser em 3 camadas validando épocas `> 1000000000000` (Ano 2001+) | Alto |
| `app.js` (`ensureMatchSequence`) | Pulava a ordenação se as partidas tivessem algum `seqID` prévio no `localStorage` | Re-ordena e re-indexa incondicionalmente do `#1` ao `#N` | Alto |
| `app.js` (`getNextSeqID`) | Calculava `max` sobre `localStorage` desatualizado sem `seqID` (retornando `0 + 1 = 1`) | Roda `ensureMatchSequence` antes de calcular `max`, retornando `N + 1` (`#398`/`#417`) | Alto |
| `js/sync_cloud.js` (`exportBackup` e `pushToCloud`) | Não garantia o campo `seqID` serializado no JSON | Serializa explicitamente o campo `"seqID": <numero>` para todos os registros | Médio |

---

## 4. Requisitos Funcionais

| ID | Requisito Funcional | Origem |
|---|---|---|
| RF-01 | O sistema deve ler a data de criação de partidas legadas em 3 camadas, prevenindo datas anteriores ao ano 2001. | PRD / Diagnóstico |
| RF-02 | O sistema deve re-sequenciar incondicionalmente a lista inteira de partidas do `#1` (mais antiga) ao `#N` (mais recente). | PRD (PR-02) |
| RF-03 | Novas partidas devem receber o `seqID` igual a `N + 1` e aparecer no topo da Página 1 da tabela em ordem decrescente. | PRD (PR-03) |
| RF-04 | O atributo `"seqID": <numero>` deve ser gravado de forma persistente em `localStorage`, backups JSON e sincronização cloud. | PRD (PR-04) |

---

## 5. Plano de Validação e Testes

- **Suíte de Testes Automatizados Node.js (`scripts/validate_seqID.cjs`)**:
  - Teste 1: Validação de re-sequenciamento contíguo (`1..416`) sobre `jornada_backup_2026-08-09 (1).json`.
  - Teste 2: Inserção de nova partida recebendo `max + 1` (`#417`).
  - Teste 3: Validação de ordenação decrescente (exibindo `#417` no topo da Página 1).
  - Teste 4: Validação de serialização JSON contendo `"seqID": <numero>`.
