# ADR 0010: Endurecimento de CSP com Separacao de Script-Src-Elem e Script-Src-Attr

**Status:** ACEITO  
**Data:** 2026-08-15  
**Decisores:** Danilo Mendes / Equipe de Engenharia  

---

## 1. Contexto
A CSP anterior utilizava `script-src 'self' 'unsafe-inline'` devido a scripts inline no `index.html`. Isso enfraquecia a capacidade da CSP de bloquear scripts inline maliciosos injetados via DOM.

## 2. Decisao
1. Extrair os blocos `<script>` inline de `index.html` para o bundle de produção compilado com Terser (`dist/app.min.js`).
2. Configurar a CSP utilizando diretivas modernas do CSP Level 3:
   - `script-src-elem 'self' https://cdn.jsdelivr.net;` (bloqueia qualquer tag `<script>` inline injetada).
   - `script-src-attr 'unsafe-inline';` (permite atributos de evento legítimos como `onclick` do HTML existente).
   - `object-src 'none'; base-uri 'self'; frame-ancestors 'none';`

## 3. Consequencias
- **Positivas:** Elimina a execução de tags `<script>` inline maliciosas enquanto mantém a compatibilidade de todos os botões e formulários do dashboard.
