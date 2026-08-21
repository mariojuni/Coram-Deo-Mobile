import { create } from 'zustand';
import { onSnapshot, doc } from 'firebase/firestore';
import { getActiveDb } from '../firebase';
import { NotificationRepository, UserNotificationState } from '../services/notification/NotificationRepository';

import * as Notifications from 'expo-notifications';

interface NotificationState {
  unreadCount: number;
  loading: boolean;
  setUnreadCount: (count: number) => void;
  initializeListener: (userId: string) => () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  loading: true,
  setUnreadCount: (count) => {
    const unread = Math.max(0, count);
    set({ unreadCount: unread });
    Notifications.setBadgeCountAsync(unread).catch(console.warn);
  },
  initializeListener: (userId: string) => {
    if (!userId) return () => {};

    const db = getActiveDb();
    const stateRef = doc(db, 'userNotificationState', userId);
    
    set({ loading: true });
    
    const unsubscribe = onSnapshot(stateRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data() as UserNotificationState;
        const unread = Math.max(0, data.unreadCount || 0);
        set({ unreadCount: unread, loading: false });
        Notifications.setBadgeCountAsync(unread).catch(console.warn);
      } else {
        set({ unreadCount: 0, loading: false });
        Notifications.setBadgeCountAsync(0).catch(console.warn);
      }
    }, (error: any) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        set({ loading: false });
        return;
      }
      console.error('Error in userNotificationState listener:', error);
      set({ loading: false });
    });

    return unsubscribe;
  },
}));
