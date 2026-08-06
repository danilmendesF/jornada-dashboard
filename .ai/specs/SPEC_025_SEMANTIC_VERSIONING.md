# 📝 SPEC_025: SEMANTIC VERSIONING & AUTO BUMP

- **Status**: 🟢 IMPLEMENTADO
- **Tipo**: FEAT / INFRA
- **Autor**: FeatureArchitect
- **Data**: 2026-08-06
- **Commit**: pendente
- **Módulos Impactados**: `index.html`, `style.css`, `package.json`, `scripts/update_state.cjs`
- **Novos Arquivos**: `scripts/bump_version.cjs`

---

## 1. Visão Geral & Motivação

O projeto requer um controle explícito da versão em produção para facilitar o acompanhamento de deploys e debugging no navegador. A versão segue o padrão Semantic Versioning (`MAJOR.MINOR.PATCH`) e deve ser incrementada automaticamente no fluxo de build.

## 2. Requisitos Funcionais

### RF-01: Elemento visual de versão
- O frontend deve exibir de forma discreta a versão da aplicação (`vX.Y.Z`) no canto inferior esquerdo/direito ou rodapé centralizado, visível em todas as telas (Login e Dashboard).
- O elemento deve possuir a tag `<span id="appVersion">X.Y.Z</span>` para possibilitar a injeção via script no momento do deploy.

### RF-02: Bump de versão automatizado
- Um novo script (`scripts/bump_version.cjs`) gerencia o ciclo.
- Ações do script:
  1. Lê o `version` atual do `package.json`.
  2. Aceita argumentos opcionais: `patch`, `minor`, `major` (default é `patch`).
  3. Incrementa a versão, atualiza e salva o `package.json`.
  4. Escaneia `index.html` em busca do padrão `<span id="appVersion">.*?</span>` e injeta a nova versão gerada.
  
### RF-03: Integração no Quick Workflow RAG
- A documentação gerada pelo RAG (`SESSION_CONTEXT.md` -> Seção de Comandos Rápidos) deve exibir a sequência recomendada: Validar -> Bump Versão -> Build -> Update State -> Deploy.
