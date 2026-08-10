/**
 * Test script: trigger a Firebase password reset email for a given email address
 * using the production Firebase project (coramdeo-prod).
 *
 * Run from project root:
 *   node scripts/test_password_reset.js
 */

const admin = require('../functions/node_modules/firebase-admin');
const { getAuth } = require('../functions/node_modules/firebase-admin/auth');

const PROJECT_ID = 'coramdeo-prod';

const app = admin.initializeApp({
  projectId: PROJECT_ID,
}, 'reset-test-app');

async function main() {
  const auth = getAuth(app);
  const testEmail = 'junikarencristhel@gmail.com'; // Karen's email

  console.log(`\n🔑 Testing password reset for: ${testEmail}`);
  console.log(`   Project: ${PROJECT_ID}\n`);

  try {
    // First check if the user exists in Firebase Auth
    const userRecord = await auth.getUserByEmail(testEmail);
    console.log(`✅ User found in Firebase Auth:`);
    console.log(`   UID:        ${userRecord.uid}`);
    console.log(`   Email:      ${userRecord.email}`);
    console.log(`   Verified:   ${userRecord.emailVerified}`);
    console.log(`   Providers:  ${userRecord.providerData.map(p => p.providerId).join(', ')}`);
    console.log(`   Disabled:   ${userRecord.disabled}`);
    console.log('');

    // Generate a password reset link
    const resetLink = await auth.generatePasswordResetLink(testEmail);
    console.log(`✅ Password reset link generated successfully!`);
    console.log(`   This confirms Firebase Auth can generate the reset link.`);
    console.log(`\n   Reset Link (for manual testing):\n   ${resetLink}\n`);
    console.log('⚠️  NOTE: This link was generated but NOT emailed automatically via Admin SDK.');
    console.log('   The app uses sendPasswordResetEmail() which sends via Firebase\'s email service.');
    console.log('   If the email is not being received, check:');
    console.log('   1. Firebase Console → Authentication → Templates → Password reset');
    console.log('   2. Whether a custom email domain is configured (may need DNS/SMTP setup)');
    console.log('   3. The user\'s spam/junk folder');
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.error(`❌ User NOT found in Firebase Auth for email: ${testEmail}`);
      console.error(`   This means the email address is not registered in coramdeo-prod Firebase Auth.`);
    } else {
      console.error(`❌ Error:`, err.code, err.message);
    }
  }

  process.exit(0);
}

main().catch(e => {
  console.error('Script failed:', e);
  process.exit(1);
});
