# 📝 SPEC_013: WALLPAPER FULLSCREEN COVER IMERSIVO NA TELA DE LOGIN

- **Status**: 🟡 EM REVISÃO (Aguardando Aprovação do Usuário)
- **Autor**: Spec-Architect
- **Data**: 2026-08-05
- **Módulos Impactados**: `style.css`

---

## 1. Visão Geral & Motivação
Esta especificação atende à preferência direta do usuário: remover o modo de enquadramento com bordas laterais (`background-size: contain`) e retornar ao modo **Fullscreen Cover Imersivo (`background-size: cover`)**, garantindo que a artwork Pokémon cubra 100% da tela sem nenhuma borda preta nas laterais.

---

## 2. Requisitos Funcionais & Design (RF)

### RF-01: Preenchimento Total da Tela (`background-size: cover`)
- Em `.auth-wall-container` (`style.css`), definir:
  - `background-size: cover;`
  - `background-position: center center;`
  - `background-repeat: no-repeat;`
- Remover qualquer margem ou borda preta lateral, fazendo com que a ilustração cubra a totalidade da tela em qualquer resolução (desktop e mobile).

### RF-02: Manutenção do Efeito Cyber Space Dark & Glassmorphism
- Preservar o blend-mode espacial (`radial-gradient` e `linear-gradient` com as cores do time: `#080c18`, `#7c6af7`, `#00c8f8`).
- Preservar a transparência e o efeito de vidro fosco (`backdrop-filter: blur(20px)`) do cartão de formulário `.auth-wall-card` para contraste ideal.

---

## 3. Critérios de Aceite & Validação
- [ ] O plano de fundo cobre 100% da tela (Full Cover) sem bordas pretas nas laterais.
- [ ] Suíte automatizada `node scripts/validate.cjs` e `node scripts/validate_auth.cjs` aprovada em 100% dos 61 testes.
