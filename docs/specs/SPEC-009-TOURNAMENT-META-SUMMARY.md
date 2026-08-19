---
id: SPEC-009
title: Resumo Diario do Meta de Torneios Online (Limitless TCG)
version: 1.0.0
status: VERIFIED
category: Functional
lastUpdated: 2026-08-18
tested_by: tests/tournaments_meta.test.js
---

# SPEC-009: Resumo Diário do Meta de Torneios Online

## 1. Objetivo
Fornecer aos jogadores e comissão técnica do Jornada TCG Team uma visão analítica e consolidada do metagame competitivo de Pokémon TCG Online referente ao dia anterior, utilizando dados públicos da plataforma Play Limitless.

## 2. Requisitos Funcionais
1. **Janela Temporal:** Análise automática dos torneios concluídos no dia anterior com base no timezone 'America/Sao_Paulo' (UTC-3).
2. **Elegibilidade:** Somente considerar torneios com mais de 150 participantes (players > 150) e formato oficial Standard (data-format="4").
3. **Cálculo do Meta Share:** Cálculo ponderado do número absoluto de jogadores por arquétipo em relação ao total somado de jogadores em todos os torneios elegíveis.
4. **Top Decks & Other Decks:** Exibição detalhada dos Top 6 arquétipos e agrupamento dos demais sob 'Other Decks'.
5. **Campeões:** Identificação do vencedor de cada torneio elegível, com deck utilizado, ícones de Pokémon e links para o torneio original e decklist oficial.
6. **Resiliência e Fallback:** Caso a fonte externa esteja indisponível, o sistema deve exibir dados em cache Redis ou estado informativo amigável sem lançar erros não tratados.

## 3. Requisitos de Segurança & Performance
1. Manter a Content Security Policy (CSP) intacta com conexão restrita a 'self' e imagens https permitidas.
2. Cacheamento em duas camadas: Upstash Redis (chave tournaments-meta:YYYY-MM-DD com TTL de 48h) e HTTP Cache-Control.
3. Sanitização de todo conteúdo externo via escapeHtml prevenindo XSS.
