# Auditoria Independente de Deploy & Infraestrutura — Jornada TCG Team

**Data:** 2026-08-14  
**Auditado por:** Independent Engineering Auditor  
**Status do Deploy:** VERIFIED

---

## 1. Mapeamento de Infraestrutura & Pipeline

| Dimensao | Estado Observado em Producao | Status | Evidencia |
|---|---|---|---|
| **Plataforma de Hospedagem** | Vercel Serverless / Edge Platform | **VERIFIED** | `vercel.json`, deploy logs, DNS oficial |
| **Dominio Primario** | `https://www.jornadatcgteam.com.br` | **VERIFIED** | `api/email.js`, assets, preview endpoints |
| **Build Step** | `node scripts/build_bundle.cjs` (Terser + minificacao CSS) | **VERIFIED** | `dist/app.min.js`, `dist/style.min.css` |
| **Versionamento & Cache Busting** | `node scripts/bump_version.cjs` injeta query param nos scripts | **VERIFIED** | `index.html`, `package.json`, `version.json` |
| **Persistencia Externa (Database)** | Redis Cloud com Fallback KeyValue | **VERIFIED** | `api/sync.js`, `api/auth.js` |
| **Servico de E-mails** | Resend API (`https://api.resend.com/emails`) | **VERIFIED** | `api/email.js`, `api/notifyDeck.js` |
| **Procedimento de Rollback** | Instant Rollback no Painel Vercel ou `git revert` | **VERIFIED** | `docs/operations/rollback.md` |

---

## 2. Riscos e Gaps Operacionais Identificados

1. **Deploy Automatico ao Push na Main:** Qualquer commit na `main` gera deploy imediato na Vercel. Mitigado pelo gate local obrigatorio `npm run validate:sdd` e `.cursorrules`.
2. **Ambiente de Homologacao (Staging):** Atualmente a Vercel gera Preview Deployments para branches/PRs, mas nao ha um banco Redis isolado formal para homologacao (utilizam a mesma base se configurado globalmente).
