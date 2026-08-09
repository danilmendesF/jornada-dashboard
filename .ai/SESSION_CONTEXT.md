# 🧭 SESSION CONTEXT — Jornada Dashboard

> **Gerado automaticamente por `node scripts/update_state.cjs`.**
> **Leia como PRIMEIRO PASSO em qualquer nova sessão ou conversa.**
> Gerado em: 2026-08-09T22:39:03.304Z | Commit: `de073d5`

---

## 🚀 ESTADO ATUAL DO PROJETO

- **Último commit**: `de073d5`
- **Produção**: https://jornadatcgteam.com.br (Vercel auto-deploy)
- **Repositório**: https://github.com/danilmendesF/jornada-dashboard

### 5 Commits Mais Recentes:
```
de073d5 fix(table): implementa seqID incremental numérico estrito, ordenação primária por seqID e suíte de validação automatizada
1b691c0 fix(table): separa ordenacao por id da coluna Data e estabelece desempate incondicional por seqId decrescente
2781f68 fix(table): implementa seqId incremental sequencial fixo persistido em todas as partidas antigas e novas
00dddf5 fix(table): implementa auto-incremento real (_displayId) preenchendo falhas de ordenacao e numeros de ID retroativos
095e0b8 fix: ajuste da ordenacao de partidas
```

### Arquivos Modificados no Último Commit:
- `.ai/PROJECT_INDEX.md`
- `.ai/SESSION_CONTEXT.md`
- `app.js`
- `dist/app.min.js`
- `index.html`
- `js/quicklog.js`
- `js/table.js`
- `manager.js`
- `package.json`
- `scripts/validate_seqID.cjs`
- `version.json`

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
| `SPEC_024_REGISTRATION_FEEDBACK_VISUAL.md` | 🟢 IMPLEMENTADO |
| `SPEC_025_SEMANTIC_VERSIONING.md` | 🟢 IMPLEMENTADO |
| `SPEC_027_RESEND_DOMAIN.md` | — |
| `SPEC_028_MULTI_AGENT_WORKFLOW.md` | — |
| `SPEC_029_HIDE_ACTIONS_FOR_NON_OWNERS.md` | — |
| `SPEC_030_DEPLOY_PAUSE.md` | — |
| `SPEC_031_NEW_DECK_EMAIL.md` | — |
| `SPEC_032_NOTIFY_DECK_FIX.md` | — |
| `SPEC_033_FIX_SYNC_UNIFY.md` | — |
| `SPEC_034_BATCH_UNIFY.md` | — |
| `SPEC_035_FIX_GLOBAL_SYNC.md` | — |
| `SPEC_036_REMOVE_SYNC_UI.md` | — |
| `SPEC_037_FORCE_GLOBAL_TOKEN.md` | — |
| `SPEC_038_HOT_RELOAD.md` | — |
| `SPEC_039_ADMIN_ROLE.md` | — |
| `SPEC_040_INDIVIDUAL_RESET.md` | — |
| `SPEC_041_BUG_ORDENACAO.md` | 🟢 IMPLEMENTADO |


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

## 📈 PESO DO CONTEXTO (RAG TOKEN TRACKER)

> Monitoramento de consumo de tokens para a IA (Heurística: ~4 chars / token)

| Arquivo de Contexto | Caracteres | Tokens Estimados |
|---|---|---|
| `SESSION_CONTEXT.md` | 5371 | ~1343 tks |
| `PROJECT_INDEX.md` | 4643 | ~1161 tks |
| `DECISION_LOG.md` | 4744 | ~1186 tks |
| `ARCHITECTURE.md` | 7650 | ~1913 tks |
| `agent_personas.md` | 5129 | ~1282 tks |
| **TOTAL BASE RAG** | **27537** | **~6884 tks** |

*(Nota: O GPT-4 / Gemini-1.5 suportam 128k-1M+ tokens. Um RAG base ideal consome < 5.000 tokens).*

---

## ⚡ COMANDOS RÁPIDOS

```powershell
# Validação completa (61 testes)
node scripts/validate.cjs; node scripts/validate_auth.cjs

# Atualizar versão (SemVer) no index.html e package.json
node scripts/bump_version.cjs

# Recompilar bundle
node scripts/build_bundle.cjs

# Atualizar SESSION_CONTEXT + PROJECT_INDEX
node scripts/update_state.cjs

# Mirror + Deploy (após aprovação)
robocopy "C:\Users\danil\.gemini\antigravity\scratch\jornada-dashboard" "C:\Users\danil\OneDrive\Documentos\jornada-dashboard" /E /NDL /NFL /NJH /NJS; exit 0
git -C "C:\Users\danil\OneDrive\Documentos\jornada-dashboard" add .; git -C "C:\Users\danil\OneDrive\Documentos\jornada-dashboard" commit -m "..."; git -C "C:\Users\danil\OneDrive\Documentos\jornada-dashboard" push origin main
```