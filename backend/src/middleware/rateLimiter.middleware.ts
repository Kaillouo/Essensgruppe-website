import rateLimit from 'express-rate-limit';

// Login rate limiter: 5 attempts per minute
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Too many login attempts, please try again after a minute' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter: 20 requests per minute
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Registration rate limiter: 3 attempts per hour
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { error: 'Too many registration attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Forgot-password rate limiter: 5 requests per 15 minutes per IP
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Zu viele Anfragen. Bitte versuche es in 15 Minuten erneut.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Reset-password rate limiter: 5 requests per 15 minutes per IP
export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Zu viele Anfragen. Bitte versuche es in 15 Minuten erneut.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI chat rate limiter: 10 requests per minute per IP
export const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Zu viele KI-Anfragen. Bitte warte eine Minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});
