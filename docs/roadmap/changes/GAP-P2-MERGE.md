# Change Plan: GAP-P2 — Merge Deterministico para Multiplos Pushes Offline

**Severidade:** P2 — MEDIUM  
**Dominio:** Integridade de Dados & Sincronizacao Hibrida  
**Status do Plano:** READY_FOR_REVIEW  

---

## 1. O Problema Atual (Last-Write-Wins Total)

Hoje, a sincronizacao opera substituindo o array completo no Redis e no `localStorage`:
```
Dispositivo A (Offline): Registra Partida #417 (Danilo vs Gui)
Dispositivo B (Offline): Registra Partida #417 (Victor vs Matheus)

Dispositivo A conecta: Envia [..., #417-Danilo] -> Redis fica com Danilo.
Dispositivo B conecta: Envia [..., #417-Victor] -> Redis SOBRESCREVE e apaga a partida do Danilo!
```

---

## 2. Formalizacao Matematica do Merge Deterministico

### A. Identidade do Registro
Cada partida possui uma chave de identidade primaria canonica:
`matchId = match.id` (String alfanumerica unica gerada via `Date.now() + Math.random()`).

### B. Regra de Ordenacao e Desempate (Ordering Invariant)
O timestamp de ordenacao T(m) e calculado pelo parser de 3 camadas `getMatchTimestamp(m)`.
Em caso de empate identico no timestamp T(m), o desempate e resolvido por `localeCompare(m1.id, m2.id)`.

### C. Regra de Fusao Deterministica (Union + Deduplication + Re-Sequence)
Para dois conjuntos de partidas A (Local) e B (Nuvem):
1. **Uniao por ID:** Se id pertence a A e id pertence a B, mantem a versao com maior `updatedAt` (ou B caso empatado).
2. **Insercao:** Se id pertence a A e nao pertence a B, insere no conjunto. Se id pertence a B e nao pertence a A (e nao consta em `deletedIds`), insere no conjunto.
3. **Re-sequenciamento Incondicional:** Ordena todo o conjunto unificado pelo timestamp T(m) e re-indexa `seqID = 1..N`.

---

## 3. Exemplo Concreto de Comutatividade

Conjunto A = [m1, m2, m3], Conjunto B = [m1, m2, m4]

- **Ordem A -> B:**
  - Merge(A, B) = {m1, m2, m3, m4} ordenados por data -> `seqID`: 1, 2, 3, 4.
- **Ordem B -> A:**
  - Merge(B, A) = {m1, m2, m4, m3} ordenados por data -> `seqID`: 1, 2, 3, 4.

**Resultado:** Merge(A, B) e equivalente a Merge(B, A) (Deterministico e Comutativo). Zero perda de dados!

---

## 4. Plano de Implementacao

1. **Modulo de Fusao (`js/sync_cloud.js` & `api/sync.js`):**
   - Criar funcao pura `deterministicMergeMatches(localMatches, remoteMatches, deletedIds)`:
     ```javascript
     function deterministicMergeMatches(listA, listB, deletedIdsSet = new Set()) {
       const map = new Map();
       [...(listA || []), ...(listB || [])].forEach(m => {
         if (!m || !m.id || deletedIdsSet.has(m.id)) return;
         if (!map.has(m.id)) {
           map.set(m.id, m);
         } else {
           const existing = map.get(m.id);
           const tsA = Date.parse(m.updatedAt || m.createdAt) || 0;
           const tsB = Date.parse(existing.updatedAt || existing.createdAt) || 0;
           if (tsA > tsB) map.set(m.id, m);
         }
       });
       const merged = Array.from(map.values());
       return ensureMatchSequence(merged);
     }
     ```
2. **Atualizacao em `pullFromCloud`:**
   - Em vez de `saveManual(data.manualMatches)`, executar:
     `const merged = deterministicMergeMatches(loadManual(), data.manualMatches, loadDeleted());`
     `saveManual(merged);`
3. **Testes Unitarios (`tests/merge.test.js`):**
   - Validar comutatividade, insercao de partidas criadas em paralelo e respeito a delecoes.

---

## 5. Criterios de Aceite
- [ ] Partidas criadas em dispositivos distintos offline sao preservadas sem que uma sobrescreva a outra.
- [ ] Sequenciamento `seqID` e recalculado sem lacunas ou duplicidades.
- [ ] Partidas deletadas propositalmente (`deletedIds`) nao reaparecem apos merge.
