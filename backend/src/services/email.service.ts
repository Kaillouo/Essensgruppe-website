import { transporter } from '../utils/mailer';

const SENDER = '"Essensgruppe Supreme Leader" <Emperor@essensgruppe.de>';

// ─── Animated SVG wave background ────────────────────────────────────────────
// Applied as an inline style on the outer <td> — <style> blocks are stripped
// by Gmail, but inline styles survive.

function waveSvgDataUri(): string {
  const W = 720, H = 600, amp = 18, count = 18;
  const paths = Array.from({ length: count }, (_, i) => {
    const y = Math.round((i + 0.5) * (H / count));
    return `<path d='M0,${y} C90,${y - amp} 180,${y + amp} 270,${y} C360,${y - amp} 450,${y + amp} 540,${y} C630,${y - amp} ${W},${y} ${W},${y}' stroke='rgb(109,40,217)' stroke-width='3.5' stroke-opacity='0.09' fill='none'/>`;
  }).join('');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'>${paths}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const WAVE_URI = waveSvgDataUri();

// ─── Shared HTML wrapper ─────────────────────────────────────────────────────

function emailWrapper(title: string, preheader: string, bodyRows: string): string {
  return `<!DOCTYPE html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    *{box-sizing:border-box;}
    body,html{margin:0;padding:0;width:100%!important;}
    body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;}
    a{text-decoration:none;}
    img{display:block;border:0;max-width:100%;}
    @media only screen and (max-width:600px){
      .wrap{padding:12px!important;}
      .h-pad{padding:28px 22px!important;}
      .b-pad{padding:28px 22px!important;}
      .f-pad{padding:20px 22px!important;}
      .btn a{padding:14px 28px!important;font-size:14px!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#faf8ff;">
  <!-- preheader -->
  <div style="display:none;max-height:0;overflow:hidden;">${preheader}&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td class="wrap" style="padding:40px 16px;background-color:#faf8ff;background-image:url('${WAVE_URI}');background-repeat:repeat;background-size:720px 600px;">
        <table role="presentation" align="center" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:20px;border:1px solid #ede9fe;overflow:hidden;box-shadow:0 8px 48px rgba(109,40,217,0.13);">
          ${bodyRows}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Shared components ────────────────────────────────────────────────────────

function header(tagline = 'Abi 2027 &mdash; Freiburg'): string {
  return `
  <tr>
    <td style="padding:32px 40px;background:linear-gradient(135deg,#6d28d9 0%,#4338ca 60%,#3730a3 100%);">
      <div style="display:inline-block;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);border-radius:8px;padding:5px 13px;margin-bottom:14px;">
        <span style="font-size:11px;font-weight:800;color:#fff;letter-spacing:2px;text-transform:uppercase;">EG</span>
      </div>
      <div>
        <span style="font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.4px;line-height:1.2;display:block;">Essensgruppe Portal</span>
        <span style="font-size:12px;color:rgba(255,255,255,0.8);font-weight:500;margin-top:5px;display:block;">${tagline}</span>
      </div>
    </td>
  </tr>`;
}

function primaryBtn(label: string, url: string): string {
  return `
  <table role="presentation" class="btn" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 0;">
    <tr>
      <td style="border-radius:12px;background:linear-gradient(135deg,#7c3aed,#4f46e5);box-shadow:0 4px 16px rgba(124,58,237,0.35);">
        <a href="${url}" style="display:inline-block;padding:15px 44px;font-family:'Inter',sans-serif;font-size:15px;font-weight:700;color:#ffffff;border-radius:12px;letter-spacing:0.2px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function infoBox(rows: { label: string; value: string; mono?: boolean }[]): string {
  const cells = rows.map(r => `
    <tr>
      <td style="padding:13px 20px;border-bottom:1px solid #f3f0ff;">
        <p style="margin:0 0 2px;font-size:11px;font-weight:700;color:#a78bfa;letter-spacing:0.9px;text-transform:uppercase;">${r.label}</p>
        <p style="margin:0;font-size:15px;font-weight:600;color:#1e1b4b;${r.mono ? "font-family:'Courier New',monospace;" : ''}">${r.value}</p>
      </td>
    </tr>`).join('');
  return `
  <div style="background:#faf8ff;border:1px solid #ede9fe;border-radius:12px;overflow:hidden;margin:20px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${cells}</table>
  </div>`;
}

function alertBox(text: string, color: '#fef3c7' | '#fef2f2' | '#ecfdf5' | '#eff6ff', textColor: string): string {
  return `<div style="background:${color};border-left:3px solid ${textColor};border-radius:8px;padding:13px 16px;margin:20px 0;">
    <p style="margin:0;font-size:13px;color:${textColor};line-height:1.6;">${text}</p>
  </div>`;
}

function footer(): string {
  return `
  <tr>
    <td class="f-pad" style="padding:22px 40px;background:#faf8ff;border-top:1px solid #ede9fe;">
      <p style="margin:0;font-size:12px;color:#a78bfa;text-align:center;line-height:1.7;">
        Essensgruppe Portal &bull; Theodor-Heuss-Gymnasium Freiburg<br>
        <a href="https://essensgruppe.de" style="color:#7c3aed;">essensgruppe.de</a>
        &nbsp;&bull;&nbsp;
        <a href="https://essensgruppe.de/privacy" style="color:#7c3aed;">Datenschutz</a>
      </p>
    </td>
  </tr>`;
}

// ─── 1. Email Verification ────────────────────────────────────────────────────

export async function sendVerificationEmail(user: { username: string; email: string }, token: string): Promise<void> {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  const rows = `
  ${header()}
  <tr>
    <td class="b-pad" style="padding:36px 40px;">
      <h2 style="margin:0 0 6px;font-size:24px;font-weight:900;color:#1e1b4b;letter-spacing:-0.4px;">E-Mail bestätigen</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#7c3aed;font-weight:600;">Fast geschafft — ein Klick genügt</p>

      <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.75;">
        Hey <strong style="color:#5b21b6;">${user.username}</strong>,
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.75;">
        Willkommen beim <strong style="color:#1e1b4b;">Essensgruppe Portal</strong>! Klicke auf den Button, um deine E-Mail-Adresse zu bestätigen und deinen Account zu aktivieren.
      </p>

      ${primaryBtn('E-Mail bestätigen', url)}

      <p style="margin:28px 0 8px;font-size:13px;color:#6b7280;">Oder kopiere diesen Link:</p>
      <div style="background:#faf8ff;border:1px solid #ede9fe;border-radius:8px;padding:12px 16px;">
        <p style="margin:0;font-size:12px;color:#7c3aed;word-break:break-all;font-family:'Courier New',monospace;">${url}</p>
      </div>

      ${alertBox('Dieser Link ist <strong>24 Stunden</strong> gültig. Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.', '#eff6ff', '#3b82f6')}
    </td>
  </tr>
  ${footer()}`;

  await transporter.sendMail({
    from: SENDER,
    to: user.email,
    subject: 'E-Mail bestätigen — Essensgruppe Portal',
    html: emailWrapper('E-Mail bestätigen', `Hey ${user.username}, bestätige deine E-Mail um deinen Account zu aktivieren.`, rows),
  });
}

// ─── 2. Welcome ───────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(user: { username: string; email: string }): Promise<void> {
  const loginUrl = `${process.env.FRONTEND_URL}/login`;

  const features: { icon: string; title: string; desc: string }[] = [
    { icon: '💬', title: 'Essensgruppe Forum', desc: 'Bubble-Forum für Diskussionen mit deiner Klasse' },
    { icon: '📅', title: 'ABI 27 Events',      desc: 'Events planen, abstimmen & Fotos teilen' },
    { icon: '🎮', title: 'Games',               desc: 'Blackjack, Poker & Prediction Markets' },
    { icon: '⛏️', title: 'Minecraft',            desc: 'Klassenserver mit BlueMap & Ankündigungen' },
  ];

  const featureRows = features.map(f => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f3f0ff;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="44" style="padding-right:14px;vertical-align:middle;">
              <div style="width:38px;height:38px;border-radius:10px;background:#f5f3ff;border:1px solid #ede9fe;text-align:center;line-height:38px;font-size:17px;">${f.icon}</div>
            </td>
            <td style="vertical-align:middle;">
              <p style="margin:0 0 1px;font-size:13px;font-weight:700;color:#1e1b4b;">${f.title}</p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">${f.desc}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join('');

  const rows = `
  ${header()}
  <tr>
    <td class="b-pad" style="padding:36px 40px;">
      <h2 style="margin:0 0 6px;font-size:24px;font-weight:900;color:#1e1b4b;letter-spacing:-0.4px;">Willkommen in der Essensgruppe!</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#7c3aed;font-weight:600;">Dein Account ist jetzt aktiv</p>

      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.75;">
        Hey <strong style="color:#5b21b6;">${user.username}</strong>,<br><br>
        deine E-Mail wurde bestätigt. Du bist ab sofort offiziell Teil des Essensgruppe Portals — dem privaten Bereich für <strong style="color:#1e1b4b;">Abi 2027 am THG Freiburg</strong>.
      </p>

      <div style="background:#faf8ff;border:1px solid #ede9fe;border-radius:12px;padding:16px 20px;margin-bottom:4px;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:800;color:#a78bfa;letter-spacing:1px;text-transform:uppercase;">Was dich erwartet</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${featureRows}
        </table>
      </div>

      <div style="background:linear-gradient(135deg,#fef9c3,#fef3c7);border:1px solid #fde68a;border-radius:10px;padding:13px 18px;margin:20px 0;">
        <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;font-weight:500;">
          1.000 Startmünzen wurden deinem Konto gutgeschrieben — teste dein Glück in den Games!
        </p>
      </div>

      ${primaryBtn('Zum Portal', loginUrl)}
    </td>
  </tr>
  ${footer()}`;

  await transporter.sendMail({
    from: SENDER,
    to: user.email,
    subject: 'Willkommen im Essensgruppe Portal!',
    html: emailWrapper('Willkommen', `Dein Account ist aktiv, ${user.username}. Du hast 1.000 Startmünzen erhalten.`, rows),
  });
}

// ─── 3. Password Reset ────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(user: { username: string; email: string }, token: string): Promise<void> {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const rows = `
  ${header('Passwort zurücksetzen')}
  <tr>
    <td class="b-pad" style="padding:36px 40px;">
      <h2 style="margin:0 0 6px;font-size:24px;font-weight:900;color:#1e1b4b;letter-spacing:-0.4px;">Neues Passwort festlegen</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#7c3aed;font-weight:600;">Du hast ein neues Passwort angefordert</p>

      <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.75;">
        Hey <strong style="color:#5b21b6;">${user.username}</strong>,
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.75;">
        Wir haben eine Anfrage zum Zurücksetzen deines Passworts erhalten. Klicke auf den Button, um ein neues Passwort festzulegen.
      </p>

      ${primaryBtn('Passwort jetzt zurücksetzen', url)}

      <p style="margin:28px 0 8px;font-size:13px;color:#6b7280;">Oder kopiere diesen Link:</p>
      <div style="background:#faf8ff;border:1px solid #ede9fe;border-radius:8px;padding:12px 16px;">
        <p style="margin:0;font-size:12px;color:#7c3aed;word-break:break-all;font-family:'Courier New',monospace;">${url}</p>
      </div>

      ${alertBox('Dieser Link läuft in <strong>1 Stunde</strong> ab. Falls du kein neues Passwort angefordert hast, kannst du diese E-Mail ignorieren — dein Account ist sicher.', '#fef2f2', '#ef4444')}
    </td>
  </tr>
  ${footer()}`;

  await transporter.sendMail({
    from: SENDER,
    to: user.email,
    subject: 'Passwort zurücksetzen — Essensgruppe Portal',
    html: emailWrapper('Passwort zurücksetzen', `Hey ${user.username}, setze dein Passwort über den Link zurück.`, rows),
  });
}

// ─── 4. Admin: New User Registered ───────────────────────────────────────────

export async function sendAdminNewUserAlert(newUser: { username: string; email: string }): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  const adminUrl = `${process.env.FRONTEND_URL}/admin`;

  const rows = `
  ${header('Admin-Benachrichtigung')}
  <tr>
    <td class="b-pad" style="padding:36px 40px;">
      <div style="display:inline-block;background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:4px 11px;margin-bottom:18px;">
        <span style="font-size:11px;font-weight:800;color:#92400e;letter-spacing:0.8px;text-transform:uppercase;">Neue Registrierung</span>
      </div>

      <h2 style="margin:0 0 20px;font-size:20px;font-weight:900;color:#1e1b4b;letter-spacing:-0.3px;">Neuer Nutzer hat sich registriert</h2>

      ${infoBox([
        { label: 'Benutzername', value: newUser.username },
        { label: 'E-Mail',       value: newUser.email },
      ])}

      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.7;">
        Eine Bestätigungs-E-Mail wurde gesendet. Nach der Verifizierung wird der Account automatisch als ABI27 aktiviert.
      </p>

      ${primaryBtn('Admin Panel öffnen', adminUrl)}
    </td>
  </tr>
  ${footer()}`;

  await transporter.sendMail({
    from: SENDER,
    to: adminEmail,
    subject: `Neue Registrierung: ${newUser.username}`,
    html: emailWrapper('Neue Registrierung', `${newUser.username} (${newUser.email}) hat sich registriert.`, rows),
  });
}

// ─── 5. Admin-Created Account ─────────────────────────────────────────────────

export async function sendAdminCreatedAccountEmail(
  user: { username: string; email: string },
  tempPassword: string
): Promise<void> {
  const loginUrl = `${process.env.FRONTEND_URL}/login`;
  const rows = `
  ${header()}
  <tr>
    <td class="b-pad" style="padding:36px 40px;">
      <div style="display:inline-block;background:#ecfdf5;border:1px solid #6ee7b7;border-radius:6px;padding:4px 11px;margin-bottom:18px;">
        <span style="font-size:11px;font-weight:800;color:#065f46;letter-spacing:0.8px;text-transform:uppercase;">Account erstellt</span>
      </div>

      <h2 style="margin:0 0 6px;font-size:24px;font-weight:900;color:#1e1b4b;letter-spacing:-0.4px;">Dein Account ist bereit</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#7c3aed;font-weight:600;">Der Admin hat deinen Zugang eingerichtet</p>

      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.75;">
        Hey <strong style="color:#5b21b6;">${user.username}</strong>,<br><br>
        dein Account wurde vom Admin erstellt. Du kannst dich sofort einloggen.
      </p>

      ${infoBox([
        { label: 'Benutzername',         value: user.username, mono: true },
        { label: 'Temporäres Passwort', value: tempPassword,  mono: true },
      ])}

      ${alertBox('Ändere dein Passwort nach dem ersten Login in den <strong>Profileinstellungen</strong>.', '#fef2f2', '#ef4444')}

      ${primaryBtn('Jetzt einloggen', loginUrl)}
    </td>
  </tr>
  ${footer()}`;

  await transporter.sendMail({
    from: SENDER,
    to: user.email,
    subject: 'Dein Essensgruppe Account wurde erstellt',
    html: emailWrapper('Account erstellt', `Hey ${user.username}, dein Account ist bereit. Hier sind deine Zugangsdaten.`, rows),
  });
}
