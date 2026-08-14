const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./credentials.json');

initializeApp({
  credential: cert(serviceAccount)
});

async function run() {
  const db = getFirestore('coramdeo');
  const snapshot = await db.collectionGroup('devices').get();
  console.log(`Found ${snapshot.size} device tokens`);
  snapshot.forEach(doc => {
    console.log(doc.ref.path, doc.data());
  });
}
run().catch(console.error);
