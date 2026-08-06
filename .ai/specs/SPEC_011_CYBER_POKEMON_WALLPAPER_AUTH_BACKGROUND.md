# 📝 SPEC_011: WALLPAPER DE ARTWORK POKÉMON E DESIGN GLASSMORPHISM NA TELA DE LOGIN

- **Status**: 🟡 EM REVISÃO (Aguardando Aprovação do Usuário)
- **Autor**: Spec-Architect
- **Data**: 2026-08-05
- **Módulos Impactados**: `style.css`, `index.html`, `assets/auth_background.jpg`

---

## 1. Visão Geral & Motivação
Esta especificação define a integração da arte clássica/celestial de Pokémon (Kyogre, Lugia, Solrock e Lunatone) como plano de fundo oficial da tela de Login e Cadastro (`.auth-wall-container`). O estilo integrará o background com o esquema de cores **Cyber Space Dark** do time (`#080c18`, roxo elétrico `#7c6af7`, ciano neon `#00c8f8`), aplicando máscaras radiais, blend-modes de alta iluminação e cartões glassmorphism de alta legibilidade.

---

## 2. Requisitos Funcionais & Design (RF)

### RF-01: Cópia e Otimização do Asset (`assets/auth_background.jpg`)
- Copiar a imagem fornecida para a pasta de assets da aplicação (`assets/auth_background.jpg`).
- Garantir carregamento otimizado com suporte a telas de alta resolução e retina.

### RF-02: Estilização do Background na Tela de Login (`style.css`)
- Aplicar a imagem no container `.auth-wall-container` com `background-size: cover`, `background-position: center`.
- Adicionar uma camada de gradiente Cyber Space Dark sobreposta (`linear-gradient` e `radial-gradient` com as cores do time) e `background-blend-mode: overlay, luminosity, screen` para que as linhas e detalhes da ilustração brilhem nas tonalidades ciano e roxo elétrico.

### RF-03: Cartão Glassmorphism de Alta Legibilidade (`.auth-wall-card`)
- Atualizar `.auth-wall-card` com efeito glassmorphism avançado (`backdrop-filter: blur(16px)`), borda dupla com brilho neon (`1px solid rgba(124, 106, 247, 0.4)`), sombra bioluminescente (`box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8)`) e botões com gradiente neon.

---

## 3. Critérios de Aceite & Validação
- [ ] Arte dos Pokémons visível de fundo com iluminação harmônica no tema Cyber Space.
- [ ] Formulário de login/cadastro 100% legível com contraste perfeito e efeito vidro fosco.
- [ ] Suíte automatizada `node scripts/validate.cjs` e `node scripts/validate_auth.cjs` aprovada em 100% dos 61 testes.
