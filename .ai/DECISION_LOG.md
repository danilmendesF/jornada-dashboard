# 📒 DECISION LOG — Jornada Dashboard

Registro cronológico de decisões arquiteturais relevantes. Consulte este arquivo **ANTES de propor mudanças estruturais** para evitar reverter decisões deliberadas.

---

## DEC-001 — IIFE Bundle para Encapsulamento de Produção
- **Data**: 2026-08-05
- **Commit**: `5fb06fe`
- **Decisão**: Todo o código JS de produção é bundlado em um único arquivo `dist/app.min.js` dentro de um IIFE `(function(){ "use strict"; ... })()`.
- **Motivação**: Impede que classes, funções e variáveis locais sejam visíveis no DevTools do navegador. Protege a estrutura modular do código-fonte contra engenharia reversa simples.
- **Consequência Importante**: Declarações `function foo()` são **hoisted** ao topo do escopo IIFE. Se dois arquivos declararem `function populateQuickLogDropdowns()`, o arquivo listado **último** no array `jsOrder` de `build_bundle.cjs` vence. Sempre verificar duplicatas antes de criar uma função.
- **Regra**: Nunca trocar de IIFE para módulos ES6 sem criar uma SPEC aprovada e testar em staging.

---

## DEC-002 — Arquitetura Modular: js/ < 350 linhas
- **Data**: 2026-07-22
- **Decisão**: Cada arquivo em `js/` deve ter no máximo 350 linhas. `manager.js` e `app.js` são monolitos legados mantidos por compatibilidade e não estão sujeitos a este limite, mas também não devem crescer.
- **Motivação**: Permite que a IA leia um módulo inteiro sem ultrapassar janela de contexto, reduzindo custo de tokens e erros de raciocínio parcial.
- **Regra**: Se um módulo em `js/` ultrapassar 350 linhas, ele DEVE ser dividido. Novos módulos de `manager.js` devem ser extraídos para `js/`.

---

## DEC-003 — Partidas Espelho (Mirror Matches) são Automáticas e em Cascata
- **Data**: 2026-07-22
- **Commit**: inicial
- **Decisão**: Quando um `Adversario` é um jogador do time (`players.includes(Adversario)`), uma partida espelho é criada automaticamente com resultado invertido. A exclusão de uma partida apaga a espelho em cascata.
- **Motivação**: Evitar que os jogadores registrem o mesmo duelo duas vezes e garantir consistência estatística nos rankings.
- **Regra**: Nunca alterar `buildMirrorMatch()` sem também atualizar os critérios de inversão de `Resultado`, `Pontos`, `Placar`, `Start` e `GamesDetail`.

---

## DEC-004 — Autenticação JWT + Redis KV (Sem SQL)
- **Data**: 2026-07-24
- **Commit**: `SPEC_002`
- **Decisão**: O sistema de autenticação usa JWT assinados com PBKDF2 + Redis KV (Upstash) como backend. Sem banco de dados relacional.
- **Motivação**: Compatibilidade com deploy Serverless na Vercel (sem persistência de estado entre funções). Redis KV é ideal para armazenamento chave-valor de tokens e perfis.
- **Imunidade SQL**: O sistema é 100% imune a SQL Injection porque não usa SQL.
- **Regra**: Nunca adicionar dependência de banco relacional sem criar uma SPEC de migração completa.

---

## DEC-005 — #quickLogPlayer Travado ao Jogador Autenticado
- **Data**: 2026-08-06
- **Commit**: `4f46436`
- **Decisão**: O dropdown `#quickLogPlayer` exibe **exclusivamente** o nome do jogador logado. Nenhuma opção de outros integrantes é exibida.
- **Motivação**: Impede registro acidental de partidas em nome de outro jogador. O quick log é uma ferramenta pessoal e imediata.
- **Implementação**: A função canônica é `populateQuickLogDropdowns()` em `manager.js` (usa `getActivePlayerName()` de `js/config.js`). A versão em `js/quicklog.js` é um stub que delega para a versão de `manager.js`.
- **Regra**: NUNCA restaurar o comportamento de lista completa em `#quickLogPlayer`. Qualquer mudança neste dropdown requer uma SPEC aprovada.

---

## DEC-006 — Dados de Partidas em localStorage + Sincronização Redis KV
- **Data**: 2026-07-22
- **Decisão**: Partidas manuais são persistidas em `localStorage` (offline-first) e sincronizadas para Redis KV via `js/sync_cloud.js`.
- **Motivação**: Funciona sem conexão. A sincronização é eventual (debounce de 2s após qualquer mudança).
- **Payload de Sync**: `{ edits, deletedIds, archetypeUnifications, decks, players, locais, colecoes, adminPin }`.
- **Regra**: Qualquer novo dado que precise ser compartilhado entre dispositivos DEVE ser adicionado ao payload de sync em `pushToCloud()` e `pullFromCloud()`.

---

## DEC-007 — Design System Cyber Space Dark (Paleta Semântica Inviolável)
- **Data**: 2026-08-04
- **Commit**: `SPEC_016`
- **Decisão**: Paleta de cores semântica e inviolável:
  - 🟢 `#2ee8a0` = Vitória, Status OK
  - 🔴 `#f75050` = Derrota, Ações Destrutivas
  - 🟡 `#f5c842` = Empate, Alerta
  - 🟣 `#7c6af7` = Time, Ações Primárias
  - 🔵 `#00c8f8` = Destaques Interativos, Badges
- **Regra**: NUNCA usar cores fora desta paleta para elementos com significado semântico. Tokens CSS estão em `:root` em `style.css`.
