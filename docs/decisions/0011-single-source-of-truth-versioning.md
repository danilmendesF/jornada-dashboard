# ADR 0011: Build-Time Injection e Single Source of Truth para Versionamento

**Status:** ACEITO  
**Data:** 2026-08-16  
**Decisores:** Danilo Mendes / Equipe de Engenharia  
**Contexto:** CHG-003 (Eliminacao da Duplicacao Manual de Versao)

---

## 1. Contexto
Anteriormente, o numero de versao da aplicacao exigia sincronizacao manual em multiplos arquivos:
1. package.json
2. version.json
3. index.html (#appVersion e #appVersionAuth)
4. Cachebusters em tags script e link

Essa duplicacao gerava risco de divergencia humana, onde o DOM desatualizado entrava em conflito com o version.json, causando loops de recarregamento.

## 2. Decisao
1. Estabelecer o campo version em package.json como a **Unica Fonte de Verdade (Single Source of Truth)** da versao da aplicacao.
2. Adotar uma estrategia de template version-neutral no index.html fonte, utilizando o placeholder __APP_VERSION__.
3. O motor central de compilacao (scripts/build_bundle.cjs / npm run build):
   - Le a versao diretamente de package.json.
   - Gera e sincroniza automaticamente os artefatos derivados: public/version.json e version.json.
   - Injeta a versao nos elementos #appVersion, #appVersionAuth e nos query parameters de cache-busting ao gerar public/index.html.
   - Valida estritamente que nenhum placeholder __APP_VERSION__ permaneca sem resolucao no build final.
4. Manter o Quality Gate no SDD 2.0 (scripts/validate_sdd.cjs) e testes automatizados (tests/dom_integration.test.js) como camada continua de verificacao de paridade.

## 3. Consequencias
- **Positivas:**
  - Elimina 100% da necessidade de edicao manual de versao no HTML.
  - O processo de release e bump passa a exigir alteracao apenas no package.json.
  - Builds sao deterministicos, idempotentes e a prova de divergencias.
- **Negativas:**
  - Nenhuma. A arquitetura preserva total compatibilidade com o runtime e os Quality Gates existentes.
