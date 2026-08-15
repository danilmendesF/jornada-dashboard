---
id: SPEC-004
title: Autenticacao, Controle de Acesso, Rate Limiting e Observabilidade
status: VERIFIED
version: 2.1.0
tested_by: tests/authorization.test.js
updated_at: 2026-08-15
---

# SPEC-004: Autenticacao, Controle de Acesso, Rate Limiting e Observabilidade

## 1. Requisitos de Negocio
- Rotas de mutacao em nuvem exigem cabecalho `Authorization: Bearer <JWT>`.
- O segredo JWT deve ser fornecido obrigatoriamente via `process.env.JWT_SECRET` (sem fallback hardcoded).
- Autorizacao granular (BOLA/IDOR): usuarios so podem sincronizar dados do seu proprio time (`allowedSyncTokens`). Administradores podem gerenciar todos os namespaces.
- Rate limiting distribuido em `/api/auth`: maximo de 10 tentativas por janela de 15 minutos por IP (retorna 429 Too Many Requests).
- Tokens JWT possuem ciclo de vida finito com claim `exp` de 30 dias e tolerancia de clock skew de 60 segundos.
- Todas as funcoes serverless injetam e propagam `X-Request-ID` para correlacao de logs estruturados.

## 2. Invariantes
- Tokens assinados com HMAC-SHA256 contendo `id`, `email`, `teamId`, `allowedSyncTokens`, `role`, `iat`, `exp`.
- Rejeicao com 401 para ausencia ou expiracao de token e 403 para token invalido ou namespace estrangeiro.
- Logs estruturados em formato JSON com `timestamp`, `service`, `level`, `message`, `requestId`.
