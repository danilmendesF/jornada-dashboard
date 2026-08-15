# Change Plan: GAP-P3 — Centralizacao e Higienizacao de Design Tokens

**Severidade:** P3 — LOW  
**Dominio:** Frontend Styling & Design System  
**Status do Plano:** READY_FOR_REVIEW  

---

## 1. Diagnostico

- `style.css` ja possui os tokens base definidos em `:root` (linhas 10-60).
- Contudo, ao longo das 3.086 linhas de `style.css` e em estilos inline de templates de e-mail em `api/email.js`, existem ocorrencias literais de cores (ex: `#060913`, `#0d1225`, `#7c3aed`, `#00c8f8`).
- **Impacto:** Baixo risco funcional. Trata-se de manutencao de codigo e coerencia visual (DX).

---

## 2. Plano de Higienizacao

1. Mapear todas as cores literais em `style.css` e substituir por `var(--token)`.
2. Em `api/email.js`, criar um objeto constante no topo:
   ```javascript
   const EMAIL_THEME = {
     bgOuter: '#060913',
     bgCard: '#0d1225',
     accentCyan: '#00c8f8',
     accentPurple: '#7c3aed',
     textPrimary: '#dce8ff',
     textSecondary: '#6a85b5',
     gold: '#f5c842'
   };
   ```
3. Validar compilacao do bundle via `node scripts/build_bundle.cjs`.

---

## 3. Criterios de Aceite
- [ ] Nenhuma alteracao visual regressiva para o usuario final.
- [ ] CSS minificado sem crescimento de tamanho de bundle.
