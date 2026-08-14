const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
initializeApp({ projectId: "coramdeo-prod" });

async function run() {
  const db = getFirestore(); // Default DB
  const snapshot = await db.collection('userNotificationState').get();
  console.log(`Found ${snapshot.size} users with notifications in DEFAULT DB`);
  snapshot.forEach(doc => console.log(doc.id, doc.data()));
}
run().catch(console.error);
