# 💬 PROMPT 03: REFATORAÇÃO DE CÓDIGO (Zero Regressão)

Copie e envie o prompt abaixo quando solicitar refatorações ou otimizações:

---

```markdown
@IA Atue como Spec-Architect e Quality-Validator no projeto Jornada Dashboard.

Desejo realizar uma refatoração no seguinte componente:
[DESCREVA O COMPONENTE OU MÓDULO A SER REFATORADO]

Diretivas de Refatoração:
1. Mantenha os módulos com menos de 300 linhas em `js/`.
2. Preserve 100% dos bindings globais em `window`.
3. Valide os contratos de dados definidos em `.ai/ARCHITECTURE.md`.
4. Crie o plano `implementation_plan.md` e aguarde minha aprovação.
5. Ao concluir, execute `node scripts/validate.js` e `node scripts/update_state.js`.
```
