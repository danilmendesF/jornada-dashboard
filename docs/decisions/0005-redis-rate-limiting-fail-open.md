# ADR 0005: Rate Limiting Distribuido no Redis com Fail-Open

**Status:** ACEITO  
**Data:** 2026-08-15  
**Decisores:** Danilo Mendes / Equipe de Engenharia  

---

## 1. Contexto
A rota `/api/auth` processa operacoes de login e cadastro. Sem protecao de taxa, atores maliciosos poderiam realizar ataques automatizados de forca bruta. Por ser uma aplicacao serverless distribuida na Vercel, rate limiting em memoria local de instancia e ineficaz.

## 2. Decisao
Implementar rate limiting baseado em contador no Redis (`ratelimit_auth_${ip}_${action}`) com janela de 15 minutos (900s) e limite maximo de 10 tentativas.
- Em caso de indisponibilidade ou timeout do Redis, adotar a politica **Fail-Open**: o request e autorizado e um log de aviso estruturado e emitido. Isso garante que instabilidades no Redis nao impecam jogadores de participarem de torneios presenciais.

## 3. Consequencias
- **Positivas:** Bloqueio robusto contra forca bruta distribuida com emissao de status `429 Too Many Requests` e cabecalho `Retry-After`.
- **Trade-offs:** Durante falhas temporarias do Redis, a aplicacao prioriza disponibilidade sobre bloqueio estrito.
