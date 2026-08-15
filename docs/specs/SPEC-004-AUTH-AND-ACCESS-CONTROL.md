---
id: SPEC-004
title: Autenticacao e Controle de Acesso Serverless
status: VERIFIED
version: 2.0.0
tested_by: tests/authorization.test.js
updated_at: 2026-08-15
---

# SPEC-004: Autenticacao e Controle de Acesso Serverless

## 1. Requisitos de Negocio
- Rotas de mutacao em nuvem exigem cabecalho `Authorization: Bearer <JWT>`.
- O segredo JWT deve ser fornecido obrigatoriamente via `process.env.JWT_SECRET` (sem fallback hardcoded).
- Autorizacao granular (BOLA/IDOR): usuarios so podem sincronizar dados do seu proprio time (`allowedSyncTokens`). Administradores podem gerenciar todos os namespaces.

## 2. Invariantes
- Tokens assinados com HMAC-SHA256 contendo `id`, `email`, `teamId`, `allowedSyncTokens`, `role`.
- Rejeicao com 401 para ausencia de token e 403 para token invalido ou namespace estrangeiro.
