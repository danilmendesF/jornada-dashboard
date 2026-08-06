/**
 * 📧 EMAIL DISPATCHER MODULE — Jornada Dashboard
 * Sends HTML confirmation & welcome emails to registered team players.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Jornada TCG Team <nao-responda@jornadatcgteam.com.br>';

export async function sendWelcomeEmail(playerName, playerEmail) {
  if (!playerEmail || !playerEmail.includes('@')) {
    console.warn('[Email Module] Invalid recipient email address:', playerEmail);
    return false;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #080c18; color: #e2e8f0; margin: 0; padding: 20px; }
        .container { max-width: 560px; margin: 0 auto; background: #0d1225; border: 1px solid #7c6af7; border-radius: 12px; padding: 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .brand { text-align: center; margin-bottom: 24px; }
        .logo-title { font-size: 24px; font-weight: bold; color: #00c8f8; margin: 8px 0 0 0; text-transform: uppercase; letter-spacing: 1px; }
        .subtitle { font-size: 13px; color: #94a3b8; margin-top: 4px; }
        .card { background: #131b35; border: 1px solid rgba(124,106,247,0.3); border-radius: 8px; padding: 20px; margin: 20px 0; }
        .greeting { font-size: 18px; font-weight: bold; color: #ffffff; margin-bottom: 12px; }
        .badge { display: inline-block; background: rgba(0,200,248,0.15); border: 1px solid #00c8f8; color: #00c8f8; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .btn { display: block; width: 100%; text-align: center; background: linear-gradient(135deg, #7c6af7, #00c8f8); color: #ffffff; text-decoration: none; font-weight: bold; padding: 14px 0; border-radius: 6px; margin-top: 24px; }
        .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 28px; border-top: 1px solid #1e293b; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="brand">
          <div class="logo-title">⚡ Jornada Dashboard</div>
          <div class="subtitle">TCG Team &middot; Análise Regional & Matchups</div>
        </div>

        <div class="card">
          <div class="greeting">Olá, ${playerName}! 🎮</div>
          <p style="color: #cbd5e1; line-height: 1.6;">
            Sua inscrição no painel exclusivo do <strong>Jornada TCG Team</strong> foi confirmada com sucesso!
          </p>
          <div style="margin: 16px 0;">
            <span class="badge">STATUS: CADASTRO CONFIRMADO</span>
          </div>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">
            Agora você tem acesso completo ao registro de partidas, análises de Win Rate, detalhamento de games MD3 e matriz de matchups do time.
          </p>
        </div>

        <div class="footer">
          &copy; 2026 Jornada TCG Team &middot; E-mail automático de confirmação.
        </div>
      </div>
    </body>
    </html>
  `;

  // ── RESEND API MODE (If API Key Configured) ────────────────────────────────
  if (RESEND_API_KEY) {
    try {
      console.log(`[Email Module] Sending email via Resend API to ${playerEmail}...`);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [playerEmail],
          subject: '⚡ Cadastro Confirmado! Bem-vindo ao Jornada TCG Team 🎮',
          html: htmlContent
        })
      });

      if (res.ok) {
        console.log(`[Email Module] Welcome email delivered successfully to ${playerEmail}`);
        return { success: true, delivered: true };
      } else {
        const errText = await res.text();
        console.error('[Email Module] Resend API error:', errText);
        return { success: false, delivered: false, error: errText };
      }
    } catch (err) {
      console.error('[Email Module] Error invoking Resend API:', err.message);
      return { success: false, delivered: false, error: err.message };
    }
  }

  // ── FALLBACK / LOCAL SIMULATION MODE ───────────────────────────────────────
  console.log(`\n==================================================`);
  console.log(`📧 [SIMULAÇÃO E-MAIL DE CONFIRMAÇÃO]`);
  console.log(`   Para: ${playerName} <${playerEmail}>`);
  console.log(`   Assunto: ⚡ Cadastro Confirmado! Bem-vindo ao Jornada TCG Team 🎮`);
  console.log(`   Status: Simulação local (RESEND_API_KEY não configurada)`);
  console.log(`==================================================\n`);

  return { success: true, delivered: false, reason: 'RESEND_API_KEY_MISSING' };
}
