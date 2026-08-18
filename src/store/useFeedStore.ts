import { create } from 'zustand';
import { bibleHighlightRepository } from '../features/bibleHighlights/data/bibleHighlight.repository';
import type { BibleHighlight } from '../features/bibleHighlights/domain/bibleHighlight.types';
import { sermonRepository } from '../features/sermons/data/sermon.repository';
import { prayerRepository } from '../features/prayer/data/prayer.repository';
import type { SermonNote } from '../features/sermons/domain/sermon.types';
import type { Prayer } from '../features/prayer/domain/prayer.types';
import { bibleNoteRepository } from '../features/bibleNotes/data/bibleNote.repository';
import type { BibleNote } from '../features/bibleNotes/domain/bibleNote.types';

export type FeedNoteItem = 
  | (SermonNote & { _type: 'sermon' })
  | (BibleNote & { _type: 'bible' });

interface FeedStore {
  churchHighlights: BibleHighlight[];
  highlightsLoading: boolean;
  hasMoreHighlights: boolean;
  pageLimit: number;
  
  notes: FeedNoteItem[];
  notesLoading: boolean;

  prayers: Prayer[];
  prayersLoading: boolean;

  feedError: string | null;

  initializeFeedsListener: () => () => void;
  loadMoreHighlights: () => void;
  clearFeedsListener: () => void;
  retryFeeds: () => void;
  removeNote: (id: string) => void;
  toggleNoteLike: (id: string, uid: string) => void;
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

  feedError: null,

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
          highlightsUnsubscribe = bibleHighlightRepository.subscribeChurchHighlights(
            churchId,
            (posts) => {
              set({ churchHighlights: posts, highlightsLoading: false, hasMoreHighlights: posts.length >= limit, feedError: null });
            },
            limit,
            (err) => {
              set({ highlightsLoading: false, feedError: 'Failed to load highlights. Please try again.' });
            }
          );
        };
        subscribeHighlights(get().pageLimit);

        // 2. Subscribe to prayers
        if (!prayersUnsubscribe) {
          prayersUnsubscribe = prayerRepository.subscribeToPrayers(
            churchId,
            (nextPrayers) => {
              set({ prayers: nextPrayers, prayersLoading: false, feedError: null });
            },
            (error: any) => {
              set({ prayersLoading: false, feedError: 'Failed to load prayers. Please try again.' });
            }
          );
        }

        // 3. Fetch notes (one time)
        if (currentUser?.uid) {
          set({ notesLoading: true });
          Promise.all([
            sermonRepository.fetchUserNotes(currentUser.uid, churchId).catch(err => []),
            bibleNoteRepository.getChurchNotes(churchId).catch(err => [])
          ]).then(([sermonNotes, bibleNotes]) => {
            const combined: FeedNoteItem[] = [
              ...sermonNotes.map(n => ({ ...n, _type: 'sermon' as const })),
              ...bibleNotes.map(n => ({ ...n, _type: 'bible' as const }))
            ];
            combined.sort((a, b) => {
              const timeA = a.createdAt && (a.createdAt as any).toDate ? (a.createdAt as any).toDate().getTime() : (a.createdAt ? new Date(a.createdAt as any).getTime() : 0);
              const timeB = b.createdAt && (b.createdAt as any).toDate ? (b.createdAt as any).toDate().getTime() : (b.createdAt ? new Date(b.createdAt as any).getTime() : 0);
              return timeB - timeA;
            });
            set({ notes: combined, notesLoading: false, feedError: null });
          }).catch(err => {
            console.warn('Failed to fetch combined notes:', err);
            set({ notesLoading: false, feedError: 'Failed to load notes. Please try again.' });
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
      highlightsUnsubscribe = bibleHighlightRepository.subscribeChurchHighlights(
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
      notes: [], notesLoading: false,
      feedError: null
    });
  },

  retryFeeds: () => {
    // Clear and restart the feeds listener for the current church
    get().clearFeedsListener();
    get().initializeFeedsListener();
  },

  removeNote: (id: string) => {
    set((state) => ({
      notes: state.notes.filter(n => n.id !== id)
    }));
  },

  toggleNoteLike: (id: string, uid: string) => {
    set((state) => ({
      notes: state.notes.map(n => {
        if (n.id !== id) return n;
        if (n._type === 'sermon') return n;
        const likedBy = n.likedBy || [];
        const isLiked = likedBy.includes(uid);
        const nextLikedBy = isLiked
          ? likedBy.filter((userId: string) => userId !== uid)
          : [...likedBy, uid];
        return {
          ...n,
          likes: Math.max(0, (n.likes || 0) + (isLiked ? -1 : 1)),
          likedBy: nextLikedBy,
        };
      })
    }));
  },
}));
