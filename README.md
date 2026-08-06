# ⚡ Jornada TCG Team — Regional Analytics Dashboard

![License](https://img.shields.io/badge/License-MIT-purple.svg)
![Build Status](https://img.shields.io/badge/Build-Passing-2ee8a0.svg)
![Security](https://img.shields.io/badge/Security-HMAC--SHA256--JWT-00c8f8.svg)
![Architecture](https://img.shields.io/badge/Architecture-SDD%20v2.0-7c6af7.svg)

> **Jornada TCG Team Dashboard** é uma plataforma de alta performance desenvolvida para análise avançada de winrate, matchups estatísticos, gerenciamento de listas PTCGL e sincronização em nuvem multi-dispositivo para o time **Jornada TCG**.

---

## 🚀 Principais Funcionalidades

- 📊 **Análise Estatística Avançada**: Métricas em tempo real de Winrate geral, desempenho por deck, partidas espelho (*Mirror Matches*) e cálculo de zika/brick por partidas e games.
- ⚔️ **Matriz Dinâmica de Matchups**: Tabela comparativa interativa com gradiente de calor (High / Mid / Low Reliability) e estatísticas detalhadas contra o meta regional.
- ⚡ **Log Rápido (Quick Log)**: Interface otimizada de 1 clique para registro instantâneo de partidas em dispositivos mobile e desktop.
- 🔐 **Autenticação Segura & Permissões RBAC**: Sistema de login e cadastro com tokens **JWT (HMAC-SHA256)**, criptografia PBKDF2 e restrição estrita de edição/deleção de partidas por propriedade do jogador.
- ☁️ **Sincronização em Nuvem Multi-Dispositivo**: Motor de sincronização em tempo real alimentado por Vercel Serverless Functions e Redis KV, com histórico de unificação de arquétipos.
- 📦 **Bundle de Produção Minificado & IIFE**: Código compilado, sem exposição de comentários de desenvolvimento e com encapsulamento de escopo no navegador.

---

## 🛠️ Stack Tecnológica

- **Frontend Core**: HTML5 Semântico, Vanilla JavaScript (ES6+), CSS3 Vanilla com Design System **Cyber Space Dark**.
- **Visualização de Dados**: Chart.js v4.4.0.
- **Backend / API**: Serverless Functions (Node.js no Vercel).
- **Banco de Dados Cloud**: Redis KV (Key-Value Store).
- **Segurança**: JWT Auth, Hash PBKDF2 SHA-256, Sanitização XSS, Script Anti-Flicker.

---

## 📂 Estrutura do Repositório

```
jornada-dashboard/
├── .agents/                 # Regras e comandos do assistente agentic
├── .ai/                     # Especificações arquiteturais (Specs) e fluxo SDD
│   └── specs/               # Especificações detalhadas (SPEC_001 a SPEC_020)
├── api/                     # Serverless Functions da Vercel (/api/auth, /api/sync)
├── assets/                  # Imagens e papéis de parede em alta definição
├── dist/                    # Bundle de produção minificado (app.min.js, style.min.css)
├── docs/                    # Documentação do projeto e checklists de deploy
├── js/                      # Módulos JavaScript organizados (< 350 linhas por módulo)
├── scripts/                 # Suíte de testes automatizados e script de build
├── app.js                   # Orquestrador principal do Dashboard
├── manager.js               # Orquestrador do Gerenciador de Decks e Partidas
├── index.html               # Aplicação SPA
├── style.css                # Sistema de Design Tokens CSS
├── package.json             # Configuração do projeto Node.js
└── README.md                # Documentação oficial do repositório
```

---

## ⚙️ Instalação & Desenvolvimento Local

### 1. Clonar o Repositório
```bash
git clone https://github.com/danilmendesF/jornada-dashboard.git
cd jornada-dashboard
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env` e configure suas chaves de teste:
```bash
cp .env.example .env
```

### 3. Executar Suíte de Testes Automatizados
```bash
node scripts/validate.cjs
node scripts/validate_auth.cjs
```

---

## 📄 Licença

Este projeto está licenciado sob a licença **MIT** — consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<p align="center">
  Desenvolvido com ⚡ para o <b>Team Jornada TCG</b>
</p>
