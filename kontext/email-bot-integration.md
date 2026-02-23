# Email Bot Integration for School Portal

## Overview
Implement automated email system using a 2FA-protected bot email account to handle user notifications, account management, and admin alerts.

---

## Email Account Setup (Do First)

### Step 1: Create Gmail Account
**Recommended email:** `abitur27portal@gmail.com` (or similar)

1. Go to gmail.com
2. Create new account
3. Choose strong password
4. Save credentials securely

### Step 2: Enable 2FA
1. Go to myaccount.google.com/security
2. Enable "2-Step Verification"
3. Use authenticator app (Google Authenticator, Authy)
4. Save backup codes

### Step 3: Generate App Password
1. Go to myaccount.google.com/apppasswords
2. Select "Mail" and "Other (Custom name)"
3. Name it: "School Portal Backend"
4. Copy the 16-character password
5. This is what the bot uses (NOT your real password)

---

## Email Types to Implement

### 1. Welcome Email (New Account Created)
**Trigger:** Admin creates new user account

**Recipient:** New user's email

**Content:**
```
Subject: Willkommen beim Abitur 2027 Portal!

Hallo [Username],

Dein Account wurde erstellt!

Login Daten:
• Benutzername: [username]
• Temporäres Passwort: [temp_password]
• Portal: https://yourschool.com

Bitte ändere dein Passwort beim ersten Login.

Viel Spaß!
Das Abitur 2027 Team
```

---

### 2. Password Reset Email
**Trigger:** User clicks "Passwort vergessen" or admin resets password

**Recipient:** User's email

**Content:**
```
Subject: Passwort zurücksetzen - Abitur 2027 Portal

Hallo [Username],

Du hast einen Passwort-Reset angefordert.

Reset-Link (gültig für 1 Stunde):
https://yourschool.com/reset-password?token=[reset_token]

Falls du das nicht warst, ignoriere diese Email.

Das Abitur 2027 Team
```

---

### 3. Event Notifications
**Trigger:** New event posted or event status changes

**Recipient:** All Essensgruppe members

**Content:**
```
Subject: Neues Event: [Event Title]

Hallo,

Ein neues Event wurde vorgeschlagen!

📅 [Event Title]
📍 [Location]
🗓️ [Date]
💰 Budget: [Budget]

Beschreibung:
[Description]

👉 Jetzt abstimmen: https://yourschool.com/abi27/events

Das Abitur 2027 Team
```

**Variations:**
- Event accepted → "Event bestätigt!"
- Event cancelled → "Event abgesagt"
- Event completed → "Event war ein Erfolg!"

---

### 4. Admin Notifications
**Trigger:** Important admin events

**Recipient:** Admin email only

**Content Types:**

**New Join Request:**
```
Subject: [ADMIN] Neue Beitrittsanfrage

Jemand möchte der Essensgruppe beitreten:

Name: [Name from form]
Email: [Email from form]
Nachricht: [Message]

Aktion erforderlich:
https://yourschool.com/admin/requests
```

**Suspicious Activity:**
```
Subject: [ADMIN] Verdächtige Aktivität

Mögliches Problem entdeckt:

User: [Username]
Aktivität: [Description]
Zeit: [Timestamp]
IP: [IP Address]

Überprüfen: https://yourschool.com/admin/logs
```

**Low Balance Alert (Gambling):**
```
Subject: [ADMIN] Balance-Warnung

User: [Username]
Balance: [Balance] Coins (unter 0!)

Manueller Eingriff erforderlich.
```

---

## Technical Implementation

### Backend Structure
```
backend/
├── src/
│   ├── services/
│   │   ├── email.service.ts       # Core email logic
│   │   └── templates.service.ts   # Email templates
│   ├── utils/
│   │   └── mailer.ts              # Nodemailer config
│   └── controllers/
│       └── auth.controller.ts     # Trigger emails
```

### Technology Stack
- **Nodemailer** - Send emails via SMTP
- **Handlebars** - Template engine for HTML emails
- **Bull Queue** (optional) - Queue emails for reliability

---

## Implementation Details

### 1. Nodemailer Configuration

**Install:**
```bash
npm install nodemailer
npm install @types/nodemailer --save-dev
npm install handlebars
npm install @types/handlebars --save-dev
```

**Config (src/utils/mailer.ts):**
```typescript
import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,     // abitur27portal@gmail.com
    pass: process.env.EMAIL_PASSWORD  // App password from Gmail
  }
});

// Test connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('Email service error:', error);
  } else {
    console.log('✅ Email service ready');
  }
});
```

**Environment Variables (.env):**
```bash
EMAIL_USER=abitur27portal@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM="Abitur 2027 Portal <abitur27portal@gmail.com>"
ADMIN_EMAIL=your-admin@email.com
FRONTEND_URL=https://yourschool.com
```

---

### 2. Email Service (src/services/email.service.ts)

```typescript
import { transporter } from '../utils/mailer';
import { renderTemplate } from './templates.service';

export class EmailService {
  
  async sendWelcomeEmail(user: User, tempPassword: string) {
    const html = renderTemplate('welcome', {
      username: user.username,
      tempPassword,
      loginUrl: process.env.FRONTEND_URL
    });
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: 'Willkommen beim Abitur 2027 Portal!',
      html
    });
    
    console.log(`Welcome email sent to ${user.email}`);
  }
  
  async sendPasswordReset(user: User, resetToken: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const html = renderTemplate('password-reset', {
      username: user.username,
      resetUrl,
      expiresIn: '1 Stunde'
    });
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: 'Passwort zurücksetzen - Abitur 2027 Portal',
      html
    });
    
    console.log(`Password reset email sent to ${user.email}`);
  }
  
  async sendEventNotification(event: Event, recipients: User[]) {
    const html = renderTemplate('event-notification', {
      title: event.title,
      description: event.description,
      date: event.date,
      location: event.location,
      budget: event.budget,
      eventUrl: `${process.env.FRONTEND_URL}/abi27/events/${event.id}`
    });
    
    // Send to all members
    const emailPromises = recipients.map(user => 
      transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: `Neues Event: ${event.title}`,
        html
      })
    );
    
    await Promise.all(emailPromises);
    console.log(`Event notification sent to ${recipients.length} users`);
  }
  
  async sendAdminAlert(type: string, data: any) {
    const adminEmail = process.env.ADMIN_EMAIL;
    
    const html = renderTemplate('admin-alert', {
      type,
      data: JSON.stringify(data, null, 2),
      timestamp: new Date().toLocaleString('de-DE')
    });
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: adminEmail,
      subject: `[ADMIN] ${type}`,
      html
    });
    
    console.log(`Admin alert sent: ${type}`);
  }
}

export const emailService = new EmailService();
```

---

### 3. Email Templates Service

Create HTML email templates that are responsive and professional. Include all 4 template types with German text and modern styling.

---

## Integration Points

### User Creation
```typescript
// When admin creates user
await emailService.sendWelcomeEmail(user, tempPassword);
```

### Password Reset
```typescript
// When user requests reset
await emailService.sendPasswordReset(user, resetToken);
```

### Event Posted
```typescript
// When new event created
const members = await getEssensgruppeMembers();
await emailService.sendEventNotification(event, members);
```

### Admin Alerts
```typescript
// When suspicious activity detected
await emailService.sendAdminAlert('Suspicious Activity', {
  user: username,
  action: 'Multiple failed login attempts',
  ip: req.ip
});
```

---

## Error Handling

### Retry Logic
```typescript
async function sendEmailWithRetry(sendFn: () => Promise<void>, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await sendFn();
      return;
    } catch (error) {
      console.error(`Email send attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### Failed Email Logging
```typescript
// Log failed emails to database
await db.failedEmails.create({
  recipient: user.email,
  type: 'welcome',
  error: error.message,
  data: { username: user.username }
});
```

---

## Security

### Rate Limiting
```typescript
// Limit password reset requests
app.use('/api/auth/reset-password', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3
}));
```

### Token Expiration
- Password reset: 1 hour
- Email verification: 24 hours
- Always hash tokens in database

### Validation
```typescript
import validator from 'validator';

if (!validator.isEmail(email)) {
  throw new Error('Invalid email');
}
```

---

## Testing

### Development Mode
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('📧 Would send email to:', user.email);
  return; // Don't actually send
}
```

---

## Environment Variables

```bash
EMAIL_USER=abitur27portal@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM="Abitur 2027 Portal <abitur27portal@gmail.com>"
ADMIN_EMAIL=your-admin@email.com
FRONTEND_URL=https://yourschool.com
NODE_ENV=production
```

---

## Deliverables

1. Nodemailer configuration
2. Email service with 4 email types
3. Professional HTML templates (German, responsive)
4. Integration with auth/events controllers
5. Error handling and retry logic
6. Rate limiting on sensitive endpoints
7. Email logging system
8. Setup documentation

---

## Build Instructions for Claude Code

1. Install nodemailer and handlebars
2. Create email service with all methods
3. Create 4 beautiful HTML templates in German
4. Integrate with existing controllers
5. Add environment variable validation
6. Implement retry logic
7. Add rate limiting
8. Create email logging
9. Test each email type
10. Document in README
