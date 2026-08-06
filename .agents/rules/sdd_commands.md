# ⚡ REGRAS DE ATALHOS DE COMANDOS SDD (/feat, /fix, /refactor, /doc)

Sempre que o Usuário utilizar um dos comandos abaixo no chat, a IA DEVE automaticamente transformar o comando em uma solicitação formal do padrão **SDD (Specification-Driven Development)**:

---

## 1. `/feat <descrição>` — Nova Funcionalidade
- **Ação da IA**:
  1. Cria o arquivo de especificação em `.ai/specs/SPEC_XXX_<NOME_DA_FEATURE>.md`.
  2. Gera o artefato `implementation_plan.md` com o plano completo de implementação (`request_feedback: true`).
  3. **Interrompe as ferramentas** e exibe a mensagem de confirmação para o Usuário clicar em **Proceed**.
  4. Após o **Proceed**, executa as alterações, roda os 61 testes (`scripts/validate.cjs`), atualiza o RAG (`scripts/update_state.cjs`) e gera o `walkthrough.md`.
  5. **Fase 5 (Deploy Checkpoint)**: Pergunta se o Usuário quer enviar para produção (`git commit & push`) ou testar localmente antes.

---

## 2. `/fix <descrição>` — Correção / Ajuste Fino
- **Ação da IA**:
  1. Cria a spec de correção em `.ai/specs/SPEC_XXX_<NOME_DO_FIX>.md`.
  2. Gera o artefato `implementation_plan.md` focando na causa raiz e na solução cirúrgica.
  3. **Interrompe as ferramentas** e aguarda o clique em **Proceed**.
  4. Após aprovação, corrige o código, executa os 61 testes automatizados e gera o `walkthrough.md`.
  5. **Fase 5 (Deploy Checkpoint)**: Pergunta se o Usuário prefere testar no navegador ou fazer deploy em produção.

---

## 3. `/refactor <descrição>` — Refatoração & Otimização
- **Ação da IA**:
  1. Cria `.ai/specs/SPEC_XXX_REFACTOR.md` especificando os módulos a serem modularizados (< 350 linhas).
  2. Apresenta o `implementation_plan.md` garantindo **Zero Regressão**.
  3. Aguarda **Proceed** ➔ Executa refatoração ➔ Roda 61 testes ➔ Pergunta sobre Deploy.

---

## 4. `/doc <descrição>` — Atualização de Documentação
- **Ação da IA**:
  1. Atualiza diretamente os arquivos de documentação no diretório `.ai/` ou `docs/`.
  2. Atualiza o índice RAG (`node scripts/update_state.cjs`).
