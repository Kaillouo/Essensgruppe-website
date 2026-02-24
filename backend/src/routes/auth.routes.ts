import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '../utils/prisma.util';
import { hashPassword, comparePassword } from '../utils/password.util';
import { generateToken } from '../utils/jwt.util';
import { loginLimiter, registerLimiter, forgotPasswordLimiter, resetPasswordLimiter } from '../middleware/rateLimiter.middleware';
import { AuthResponse } from '../types';
import { sendVerificationEmail, sendWelcomeEmail, sendAdminNewUserAlert, sendPasswordResetEmail } from '../services/email.service';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  identifier: z.string(), // username or email
  password: z.string(),
});

// POST /api/auth/register — submit join request with email verification
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if registration is open
    const setting = await prisma.appSetting.findUnique({ where: { key: 'REGISTRATION_OPEN' } });
    if (setting && setting.value === 'false') {
      return res.status(403).json({ error: 'Registrierung ist derzeit geschlossen.' });
    }

    // Check username conflict — PENDING accounts are stale (unverified), clean them up
    const existingUsername = await prisma.user.findUnique({ where: { username: data.username } });
    if (existingUsername) {
      if (existingUsername.status === 'PENDING') {
        await prisma.emailVerification.deleteMany({ where: { userId: existingUsername.id } });
        await prisma.user.delete({ where: { id: existingUsername.id } });
      } else {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Check email conflict — same logic: clean up stale PENDING accounts
    const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingEmail) {
      if (existingEmail.status === 'PENDING') {
        await prisma.emailVerification.deleteMany({ where: { userId: existingEmail.id } });
        await prisma.user.delete({ where: { id: existingEmail.id } });
      } else {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash,
        status: 'PENDING',
        emailVerified: false,
        balance: 1000,
      },
    });

    // Create verification token (24h expiry)
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.emailVerification.create({
      data: { userId: user.id, token, expiresAt },
    });

    // Send verification email (non-fatal if it fails)
    try {
      await sendVerificationEmail({ username: user.username, email: user.email }, token);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }

    // Notify admin of new registration (non-fatal)
    sendAdminNewUserAlert({ username: user.username, email: user.email }).catch(() => {});

    res.status(201).json({ message: 'Registrierung erfolgreich! Überprüfe dein Postfach und bestätige deine E-Mail-Adresse.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/verify-email — activate account after email click
// Uses POST (not GET) so email scanner pre-fetching doesn't consume the token
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const verification = await prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification) {
      return res.status(400).json({ error: 'Dieser Bestätigungslink wurde bereits verwendet oder ist ungültig.' });
    }

    if (verification.expiresAt < new Date()) {
      await prisma.emailVerification.deleteMany({ where: { token } });
      return res.status(400).json({ error: 'Der Bestätigungslink ist abgelaufen. Bitte registriere dich erneut.' });
    }

    // Already verified — idempotent: return success so repeated/double clicks always work
    if (verification.user.status === 'ACTIVE') {
      return res.json({ message: 'E-Mail erfolgreich bestätigt! Du kannst dich jetzt einloggen.' });
    }

    // Activate user
    await prisma.user.update({
      where: { id: verification.userId },
      data: { status: 'ACTIVE', emailVerified: true },
    });

    // Create initial balance transaction
    await prisma.transaction.create({
      data: {
        userId: verification.userId,
        amount: 1000,
        type: 'INITIAL_BALANCE',
      },
    });

    // Keep the token in DB until it expires naturally (24h).
    // This makes the endpoint idempotent: repeated clicks within 24h always succeed.
    // After expiry the token is gone and returns "already used" above.

    // Send welcome email (non-fatal)
    sendWelcomeEmail({ username: verification.user.username, email: verification.user.email }).catch(() => {});

    res.json({ message: 'E-Mail erfolgreich bestätigt! Du kannst dich jetzt einloggen.' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /api/auth/login — login by username or email
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    // Find by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: data.identifier },
          { email: data.identifier },
        ],
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const isValidPassword = await comparePassword(data.password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    if (user.status === 'PENDING') {
      return res.status(403).json({ error: 'Bitte bestätige zuerst deine E-Mail-Adresse.' });
    }

    if (user.status === 'BANNED') {
      return res.status(403).json({ error: 'Your account has been banned.' });
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    const response: AuthResponse = {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.balance,
        avatarUrl: user.avatarUrl,
      },
    };

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/forgot-password — request a password reset link
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'E-Mail-Adresse erforderlich.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // PENDING = registered but not verified yet — tell them clearly
    if (user && user.status === 'PENDING') {
      return res.status(400).json({ error: 'Diese E-Mail-Adresse wurde noch nicht bestätigt. Bitte überprüfe dein Postfach und klicke den Bestätigungslink.' });
    }

    // Non-existent or other non-active status — generic message to avoid leaking
    const OK = { message: 'Falls ein Account mit dieser E-Mail existiert, erhältst du in Kürze eine E-Mail.' };

    if (!user || user.status !== 'ACTIVE') return res.json(OK);

    // Delete any existing reset token
    await prisma.passwordReset.deleteMany({ where: { userId: user.id } });

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordReset.create({ data: { userId: user.id, token, expiresAt } });

    await sendPasswordResetEmail({ username: user.username, email: user.email }, token);

    res.json(OK);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

// POST /api/auth/reset-password — set new password using a valid token
router.post('/reset-password', resetPasswordLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || typeof token !== 'string' || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Ungültige Anfrage.' });
    }

    const reset = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!reset) {
      return res.status(400).json({ error: 'Ungültiger oder bereits verwendeter Link.' });
    }

    if (reset.expiresAt < new Date()) {
      await prisma.passwordReset.delete({ where: { token } });
      return res.status(400).json({ error: 'Der Link ist abgelaufen. Bitte fordere einen neuen an.' });
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } });
    await prisma.passwordReset.delete({ where: { token } });

    res.json({ message: 'Passwort erfolgreich geändert. Du kannst dich jetzt einloggen.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Reset failed' });
  }
});

export default router;
