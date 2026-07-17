import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

export const syncUserNameOnUpdate = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    const nameChanged = beforeData.firstName !== afterData.firstName || beforeData.lastName !== afterData.lastName;
    const photoChanged = beforeData.photoUrl !== afterData.photoUrl;

    // Check if either name or photo actually changed
    if (!nameChanged && !photoChanged) {
      return null;
    }

    const newName = [afterData.firstName, afterData.lastName].filter(Boolean).join(' ');
    const newPhotoUrl = afterData.photoUrl || null;
    const userId = context.params.userId;

    console.log(`User ${userId} changed profile. Syncing...`);

    const batch = db.batch();
    
    // We need to query prayer_requests and comments across ALL churches.
    // In Firestore, if we need to query subcollections across all parents, we use a Collection Group query.
    // However, if we don't have collection group indexes, we might have to query them per church.
    // Let's assume we can query them via collectionGroup if we have it, 
    // or just assume we know the user's churchId.
    // Since users belong to a specific churchId (afterData.churchId), we can query that church directly.
    const churchId = afterData.churchId;
    if (!churchId) {
      console.log('User has no churchId. Skipping sync.');
      return null;
    }

    try {
      // 1. Update Prayer Requests
      // Depending on the exact fields: requesterName, name, createdBy vs userId.
      const prayersSnapshot = await db
        .collection('churches')
        .doc(churchId)
        .collection('prayer_requests')
        .where('userId', '==', userId)
        .get();

      prayersSnapshot.forEach((doc) => {
        // Also respect isAnonymous if they have it
        const data = doc.data();
        if (!data.isAnonymous) {
          const updates: any = {};
          if (nameChanged) {
            updates.name = newName;
            updates.requesterName = newName;
          }
          if (photoChanged) {
            updates.userPhotoUrl = newPhotoUrl;
          }
          batch.update(doc.ref, updates);
        }
      });

      // 2. Update Comments
      const commentsSnapshot = await db
        .collection('comments') // From your repository, it looks like comments is a root collection
        .where('userId', '==', userId)
        .get();

      commentsSnapshot.forEach((doc) => {
        const updates: any = {};
        if (nameChanged) updates.userName = newName;
        if (photoChanged) updates.userPhotoUrl = newPhotoUrl;
        batch.update(doc.ref, updates);
      });

      await batch.commit();
      console.log(`Successfully synced name for user ${userId}`);
    } catch (error) {
      console.error('Error syncing user names:', error);
    }

    return null;
  });
