const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  credential: applicationDefault(),
  projectId: 'coramdeo-prod',
});

async function run() {
  // Check the named 'coramdeo' database (prod)
  const db = getFirestore('coramdeo');
  const snapshot = await db.collectionGroup('devices').get();
  console.log(`\n=== Found ${snapshot.size} device token(s) in coramdeo-prod/coramdeo DB ===\n`);
  snapshot.forEach(doc => {
    const d = doc.data();
    console.log(`Path: ${doc.ref.path}`);
    console.log(`  token:       ${d.token ? d.token.substring(0, 30) + '...' : 'MISSING'}`);
    console.log(`  platform:    ${d.platform}`);
    console.log(`  environment: ${d.environment}`);
    console.log(`  enabled:     ${d.notificationsEnabled}`);
    console.log(`  lastSeen:    ${d.lastSeenAt?.toDate?.() || d.lastSeenAt}`);
    console.log('');
  });
}
run().catch(console.error);
