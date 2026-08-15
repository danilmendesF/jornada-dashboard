# ADR 0002: Sequenciamento Cronologico Contiguo (seqID 1..N)

**Status:** ACEITO  
**Data:** 2026-08-14  
**Decisores:** Danilo Mendes / Equipe de Engenharia  

---

## 1. Contexto
A ordenacao de partidas baseada em multiplos campos textuais ou timestamps em formatos mistos causava instabilidade, enviando partidas recentes para paginas antigas da tabela.

## 2. Decisao
Implementar o atributo canonico `seqID` atribuido incondicionalmente em ordem cronologica de 1 a N. A ordenacao padrao da tabela e estritamente `seqID desc`.

## 3. Consequencias
- **Positivas:** A partida mais recente sempre aparece no topo da Pagina 1 com o maior numero sequencial; garantia matematica de ordenacao.
