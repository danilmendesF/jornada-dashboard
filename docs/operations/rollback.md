# Procedimento de Rollback — Jornada TCG Team

**Status:** VERIFIED  

---

## 1. Quando Executar Rollback
- Falha critica no carregamento da tabela ou perda de reatividade de filtros.
- Erro 500 generalizado nas Serverless Functions (`/api/auth`, `/api/sync`).
- Corrupcao visual grave que impeça o registro de partidas durante torneios.

---

## 2. Procedimento de Rollback Imediato

### Opcao A: Rollback Instantaneo via Painel Vercel (Instant Rollback)
1. Acessar o Dashboard do projeto na Vercel (`jornada-dashboard`).
2. Navegar em **Deployments**.
3. Localizar o deployment estavel anterior.
4. Clicar no menu `...` e selecionar **Instant Rollback**.

### Opcao B: Rollback via Git Revert
```bash
git log -n 5 --oneline
git revert <commit_com_falha> -m 1
git push origin main
```
