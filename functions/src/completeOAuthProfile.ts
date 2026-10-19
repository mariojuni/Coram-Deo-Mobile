import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

export const completeOAuthProfile = onCall(
  {
    region: 'asia-southeast1',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be authenticated to perform this action.');
    }

    const uid = request.auth.uid;
    const data = request.data;
    const db = getFirestore(admin.app(), 'coramdeo');

    try {
      const userRef = db.collection('users').doc(uid);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        throw new HttpsError('not-found', 'User document not found.');
      }

      // Check if username is taken
      if (data.username) {
        const usernameQuery = await db.collection('users').where('username', '==', data.username).get();
        if (!usernameQuery.empty) {
          const matchedDoc = usernameQuery.docs[0];
          if (matchedDoc.id !== uid) {
            throw new HttpsError('already-exists', 'Username is already taken.');
          }
        }
      }

      const updates: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        onboardingStatus: 'COMPLETED',
      };

      if (data.firstName !== undefined) updates.firstName = data.firstName;
      if (data.middleName !== undefined) updates.middleName = data.middleName;
      if (data.lastName !== undefined) updates.lastName = data.lastName;
      if (data.phoneNumber !== undefined) updates.phoneNumber = data.phoneNumber;
      if (data.birthDate !== undefined) {
        updates.birthDate = data.birthDate;
        updates.birthday = data.birthDate;
      }
      if (data.gender !== undefined) updates.gender = data.gender;
      if (data.address !== undefined) updates.address = data.address;
      if (data.emergencyContact !== undefined) updates.emergencyContact = data.emergencyContact;
      if (data.username !== undefined) updates.username = data.username;

      await userRef.update(updates);

      return { ok: true, message: 'Profile completed successfully.' };
    } catch (error: any) {
      console.error('[completeOAuthProfile] Error:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', 'An error occurred while updating the profile.');
    }
  }
);
