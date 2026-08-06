# 📋 SPEC_022: REFATORAÇÃO DO SISTEMA SDD/RAG

- **Status**: 🟢 IMPLEMENTADO
- **Autor**: Spec-Architect
- **Data**: 2026-08-06
- **Módulos Impactados**: `scripts/update_state.cjs`, `.ai/PROJECT_INDEX.md`, `.ai/ARCHITECTURE.md`, `.ai/specs/TEMPLATE_SPEC.md`, `.agents/rules/agent_personas.md`, `.ai/DECISION_LOG.md`

---

## 1. Visão Geral & Motivação
Auditoria e refatoração completa dos arquivos de contexto de IA para corrigir 7 problemas críticos identificados que causavam perda de contexto, duplicação de tokens, causa raiz oculta de bugs e falta de identidade de agente por tipo de comando.

## 2. Problemas Resolvidos
- P1: Timestamps duplicados no PROJECT_INDEX.md (30+ linhas)
- P2: Funções críticas de manager.js e app.js invisíveis ao RAG
- P3: Sem persona especializada por tipo de slash command
- P4: TEMPLATE_SPEC.md genérico demais
- P5: ARCHITECTURE.md sem mapa de dependências
- P6: Specs antigas com status desatualizado
- P7: Sem DECISION_LOG de decisões arquiteturais
