# AI Project Context — Jornada TCG Team

**Status:** VERIFIED  
**Ambiente de Execucao:** Single Page Application (Vanilla JS) + Vercel Serverless Functions + Redis KV.

---

## 1. Visao Geral
O **Jornada TCG Team Dashboard** e a plataforma oficial de inteligencia competitiva e registro de partidas da equipe Jornada TCG. A plataforma opera em arquitetura **Offline-First**, garantindo que jogadores possam registrar partidas e consultar dados mesmo em locais com sinal instavel durante grandes torneios.

---

## 2. Premissas de Arquitetura
1. **Zero Framework Bloat:** O frontend nao utiliza frameworks pesados no cliente; utiliza JavaScript nativo altamente otimizado e modularizado em `js/`.
2. **Bundle Unico em Producao:** Em desenvolvimento os scripts rodam modularizados; para deploy, `scripts/build_bundle.cjs` gera `dist/app.min.js` e `dist/style.min.css`.
3. **Persistencia Hibrida:** Gravacao instantanea em `localStorage` com sincronizacao continua e assincrona para Redis via `/api/sync`.
