const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
// Just use default application credentials, the firebase cli seems to be logged in!
initializeApp({
  projectId: "coramdeo-prod" // or "nazarenechurch-9c030"
});

async function run() {
  const db = getFirestore('coramdeo');
  const snapshot = await db.collection('userNotificationState').get();
  console.log(`Found ${snapshot.size} users with notifications`);
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data());
  });
}
run().catch(console.error);
