# 📝 SPEC_016: DIRETRIZES INVIOLÁVEIS DE DESIGN SYSTEM E PALETA DE CORES SEMÂNTICAS NO PADRÃO SDD

- **Status**: 🟡 EM REVISÃO (Aguardando Aprovação do Usuário)
- **Autor**: Spec-Architect / Design System Director
- **Data**: 2026-08-06
- **Módulos Impactados**: `.ai/WORKFLOW.md`, `AGENTS.md`, `.agents/rules/sdd_commands.md`, `.ai/ARCHITECTURE.md`, `style.css`

---

## 1. Visão Geral & Motivação
Esta especificação institui formalmente no protocolo **SDD (Specification-Driven Development)** a regra obrigatória de que **TODA NOVA FEATURE OU AJUSTE DE INTERFACE DEVE SEGUIR RIGOROSAMENTE O DESIGN SYSTEM E A FILOSOFIA DE CORES SEMÂNTICAS DO JORNADA DASHBOARD**.

Nenhuma funcionalidade poderá ser criada com cores genéricas (azul padrão, vermelho puro, cinza desalinhado) ou estilos desconectados da estética **Cyber Space Dark**.

---

## 2. Diretrizes Invioláveis de Design System & Cores Semânticas

### 🎨 A. Tokens CSS & Estética Cyber Space Dark
- **Fundo & Superfícies**: `var(--bg)` (`#080c18`), `var(--bg2)` (`#0d1225`), `var(--glass-bg)` (`rgba(13, 18, 37, 0.75)`).
- **Vidro Fosco & Bordas**: `backdrop-filter: blur(12px)` e `1px solid var(--glass-bd)` (`rgba(124, 106, 247, 0.2)`).
- **Tipografia**: `Rajdhani` (Títulos, KPIs, Placares) e `Outfit` (Textos de corpo, tabelas, inputs).
- **Bordas & Raios**: `var(--radius)` (12px) para cartões/modais e `var(--radius-sm)` (6px) para botões/inputs.

### 🌈 B. Filosofia Semântica das Cores (Significado Obrigatório)

| Cor / Token | Código Hex | Significado Semântico Obrigatório no App |
| :--- | :---: | :--- |
| 🟢 **Green** (`var(--green)`) | `#2ee8a0` | **Vitória**, Desempenho Alto (>55% WR), Confiabilidade Alta, Deck Válido (60 cartas), Status OK. |
| 🔴 **Red** (`var(--red)`) | `#f75050` | **Derrota**, Ações Destrutivas (Deletar/Excluir), Confiabilidade Baixa, Lista Inválida/Sobrecarregada, Erros. |
| 🟡 **Yellow** (`var(--yellow)`) | `#f5c842` | **Empate**, Desempenho Neutro (45-55% WR), Confiabilidade Média, Avisos / Em Progresso. |
| 🟣 **Electric Purple** (`var(--accent)`) | `#7c6af7` | **Identidade do Time**, Ações Primárias, Destaque de Integrante, Arquétipos Principais. |
| 🔵 **Neon Cyan** (`var(--accent2)`) | `#00c8f8` | **Destaques Interativos**, Filtros Ativos, Badges de Status, Efeitos de Glow e Foco em Inputs. |

---

## 3. Protocolo de Verificação no SDD (Fase 2 & Fase 4)
- **Fase 2 (`implementation_plan.md`)**: A IA deve explicitar no plano como a nova feature usará as cores semânticas e os tokens CSS do Design System.
- **Fase 4 (Execução)**: É proibido o uso de cores inline ad-hoc (ex: `color: blue` ou `background: red`). Todo estilo deve reutilizar os tokens CSS semânticos de `style.css`.

---

## 4. Critérios de Aceite
- [ ] Inclusão das diretrizes no `.ai/WORKFLOW.md`, `AGENTS.md` e `.agents/rules/sdd_commands.md`.
- [ ] Suíte automatizada `node scripts/validate.cjs` e `node scripts/validate_auth.cjs` aprovada em 100% dos 61 testes.
