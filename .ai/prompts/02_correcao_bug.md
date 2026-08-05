# 💬 PROMPT 02: CORREÇÃO DE BUG (Diagnóstico Empírico)

Copie e envie o prompt abaixo quando identificar um bug na aplicação:

---

```markdown
@IA Atue como Code-Auditor no projeto Jornada Dashboard.

Identifiquei o seguinte comportamento incorreto / bug:
[DESCREVA O BUG E SE POSSÍVEL COMO REPRODUZIR]

Siga o protocolo de correção de bugs:
1. Inspecione o módulo responsável usando o `.ai/PROJECT_INDEX.md` sem ler o projeto todo.
2. Identifique a causa raiz exata e apresente um diagnóstico com a linha e arquivo afetado.
3. Apresente o plano de correção garantindo ZERO REGRESSÃO dos contratos existentes (partidas espelho, MD3, filtros).
4. PARAR E AGUARDAR minha aprovação antes de modificar qualquer arquivo.
5. Após o aceite e correção, execute `node scripts/validate.js` para comprovar a fix.
```
