# ADR 0012: Agregação e Cache Serverless do Meta Diário de Torneios Online (Limitless TCG)

**Status:** ACEITO  
**Data:** 2026-08-18  
**Decisores:** Danilo Mendes / Equipe de Engenharia  
**Contexto:** CHG-004 (Resumo Diário do Meta de Torneios Online)

---

## 1. Contexto
Os jogadores e comissão técnica necessitavam de uma análise diária consolidada do metagame competitivo online de Pokémon TCG para embasar escolhas de decks e preparação de matchups. O Play Limitless publica resultados de torneios públicos, porém o acesso direto do navegador sofreria bloqueios de CORS e restrições de CSP.

## 2. Decisão
1. **Serverless Proxy & Aggregator (`api/tournaments_meta.js`):**
   - Criação de uma Vercel Serverless Function que consulta os endpoints públicos do Play Limitless.
   - Aplicação de filtros rigorosos: formato Standard (`data-format="4"`), corte temporal no dia anterior sob timezone `America/Sao_Paulo` e corte de participantes `players > 150`.
   - Agregação ponderada do Meta Share e identificação dos campeões dos torneios elegíveis.
2. **Estratégia de Cache em Dois Níveis:**
   - **Upstash Redis:** Chave `tournaments-meta:YYYY-MM-DD` com TTL de 48 horas.
   - **HTTP Edge Cache:** Headers `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`.
3. **Preservação Integral da Segurança e CSP:**
   - O browser comunica-se exclusivamente com a API interna (`same-origin`), dispensando alterações na diretiva `connect-src`.
   - Ícones de Pokémon de `https://r2.limitlesstcg.net/` são cobertos pela diretiva existente `img-src https:`.
4. **Resiliência e Fallback:**
   - Em caso de indisponibilidade da fonte externa, o sistema responde com o último cache válido ou retorna um estado degradado gracioso.

## 3. Consequências
- **Positivas:**
  - Zero chamadas externas diretas do navegador;
  - Desempenho instantâneo através do cache distribuído;
  - Visualização de alto valor estratégico para a equipe.
- **Negativas:**
  - Dependência da estrutura pública HTML do Play Limitless, mitigada por testes de contrato e parser com atributos `data-*`.
