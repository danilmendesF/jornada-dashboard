---
id: SPEC-007
title: Seguranca HTTP, Headers OWASP e Sanitizacao de DOM
status: VERIFIED
version: 1.0.0
tested_by: tests/security_headers.test.js
updated_at: 2026-08-15
---

# SPEC-007: Seguranca HTTP, Headers OWASP e Sanitizacao de DOM

## 1. Requisitos de Negocio
- Toda resposta de asset estatico e SPA na Vercel deve emitir cabecalhos HTTP de seguranca padrao:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `Content-Security-Policy`: politica restritiva permitindo CDNs especificas (Google Fonts, FontAwesome, Chart.js) e bloqueando inline scripts maliciosos.
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- Todas as interpolacoes dinamicas de dados no DOM via `innerHTML` devem aplicar a funcao de escape `escapeHtml()` para mitigar Stored e DOM XSS.

## 2. Invariantes
- Strings contendo caracteres especiais (`&`, `<`, `>`, `"`, `'`) sao convertidas para entidades HTML seguras antes de serem inseridas no DOM.
