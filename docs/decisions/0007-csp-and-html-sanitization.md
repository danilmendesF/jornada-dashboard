# ADR 0007: Content Security Policy (CSP) e Sanitizacao Universal de DOM

**Status:** ACEITO  
**Data:** 2026-08-15  
**Decisores:** Danilo Mendes / Equipe de Engenharia  

---

## 1. Contexto
A aplicacao renderiza partidas, estatisticas e badges dinamicamente via `.innerHTML`. A presenca de dados de usuarios sem escape gerava risco de DOM/Stored XSS.

## 2. Decisao
1. Implementar a funcao `escapeHtml()` no frontend e aplica-la em todas as interpolacoes de strings controladas por usuarios.
2. Configurar cabecalhos HTTP de seguranca no `vercel.json`, incluindo CSP restritiva adaptada aos assets utilizados (Google Fonts, FontAwesome, Chart.js).

## 3. Consequencias
- **Positivas:** Neutralizacao de vetores XSS e blindagem contra clickjacking e sniffing de MIME type.
- **Trade-offs:** Necessidade de manter a CSP alinhada caso novos provedores de CDN sejam adicionados.
