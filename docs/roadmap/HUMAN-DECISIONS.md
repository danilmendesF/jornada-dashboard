# Decisoes que Exigem Aprovacao Humana — Jornada TCG Team

**Status:** PENDING_HUMAN_REVIEW  

---

## 1. Decisao 1: Politica de Bloqueio para Sincronizacao Anonima na Nuvem (POST /api/sync)
- **Contexto:** Atualmente, se um jogador usar a plataforma sem fazer login, ele consegue sincronizar os dados na chave generica publica do time. O GAP-P1 propoe exigir login obrigatorio com JWT para salvar na nuvem (`POST /api/sync`), permitindo que usuarios nao logados usem o app exclusivamente offline no navegador.
- **Opcoes:**
  - **Opcao A (Recomendada pela Engenharia):** Exigir login para enviar dados a nuvem. Quem nao estiver logado grava apenas no `localStorage` local.
  - **Opcao B:** Criar uma chave sync-token compartilhada por time via configuracao manual.
- **Impacto no Usuario:** Usuarios nao logados precisarao criar conta/logar para enviar dados ao Redis compartilhado.

---

## 2. Decisao 2: Criacao de Banco Redis Isolado para Staging/Preview
- **Contexto:** Atualmente, tanto deploys de producao (`main`) quanto Preview Deployments da Vercel usam a mesma variavel de ambiente `REDIS_URL` se nao houver isolamento por branch na Vercel.
- **Opcoes:**
  - **Opcao A:** Criar um banco Redis gratuito dedicado para Staging/Preview na Vercel.
  - **Opcao B:** Manter ambiente de preview operando apenas com o proxy local em memoria / `keyvalue.xyz` mock.
