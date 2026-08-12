import { create } from 'zustand';
import { worshipRepository } from '../features/worship/data/worship.repository';
import type { Song } from '../features/worship/domain/worship.types';

interface CommunitySongsStore {
  songs: Song[];
  songsLoading: boolean;
  songsError: string | null;
  initializeSongsListener: () => () => void;
  clearSongsListener: () => void;
}

let songsUnsubscribe: (() => void) | null = null;
let songsSubscriberCount = 0;

export const useCommunitySongsStore = create<CommunitySongsStore>((set) => ({
  songs: [],
  songsLoading: true,
  songsError: null,
  initializeSongsListener: () => {
    songsSubscriberCount += 1;

    if (!songsUnsubscribe) {
      const { useAuthStore } = require('./useAuthStore');
      const churchId = useAuthStore.getState().userProfile?.churchId || (useAuthStore.getState().userProfile as any)?.church_id;
      
      if (churchId) {
          set({ songsLoading: true, songsError: null });
          songsUnsubscribe = worshipRepository.subscribeToCommunitySongs(
            churchId,
            (data) => {
              set({ songs: data, songsLoading: false });
            },
            (err) => {
              console.warn('Community songs error:', err);
              set({ songsError: 'We could not load the songs. Please try again.', songsLoading: false });
            }
          );
      } else {
          set({ songsLoading: false });
      }
    }

    return () => {
      songsSubscriberCount = Math.max(0, songsSubscriberCount - 1);
      if (songsSubscriberCount === 0 && songsUnsubscribe) {
        songsUnsubscribe();
        songsUnsubscribe = null;
      };
    };
  },
  clearSongsListener: () => {
    if (songsUnsubscribe) {
      songsUnsubscribe();
      songsUnsubscribe = null;
    }
    songsSubscriberCount = 0;
    set({ songs: [], songsLoading: false, songsError: null });
  },
}));
