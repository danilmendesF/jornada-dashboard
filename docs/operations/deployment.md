# Manual de Deploy — Jornada TCG Team

**Plataforma:** Vercel (Edge / Serverless Functions)  
**Dominio Oficial:** https://www.jornadatcgteam.com.br  
**Status:** VERIFIED  

---

## 1. Pipeline Oficial de Deploy

Para realizar o deploy de uma nova versao em producao:

1. **Validacao de Sintaxe e Testes:**
   ```bash
   npm test
   node scripts/validate_seqID.cjs
   ```
2. **Compilacao de Bundle Unico Minificado:**
   ```bash
   node scripts/build_bundle.cjs
   ```
3. **Bump de Versao Semantica:**
   ```bash
   node scripts/bump_version.cjs patch
   ```
4. **Deploy via Git Push:**
   ```bash
   git add .
   git commit -m "feat/fix: descricao da alteracao"
   git push origin main
   ```
5. **Validacao Pos-Deploy:**
   - Acessar `https://www.jornadatcgteam.com.br` com Hard Refresh (Ctrl+F5).
   - Validar versao no console e verificar carregamento de dados e login.
