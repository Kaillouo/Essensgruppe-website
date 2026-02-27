/**
 * Generates a local HTML preview of the verification email — no sending.
 * Run: npx tsx src/scripts/preview-email.ts
 * Output: Desktop/email-preview.html
 *
 * Uses base64 image (works in browser). Real emails use CID attachments.
 */
import path from 'path';
import fs from 'fs';
import os from 'os';

async function main() {

// ── Waves ─────────────────────────────────────────────────────────────────────
const W = 720, H = 600, amp = 18, count = 18;
const wavePaths = Array.from({ length: count }, (_, i) => {
  const y = Math.round((i + 0.5) * (H / count));
  return `<path d='M0,${y} C90,${y - amp} 180,${y + amp} 270,${y} C360,${y - amp} 450,${y + amp} 540,${y} C630,${y - amp} ${W},${y} ${W},${y}' stroke='rgb(109,40,217)' stroke-width='3.5' stroke-opacity='0.09' fill='none'/>`;
}).join('');
const waveSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'>${wavePaths}</svg>`;
const WAVE_URI = `data:image/svg+xml,${encodeURIComponent(waveSvg)}`;

// ── HTML ──────────────────────────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Email Preview</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  *{box-sizing:border-box;}
  body,html{margin:0;padding:0;width:100%;background-color:#faf8ff;}
  body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;}
  a{text-decoration:none;}
  img{display:block;border:0;max-width:100%;}
</style>
</head>
<body>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding:40px 16px;background-color:#faf8ff;background-image:url('${WAVE_URI}');background-repeat:repeat;background-size:720px 600px;">
      <table role="presentation" align="center" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:20px;border:1px solid #ede9fe;overflow:hidden;box-shadow:0 8px 48px rgba(109,40,217,0.13);">

        <!-- HEADER -->
        <tr>
          <td style="padding:32px 40px;background:linear-gradient(135deg,#6d28d9 0%,#4338ca 60%,#3730a3 100%);">
            <div style="display:inline-block;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);border-radius:8px;padding:5px 13px;margin-bottom:14px;">
              <span style="font-size:11px;font-weight:800;color:#fff;letter-spacing:2px;text-transform:uppercase;">EG</span>
            </div>
            <div>
              <span style="font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.4px;line-height:1.2;display:block;">Essensgruppe Portal</span>
              <span style="font-size:12px;color:rgba(255,255,255,0.8);font-weight:500;margin-top:5px;display:block;">Abi 2027 &mdash; Freiburg</span>
            </div>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:36px 40px;">
            <h2 style="margin:0 0 6px;font-size:24px;font-weight:900;color:#1e1b4b;letter-spacing:-0.4px;">E-Mail bestätigen</h2>
            <p style="margin:0 0 24px;font-size:14px;color:#7c3aed;font-weight:600;">Fast geschafft — ein Klick genügt</p>
            <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.75;">
              Hey <strong style="color:#5b21b6;">MaxMustermann</strong>,
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.75;">
              Willkommen beim <strong style="color:#1e1b4b;">Essensgruppe Portal</strong>! Klicke auf den Button, um deine E-Mail-Adresse zu bestätigen und deinen Account zu aktivieren.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 0;">
              <tr>
                <td style="border-radius:12px;background:linear-gradient(135deg,#7c3aed,#4f46e5);box-shadow:0 4px 16px rgba(124,58,237,0.35);">
                  <a href="#" style="display:inline-block;padding:15px 44px;font-family:'Inter',sans-serif;font-size:15px;font-weight:700;color:#ffffff;border-radius:12px;letter-spacing:0.2px;">E-Mail bestätigen</a>
                </td>
              </tr>
            </table>
            <p style="margin:28px 0 8px;font-size:13px;color:#6b7280;">Oder kopiere diesen Link:</p>
            <div style="background:#faf8ff;border:1px solid #ede9fe;border-radius:8px;padding:12px 16px;">
              <p style="margin:0;font-size:12px;color:#7c3aed;word-break:break-all;font-family:'Courier New',monospace;">https://essensgruppe.de/verify-email?token=preview-token-123</p>
            </div>
            <div style="background:#eff6ff;border-left:3px solid #3b82f6;border-radius:8px;padding:13px 16px;margin:20px 0;">
              <p style="margin:0;font-size:13px;color:#3b82f6;line-height:1.6;">Dieser Link ist <strong>24 Stunden</strong> gültig. Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.</p>
            </div>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:22px 40px;background:#faf8ff;border-top:1px solid #ede9fe;">
            <p style="margin:0;font-size:12px;color:#a78bfa;text-align:center;line-height:1.7;">
              Essensgruppe Portal &bull; Theodor-Heuss-Gymnasium Freiburg<br>
              <a href="https://essensgruppe.de" style="color:#7c3aed;">essensgruppe.de</a>
              &nbsp;&bull;&nbsp;
              <a href="https://essensgruppe.de/privacy" style="color:#7c3aed;">Datenschutz</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

const out = path.join(os.homedir(), 'OneDrive', 'Desktop', 'email-preview.html');
fs.writeFileSync(out, html);
console.log(`Saved to: ${out}`);

}
main().catch(console.error);
