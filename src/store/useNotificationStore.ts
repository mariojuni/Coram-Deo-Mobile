import { create } from 'zustand';
import { onSnapshot, doc } from 'firebase/firestore';
import { getActiveDb } from '../firebase';
import { NotificationRepository, UserNotificationState } from '../services/notification/NotificationRepository';

interface NotificationState {
  unreadCount: number;
  loading: boolean;
  setUnreadCount: (count: number) => void;
  initializeListener: (userId: string) => () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  loading: true,
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
  initializeListener: (userId: string) => {
    if (!userId) return () => {};

    const db = getActiveDb();
    const stateRef = doc(db, 'userNotificationState', userId);
    
    set({ loading: true });
    
    const unsubscribe = onSnapshot(stateRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data() as UserNotificationState;
        set({ unreadCount: Math.max(0, data.unreadCount || 0), loading: false });
      } else {
        set({ unreadCount: 0, loading: false });
      }
    }, (error) => {
      console.error('Error in userNotificationState listener:', error);
      set({ loading: false });
    });

    return unsubscribe;
  },
}));
