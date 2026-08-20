---
id: SPEC-008
title: Privacidade de Dados, Retencao, Isolamento e Direito ao Esquecimento
status: VERIFIED
version: 1.1.0
tested_by: tests/storage_namespace.test.js
updated_at: 2026-08-19
---

# SPEC-008: Privacidade de Dados, Retencao, Isolamento e Direito ao Esquecimento (CHG-006.2)

## 1. Requisitos de Negocio
- Classificacao estruturada de dados: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `SECRET`.
- Senhas sao armazenadas exclusivamente com hash PBKDF2 (SHA-256) e salt de 16 bytes.
- Isolamento estrito de dados locais no navegador por namespace de usuario (`jornada_u_{userId}_*`).
- Expurgo administrativo de dados de conta suportado via endpoint autenticado `/api/auth?action=admin_delete_user_data`, exigindo perfil `role === 'admin'`.
- Partidas do time compartilhado sao preservadas com desvinculacao de credenciais pessoais.

## 2. Invariantes
- Usuarios distintos no mesmo navegador nunca compartilham nem visualizam registros locais uns dos outros.
- O logout desativa o namespace do usuario e restaura o namespace `jornada_u_anonymous_*` com expurgo total da memoria ativa.
- Operacoes de delecao administrativa registram entrada de auditoria contendo `requestId`, `adminEmail` e `targetEmail`.
