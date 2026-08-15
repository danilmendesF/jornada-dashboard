# Regras de Restricao Absoluta (DO NOT) — Jornada TCG Team

**Status:** STRICTLY NORMATIVE  

---

1. **NAO altere regras de negocio silenciosamente** sem validacao contra evidencias e testes.
2. **NAO apague dados historicos** nem reindexe partidas alterando datas ou duplicando `seqID`.
3. **NAO introduza frameworks pesados** (React, Angular, Next.js) sem justificativa aprovada.
4. **NAO exponha secrets ou credenciais** em logs, documentacao ou arquivos frontend.
5. **NAO remova testes** apenas para forcar sucesso de validacoes de CI/CD.
6. **NAO confie exclusivamente no frontend** para validacoes criticas de seguranca e autenticacao.
7. **NAO faca deploy de producao** sem validar localmente a integridade da sintaxe e o build dos bundles.
8. **NAO utilize `innerHTML` sem `escapeHtml()`** para dados dinamicos controlados pelo usuario.
9. **NAO remova o claim `exp`** de tokens JWT ou desative sua validacao temporal no `verifyJwt`.
10. **NAO remova o rate limiting** (`checkRateLimit`) das rotas de autenticacao em `/api/auth`.
11. **NAO remova os cabecalhos de seguranca HTTP** (`CSP`, `X-Frame-Options`, `HSTS`) do `vercel.json`.
12. **NAO exponha operacoes de exclusao/reset** sem exigir token autenticado de perfil `admin`.
