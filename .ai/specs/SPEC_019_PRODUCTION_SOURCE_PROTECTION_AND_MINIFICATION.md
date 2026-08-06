# 📝 SPEC_019: BUNDLE ÚNICO MINIFICADO E OFUSCAÇÃO DE CÓDIGO-FONTE EM PRODUÇÃO

- **Status**: 🟡 EM REVISÃO (Aguardando Aprovação do Usuário)
- **Autor**: Security Architect & Lead Dev
- **Data**: 2026-08-06
- **Módulos Impactados**: `scripts/build_bundle.cjs`, `index.html`, `dist/app.min.js`, `dist/style.min.css`

---

## 1. Diagnóstico do Novo Print (Exposição de Arquivos no DevTools da Vercel)

No novo print enviado (`jornada-dashboard-jornadatcg.vercel.app`), o painel **Sources** do DevTools exibe a árvore inteira de arquivos individuais do projeto:
- `js/auth.js`, `js/charts.js`, `js/config.js`, `js/filters.js`, `js/table.js`, `manager.js`, `app.js`, etc.
- Comentários originais de desenvolvimento (ex: `// ── JS/TABLE.JS ──`).
- Código-fonte legível não minificado.

### Por que isso acontece?
Atualmente, o `index.html` importa 15 arquivos `<script src="...">` individuais sem compilação. Isso faz com que a Vercel sirva o código-fonte bruto em texto puro, permitindo que qualquer pessoa abrindo o F12 leia os nomes de todos os arquivos e o código na íntegra.

---

## 2. Solução Definitiva: Bundling & Minificação (`dist/app.min.js`)

Adotaremos o **padrão industrial de desenvolvimento web seguro** (utilizado por Stripe, Vercel e grandes aplicações):

### RF-01: Script Automatizado de Build (`scripts/build_bundle.cjs`)
- Criar o compilador interno `scripts/build_bundle.cjs` que:
  1. Concatena os 15 módulos JS na ordem correta de dependência.
  2. Remove 100% dos comentários de desenvolvimento (`//` e `/* */`).
  3. Remove quebras de linha desnecessárias, múltiplos espaços e formatações.
  4. Gera um **único arquivo minificado fechado**: `dist/app.min.js`.
  5. Minifica também o CSS em `dist/style.min.css`.

### RF-02: Atualização do `index.html` para Produção
- Em `index.html`, substituir a importação dos 15 scripts soltos por um único script minificado:
  `<script src="dist/app.min.js"></script>`.
- **Resultado no DevTools Sources**: O visitante verá apenas 1 arquivo minificado `app.min.js` sem estrutura de pastas, sem comentários e de difícil leitura reversa.

### RF-03: Manutenção do Padrão SDD de Desenvolvimento
- O desenvolvimento continuará normalmente nos módulos organizados `< 350 linhas` em `js/*.js`.
- O processo de validação (`node scripts/validate.cjs`) gerará automaticamente o bundle `dist/app.min.js` antes de cada commit/deploy.

---

## 3. Critérios de Aceite & Validação
- [ ] O painel DevTools Sources em produção não exibe mais a lista de 15 arquivos soltos nem comentários.
- [ ] Toda a aplicação funciona 100% com o bundle único `dist/app.min.js`.
- [ ] Suíte automatizada `node scripts/validate.cjs` e `node scripts/validate_auth.cjs` aprovada em 100% dos 61+ testes.
