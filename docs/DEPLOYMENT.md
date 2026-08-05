# 🚀 GUIA DE HOMOLOGAÇÃO E DEPLOY — Jornada Dashboard

## 1. CHECKLIST DE HOMOLOGAÇÃO (PRÉ-DEPLOY)

Antes de enviar qualquer versão para produção (Vercel ou hospedeiro estático), execute o seguinte procedimento:

1. **Validação Automatizada de Código**:
   ```bash
   node scripts/validate.js
   ```
   *Garantir que a resposta seja `🟢 SUCESSO` com 0 falhas.*

2. **Atualização do Estado RAG**:
   ```bash
   node scripts/update_state.js
   ```
   *Atualiza o timestamp e métricas no `.ai/PROJECT_INDEX.md`.*

3. **Verificação de Regressão em Mobile**:
   - Abrir o navegador em resolução `360px x 640px` (DevTools).
   - Verificar ausência de barra de rolagem horizontal na página.
   - Confirmar que a paginação da tabela colapsa limpa.

4. **Verificação de Sync Multi-Sessão**:
   - Abrir 2 abas simultâneas.
   - Registrar partida na Aba A → Confirmar notificação de toast 🔄 na Aba B.

---

## 2. FLUXO DE DEPLOY NA VERCEL & VARIÁVEIS DE AMBIENTE

1. Certifique-se de configurar as seguintes Variáveis de Ambiente no painel da Vercel (**Settings -> Environment Variables**):
   - `REDIS_URL`: URL de conexão segura do Vercel KV / Upstash Redis.
   - `JWT_SECRET`: Chave secreta privada para assinatura das sessões dos usuários.
   - `RESEND_API_KEY`: Chave de API do serviço [Resend.com](https://resend.com) para entrega dos e-mails de confirmação de cadastro.
2. Faça commit das alterações incluindo os arquivos `.ai/`, `js/` e `api/`.
3. O deploy automático da Vercel compilará as Serverless Functions `api/auth.js`, `api/sync.js` e servirá a aplicação.
