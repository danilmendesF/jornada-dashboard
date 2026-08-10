# TASK-3 — Suíte de Testes Automatizados e Deploy da Versão

**Arquivo alvo:** `scripts/validate_seqID.cjs`
**Referência SPEC:** Seção 5 (Plano de Validação)
**Depende de:** TASK-1, TASK-2

---

## Contexto
Executar a validação completa da integridade dos dados e da ordem decrescente na tabela, publicando a nova versão em produção.

## O que fazer
1. Executar `node scripts/validate_seqID.cjs` e verificar se 100% dos testes passam.
2. Executar `scripts/bump_version.cjs`, `scripts/build_bundle.cjs` e realizar `git push origin main`.
