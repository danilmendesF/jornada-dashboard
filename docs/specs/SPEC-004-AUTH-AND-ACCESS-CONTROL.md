---
id: SPEC-004
title: Autenticacao, Controle de Acesso, Rate Limiting em Duas Camadas e Revogacao de Sessao
status: VERIFIED
version: 2.2.0
tested_by: tests/jwt_revocation.test.js
updated_at: 2026-08-15
---

# SPEC-004: Autenticacao, Controle de Acesso, Rate Limiting em Duas Camadas e Revogacao de Sessao

## 1. Requisitos de Negocio
- Rotas de mutacao em nuvem exigem cabecalho `Authorization: Bearer <JWT>`.
- O segredo JWT deve ser fornecido obrigatoriamente via `process.env.JWT_SECRET` (sem fallback hardcoded).
- Autorizacao granular (BOLA/IDOR): usuarios so podem sincronizar dados do seu proprio time (`allowedSyncTokens`). Administradores podem gerenciar todos os namespaces.
- Rate limiting distribuido em duas camadas no `/api/auth`:
  - Camada IP: maximo de 10 tentativas / 15 min por IP (`ratelimit_auth_ip_...`).
  - Camada Conta: maximo de 5 tentativas / 15 min por conta normalizada via hash SHA-256 (`ratelimit_auth_acc_...`).
- Tokens JWT possuem ciclo de vida finito com claim `exp` de 30 dias e tolerancia de clock skew de 60 segundos.
- Verificacao ativa de sessao no `POST /api/sync`: contas excluidas no Redis tem seus tokens rejeitados com `401 Unauthorized`.
- Todas as funcoes serverless injetam e propagam `X-Request-ID` para correlacao de logs estruturados.

## 2. Invariantes
- Rejeicao com 401 para ausencia, expiracao ou revogacao de token e 403 para namespace estrangeiro.
- Logs estruturados em formato JSON com `timestamp`, `service`, `level`, `message`, `requestId`.
