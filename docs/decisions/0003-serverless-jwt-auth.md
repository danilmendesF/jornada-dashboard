# ADR 0003: Autenticacao Serverless com JWT e Hashing PBKDF2

**Status:** ACEITO  
**Data:** 2026-08-14  
**Decisores:** Danilo Mendes / Equipe de Engenharia  

---

## 1. Contexto
Necessidade de controle de acesso para vincular registros a jogadores especificos, impedindo que um jogador registre partidas no nome de outro companheiro de time.

## 2. Decisao
Utilizar autenticacao JWT (HMAC-SHA256) emitida pela Serverless Function `/api/auth` e senhas armazenadas com hash PBKDF2 (SHA-256) com salt unico. O formulario do frontend trava a identidade do jogador no usuario logado via `.logged-player-badge`.

## 3. Consequencias
- **Positivas:** Sem dependencia de servicos externos pesados de autenticacao; seguranca criptografica no backend.
