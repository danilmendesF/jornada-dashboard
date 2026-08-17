# Manual de Deploy — Jornada TCG Team

**Plataforma:** Vercel (Edge / Serverless Functions)  
**Dominio Oficial:** https://www.jornadatcgteam.com.br  
**Status:** VERIFIED  

---

## 1. Pipeline Oficial de Deploy

Para realizar o deploy de uma nova versao em producao:

1. **Bump de Versao Semantica (Single Source of Truth):**
   ```bash
   node scripts/bump_version.cjs patch
   ```
   *(Ou altere `version` no `package.json` e execute `npm run build` — o motor de build injeta a versao automaticamente nos artefatos derivados)*

2. **Validacao de Quality Gates SDD 2.0:**
   ```bash
   npm run validate:sdd
   npm run drift:check
   ```

3. **Deploy via Git Push:**
   ```bash
   git add .
   git commit -m "feat/fix: descricao da alteracao"
   git push origin main
   ```

4. **Validacao Pos-Deploy:**
   - Acessar `https://www.jornadatcgteam.com.br/version.json` e validar a nova versao servida.
   - Validar versao no DOM (`#appVersion` e `#appVersionAuth`) e verificar carregamento de dados e login.

