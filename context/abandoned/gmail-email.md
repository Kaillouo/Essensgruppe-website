# Abandoned: Gmail SMTP for Email Sending

**Date abandoned:** 2026-02-23
**Replaced by:** Resend SMTP (smtp.resend.com)

## What was tried
Gmail SMTP with app passwords for sending verification/welcome emails from a custom domain (essensgruppe.de).

## Why it failed
- Gmail requires 2FA + app passwords for programmatic sending
- Sending from a custom domain (Emperor@essensgruppe.de) requires Google Workspace (paid)
- Free Gmail only sends as @gmail.com addresses
- Zoho SMTP was tried next but also requires a paid plan for programmatic SMTP

## What works now
Resend (resend.com) — free tier, 3000 emails/month, custom domain sending, simple SMTP setup. See `context/features/email-system.md`.

**DO NOT retry Gmail or Zoho SMTP approaches.**
