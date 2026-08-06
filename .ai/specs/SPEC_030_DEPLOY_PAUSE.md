# SPEC_030_DEPLOY_PAUSE: Duplo "Proceed" no Fluxo Multi-Agente

## 1. O Problema
Atualmente, a esteira do SDD (Software Design Document) executada pelo Arquiteto (Gemini Pro) possui apenas um gatilho de aprovação (`Proceed`), que ocorre logo após a confecção do plano de implementação.
Quando o usuário digita "Proceed", a inteligência artificial aciona sequencialmente:
1. O Subagente Executor (escreve o código).
2. O Subagente QA (roda os testes automatizados).
3. E, imediatamente após o passe do QA, já empurra as alterações para o Git (fazendo *bump_version* e *deploy* na Vercel).

Essa automação agressiva impede que o usuário (desenvolvedor sênior) teste a funcionalidade localmente ou valide na própria máquina se o código modificado pelo Executor atende perfeitamente à necessidade antes que vá para o repositório principal de produção.

## 2. A Solução
Adicionar um **Estágio de Pausa Pós-Validação**.
O fluxo SDD agora requer **dois momentos de "Proceed"**:
1. **Proceed 1 (Aprovação de Arquitetura)**: Autoriza o Executor a modificar os arquivos locais.
2. **Proceed 2 (Aprovação de Deploy)**: Após o QA atestar que a compilação passou, o Arquiteto deve **parar** a esteira e perguntar explicitamente ao usuário: *"Os testes automatizados passaram. Deseja testar localmente ou posso fazer o Deploy para Produção?"*. Somente após a confirmação explícita do usuário (o segundo `Proceed`), o Arquiteto fará o commit e o push.

## 3. Implementação
- Atualizar o arquivo `AGENTS.md` (Seção `FLUXO MULTI-AGENTE` e Seção `SDD SLASH COMMANDS & PERSONAS`) refletindo o passo `Wait for Deploy Proceed`.
- Atualizar `.cursorrules` documentando a pausa obrigatória de testes locais.

## 4. Plano de Testes
O próprio QA Agent validará se a regra foi escrita nos manuais de contexto. A partir desta SPEC, o Arquiteto passará a seguir o novo modelo e pausará antes de fazer o push da SPEC_030.
