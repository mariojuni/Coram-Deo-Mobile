import { create } from 'zustand';
import { worshipRepository } from '../features/worship/data/worship.repository';
import type { WorshipSetlist, WorshipSetlistItem } from '../features/worship/domain/worship.types';

interface WorshipStore {
  setlists: WorshipSetlist[];
  setlistsLoading: boolean;
  activeSetlistItems: WorshipSetlistItem[];
  setActiveSetlistItems: (items: WorshipSetlistItem[]) => void;
  initializeSetlistsListener: (churchId: string) => () => void;
  clearSetlistsListener: () => void;
}

let setlistsUnsubscribe: (() => void) | null = null;
let setlistsSubscriberCount = 0;
let currentChurchId: string | null = null;

export const useWorshipStore = create<WorshipStore>((set) => ({
  setlists: [],
  setlistsLoading: true,
  activeSetlistItems: [],
  setActiveSetlistItems: (items) => set({ activeSetlistItems: items }),
  initializeSetlistsListener: (churchId: string) => {
    // If churchId changes, we need to clear the old listener
    if (currentChurchId !== churchId && setlistsUnsubscribe) {
      setlistsUnsubscribe();
      setlistsUnsubscribe = null;
      setlistsSubscriberCount = 0;
    }

    currentChurchId = churchId;
    setlistsSubscriberCount += 1;

    if (!setlistsUnsubscribe) {
      setlistsUnsubscribe = worshipRepository.subscribeToSetlists(
        churchId,
        (nextSetlists) => {
          set({ setlists: nextSetlists, setlistsLoading: false });
        },
        (error: any) => {
          if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
            set({ setlistsLoading: false });
            return;
          }
          console.error('Error fetching setlists:', error);
          set({ setlistsLoading: false });
        }
      );
    }

    return () => {
      setlistsSubscriberCount = Math.max(0, setlistsSubscriberCount - 1);
      if (setlistsSubscriberCount === 0 && setlistsUnsubscribe) {
        setlistsUnsubscribe();
        setlistsUnsubscribe = null;
        currentChurchId = null;
      }
    };
  },
  clearSetlistsListener: () => {
    if (setlistsUnsubscribe) {
      setlistsUnsubscribe();
      setlistsUnsubscribe = null;
    }
    setlistsSubscriberCount = 0;
    currentChurchId = null;
    set({ setlists: [], setlistsLoading: false });
  },
}));
