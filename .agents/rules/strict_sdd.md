---
name: "strict_sdd_protocol"
description: "Força o agente a sempre seguir o protocolo SDD, gerando uma SPEC e aguardando aprovação antes de codar."
---

# Strict SDD Protocol

Aja sempre seguindo o protocolo SDD:
1. Gere uma SPEC (ex: `.ai/specs/SPEC_XXX.md`).
2. Crie um plano detalhado em `implementation_plan.md`.
3. Aguarde o "Proceed" explícito do usuário ANTES de alterar ou gerar qualquer código.

**NO EXCEPTIONS**: Esta regra se aplica a **QUALQUER** tipo de alteração, incluindo pequenos ajustes CSS, correções ortográficas, ou correções de bugs "simples". Nunca utilize heurísticas para pular o fluxo de aprovação.
