# Auditoria de Segurança — Jornada TCG Team

**Status:** VERIFIED  
**Referência Metodológica:** OWASP Top 10 & DevSecOps Best Practices

---

## 1. Avaliação por Categoria

| Categoria | Nível de Risco | Status Atual | Mitigação / Recomendação |
|---|---|---|---|
| **Armazenamento de Senhas** | Baixo | Seguro | Senhas utilizam PBKDF2 (SHA-256) com 10.000 iterações e salt aleatório único por usuário em `api/auth.js`. |
| **Assinatura de JWT** | Baixo | Seguro | Utiliza HMAC-SHA256 com segredo em variável de ambiente (`JWT_SECRET`) com fallback seguro. |
| **Autorização de APIs** | Médio | Requer Atenção | `api/sync.js` valida JWT, mas possui fallback para `team_default_sync` se nenhum token for enviado. Recomenda-se exigir token válido para mutações (POST). |
| **Injeção e Input Validation** | Médio | Seguro no Core | Validações no cliente e backend filtram chaves com regex (`replace(/[^a-zA-Z0-9_-]/g, '')`). Recomenda-se adicionar JSON schema validator rigoroso. |
| **Exposição de Segredos** | Baixo | Seguro | Nenhum secret hardcoded exposto no frontend ou repositório. `RESEND_API_KEY`, `REDIS_URL` e `JWT_SECRET` isolados em Serverless env vars. |
| **Proteção XSS** | Baixo | Seguro | Renderização de tabelas e dashboards utiliza `textContent` e sanitização básica para entradas de texto livre. |
| **CORS** | Baixo | Adequado | Headers CORS configurados para permitir chamadas do frontend oficial para as Serverless Functions. |
