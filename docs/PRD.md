# PRD — <Nome da feature>

> **Instruções**: Preencha cada seção com base no que você sabe sobre a feature. Campos marcados com `*` são obrigatórios para avançar para a SPEC. Remova os blocos de instrução antes de submeter.

---

## Contexto de produto \*

> Hoje o dashboard possui uma tabela de registro de partidas que exibe o registro de forma sequencial decrescentemente pelo seqID de forma incremental (i+1 para cada nova partida que for sendo lançada) para que sempre que eu registrar uma nova partida a partida mais recente seja exibida na página 1 no topo da lista com o seqID mais alto e o cliente possa ter uma visualização melhor dos dados que obteve no dia que jogou.

<Explique o contexto: qual é o produto, qual área ou fluxo esta feature toca, e o que motivou esta demanda agora>

## Problema \*

> O problema é que no cenário de produção percebi que esse comportamento não está ocorrendo. As partidas estão com o comportamento previsto mas quando pego partidas com ID do 1 ao 77 são partidas mais recentes que estão ficando nas últimas páginas e quando crio uma nova partida ela não fica na página 1 no topo do registro com o seqID mais alto para que seja exibida no topo da primeira página.

<Descrição do problema real que o usuário ou negócio enfrenta hoje>

## Objetivo \*

> Espero que todos os dados (legados e novos) sejam visualizados de forma decrescente onde a partida mais recente sempre vai ser exibida logo no topo da página 1 e que o ajuste nas partidas com seqID 1 ao 77 seja feitos. Validar se todas as partidas estão com seqID correto seguindo a lógica de acordo com a data de criação, sendo 1 a partida mais antiga e "n" a partida mais recente. Espero também que avalie se o comportamento incorreto está acontecendo devido ao localStorage.

<Resultado esperado — o que muda no comportamento do produto ou do usuário>

---

## Histórias de usuário \*

> Como desenvolvedor de software sênior e com alto grau de conhecimento, quero poder implementar feature e resolver bugs de maneira assertiva para garantir uma melhor qualidade de dashboard para meus clientes de forma a terem um software de ponta seguindo as melhores práticas de tecnologia e de experiência do usuário.

- **Como** <persona>, **quero** <ação>, **para** <benefício>

---

## Requisitos de produto \*

| ID    | Requisito de produto                                                                                                         | Tipo                     | Prioridade |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ---------- |
| PR-01 | O produto deve permitir que eu veja os dados na tabela de registro de forma ordenada mostrando a mais recente sempre no topo | <Funcional / UX / Regra> | Alta       |

---

## Fora de escopo

- Não será alterada a tela de login
- Não poderá haver alteração nos filtros da página
- Não poderá haver alteração nos dashboards que já estão funcionais
- Não poderá ter dado perdido durante a alteração pois cada registro de partida é importante estatisticamente.

---

## Critérios de aceite \*

- [ ] Que ao ordenar a página as partidas mais recentes tenham o maior seqID e as mais antigas as menores garantindo assim que as mais recentes fiquem no topo da página 1.
- [ ] Que o seqID esteja aderente com a data de criação das partidas para que tenha esse comparativo em relação a data de criação.
- [ ] Que ao testar com os dados que estão na raiz com nome jornada_backup_2026-08-09 (1) seja ordenado todos de maneira correta sem nenhum dado furar a ordem prevista.

---

## Métrica ou sinal de sucesso

A entrega será considerada funcional após ocorrer a implementação e a validação dela ter passado com sucesso e ser exibido todos os dados do backup com a ordem decrescente seguindo da partida mais recente para a mais antiga.
