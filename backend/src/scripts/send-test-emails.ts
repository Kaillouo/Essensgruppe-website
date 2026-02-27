/**
 * Test script — sends the 3 main email templates to a given address.
 * Usage: npx tsx src/scripts/send-test-emails.ts your@email.com
 */
import { config } from 'dotenv';
config();

const to = process.argv[2] || 'chunkaiyu321@gmail.com';
const testUser = { username: 'MaxMustermann', email: to };

async function run() {
  const {
    sendVerificationEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
  } = await import('../services/email.service');

  console.log(`\nSending 3 email templates to ${to}...\n`);

  try {
    await sendVerificationEmail(testUser, 'test-token-abc123-xyz456');
    console.log('✅ [1/3] E-Mail bestätigen sent');
  } catch (e: any) {
    console.error('❌ [1/3] FAILED:', e.message);
  }

  try {
    await sendWelcomeEmail(testUser);
    console.log('✅ [2/3] Willkommen sent');
  } catch (e: any) {
    console.error('❌ [2/3] FAILED:', e.message);
  }

  try {
    await sendPasswordResetEmail(testUser, 'reset-token-def789');
    console.log('✅ [3/3] Passwort zurücksetzen sent');
  } catch (e: any) {
    console.error('❌ [3/3] FAILED:', e.message);
  }

  console.log('\nDone! Check your inbox.\n');
}

run().catch(console.error);
