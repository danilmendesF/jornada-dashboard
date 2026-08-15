# ADR 0006: Expiracao Estrita de JWT e Rastreabilidade com Request-ID

**Status:** ACEITO  
**Data:** 2026-08-15  
**Decisores:** Danilo Mendes / Equipe de Engenharia  

---

## 1. Contexto
Tokens JWT emitidos anteriormente continham apenas `iat`, permanecendo validos indefinidamente caso um dispositivo fosse esquecido logado. Alem disso, a correlacao de logs entre frontend e serverless dependia de busca manual de horarios.

## 2. Decisao
1. Incluir claim `exp` obrigatorio de 30 dias na assinatura de JWT e validar estritamente no `verifyJwt` com tolerancia de clock skew de 60 segundos.
2. Injetar `X-Request-ID` (UUIDv4 ou header confiavel do cliente) em todas as requisicoes serverless e registrar em todos os logs JSON estruturados.

## 3. Consequencias
- **Positivas:** Revogacao temporal automatica de sessoes antigas e rastreabilidade total de requisicoes de ponta a ponta.
- **Trade-offs:** Usuarios inativos por mais de 30 dias precisarao realizar novo login.
