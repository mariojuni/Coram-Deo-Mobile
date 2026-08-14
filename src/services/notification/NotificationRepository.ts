import { collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, Timestamp, updateDoc, where } from 'firebase/firestore';
import { getActiveDb } from '../../firebase';

export type NotificationCategory =
  | 'prayer'
  | 'serve'
  | 'event'
  | 'discipleship'
  | 'worship'
  | 'giving'
  | 'announcement'
  | 'sermon'
  | 'system'
  | 'social';

export interface AppNotification {
  id: string;
  userId: string;
  churchId?: string | null;
  category: NotificationCategory;
  type: string;
  title: string;
  body: string;
  sourceType?: string;
  sourceId?: string;
  navigation?: {
    destination: string;
    params?: Record<string, string | number | boolean>;
  };
  actorUserId?: string;
  actorMemberId?: string;
  actorName?: string;
  actorPhotoUrl?: string;
  isRead: boolean;
  readAt?: Timestamp | null;
  createdAt: Timestamp;
  expiresAt?: Timestamp | null;
}

export interface UserNotificationState {
  userId: string;
  unreadCount: number;
  updatedAt: Timestamp;
}

export class NotificationRepository {
  /**
   * Fetch a paginated list of notifications for a specific user.
   */
  static async getNotifications(userId: string, limitCount: number = 20): Promise<AppNotification[]> {
    if (!userId) return [];
    
    try {
      const db = getActiveDb();
      const q = query(
        collection(db, `userNotifications/${userId}/items`),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data
        } as AppNotification;
      });

      // Augment with actor data
      const augmentPromises = notifications.map(async (notif) => {
        if (notif.actorUserId && (!notif.actorName || !notif.actorPhotoUrl)) {
          try {
            const userDoc = await getDoc(doc(db, 'users', notif.actorUserId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              if (!notif.actorName) {
                notif.actorName = [userData.firstName, userData.lastName].filter(Boolean).join(' ') || userData.displayName || '';
              }
              if (!notif.actorPhotoUrl) {
                notif.actorPhotoUrl = userData.photoUrl || userData.photoURL || '';
              }
            }
          } catch (e) {
            console.warn('Failed to fetch actor user for notification:', notif.id, e);
          }
        }
        return notif;
      });

      return await Promise.all(augmentPromises);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Mark a single notification as read, and optionally decrement unread count via transaction.
   */
  static async markAsRead(userId: string, notificationId: string): Promise<void> {
    if (!userId || !notificationId) return;

    try {
      const db = getActiveDb();
      const notificationRef = doc(db, `userNotifications/${userId}/items`, notificationId);
      const stateRef = doc(db, 'userNotificationState', userId);

      await runTransaction(db, async (transaction) => {
        const notifDoc = await transaction.get(notificationRef);
        if (!notifDoc.exists()) {
          throw new Error('Notification does not exist');
        }

        const data = notifDoc.data() as AppNotification;
        if (data.isRead) {
          return; // already read
        }

        const stateDoc = await transaction.get(stateRef);

        transaction.update(notificationRef, {
          isRead: true,
          readAt: Timestamp.now()
        });

        if (stateDoc.exists()) {
          const currentState = stateDoc.data() as UserNotificationState;
          const newCount = Math.max(0, (currentState.unreadCount || 0) - 1);
          transaction.update(stateRef, { unreadCount: newCount, updatedAt: Timestamp.now() });
        }
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Mark all unread notifications as read and reset the unread count.
   */
  static async markAllAsRead(userId: string): Promise<void> {
    if (!userId) return;

    try {
      const db = getActiveDb();
      // Find all unread
      const unreadQuery = query(
        collection(db, `userNotifications/${userId}/items`),
        where('isRead', '==', false)
      );
      const snapshot = await getDocs(unreadQuery);

      if (snapshot.empty) return;

      const stateRef = doc(db, 'userNotificationState', userId);
      
      const chunks = [];
      let currentChunk = [];
      for (const d of snapshot.docs) {
        currentChunk.push(d);
        if (currentChunk.length === 490) { // Keep under 500 limit
          chunks.push(currentChunk);
          currentChunk = [];
        }
      }
      if (currentChunk.length > 0) chunks.push(currentChunk);
      
      for (const chunk of chunks) {
        await runTransaction(db, async (transaction) => {
          chunk.forEach(docSnap => {
            transaction.update(docSnap.ref, {
              isRead: true,
              readAt: Timestamp.now()
            });
          });
          
          const stateDoc = await transaction.get(stateRef);
          if (stateDoc.exists()) {
            transaction.update(stateRef, { unreadCount: 0, updatedAt: Timestamp.now() });
          } else {
             transaction.set(stateRef, { userId, unreadCount: 0, updatedAt: Timestamp.now() });
          }
        });
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  /**
   * Get unread count from the state document.
   */
  static async getUnreadCount(userId: string): Promise<number> {
    if (!userId) return 0;

    try {
      const db = getActiveDb();
      const stateRef = doc(db, 'userNotificationState', userId);
      const stateDoc = await getDoc(stateRef);
      if (stateDoc.exists()) {
        const data = stateDoc.data() as UserNotificationState;
        return data.unreadCount || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
}
