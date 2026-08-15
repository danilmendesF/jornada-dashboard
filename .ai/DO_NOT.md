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
