/**
 * Diagnostic script: check which Firestore database (default vs named 'coramdeo')
 * each of the given user UIDs lives in.
 *
 * Run from project root:
 *   node scripts/check_db_users.js
 */

const admin = require('../functions/node_modules/firebase-admin');

const PROJECT_ID = 'coramdeo-prod';
const NAMED_DB = 'coramdeo';

const USER_IDS = [
  'RkKtCOA5OdTCvPFOjz78fYuPo8p1',
  'MPwB0cS0eBg7ipzL7j2fnspUp533',
  'jYv5uUW03rYIIlykcTaVcQvTGUk1',
];

// Init two separate apps — one for each database
const defaultApp = admin.initializeApp({
  projectId: PROJECT_ID,
}, 'default-db-app');

const namedApp = admin.initializeApp({
  projectId: PROJECT_ID,
  databaseURL: `https://${PROJECT_ID}.firebaseio.com`,
}, 'named-db-app');

const defaultDb = admin.firestore(defaultApp);
defaultDb.settings({ databaseId: '(default)' });

const namedDb = admin.firestore(namedApp);
namedDb.settings({ databaseId: NAMED_DB });

async function checkUser(uid) {
  const results = { uid, defaultDb: null, namedDb: null };

  // Check (default) database
  try {
    const snap = await defaultDb.collection('users').doc(uid).get();
    if (snap.exists) {
      const d = snap.data();
      results.defaultDb = {
        docId: snap.id,
        name: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
        email: d.email || '',
        authUid: d.authUid || '',
        status: d.status || '',
        churchId: d.churchId || '',
        providers: d.providers || [],
      };
    } else {
      // Try by authUid field
      const qSnap = await defaultDb.collection('users').where('authUid', '==', uid).get();
      if (!qSnap.empty) {
        const d = qSnap.docs[0].data();
        results.defaultDb = {
          docId: qSnap.docs[0].id,
          note: '(found via authUid field, not doc ID)',
          name: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
          email: d.email || '',
          authUid: d.authUid || '',
          status: d.status || '',
          churchId: d.churchId || '',
          providers: d.providers || [],
        };
      }
    }
  } catch (e) {
    results.defaultDb = { error: e.message };
  }

  // Check named 'coramdeo' database
  try {
    const snap = await namedDb.collection('users').doc(uid).get();
    if (snap.exists) {
      const d = snap.data();
      results.namedDb = {
        docId: snap.id,
        name: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
        email: d.email || '',
        authUid: d.authUid || '',
        status: d.status || '',
        churchId: d.churchId || '',
        providers: d.providers || [],
      };
    } else {
      // Try by authUid field
      const qSnap = await namedDb.collection('users').where('authUid', '==', uid).get();
      if (!qSnap.empty) {
        const d = qSnap.docs[0].data();
        results.namedDb = {
          docId: qSnap.docs[0].id,
          note: '(found via authUid field, not doc ID)',
          name: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
          email: d.email || '',
          authUid: d.authUid || '',
          status: d.status || '',
          churchId: d.churchId || '',
          providers: d.providers || [],
        };
      }
    }
  } catch (e) {
    results.namedDb = { error: e.message };
  }

  return results;
}

async function main() {
  console.log(`\n🔍 Checking users across databases in project: ${PROJECT_ID}\n`);
  console.log(`   (default) = Firestore default database`);
  console.log(`   ${NAMED_DB}   = Named Firestore database used by production app\n`);
  console.log('─'.repeat(70));

  for (const uid of USER_IDS) {
    const result = await checkUser(uid);
    console.log(`\nUID: ${uid}`);
    if (result.defaultDb) {
      console.log(`  ✅ Found in (default) DB:`, JSON.stringify(result.defaultDb, null, 4).split('\n').join('\n  '));
    } else {
      console.log(`  ❌ NOT found in (default) DB`);
    }
    if (result.namedDb) {
      console.log(`  ✅ Found in '${NAMED_DB}' DB:`, JSON.stringify(result.namedDb, null, 4).split('\n').join('\n  '));
    } else {
      console.log(`  ❌ NOT found in '${NAMED_DB}' DB`);
    }
  }

  console.log('\n' + '─'.repeat(70));
  console.log('\n📋 DIAGNOSIS SUMMARY:');
  console.log('  If a user is ONLY in (default) → their login will silently fail in production.');
  console.log('  If a user is ONLY in "coramdeo" → they are correctly set up.\n');

  process.exit(0);
}

main().catch(e => {
  console.error('Script failed:', e);
  process.exit(1);
});
