const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
initializeApp({ projectId: "coramdeo-prod" });

async function run() {
  const db = getFirestore('coramdeo');
  const doc = await db.collection('churches').doc('scFcxDcAR7vVJWGUn9TS').collection('prayer_requests').doc('CAddfFcB9PGVufCaO4eL').get();
  console.log('Prayer exists?', doc.exists);
  if (doc.exists) console.log(doc.data());
}
run().catch(console.error);
