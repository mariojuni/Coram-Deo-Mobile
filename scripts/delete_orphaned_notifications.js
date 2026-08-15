const admin = require('firebase-admin');

// 1. Initialize Firebase Admin
// Make sure to set GOOGLE_APPLICATION_CREDENTIALS environment variable
// pointing to your service account key JSON file, OR run this where
// you are authenticated with gcloud.
admin.initializeApp({
  // Use the default project
});

const db = admin.firestore();

async function deleteOrphanedNotifications() {
  // If you know the specific sourceId of the deleted prayer request:
  const sourceId = 'VOG17W1zcVYYrrtZYJTk'; // Example from your logs, replace if different

  console.log(`Starting cleanup for orphaned notifications with sourceId: ${sourceId}`);

  try {
    const snap = await db.collectionGroup('items').where('sourceId', '==', sourceId).get();
    
    if (snap.empty) {
      console.log('No notifications found for this sourceId.');
      return;
    }

    const batch = db.batch();
    const userUnreadDecrements = new Map();

    snap.docs.forEach(doc => {
      batch.delete(doc.ref);
      const data = doc.data();
      if (data.isRead === false) {
        const userId = doc.ref.parent.parent?.id;
        if (userId) {
          userUnreadDecrements.set(userId, (userUnreadDecrements.get(userId) || 0) + 1);
        }
      }
    });

    for (const [userId, count] of userUnreadDecrements.entries()) {
      const stateRef = db.doc(`userNotificationState/${userId}`);
      batch.update(stateRef, {
        unreadCount: admin.firestore.FieldValue.increment(-count)
      });
    }

    await batch.commit();
    console.log(`Successfully deleted ${snap.size} orphaned notifications for sourceId ${sourceId}`);
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

deleteOrphanedNotifications()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
