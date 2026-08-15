---
id: SPEC-008
title: Privacidade de Dados, Retencao e Direito ao Esquecimento
status: VERIFIED
version: 1.0.0
tested_by: tests/privacy_deletion.test.js
updated_at: 2026-08-15
---

# SPEC-008: Privacidade de Dados, Retencao e Direito ao Esquecimento

## 1. Requisitos de Negocio
- Classificacao estruturada de dados: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `SECRET`.
- Senhas sao armazenadas exclusivamente com hash PBKDF2 (SHA-256) e salt de 16 bytes.
- Expurgo administrativo de dados de conta suportado via endpoint autenticado `/api/auth?action=admin_delete_user_data`, exigindo perfil `role === 'admin'`.
- Partidas do time compartilhado sao preservadas com desvinculacao de credenciais pessoais.

## 2. Invariantes
- Operacoes de delecao administrativa registram entrada de auditoria contendo `requestId`, `adminEmail` e `targetEmail`.
- Requisicoes de delecao nao autorizadas sao rejeitadas com 403 Forbidden.
