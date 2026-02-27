import nodemailer from 'nodemailer';

if (!process.env.RESEND_API_KEY) {
  console.warn('⚠️  RESEND_API_KEY not set — email sending disabled');
}

export const transporter = nodemailer.createTransport({
  host: 'smtp.resend.com',
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: 'resend',
    pass: process.env.RESEND_API_KEY,
  },
});

// Verify connection on startup (non-fatal)
transporter.verify((error) => {
  if (error) {
    console.error('❌ Email service error:', error.message);
  } else {
    console.log('✅ Email service ready');
  }
});
