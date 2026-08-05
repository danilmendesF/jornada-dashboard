# 📝 SPEC_006: PROTOCOLO SDD DE DEPLOY E SINCRONIZAÇÃO GITHUB (GITFLOW & VERCEL)

- **Status**: 🟡 EM REVISÃO (Aguardando Aprovação do Usuário)
- **Autor**: Spec-Architect
- **Data**: 2026-08-05
- **Diretório Origem (Desenvolvimento Antigravity)**: `C:\Users\danil\.gemini\antigravity\scratch\jornada-dashboard`
- **Diretório Destino (Repositório GitHub)**: `C:\Users\danil\OneDrive\Documentos\jornada-dashboard`

---

## 1. Visão Geral & Objetivos
Esta especificação estabelece o procedimento automatizado para **sincronizar o código-fonte desenvolvido, a suíte de validação e a base RAG** com o repositório oficial do GitHub, realizando o commit padronizado via GitFlow (Conventional Commits) para disparo do deploy automático na Vercel.

---

## 2. Requisitos do Pipeline de Deploy

### RF-01: Pré-flight QA Obrigatório
- O deploy só pode ser executado após aprovação de **100% dos 61 testes automatizados** via:
  ```bash
  node scripts/validate.cjs
  node scripts/validate_auth.cjs
  node scripts/update_state.cjs
  ```

### RF-02: Sincronização e Espelhamento Sem Perda de Dados
- Copiar e espelhar com precisão todos os módulos e documentações RAG da pasta de desenvolvimento para a pasta do repositório Git (`OneDrive\Documentos\jornada-dashboard`), incluindo:
  - `.ai/` (Estrutura SDD, RAG Index, Specs, Prompts e Workflows)
  - `api/` (`auth.js`, `sync.js`, `email.js` - Serverless Node.js)
  - `js/` (12 módulos desacoplados)
  - `scripts/` (Suíte de validação automatizada e atualizador de estado)
  - `docs/` (Dicionário de dados e guia de deploy)
  - `index.html`, `style.css`, `app.js`, `manager.js`, `package.json`

### RF-03: Commit Padronizado (Conventional Commits / GitFlow)
- Estrutura de mensagens semânticas e claras:
  - `feat(auth): adiciona backend serverless Node.js, login wall fullscreen e envio de e-mails`
  - `feat(rbac): implementa trava de perfil unico 1-para-1 e permissoes de edicao por jogador`
  - `docs(sdd): atualiza base RAG, specs e guia de homologacao para producao`

---

## 3. Critérios de Aceite & Validação
- [ ] 61/61 testes automatizados aprovados no Pré-flight.
- [ ] Sincronização de 100% dos arquivos realizada sem erros.
- [ ] Commits realizados com mensagens semânticas.
- [ ] `git push origin main` enviado com sucesso para a Vercel.
