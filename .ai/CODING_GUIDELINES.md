# AI Coding Guidelines — Jornada TCG Team

**Status:** NORMATIVE  

---

## 1. Regras de Codigo e Estilo
- **Modularidade:** Modulos dentro de `js/` devem ter escopo focado e coeso.
- **Validacao de Sintaxe Obrigatoria:** Apos qualquer edicao em arquivos `.js` ou `.cjs`, execute `node -c <arquivo>` para validacao de sintaxe.
- **Compatibilidade com Globais:** Mantenha compatibilidade com os seletores DOM e metodos vinculados a `window` que orquestram a interface.
- **Versionamento e Build:** Apos alteracoes significativas, sempre execute:
  1. `node scripts/build_bundle.cjs`
  2. `node scripts/bump_version.cjs patch`
