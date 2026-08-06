# 📝 SPEC_023: SESSION CONTEXT AUTO-GENERATOR & TESTES COMPORTAMENTAIS

- **Status**: 🟢 IMPLEMENTADO
- **Tipo**: FEAT
- **Autor**: Spec-Architect
- **Data**: 2026-08-06
- **Módulos Impactados**: `scripts/update_state.cjs`, `scripts/validate.cjs`, `.ai/SESSION_CONTEXT.md` (gerado), `AGENTS.md`
- **Módulos PROIBIDOS de Tocar**: `js/*.js`, `app.js`, `index.html`, `style.css`

---

## 1. Visão Geral & Motivação

**Gap A**: Em cada nova conversa com a IA, ela começa sem saber o estado atual do projeto (último deploy, SPECs em andamento, bugs conhecidos). Isso gera consumo desnecessário de tokens e perguntas repetitivas de contexto.

**Gap B**: Os 61 testes validam estrutura e sintaxe, mas não comportamento. A IA pode introduzir um bug (ex: `getActivePlayerName()` retornando null quando logado) sem nenhum teste falhar.

## 2. Requisitos Funcionais

### RF-01: SESSION_CONTEXT.md gerado automaticamente
- `update_state.cjs` gera `.ai/SESSION_CONTEXT.md` com: último commit, última SPEC, lista de arquivos modificados recentemente, bugs conhecidos (abertos), próximas prioridades.
- `AGENTS.md` instrui a IA a ler este arquivo como **primeiro passo** em toda nova sessão.

### RF-02: Testes Comportamentais em validate.cjs
- **Teste 6**: `getActivePlayerName()` lê corretamente perfis planos `{ name }` e aninhados `{ user: { name } }`.
- **Teste 7**: Bundle IIFE não expõe `window.players`, `window.allData` como globais poluidores.
- **Teste 8**: `populateQuickLogDropdowns` em `manager.js` usa `getActivePlayerName()`, não a lista global `players`.
- **Teste 9**: Nenhuma função crítica está duplicada entre `js/*.js` e `manager.js`.
