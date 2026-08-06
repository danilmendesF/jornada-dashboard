# 🤖 DIRECTIVES FOR AI AGENTS — Jornada Dashboard

Welcome AI Agent. Read and strictly enforce these directives for any task in this codebase.

---

## ⚠️ ZERO-REGRESSION DIRECTIVE (INVIOLABLE RULE)

> **ZERO REGRESSION**: No existing feature, dataset, mirror match contract, calculation formula, or mobile touch layout may be broken or negatively altered. Always run syntax validation (`node -c`) after any edit.

---

## 🎯 TOKEN OPTIMIZATION WORKFLOW (RAG & SDD)

1. **DO NOT READ MONOLITHIC FILES**: Never inspect `app.js` or `manager.js` entirely unless explicitly requested.
2. **USE THE RAG INDEX**: Check [.ai/PROJECT_INDEX.md](file:///.ai/PROJECT_INDEX.md) to locate the exact module in `js/` that contains the target logic.
3. **READ ONLY TARGET MODULES**: Read the specific modular file in `js/` (e.g. `js/quicklog.js` or `js/md3.js`) which is under 300 lines.
4. **INSPECT ARCHITECTURE SPEC**: Consult [.ai/ARCHITECTURE.md](file:///.ai/ARCHITECTURE.md) before modifying stats, mirror rules, or storage keys.

---

## 🛠️ CODE STANDARDS

- **Vanilla JS**: No frameworks or build tools required. Maintain standard ES6 / browser-compatible syntax.
- **Global Bindings**: Bind primary handlers to `window.<functionName>` so HTML `onclick` handlers resolve seamlessly.
- **Defensive Programming**: Always check array/object existence before dereferencing (`Array.isArray(x)`, `x?.prop`).
- **IDs**: Always append random suffixes to timestamp IDs: `Date.now().toString() + Math.random().toString(36).substr(2, 4)`.
- **CSS**: Use variables from `:root`. Maintain mobile touch targets at `>= 40px` and avoid vertical/horizontal page overflow (`overflow-x: hidden`).

---

## ⚡ SDD SLASH COMMANDS SUMMARY

- **/feat <desc>**: Triggers SDD Feature workflow (`SPEC_XXX_FEATURE.md` ➔ `implementation_plan.md` ➔ Approval ➔ Implementation ➔ 61 Validation Tests ➔ Deploy Checkpoint).
- **/fix <desc>**: Triggers SDD Bugfix workflow (`SPEC_XXX_FIX.md` ➔ `implementation_plan.md` ➔ Approval ➔ Implementation ➔ 61 Validation Tests ➔ Deploy Checkpoint).
- **/refactor <desc>**: Triggers SDD Refactoring workflow with zero regression enforcement.
- **/doc <desc>**: Triggers SDD Documentation update and RAG re-indexing (`scripts/update_state.cjs`).
