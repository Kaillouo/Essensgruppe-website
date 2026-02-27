# Email System

**Provider:** Resend (smtp.resend.com:587, STARTTLS)
**Sender:** Emperor@essensgruppe.de (display name: "Essensgruppe Supreme Leader")
**Free tier:** 3,000 emails/month

## .env Variables
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
EMAIL_FROM="Essensgruppe Supreme Leader <Emperor@essensgruppe.de>"
ADMIN_EMAIL=chef@essensgruppe.de
```

## Email Templates (backend/src/services/email.service.ts)

| Function | Trigger | Recipient |
|----------|---------|-----------|
| sendVerificationEmail(user, token) | User registers | New user |
| sendWelcomeEmail(user) | User clicks verify link | New user |
| sendPasswordResetEmail(user, token) | User requests reset | User |
| sendAdminNewUserAlert(user) | User registers | Admin (ADMIN_EMAIL) |
| sendAdminCreatedAccountEmail(user, pw) | Admin creates user | New user |

## Design
All templates share: light background (#faf8ff), SVG wave lines, purple gradient header, white card, responsive, German text, no emojis in subjects.

## Key Files
- `backend/src/services/email.service.ts` — all 5 templates + shared helpers
- `backend/src/utils/mailer.ts` — nodemailer transporter config
- `backend/src/scripts/preview-email.ts` — generate HTML preview locally
- `backend/src/scripts/send-test-emails.ts` — send test emails to any address

## Previous approaches (abandoned)
Gmail and Zoho SMTP both failed — see `context/abandoned/gmail-email.md`
