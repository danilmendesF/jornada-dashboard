# 📝 SPEC_020: ORGANIZAÇÃO DE REPOSITÓRIO E BOAS PRÁTICAS DO GITHUB

- **Status**: 🟡 EM REVISÃO (Aguardando Aprovação do Usuário)
- **Autor**: Repository Architect & Lead Dev
- **Data**: 2026-08-06
- **Módulos Impactados**: `README.md`, `.gitignore`, `.env.example`, `docs/`, `package.json`

---

## 1. Visão Geral & Boas Práticas da Indústria (GitHub Standard)

### ❓ Ter documentação `.md` e especificações no GitHub é boa prática?
- **SIM, 100%!** Em projetos modernos de software (Google, Vercel, Meta, Microsoft), manter especificações (`Specs`), RFCs, ADRs (Architectural Decision Records) e Guias de Deploy dentro do repositório é considerado uma **melhor prática oficial**. Isso garante rastreabilidade histórica e documentação viva.

### 🛡️ O que NUNCA deve estar no GitHub?
1. **Segredos e Senhas (`.env`, `.env.local`)**: Chaves de API, senhas de banco de dados (`REDIS_URL`), chaves secretas de token (`JWT_SECRET`).
2. **Arquivos temporários e de SO (`.DS_Store`, `Thumbs.db`, `.gemini/`, `scratch/`)**.
3. **Módulos instalados (`node_modules/`)**.

---

## 2. Requisitos de Organização & Limpeza do Repositório (RF)

### RF-01: `.gitignore` Blindado & Modelo `.env.example`
- Garantir que `.gitignore` ignore `.env*`, `.gemini/`, `scratch/`, `*.log`, `node_modules/`.
- Criar o arquivo de exemplo seguro `.env.example` contendo apenas os nomes das variáveis necessárias (`JWT_SECRET`, `REDIS_URL`), sem os valores reais.

### RF-02: README.md Profissional e Estruturado
- Reformular o `README.md` principal do repositório para o padrão profissional do GitHub:
  - Apresentação do **Team Jornada TCG Dashboard**.
  - Badge de tecnologias (HTML5, Vanilla JS, CSS3 Cyber Space Dark, Node.js Serverless, Redis KV, Chart.js).
  - Arquitetura de segurança (JWT HMAC-SHA256, Anti-Flicker, Encapsulamento IIFE).
  - Instruções de desenvolvimento local e deploy na Vercel.

### RF-03: Organização da Pasta de Documentação (`docs/`)
- Mover checklists e guias soltos da raiz para a pasta `docs/` (`docs/DEPLOY_CHECKLIST.md`), mantendo a raiz limpa e profissional.

---

## 3. Critérios de Aceite & Validação
- [ ] O repositório está limpo, organizado e sem nenhum segredo exposto.
- [ ] `.env.example` criado para orientar novas instalações sem expor senhas reais.
- [ ] `README.md` profissional configurado.
- [ ] Suíte automatizada `node scripts/validate.cjs` e `node scripts/validate_auth.cjs` aprovada em 100% dos 61+ testes.
