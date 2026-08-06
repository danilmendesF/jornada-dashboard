# 🤖 DIRECTIVES FOR AI AGENTS — Jornada Dashboard

Welcome AI Agent. Read and strictly enforce these directives for any task in this codebase.

---

## ⚠️ ZERO-REGRESSION DIRECTIVE (INVIOLABLE RULE)

> **ZERO REGRESSION**: No existing feature, dataset, mirror match contract, calculation formula, or mobile touch layout may be broken or negatively altered. Always run `node scripts/validate.cjs` after any edit.

---

## 📚 MANDATORY READING ORDER ON EACH NEW TASK

Before writing a single line of code, read in this exact order:

1. **[PROJECT_INDEX.md](.ai/PROJECT_INDEX.md)** — Locate the exact module and function line number. This is your map. Do not skip it.
2. **[DECISION_LOG.md](.ai/DECISION_LOG.md)** — Check if your proposed change conflicts with a past architectural decision. If it does, flag it in the `implementation_plan.md`.
3. **[ARCHITECTURE.md](.ai/ARCHITECTURE.md)** — For any change involving stats, mirror matches, localStorage, or sync — this is mandatory.
4. **[agent_personas.md](.agents/rules/agent_personas.md)** — Adopt the correct persona for the slash command received (`/fix` → BugHunter, `/feat` → FeatureArchitect, `/refactor` → RefactorSurgeon, `/doc` → DocKeeper).

---

## 🎯 TOKEN OPTIMIZATION WORKFLOW (RAG)

1. **DO NOT READ MONOLITHIC FILES ENTIRELY**: Never read `app.js` or `manager.js` in full. Use `PROJECT_INDEX.md` to find the exact function line, then read only ± 30 lines around it.
2. **USE THE RAG INDEX**: `PROJECT_INDEX.md` now indexes both `js/` modules AND critical functions in `manager.js`/`app.js` with line numbers.
3. **SEARCH FOR DUPLICATES BEFORE CREATING FUNCTIONS**: For any new function, run a PowerShell `Select-String` across all `.js` files to confirm it doesn't already exist elsewhere.
4. **VERIFY BUNDLE ORDER**: Check `scripts/build_bundle.cjs → jsOrder` array. Functions in files listed LATER override same-named functions in earlier files (JS hoisting inside IIFE scope).

---

## 🛠️ CODE STANDARDS

- **Vanilla JS**: No frameworks or build tools required. Maintain standard ES6 / browser-compatible syntax.
- **Global Bindings**: Bind primary handlers to `window.<functionName>` so HTML `onclick` handlers resolve seamlessly.
- **Defensive Programming**: Always check array/object existence before dereferencing (`Array.isArray(x)`, `x?.prop`).
- **IDs**: Always append random suffixes to timestamp IDs: `Date.now().toString() + Math.random().toString(36).substr(2, 4)`.
- **CSS**: Use variables from `:root`. Maintain mobile touch targets at `>= 40px` and avoid vertical/horizontal page overflow (`overflow-x: hidden`).
- **No Duplicate Functions**: Before creating any function, search for it with `Select-String`. A function declared in two files in the same IIFE bundle will cause silent override bugs.

---

## 🛑 SDD PROTOCOL: NO EXCEPTIONS

- **NO HEURISTIC BYPASSING**: You must ALWAYS generate an `implementation_plan.md` (or a `SPEC_XXX.md` file) and wait for the user to say `Proceed` before writing any code.
- This applies to **ALL** tasks, including trivial CSS tweaks, minor bug fixes, or text changes.
- Do not assume a task is too small for the SDD workflow. If the user uses `/fix`, `/feat`, or `/refactor`, the planning phase is **MANDATORY**.

---

## ⚡ SDD SLASH COMMANDS & PERSONAS

| Comando | Persona Adotada | Spec Gerada | Workflow |
|---|---|---|---|
| `/fix <desc>` | 🔴 **BugHunter** | `SPEC_XXX_FIX.md` | Root Cause → Plan → Proceed 1 → Fix → QA → Proceed 2 → Deploy/Push |
| `/feat <desc>` | 🟢 **FeatureArchitect** | `SPEC_XXX_FEATURE.md` | RFC → Plan → Proceed 1 → Build → QA → Proceed 2 → Deploy/Push |
| `/refactor <desc>` | 🔵 **RefactorSurgeon** | `SPEC_XXX_REFACTOR.md` | Full Read → Plan → Proceed 1 → Refactor → QA → Proceed 2 → Deploy/Push |
| `/doc <desc>` | 🟡 **DocKeeper** | Updates `.ai/` files | Update Specs Status → RAG Re-index → No code changes |

## 🔄 FLUXO MULTI-AGENTE

- **Planner**: Pro High
- **Executor**: Flash
- **QA**: Flash (Valida, então dispara o Proceed 2 para Deploy/Push)

See full persona definitions in [agent_personas.md](.agents/rules/agent_personas.md).
