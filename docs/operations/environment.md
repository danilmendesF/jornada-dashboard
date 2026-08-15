# Variaveis de Ambiente e Infraestrutura — Jornada TCG Team

**Status:** VERIFIED  

---

## Variaveis de Ambiente (Serverless)

| Variavel | Descricao | Obrigatoria | Exemplo / Padrao |
|---|---|---|---|
| `JWT_SECRET` | Chave secreta para assinatura HMAC-SHA256 dos tokens JWT | Sim | Configurada no painel Vercel |
| `REDIS_URL` | URL de conexao com o Redis Cloud | Sim | `redis://default:senha@host:porta` |
| `RESEND_API_KEY` | Chave de API do Resend para envio de e-mails | Sim | `re_...` |
| `FROM_EMAIL` | Remetente dos e-mails transacionais | Opcional | `Jornada TCG Team <nao-responda@jornadatcgteam.com.br>` |
| `ADMIN_EMAIL` | Destinatario dos alertas de novo deck | Opcional | `danilmendes@gmail.com` |
| `APP_URL` | URL base do sistema para links em e-mails | Opcional | `https://www.jornadatcgteam.com.br` |
