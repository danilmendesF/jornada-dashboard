# ADR 0009: Verificacao Ativa de Existencia do Usuario na Sincronizacao

**Status:** ACEITO  
**Data:** 2026-08-15  
**Decisores:** Danilo Mendes / Equipe de Engenharia  

---

## 1. Contexto
Tokens JWT possuem assinatura válida e expiração de 30 dias. Caso um administrador excluísse uma conta (`admin_delete_user_data`), o token emitido anteriormente continuava sendo aceito em mutações `POST /api/sync` até seu `exp` expirar, devido à natureza puramente stateless da validação.

## 2. Decisao
No endpoint de mutação `POST /api/sync`:
- Quando o Redis estiver conectado, após validar a assinatura e o claim `exp` do JWT, consultar a chave `user_${email}` no Redis.
- Se o registro do usuário não existir (conta excluída ou revogada), rejeitar a requisição com `401 Unauthorized` (`Token revogado ou usuário inexistente`).
- Se o Redis estiver indisponível, aplicar Fail-Open com log de aviso.

## 3. Consequencias
- **Positivas:** Revogação imediata de permissão de escrita em caso de exclusão ou desligamento de membro da equipe.
- **Trade-offs:** Adiciona 1 leitura rápida O(1) (< 2ms no Upstash) nas requisições de mutação POST (leituras GET permanecem sem custo).
