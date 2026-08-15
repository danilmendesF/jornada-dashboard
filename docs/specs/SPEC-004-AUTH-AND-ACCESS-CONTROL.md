# SPEC-004: Autenticacao, Autorizacao e Controle de Acesso

**Status:** NORMATIVE / VERIFIED  

---

## 1. Regras de Seguranca
- Senhas sao criptografadas com PBKDF2 (SHA-256, 10.000 iteracoes, salt unico).
- Sessoes utilizam tokens JWT assinados com HMAC-SHA256.
- Apenas o autor do registro ou administradores podem editar/excluir partidas.
