---
id: SPEC-007
title: Seguranca HTTP, CSP com script-src-elem e Sanitizacao Universal de DOM
status: VERIFIED
version: 1.1.0
tested_by: tests/xss_sanitization.test.js
updated_at: 2026-08-15
---

# SPEC-007: Seguranca HTTP, CSP com script-src-elem e Sanitizacao Universal de DOM

## 1. Requisitos de Negocio
- Toda resposta de asset estatico e SPA na Vercel deve emitir cabecalhos HTTP de seguranca padrao:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `Content-Security-Policy`: utiliza `script-src-elem 'self' https://cdn.jsdelivr.net` para bloquear tags script inline maliciosas e `script-src-attr 'unsafe-inline'` para atributos de evento legítimos.
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- Todas as interpolacoes dinamicas de dados no DOM via `innerHTML` em `table.js`, `matchup.js`, `md3.js`, `manager_forms.js`, `auth.js` e `quicklog.js` devem aplicar a funcao de escape `escapeHtml()`.

## 2. Invariantes
- Strings contendo caracteres especiais (`&`, `<`, `>`, `"`, `'`) sao convertidas para entidades HTML seguras antes de serem inseridas no DOM.
