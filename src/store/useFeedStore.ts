import { create } from 'zustand';
import { churchHighlightRepository, type ChurchHighlightPost } from '../features/bible/data/churchHighlight.repository';
import { sermonRepository } from '../features/sermons/data/sermon.repository';
import { prayerRepository } from '../features/prayer/data/prayer.repository';
import type { SermonNote } from '../features/sermons/domain/sermon.types';
import type { Prayer } from '../features/prayer/domain/prayer.types';

interface FeedStore {
  churchHighlights: ChurchHighlightPost[];
  highlightsLoading: boolean;
  hasMoreHighlights: boolean;
  pageLimit: number;
  
  notes: SermonNote[];
  notesLoading: boolean;

  prayers: Prayer[];
  prayersLoading: boolean;

  initializeFeedsListener: () => () => void;
  loadMoreHighlights: () => void;
  clearFeedsListener: () => void;
}

let highlightsUnsubscribe: (() => void) | null = null;
let prayersUnsubscribe: (() => void) | null = null;
let feedsSubscriberCount = 0;

export const useFeedStore = create<FeedStore>((set, get) => ({
  churchHighlights: [],
  highlightsLoading: true,
  hasMoreHighlights: true,
  pageLimit: 10,
  
  notes: [],
  notesLoading: true,

  prayers: [],
  prayersLoading: true,

  initializeFeedsListener: () => {
    feedsSubscriberCount += 1;
    
    if (feedsSubscriberCount === 1) {
      const { useAuthStore } = require('./useAuthStore');
      const userProfile = useAuthStore.getState().userProfile;
      const currentUser = useAuthStore.getState().currentUser;
      const churchId = userProfile?.churchId || (userProfile as any)?.church_id;
      
      if (churchId) {
        // 1. Subscribe to highlights
        const subscribeHighlights = (limit: number) => {
          if (highlightsUnsubscribe) highlightsUnsubscribe();
          highlightsUnsubscribe = churchHighlightRepository.subscribeChurchHighlights(
            churchId,
            (posts) => {
              set({ churchHighlights: posts, highlightsLoading: false, hasMoreHighlights: posts.length >= limit });
            },
            limit,
            (err) => {
              set({ highlightsLoading: false });
            }
          );
        };
        subscribeHighlights(get().pageLimit);

        // 2. Subscribe to prayers
        if (!prayersUnsubscribe) {
          prayersUnsubscribe = prayerRepository.subscribeToPrayers(
            churchId,
            (nextPrayers) => {
              set({ prayers: nextPrayers, prayersLoading: false });
            },
            (error: any) => {
              set({ prayersLoading: false });
            }
          );
        }

        // 3. Fetch notes (one time)
        if (currentUser?.uid) {
          set({ notesLoading: true });
          sermonRepository
            .fetchUserNotes(currentUser.uid, churchId)
            .then((userNotes) => {
              set({ notes: userNotes || [], notesLoading: false });
            })
            .catch((err) => {
              console.warn('Failed to fetch user notes:', err);
              set({ notesLoading: false });
            });
        } else {
            set({ notesLoading: false });
        }
      } else {
        set({ highlightsLoading: false, prayersLoading: false, notesLoading: false });
      }
    }

    return () => {
      feedsSubscriberCount = Math.max(0, feedsSubscriberCount - 1);
      if (feedsSubscriberCount === 0) {
        if (highlightsUnsubscribe) {
          highlightsUnsubscribe();
          highlightsUnsubscribe = null;
        }
        if (prayersUnsubscribe) {
          prayersUnsubscribe();
          prayersUnsubscribe = null;
        }
      }
    };
  },
  
  loadMoreHighlights: () => {
    const { pageLimit } = get();
    const newLimit = pageLimit + 10;
    set({ pageLimit: newLimit });
    
    const { useAuthStore } = require('./useAuthStore');
    const churchId = useAuthStore.getState().userProfile?.churchId || (useAuthStore.getState().userProfile as any)?.church_id;
    
    if (churchId) {
      if (highlightsUnsubscribe) highlightsUnsubscribe();
      highlightsUnsubscribe = churchHighlightRepository.subscribeChurchHighlights(
        churchId,
        (posts) => {
          set({ churchHighlights: posts, highlightsLoading: false, hasMoreHighlights: posts.length >= newLimit });
        },
        newLimit,
        (err) => {
          set({ highlightsLoading: false });
        }
      );
    }
  },

  clearFeedsListener: () => {
    if (highlightsUnsubscribe) {
      highlightsUnsubscribe();
      highlightsUnsubscribe = null;
    }
    if (prayersUnsubscribe) {
      prayersUnsubscribe();
      prayersUnsubscribe = null;
    }
    feedsSubscriberCount = 0;
    set({ 
      churchHighlights: [], highlightsLoading: false, pageLimit: 10, hasMoreHighlights: true,
      prayers: [], prayersLoading: false,
      notes: [], notesLoading: false 
    });
  },
}));
