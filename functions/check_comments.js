const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
initializeApp({ projectId: "coramdeo-prod" });

async function run() {
  const db = getFirestore('coramdeo');
  const snapshot = await db.collection('comments').orderBy('createdAt', 'desc').limit(5).get();
  console.log(`Found ${snapshot.size} recent comments`);
  for (const doc of snapshot.docs) {
    console.log(doc.id, doc.data());
  }
}
run().catch(console.error);
