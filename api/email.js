
/**
 * 📧 EMAIL DISPATCHER MODULE — Jornada Dashboard
 * Professional HTML Email Templates & Resend API Dispatcher for Jornada TCG Team
 */

function log(level, message, context = {}) {
  const payload = { timestamp: new Date().toISOString(), level, message, ...context };
  if (level === 'error') console.error(JSON.stringify(payload));
  else console.log(JSON.stringify(payload));
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Jornada TCG Team <nao-responda@jornadatcgteam.com.br>';
const DEFAULT_APP_URL = process.env.APP_URL || 'https://www.jornadatcgteam.com.br';

/**
 * Generates the professional Welcome HTML Email template in Jornada TCG Dark & Pokémon theme
 * @param {string} playerName - Trainer's name
 * @param {string} playerEmail - Trainer's email
 * @param {string} appUrl - Dashboard link
 * @returns {string} Fully responsive inline HTML email
 */
export function generateWelcomeEmailHtml(playerName = 'Treinador', playerEmail = '', appUrl = DEFAULT_APP_URL) {
  const safeName = playerName || 'Treinador';
  const upperName = safeName.toUpperCase();

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt-BR">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="x-apple-disable-message-reformatting" />
  <title>Seja bem-vindo ao Jornada TCG Team!</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #060913; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #cbd5e1; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; padding: 12px !important; }
      .step-col { display: block !important; width: 100% !important; margin-bottom: 12px !important; }
      .step-spacer { display: none !important; }
      .hero-pad { padding: 20px 16px !important; }
      .greeting-title { font-size: 24px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #060913; color: #cbd5e1;">
  <center style="width: 100%; background-color: #060913;">
    <!-- CONTAINER PRINCIPAL DARK THEME -->
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #0d1225; border-radius: 18px; margin: 0 auto; box-shadow: 0 16px 45px rgba(0, 0, 0, 0.85), 0 0 35px rgba(124, 106, 247, 0.18); overflow: hidden; border: 1px solid rgba(124, 106, 247, 0.4);" class="email-container">
      
      <!-- TOP HEADER / BRAND WITH OFFICIAL LOGO -->
      <tr>
        <td style="padding: 24px 32px 18px 32px; background-color: #0a0e1e; border-bottom: 1px solid rgba(124, 106, 247, 0.25);">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="left" style="vertical-align: middle;">
                <table border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align: middle; padding-right: 14px;">
                      <a href="${appUrl}" target="_blank" style="text-decoration: none; display: block;">
                        <img src="${appUrl}/logo.png" alt="Jornada TCG Team Logo" width="48" height="48" style="display: block; border-radius: 10px; width: 48px; height: 48px; object-fit: contain; box-shadow: 0 4px 14px rgba(0, 200, 248, 0.35); border: 1px solid rgba(0, 200, 248, 0.3);" />
                      </a>
                    </td>
                    <td style="vertical-align: middle;">
                      <div style="font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        JORNADA <span style="color: #00c8f8;">TCG TEAM</span>
                      </div>
                      <div style="font-size: 11px; font-weight: 700; color: #94a3b8; letter-spacing: 0.8px; text-transform: uppercase; margin-top: 2px;">
                        Competitividade &middot; Análise &middot; Inteligência
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CONTEÚDO PRINCIPAL -->
      <tr>
        <td style="padding: 32px 32px 24px 32px; background-color: #0d1225;">
          
          <!-- SAUDAÇÃO COM DESTAQUE DARK / POKÉMON -->
          <h1 class="greeting-title" style="margin: 0 0 10px 0; font-size: 27px; line-height: 1.25; font-weight: 900; color: #ffffff;">
            <span style="background-color: rgba(245, 200, 66, 0.18); color: #f5c842; border: 1px solid rgba(245, 200, 66, 0.4); padding: 3px 10px; border-radius: 6px; display: inline-block;">Seja bem-vindo,</span>
            <span style="color: #00c8f8; text-transform: uppercase;">${upperName}</span>
          </h1>

          <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #ffffff;">
            Esse é o começo de uma jornada lendária! ⚡🎮
          </p>

          <p style="margin: 0 0 26px 0; font-size: 14.5px; line-height: 1.65; color: #cbd5e1;">
            Agora que você faz parte do <strong style="color: #ffffff;">JORNADA TCG TEAM</strong>, estamos passando para avisar que seu acesso exclusivo ao aplicativo e painel de inteligência competitiva já está disponível!
          </p>

          <!-- HERO BANNER PROFISSIONAL DARK THEME -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #1c1447 0%, #2e1065 55%, #0f172a 100%); border-radius: 16px; margin-bottom: 32px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 200, 248, 0.15); border: 1px solid rgba(0, 200, 248, 0.35);">
            <tr>
              <td class="hero-pad" style="padding: 24px 22px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td>
                      <div style="font-size: 12px; font-weight: 800; color: #34e0a1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                        🔥 PLATAFORMA ATIVA
                      </div>
                      <div style="font-size: 18px; font-weight: 800; color: #ffffff; line-height: 1.35; margin-bottom: 8px;">
                        Acesse seu Dashboard e comece a registrar partidas!
                      </div>
                      <div style="font-size: 13px; line-height: 1.5; color: #e2e8f0; margin-bottom: 16px;">
                        Monitore sua Win Rate em tempo real, arquétipos, estatísticas de brick e detalhamento de partidas MD3 com facilidade.
                      </div>
                      <table border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding-right: 8px;">
                            <span style="display: inline-block; background: rgba(0, 200, 248, 0.15); border: 1px solid rgba(0, 200, 248, 0.4); color: #00c8f8; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 700;">
                              ⚡ Quick Log em 1 Clique
                            </span>
                          </td>
                          <td>
                            <span style="display: inline-block; background: rgba(124, 106, 247, 0.15); border: 1px solid rgba(124, 106, 247, 0.4); color: #c084fc; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 700;">
                              📊 Matriz de Matchups
                            </span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- SEÇÃO: VEJA COMO É FÁCIL -->
          <div style="margin-bottom: 28px;">
            <h2 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 800; color: #ffffff;">
              Veja como é fácil:
            </h2>
            <p style="margin: 0 0 18px 0; font-size: 14px; color: #94a3b8; line-height: 1.5;">
              São apenas três passos para completar o seu acesso e deixar tudo pronto:
            </p>

            <!-- 3 PASSOS EM CARDS DARK THEME -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <!-- PASSO 1 -->
                <td class="step-col" width="31%" style="vertical-align: top; background-color: #131b35; border: 1px solid rgba(124, 106, 247, 0.3); border-radius: 12px; padding: 18px 12px; text-align: center;">
                  <div style="width: 44px; height: 44px; margin: 0 auto 12px auto; background: #1e1b4b; border: 1px solid rgba(0, 200, 248, 0.4); border-radius: 50%; text-align: center; line-height: 44px; font-size: 20px;">
                    📱
                  </div>
                  <div style="font-size: 13px; font-weight: 800; color: #ffffff; margin-bottom: 6px;">
                    1. Acesse o App
                  </div>
                  <div style="font-size: 11.5px; line-height: 1.45; color: #94a3b8;">
                    Abra o painel no navegador do celular ou computador.
                  </div>
                </td>

                <td class="step-spacer" width="3.5%"></td>

                <!-- PASSO 2 -->
                <td class="step-col" width="31%" style="vertical-align: top; background-color: #131b35; border: 1px solid rgba(124, 106, 247, 0.3); border-radius: 12px; padding: 18px 12px; text-align: center;">
                  <div style="width: 44px; height: 44px; margin: 0 auto 12px auto; background: #1e1b4b; border: 1px solid rgba(0, 200, 248, 0.4); border-radius: 50%; text-align: center; line-height: 44px; font-size: 20px;">
                    🔑
                  </div>
                  <div style="font-size: 13px; font-weight: 800; color: #ffffff; margin-bottom: 6px;">
                    2. Faça o Login
                  </div>
                  <div style="font-size: 11.5px; line-height: 1.45; color: #94a3b8;">
                    Use seu e-mail e senha cadastrados para entrar.
                  </div>
                </td>

                <td class="step-spacer" width="3.5%"></td>

                <!-- PASSO 3 -->
                <td class="step-col" width="31%" style="vertical-align: top; background-color: #131b35; border: 1px solid rgba(124, 106, 247, 0.3); border-radius: 12px; padding: 18px 12px; text-align: center;">
                  <div style="width: 44px; height: 44px; margin: 0 auto 12px auto; background: #1e1b4b; border: 1px solid rgba(0, 200, 248, 0.4); border-radius: 50%; text-align: center; line-height: 44px; font-size: 20px;">
                    ⚔️
                  </div>
                  <div style="font-size: 13px; font-weight: 800; color: #ffffff; margin-bottom: 6px;">
                    3. Salve Partidas
                  </div>
                  <div style="font-size: 11.5px; line-height: 1.45; color: #94a3b8;">
                    Registre seus treinos e acompanhe sua evolução!
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- SEÇÃO: VOCÊ NO CONTROLE DE TUDO -->
          <div style="margin-bottom: 30px;">
            <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: #ffffff;">
              Você no controle de tudo!
            </h2>
            <p style="margin: 0 0 12px 0; font-size: 14.5px; line-height: 1.6; color: #cbd5e1;">
              Com o dashboard, você e a equipe têm acesso às melhores métricas para afiar suas 60 cartas, identificar matchups favoráveis e dominar os torneios competitivos!
            </p>
            <p style="margin: 0; font-size: 15px; font-weight: 800; color: #00c8f8;">
              Agora me conta, você está pronto para alcançar o próximo nível? 🚀
            </p>
          </div>

          <!-- BOTÃO DE AÇÃO PROEMINENTE (CTA PRINCIPAL) COM REDIRECIONAMENTO CORRETO -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
            <tr>
              <td align="center">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${appUrl}" style="height:52px;v-text-anchor:middle;width:340px;" arcsize="18%" stroke="f" fillcolor="#7c3aed">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">CLIQUE AQUI E ACESSE AGORA MESMO!</center>
                </v:roundrect>
                <![endif]-->
                <a href="${appUrl}" target="_blank" style="background: #7c3aed; background: linear-gradient(135deg, #7c3aed 0%, #00c8f8 100%); color: #ffffff; display: block; width: 88%; max-width: 380px; font-family: sans-serif; font-size: 15px; font-weight: 800; line-height: 52px; text-align: center; text-decoration: none; border-radius: 12px; box-shadow: 0 8px 25px rgba(0, 200, 248, 0.4); text-transform: uppercase; letter-spacing: 0.5px; mso-hide: all;">
                  Clique aqui e acesse agora mesmo!
                </a>
              </td>
            </tr>
          </table>

          <!-- AVISO / TERMOS E PRIVACIDADE DARK -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0e1e; border: 1px solid rgba(124, 106, 247, 0.25); border-radius: 10px; margin-bottom: 10px;">
            <tr>
              <td style="padding: 14px 16px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td width="24" style="vertical-align: top; font-size: 16px; color: #00c8f8; line-height: 1.3; padding-right: 10px;">
                      ⓘ
                    </td>
                    <td style="font-size: 12px; line-height: 1.5; color: #94a3b8;">
                      Ao continuar utilizando o Jornada Dashboard, você declara concordar com as diretrizes e regras internas da equipe. Guarde suas credenciais de login com segurança.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

        </td>
      </tr>

      <!-- FOOTER PROFISSIONAL DARK COM LOGO, REDES E COPYRIGHT -->
      <tr>
        <td style="background-color: #0a0e1e; padding: 24px 32px; border-top: 1px solid rgba(124, 106, 247, 0.25); text-align: center;">
          <div style="margin-bottom: 14px;">
            <a href="${appUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
              <img src="${appUrl}/logo.png" alt="Jornada TCG Team Logo" width="38" height="38" style="display: inline-block; border-radius: 8px; width: 38px; height: 38px; object-fit: contain; margin: 0 auto;" />
            </a>
          </div>

          <div style="margin-bottom: 12px;">
            <a href="${appUrl}" target="_blank" style="color: #00c8f8; text-decoration: none; font-size: 12px; font-weight: 700; margin: 0 10px;">🌐 Painel Oficial</a>
            <span style="color: #475569;">&bull;</span>
            <a href="${appUrl}" target="_blank" style="color: #00c8f8; text-decoration: none; font-size: 12px; font-weight: 700; margin: 0 10px;">🏆 Jornada TCG</a>
            <span style="color: #475569;">&bull;</span>
            <a href="${appUrl}" target="_blank" style="color: #00c8f8; text-decoration: none; font-size: 12px; font-weight: 700; margin: 0 10px;">🛡️ Suporte</a>
          </div>

          <div style="font-size: 11px; line-height: 1.6; color: #64748b;">
            Todos os direitos reservados &copy; 2026<br/>
            <strong style="color: #94a3b8;">Jornada TCG Team &middot; Inteligência e Análise Competitiva</strong><br/>
            <span style="color: #475569;">Projeto independente desenvolvido para a equipe Jornada TCG.</span>
          </div>
        </td>
      </tr>

    </table>
    
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin-top: 12px;">
      <tr>
        <td align="center" style="font-size: 11px; color: #64748b;">
          Este é um e-mail automático gerado pelo sistema Jornada Dashboard.
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
}

/**
 * Generates notification email for new deck additions in Dark Theme
 */
export function generateNewDeckEmailHtml(playerName = 'Treinador', deckName = 'Novo Deck', appUrl = DEFAULT_APP_URL) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Novo Deck Adicionado - Jornada TCG Team</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #060913; margin: 0; padding: 24px; color: #cbd5e1;">
  <div style="max-width: 520px; margin: 0 auto; background: #0d1225; border-radius: 14px; padding: 28px; border: 1px solid rgba(124, 106, 247, 0.4); box-shadow: 0 8px 30px rgba(0,0,0,0.7);">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
      <a href="${appUrl}" target="_blank" style="text-decoration: none; display: block;">
        <img src="${appUrl}/logo.png" alt="Jornada TCG Team" width="36" height="36" style="display: block; border-radius: 8px; width: 36px; height: 36px; object-fit: contain;" />
      </a>
      <strong style="font-size: 18px; color: #ffffff;">Jornada TCG Team</strong>
    </div>
    <h2 style="color: #00c8f8; font-size: 20px; margin: 0 0 12px 0;">🃏 Novo Deck Cadastrado!</h2>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
      O treinador <strong style="color: #ffffff;">${playerName}</strong> adicionou o arquétipo <strong style="color: #00c8f8;">${deckName}</strong> ao painel.
    </p>
    <div style="margin: 24px 0;">
      <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #00c8f8); color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0, 200, 248, 0.35);">
        Visualizar no Dashboard
      </a>
    </div>
    <hr style="border: 0; border-top: 1px solid rgba(124, 106, 247, 0.2); margin: 20px 0;" />
    <div style="font-size: 11px; color: #64748b; text-align: center;">
      E-mail automático enviado pelo Jornada Dashboard &copy; 2026.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Sends the welcome email to a newly registered user
 */
export async function sendWelcomeEmail(playerName, playerEmail, appUrl = DEFAULT_APP_URL) {
  if (!playerEmail || !playerEmail.includes('@')) {
    console.warn('[Email Module] Invalid recipient email address:', playerEmail);
    return { success: false, error: 'INVALID_EMAIL' };
  }

  const htmlContent = generateWelcomeEmailHtml(playerName, playerEmail, appUrl);

  // ── RESEND API MODE (If API Key Configured) ────────────────────────────────
  if (RESEND_API_KEY) {
    try {
      log('info', `[Email Module] Sending email via Resend API to ${playerEmail}...`);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [playerEmail],
          subject: `⚡ Seja bem-vindo ao Jornada TCG Team, ${playerName}! 🎮`,
          html: htmlContent
        })
      });

      if (res.ok) {
        log('info', `[Email Module] Welcome email delivered successfully to ${playerEmail}`);
        return { success: true, delivered: true };
      } else {
        const errText = await res.text();
        log('error', '[Email Module] Resend API error:', { error: errText });
        return { success: false, delivered: false, error: errText };
      }
    } catch (err) {
      log('error', '[Email Module] Error invoking Resend API:', { error: err.message });
      return { success: false, delivered: false, error: err.message };
    }
  }

  // ── FALLBACK / LOCAL SIMULATION MODE ───────────────────────────────────────
  log('info', `\n==================================================`);
  log('info', `📧 [SIMULAÇÃO E-MAIL DE BOAS-VINDAS PROFISSIONAL (DARK THEME)]`);
  log('info', `   Para: ${playerName} <${playerEmail}>`);
  log('info', `   Assunto: ⚡ Seja bem-vindo ao Jornada TCG Team, ${playerName}! 🎮`);
  log('info', `   Link de Acesso: ${appUrl}`);
  log('info', `   Status: Template Dark Theme gerado com sucesso (RESEND_API_KEY não configurada em dev)`);
  log('info', `==================================================\n`);

  return { success: true, delivered: false, reason: 'RESEND_API_KEY_MISSING' };
}

/**
 * Sends notification email when a new deck is registered
 */
export async function sendNewDeckEmail(playerName, deckName, appUrl = DEFAULT_APP_URL) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    log('error', '[Email Module] ADMIN_EMAIL not configured');
    return { success: false, error: 'ADMIN_EMAIL_MISSING' };
  }

  const htmlContent = generateNewDeckEmailHtml(playerName, deckName, appUrl);

  if (RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [adminEmail],
          subject: `Novo Deck: ${deckName} (por ${playerName})`,
          html: htmlContent
        })
      });
      return { success: res.ok };
    } catch (err) {
      console.error('[Email Module] sendNewDeckEmail error:', err);
      return { success: false, error: err.message };
    }
  }
  return { success: true, delivered: false, reason: 'RESEND_API_KEY_MISSING' };
}

/**
 * Serverless API Handler to preview or test emails in browser
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const preview = req.query?.preview;
  const name = req.query?.name || 'Danilo';
  const email = req.query?.email || 'danilmendes@gmail.com';
  const deck = req.query?.deck || 'Charizard ex / Pidgeot';

  if (preview === 'welcome' || preview === 'true' || preview === '1') {
    const html = generateWelcomeEmailHtml(name, email);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }

  if (preview === 'deck') {
    const html = generateNewDeckEmailHtml(name, deck);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }

  return res.status(200).json({
    status: 'Email module operational',
    endpoints: {
      previewWelcome: '/api/email?preview=welcome&name=Danilo',
      previewDeck: '/api/email?preview=deck&name=Danilo&deck=Charizard+ex'
    }
  });
}

