# 👥 ROSTER DE SUBAGENTES ESPECIALIZADOS — Jornada Dashboard

Este catálogo define os papéis de subagentes que a IA principal deve delegar ao realizar tarefas complexas no projeto.

---

## 🎭 PAPÉIS DE AGENTES RECOMENDADOS

### 1. `Spec-Architect` (Arquiteto de Especificações)
- **Função**: Escrever e manter specs SDD em `.ai/specs/` e planos em `implementation_plan.md`.
- **Ferramentas**: `view_file`, `write_to_file`.
- **Quando invocar**: Antes de iniciar qualquer grande refatoração ou funcionalidade nova.

### 2. `Code-Auditor` (Auditor de Código & Segurança)
- **Função**: Varrer bugs de runtime, concorrência multi-sessão, estouro de z-index e vazamentos de escopo.
- **Ferramentas**: Read-only tools (`grep_search`, `view_file`, `list_dir`).
- **Quando invocar**: Ao investigar falhas relatadas pelo usuário ou realizar auditorias 360°.

### 3. `UI-UX-Specialist` (Especialista em Interface & Mobile)
- **Função**: Auditar responsividade em viewports de 320px a 480px, verificar touch targets (≥40px), hovers e animações.
- **Ferramentas**: `view_file`, `replace_file_content`.
- **Quando invocar**: Para ajustes visuais no `style.css` ou `index.html`.

### 4. `Quality-Validator` (Engenheiro de Validação & QA)
- **Função**: Executar e atualizar os scripts de teste automatizado `scripts/validate.js` e `scripts/update_state.js`.
- **Ferramentas**: `run_command`, `write_to_file`.
- **Quando invocar**: Após a conclusão das alterações de código para garantir zero regressão antes do deploy.

---

## 🛠️ MATRIZ DE DELEGAÇÃO

| Tipo de Solicitacão | Subagente Recomendado | Modelo Recomendado |
|---|---|---|
| Mapeamento de codebase ou leitura ampla | `research` / `Code-Auditor` | `flash` |
| Criação de Spec SDD ou plano complexo | `Spec-Architect` | `pro` / `inherit` |
| Testes automatizados e syntax check | `Quality-Validator` | `flash` |
| Edição de CSS/UI Mobile | `UI-UX-Specialist` | `flash` / `inherit` |
