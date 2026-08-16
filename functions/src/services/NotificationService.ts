import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export type NotificationCategory =
  | 'prayer'
  | 'serve'
  | 'event'
  | 'discipleship'
  | 'worship'
  | 'giving'
  | 'announcement'
  | 'system'
  | 'social';

export interface CreateNotificationParams {
  userId: string;
  churchId?: string;
  category: NotificationCategory;
  type: string;
  title: string;
  body: string;
  sourceType?: string;
  sourceId?: string;
  navigation?: {
    destination: string;
    params?: any;
  };
  actorUserId?: string;
  actorMemberId?: string;
}

export class NotificationService {
  /**
   * Creates an in-app notification in Firestore and attempts to send a push notification.
   */
  static async createUserNotification(params: CreateNotificationParams): Promise<void> {
    const databaseName = process.env.GCLOUD_PROJECT === 'coramdeo-prod' ? 'coramdeo' : '(default)';
    const db = getFirestore(admin.app(), databaseName);
    const notificationId = db.collection('_').doc().id; // Generate random ID

    const notificationData = {
      id: notificationId,
      ...params,
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const notificationRef = db.doc(`userNotifications/${params.userId}/items/${notificationId}`);
    const stateRef = db.doc(`userNotificationState/${params.userId}`);

    try {
      // 1. Write the notification and increment unread count transactionally
      await db.runTransaction(async (transaction) => {
        // Reads must come before writes
        const stateDoc = await transaction.get(stateRef);

        transaction.set(notificationRef, notificationData);

        if (stateDoc.exists) {
          const count = stateDoc.data()?.unreadCount || 0;
          transaction.update(stateRef, { 
            unreadCount: count + 1, 
            updatedAt: admin.firestore.FieldValue.serverTimestamp() 
          });
        } else {
          transaction.set(stateRef, {
            userId: params.userId,
            unreadCount: 1,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      });

      // 2. Try to send FCM push
      await this.sendPushToUser(params.userId, params);

    } catch (error) {
      console.error(`Error creating notification for user ${params.userId}:`, error);
    }
  }

  /**
   * Sends FCM push notification strictly to matching environment tokens.
   */
  private static async sendPushToUser(userId: string, params: CreateNotificationParams): Promise<void> {
    const databaseName = process.env.GCLOUD_PROJECT === 'coramdeo-prod' ? 'coramdeo' : '(default)';
    const db = getFirestore(admin.app(), databaseName);
    
    // We determine our current backend environment using process.env or project id.
    // Assuming standard Firebase setups, `GCLOUD_PROJECT` has the project ID.
    // e.g., 'coramdeo-prod' vs 'coramdeo-staging'
    const projectId = process.env.GCLOUD_PROJECT || '';
    const isProduction = projectId.includes('prod');
    const targetEnvironment = isProduction ? 'production' : 'staging';

    try {
      const tokensSnap = await db.collection(`userPushTokens/${userId}/devices`)
        .where('notificationsEnabled', '==', true)
        .where('environment', '==', targetEnvironment)
        .get();

      if (tokensSnap.empty) {
        return; // No tokens for this user in this environment
      }

      const tokens: string[] = [];
      tokensSnap.forEach(doc => {
        const data = doc.data();
        if (data.token) tokens.push(data.token);
      });

      if (tokens.length === 0) return;

      const payload = {
        notification: {
          title: params.title,
          body: params.body,
        },
        data: {
          category: params.category,
          sourceType: params.sourceType || '',
          sourceId: params.sourceId || '',
          // pass navigation object stringified if needed
        }
      };

      const response = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: payload.notification,
        data: payload.data,
        // Required for iOS push notifications when app is closed/backgrounded
        apns: {
          headers: {
            'apns-priority': '10', // High priority = immediate delivery
          },
          payload: {
            aps: {
              'content-available': 1, // Wake app in background
              sound: 'default',
              badge: 1,
            },
          },
        },
        android: {
          priority: 'high',
        },
      });

      // 3. Clean up invalid tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errCode = resp.error?.code;
            if (
              errCode === 'messaging/invalid-registration-token' ||
              errCode === 'messaging/registration-token-not-registered'
            ) {
              failedTokens.push(tokens[idx]);
            }
          }
        });

        if (failedTokens.length > 0) {
          const batch = db.batch();
          tokensSnap.docs.forEach(doc => {
            if (failedTokens.includes(doc.data().token)) {
              batch.delete(doc.ref);
            }
          });
          await batch.commit();
        }
      }
    } catch (error) {
      console.error(`Error sending push to user ${userId}:`, error);
    }
  }

  /**
   * Deletes all notifications associated with a given sourceId across all users.
   * Useful when the underlying entity (prayer request, comment) is deleted.
   */
  static async deleteNotificationsBySource(sourceId: string): Promise<void> {
    if (!sourceId) return;

    const databaseName = process.env.GCLOUD_PROJECT === 'coramdeo-prod' ? 'coramdeo' : '(default)';
    const db = getFirestore(admin.app(), databaseName);

    try {
      const snap = await db.collectionGroup('items').where('sourceId', '==', sourceId).get();
      if (snap.empty) return;

      const batch = db.batch();
      const userUnreadDecrements = new Map<string, number>();

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
      console.log(`Deleted ${snap.size} notifications for sourceId ${sourceId}`);
    } catch (error) {
      console.error(`Error deleting notifications for source ${sourceId}:`, error);
    }
  }
}
