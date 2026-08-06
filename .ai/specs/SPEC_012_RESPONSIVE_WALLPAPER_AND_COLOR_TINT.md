# 📝 SPEC_012: AJUSTE RESPONSIVO DO WALLPAPER POKÉMON E TONALIZAÇÃO CYBER SPACE

- **Status**: 🟡 EM REVISÃO (Aguardando Aprovação do Usuário)
- **Autor**: Spec-Architect
- **Data**: 2026-08-05
- **Módulos Impactados**: `style.css`

---

## 1. Visão Geral & Motivação
Esta especificação atende ao feedback visual do usuário:
1. **Enquadramento Responsivo Mobile & Desktop**: Impedir que a ilustração fique cortada no celular ou excessivamente ampliada no desktop, garantindo que os Pokémons (Kyogre, Lugia, Solrock, Lunatone) apareçam em enquadramento completo e harmonioso em telas desktop e mobile.
2. **Tonalização de Cores do Time (Cyber Space Dark)**: Converter o tom vintage de papel em um azul marinho profundo cibernético com traços de néon ciano (`#00c8f8`) e roxo elétrico (`#7c6af7`), mantendo a identidade visual do time.

---

## 2. Requisitos Funcionais & Design (RF)

### RF-01: Ajuste Responsivo em Mobile (`@media (max-width: 768px)`)
- Em telas de celular, aplicar `background-size: contain` ou `background-size: auto 100%` centralizado (`background-position: center top`).
- Reduzir o padding do container para 0.75rem e ajustar o tamanho do cartão `.auth-wall-card` para não ocultar a arte do fundo.

### RF-02: Enquadramento e Proporção em Desktop (`@media (min-width: 769px)`)
- Ajustar `background-size: 100% auto` com travas de limite `max-height: 100vh` e posicionamento `center center` para exibir toda a moldura da arte com Kyogre e Lugia visíveis nas laterais.

### RF-03: Tonalização de Cores do Time (`style.css`)
- Aplicar filtros CSS de infusão de cor cibernética (`filter: hue-rotate(185deg) invert(0.9) contrast(1.2)` ou gradiente radial de fusão luminosa `mix-blend-mode: color-dodge, multiply`).
- As linhas pretas da arte viram neon cibernético e o fundo assume o azul espacial `#080c18` do Jornada TCG Team.

---

## 3. Critérios de Aceite & Validação
- [ ] Ilustração completa visível em celulares sem cortes brutais dos Pokémons.
- [ ] Cores perfeitamente integradas com o tema Cyber Space Dark do time.
- [ ] Suíte automatizada `node scripts/validate.cjs` e `node scripts/validate_auth.cjs` aprovada em 100% dos 61 testes.
