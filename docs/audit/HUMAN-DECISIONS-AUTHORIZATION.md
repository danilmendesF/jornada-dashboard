# Decisoes Humanas de Engenharia — Modelo de Autorizacao Granular

**Data:** 15 de Agosto de 2026  
**Status:** PROPOSED_FOR_HUMAN_REVIEW  

---

## 1. Contexto do Problema
Na Fase 4 identificamos que, embora o JWT valide com sucesso a autenticidade do usuario, qualquer portador de um JWT valido poderia enviar mutacoes para qualquer namespace de time via `POST /api/sync?token=<namespace>`.

Na Fase 5 implementamos a politica de autorizacao (BOLA prevention):
- Usuarios comuns so podem modificar o namespace padrao `team_default_sync` ou namespaces explicitamente concedidos em seus claims (`user.allowedSyncTokens` / `user.teamId`).
- Administradores (`role === 'admin'`) podem mutar qualquer namespace.
- Mutacoes nao autorizadas sao rejeitadas com `403 Forbidden`.

---

## 2. Decisao Humana Necessaria: Vinculo de Jogador por Partida (Row-Level Authorization)

- **Cenario:** Em partidas registradas dentro do mesmo time, um treinador "Victor" deve ter permissao para editar ou excluir uma partida registrada pelo treinador "Danilo"?
- **Opcoes de Negocio:**
  - **Opcao A (Colaboracao Aberta de Time - Atual):** Todos os membros do mesmo time podem registrar e atualizar partidas do time livremente. A integridade e mantida pela preservacao da versao mais recente (`updatedAt`) e historico.
  - **Opcao B (Isolamento Estrito por Jogador):** Um jogador so pode editar/deletar partidas onde `match.Player === user.name`. Administradores podem editar todas.
- **Recomendacao da Engenharia:** Manter **Opcao A** para a versao atual (ambiente colaborativo de time reduz atrito no registro de duelos espelho), evoluindo para **Opcao B** caso o sistema se torne uma plataforma publica multi-time.
