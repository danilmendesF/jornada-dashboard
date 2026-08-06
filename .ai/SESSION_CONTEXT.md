# 🧭 SESSION CONTEXT — Jornada Dashboard

> **Gerado automaticamente por `node scripts/update_state.cjs`.**
> **Leia como PRIMEIRO PASSO em qualquer nova sessão ou conversa.**
> Gerado em: 2026-08-06T13:45:00.480Z | Commit: `e9f3e6e`

---

## 🚀 ESTADO ATUAL DO PROJETO

- **Último commit**: `e9f3e6e`
- **Produção**: https://jornadatcgteam.com.br (Vercel auto-deploy)
- **Repositório**: https://github.com/danilmendesF/jornada-dashboard

### 5 Commits Mais Recentes:
```
e9f3e6e refactor(sdd-rag): auditoria e upgrade completo do sistema SDD/RAG
4f46436 fix(quicklog): elimina funcao duplicada que sobrescrevia o lock do quick log player
87c14b0 fix(all): tranca quicklog, restaura fundo da login wall, omite acoes de terceiros e otimiza sync multi-sessao
49e8323 refactor(repo): organiza diretorios, adiciona README profissional e .env.example
5fb06fe build(dist): encapsula bundle unico em IIFE scope e publica em producao
```

### Arquivos Modificados no Último Commit:
- `.agents/rules/agent_personas.md`
- `.ai/ARCHITECTURE.md`
- `.ai/DECISION_LOG.md`
- `.ai/PROJECT_INDEX.md`
- `.ai/specs/SPEC_022_SDD_RAG_SYSTEM_REFACTORING.md`
- `.ai/specs/TEMPLATE_SPEC.md`
- `AGENTS.md`
- `scripts/update_state.cjs`

---

## 📋 STATUS DAS SPECs

| Spec | Status |
|---|---|
| `SPEC_001_MD3_STATISTICS.md` | 🟢 APROVADO E IMPLEMENTADO |
| `SPEC_002_USER_AUTHENTICATION.md` | 🟡 EM REVISÃO (Aguardando Aprovação do Usuário) |
| `SPEC_004_EMAIL_NOTIFICATIONS.md` | 🟡 EM REVISÃO (Aguardando Aprovação do Usuário) |
| `SPEC_005_PLAYER_ACCOUNT_ASSOCIATION_AND_PERMISSIONS.md` | 🟢 APROVADO E EM IMPLEMENTAÇÃO |
| `SPEC_006_DEPLOY_AND_GITHUB_SYNC.md` | 🟡 EM REVISÃO (Aguardando Aprovação do Usuário) |
| `SPEC_007_POST_LOGIN_CLEANUP_EMAIL_AND_QUICKLOG_FIXES.md` | 🟡 EM REVISÃO (Aguardando Aprovação do Usuário) |
| `SPEC_008_REGISTRATION_LOGIN_GATE_AND_EMAIL_DIAGNOSTICS.md` | 🟡 EM REVISÃO (Aguardando Aprovação do Usuário) |
| `SPEC_009_RESET_USER_ACCOUNTS.md` | 🟡 EM REVISÃO (Aguardando Aprovação do Usuário) |
| `SPEC_010_RESTRICT_MATCH_CREATION_TO_AUTHENTICATED_PLAYER.md` | 🟡 EM REVISÃO (Aguardando Aprovação do Usuário) |
| `SPEC_011_CYBER_POKEMON_WALLPAPER_AUTH_BACKGROUND.md` | 🟡 EM REVISÃO (Aguardando Aprovação do Usuário) |
| `SPEC_012_RESPONSIVE_WALLPAPER_AND_COLOR_TINT.md` | 🟡 EM REVISÃO (Aguardando Aprovação do Usuário) |
| `SPEC_013_FULLSCREEN_COVER_WALLPAPER.md` | 🟡 EM REVISÃO (Aguardando Aprovação do Usuário) |
| `SPEC_014_QUICK_LOG_RESTRICT_AUTHENTICATED_PLAYER.md` | 🟡 EM REVISÃO (Aguardando Aprovação do Usuário) |
| `SPEC_015_ARCHETYPE_UNIFICATION_PERSISTENCE_AND_CLOUD_SYNC.md` | 🟡 EM REVISÃO (Aguardando Aprovação do Usuário) |
| `SPEC_016_DESIGN_SYSTEM_AND_COLOR_PHILOSOPHY_SDD.md` | 🟡 EM REVISÃO (Aguardando Aprovação do Usuário) |
| `SPEC_017_BULLETPROOF_QUICK_LOG_SINGLE_PLAYER_LOCK.md` | 🟡 EM REVISÃO (Aguardando Aprovação do Usuário) |
| `SPEC_018_WEB_SECURITY_AUDIT_ANTI_FLICKER_XSS_SANITY.md` | 🟡 EM REVISÃO (Aguardando Aprovação do Usuário) |
| `SPEC_019_PRODUCTION_SOURCE_PROTECTION_AND_MINIFICATION.md` | 🟡 EM REVISÃO (Aguardando Aprovação do Usuário) |
| `SPEC_020_GITHUB_REPOSITORY_BEST_PRACTICES_ORGANIZATION.md` | 🟡 EM REVISÃO (Aguardando Aprovação do Usuário) |
| `SPEC_021_TRIPLE_FIX_QUICKLOG_BACKGROUND_TABLE_ACTIONS.md` | 🟡 EM REVISÃO (Aguardando Aprovação do Usuário) |
| `SPEC_022_SDD_RAG_SYSTEM_REFACTORING.md` | 🟢 IMPLEMENTADO |
| `SPEC_023_SESSION_CONTEXT_AND_BEHAVIORAL_TESTS.md` | 🟢 IMPLEMENTADO |


---

## 🛠️ CONTEXTO TÉCNICO ESSENCIAL

### Stack:
- Frontend: HTML + Vanilla JS + CSS (sem frameworks)
- Bundle: `dist/app.min.js` (IIFE) + `dist/style.min.css`
- Backend: Vercel Serverless (`api/auth.js`, `api/sync.js`)
- Banco: Redis KV (Upstash) | Auth: JWT + PBKDF2

### Ordem de Leitura Obrigatória ANTES de qualquer tarefa:
1. Este arquivo `.ai/SESSION_CONTEXT.md` ✅
2. `.ai/PROJECT_INDEX.md` — mapa de módulos + linha exata das funções críticas
3. `.ai/DECISION_LOG.md` — decisões que NÃO devem ser revertidas
4. `.agents/rules/agent_personas.md` — persona correta para o slash command
5. `.ai/ARCHITECTURE.md` — apenas se a tarefa envolver stats/mirror/storage/sync

### ⚠️ Regra Anti-Bug #1 (causa do bug SPEC_021):
> Antes de criar/editar qualquer função, verifique duplicatas:
> `Select-String -Path "*.js","js/*.js" -Pattern "function nomeDaFuncao"`
> Funções duplicadas no IIFE bundle são hoisted — a última no `jsOrder` vence silenciosamente.

---

## ⚡ COMANDOS RÁPIDOS

```powershell
# Validação completa (61 testes)
node scripts/validate.cjs; node scripts/validate_auth.cjs

# Recompilar bundle
node scripts/build_bundle.cjs

# Atualizar SESSION_CONTEXT + PROJECT_INDEX
node scripts/update_state.cjs

# Mirror + Deploy (após aprovação)
robocopy "C:\Users\danil\.gemini\antigravity\scratch\jornada-dashboard" "C:\Users\danil\OneDrive\Documentos\jornada-dashboard" /E /NDL /NFL /NJH /NJS; exit 0
git -C "C:\Users\danil\OneDrive\Documentos\jornada-dashboard" add .; git -C "C:\Users\danil\OneDrive\Documentos\jornada-dashboard" commit -m "..."; git -C "C:\Users\danil\OneDrive\Documentos\jornada-dashboard" push origin main
```