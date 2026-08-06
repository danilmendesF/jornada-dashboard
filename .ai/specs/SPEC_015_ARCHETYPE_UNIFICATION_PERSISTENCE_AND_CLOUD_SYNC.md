# 📝 SPEC_015: PERSISTÊNCIA DE UNIFICAÇÃO DE ARQUÉTIPOS E SINCRONIZAÇÃO EM NUVEM

- **Status**: 🟡 EM REVISÃO (Aguardando Aprovação do Usuário)
- **Autor**: Spec-Architect
- **Data**: 2026-08-06
- **Módulos Impactados**: `js/storage.js`, `js/sync_cloud.js`, `manager.js`, `app.js`

---

## 1. Visão Geral & Motivação
Esta especificação atende ao bug relatado pelo usuário: quando um usuário realiza a unificação de arquétipos em um dispositivo (Dispositivo A), se outro dispositivo (Dispositivo B) ou outra sessão aberta sincronizar com a nuvem, o deck antigo unificado acaba retornando e desfazendo a unificação.

### Causa Raiz TÉCNICA:
1. O objeto `edits` (`loadEdits()`) e histórico de edições do Dispositivo B mantinham referências antigas e não eram atualizados pelo `pullFromCloud()`, pois `js/sync_cloud.js` só sincronizava `manualMatches`, `decks` e `players`.
2. Não havia um registro persistente de regras de unificação (`archetypeUnifications`). Assim, quando o Dispositivo B enviava partidas com o nome antigo ou aplicava `edits` locais antigos, a unificação era sobrescrita.

---

## 2. Requisitos Funcionais & Arquitetura (RF)

### RF-01: Registro Persistente de Regras de Unificação (`js/storage.js`)
- Criar helper `loadArchetypeUnifications()` e `saveArchetypeUnifications(rules)` na chave `jornada_archetype_unifications`.
- Cada regra armazena: `{ fromDeck: string, targetArchetype: string, timestamp: number }`.

### RF-02: Registro de Regras na Unificação (`manager.js`)
- Ao executar `submitUnifyArchetypes(fromDeck, targetArchetype)`:
  - Atualizar `manualMatches`, `edits`, `decks` e `allData`.
  - Salvar uma nova regra em `archetypeUnifications`.
  - Disparar `pushToCloud()` imediatamente.

### RF-03: Aplicação Automática e Retroativa (`app.js` - `applyDataOverrides`)
- Em `applyDataOverrides()`, aplicar automaticamente todas as regras de `archetypeUnifications` cadastradas em qualquer dataset retornado ou carregado do `localStorage`.
- Garantir que mesmo se uma partida com o nome antigo for importada de outra sessão/dispositivo, a unificação é aplicada instantaneamente.

### RF-04: Sincronização em Nuvem Completa (`js/sync_cloud.js`)
- Em `pushToCloud()`: Incluir no payload em nuvem os objetos `edits`, `deletedIds`, `deletedDecks` e `archetypeUnifications`.
- Em `pullFromCloud()`: Salvar no `localStorage` do dispositivo atual os objetos `edits`, `deletedIds` e `archetypeUnifications` baixados da nuvem.

---

## 3. Critérios de Aceite & Validação
- [ ] Ao unificar arquétipos no Dispositivo A, a regra é sincronizada e aplicada no Dispositivo B sem reverter o deck antigo.
- [ ] Partidas editadas em `edits` também recebem a unificação automaticamente.
- [ ] Suíte automatizada `node scripts/validate.cjs` e `node scripts/validate_auth.cjs` aprovada em 100% dos 61 testes.
