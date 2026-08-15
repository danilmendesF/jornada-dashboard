# Reconciliação do Conhecimento — Jornada TCG Team

**Status:** VERIFIED  
**Metodologia:** Comparação rigorosa entre Documentação, Código Real, Testes e Comportamento em Produção.

---

## 1. Matriz de Reconciliação

| Item / Domínio | Documentado | Código (`js/`, `api/`) | Testes | Runtime / Prod | Intenção Real | Classificação |
|---|---|---|---|---|---|---|
| **Ordenação por seqID** | Partida mais recente no topo da Página 1 com maior seqID | `app.js` & `table.js` ordenam por `seqID desc` | `tests/app.test.js` & `validate_seqID.cjs` cobrem ordenação | Partidas recentes no topo da Página 1 | Decrescente por seqID com integridade contígua | **VERIFIED** |
| **Player Travado no Registro** | Jogador logado preenchido automaticamente | Badge visual `.logged-player-badge` com hidden input | `validate_auth.cjs` testa login | Player logado travado sem seleção manual | Bloquear troca de autor no formulário | **VERIFIED** |
| **Bloqueio de Auto-Duelo** | Oponente não pode ser igual ao jogador | Validação em `manager.js` e `quicklog.js` | Validado em runtime | Erro exibido se oponente for idêntico | Jogador não pode registrar partida contra si | **VERIFIED** |
| **Data Máxima de Registro** | Data não pode ser futura | `max` atribuído no input date + validação em `saveMatchForm` | Validado em runtime | Bloqueia salvar datas futuras | Impedir dados com datas futuras | **VERIFIED** |
| **E-mail de Boas-Vindas** | E-mail profissional com identidade Jornada | `api/email.js` Dark Theme com Logo Oficial | Endpoint `/api/email?preview=welcome` | Enviado via Resend API para novos usuários | Template dark cyberpunk com link oficial | **VERIFIED** |
| **Domínio Oficial** | `www.jornadatcgteam.com.br` | `DEFAULT_APP_URL` configurado em `api/email.js` | Validado em testes de template | Redireciona para o domínio customizado | Links e previews no domínio oficial | **VERIFIED** |
| **Sincronização Cloud** | Sincroniza via Redis | `api/sync.js` com Redis e proxy fallback | Validado via script | Snapshot persistido no Redis | Sincronização resiliente entre dispositivos | **VERIFIED** |
| **Regras .cursorrules** | Cita `.ai/PROJECT_INDEX.md` e `.ai/ARCHITECTURE.md` | Arquivos ainda não existiam no repositório | N/A | IA lia arquivos legados | Criar formalmente a pasta `.ai/` e SDD vivo | **CONFLICTING (Resolvido na Fase SDD)** |
