# Politica de Retencao de Dados e Direito ao Esquecimento

**Projeto:** Jornada TCG Team  
**Data:** 15 de Agosto de 2026  
**Status:** IMPLEMENTED / TECHNICAL CONTROLS ACTIVE  
**Classificacao Juridica:** HUMAN DECISION REQUIRED  

---

## 1. Mapeamento de Dados e Categorias

| Categoria | Dado | Finalidade | Localizacao | Retencao |
|---|---|---|---|---|
| **Conta / PII** | E-mail, Nome | Identificacao e login | Redis (`user_*`, `player_claim_*`) | Ate solicitacao de exclusao |
| **Credenciais** | Hash PBKDF2 + Salt | Autenticacao segura | Redis (`user_*`) | Ate solicitacao de exclusao |
| **Sessao** | JWT assinado | Autenticacao de API | `localStorage` do browser | 30 dias (`exp`) |
| **Partidas** | Decks, Placares, Duelos | Analise competitiva do time | `localStorage` + Redis (`jornada_sync_*`) | Indefinido (Historico) |
| **Tombstones** | IDs de partidas deletadas | Consistencia de sincronizacao | `localStorage` + Redis | 180 dias |

---

## 2. Procedimento de Expurgo de Dados (Direito ao Esquecimento)

1. **Solicitacao:** O titular solicita a remocao de sua conta ao administrador do time.
2. **Execucao Administrativa:** O administrador realiza requisicao autenticada com seu JWT de `role: 'admin'` para:
   `POST /api/auth?action=admin_delete_user_data` com body `{ targetEmail: "usuario@exemplo.com" }`.
3. **Acoes Executadas no Servidor:**
   - Exclusao da chave `user_${targetEmail}` no Redis.
   - Liberacao da vinculacao de jogador `player_claim_${targetName}` no Redis.
   - Registro de auditoria nos logs serverless com `requestId` e `adminEmail`.
4. **Preservacao de Partidas do Time:** As partidas historicas registradas pelo time sao mantidas para integridade dos graficos de winrate, sem exibicao de credenciais pessoais.
