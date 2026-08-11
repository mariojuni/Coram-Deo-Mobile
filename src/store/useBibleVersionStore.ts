import { fetchVerseOfTheDay, getUserPreferences, saveUserPreferences } from '@/utils/bibleApi';
import { create } from 'zustand';

interface VotdData {
  html: string;
  reference: string;
  passageId: string;
}

interface BibleVersionState {
  activeTranslation: string | number;
  isLoaded: boolean;
  votdCache: Record<string, VotdData>;
  votdLoading: boolean;
  /** Load from AsyncStorage — call once on app start */
  loadTranslation: () => Promise<void>;
  /** Persist + broadcast a new translation choice */
  setTranslation: (id: string | number) => Promise<void>;
  /** Load the Verse of the Day */
  loadVotd: (translationId: string) => Promise<void>;
}

export const useBibleVersionStore = create<BibleVersionState>((set, get) => ({
  activeTranslation: '',
  isLoaded: false,
  votdCache: {},
  votdLoading: false,

  loadTranslation: async () => {
    if (get().isLoaded) return;
    try {
      const prefs = (await getUserPreferences()) as any;
      set({ activeTranslation: prefs?.activeTranslation ?? '', isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },

  setTranslation: async (id) => {
    set({ activeTranslation: id });
    try {
      const prefs = (await getUserPreferences()) as any;
      await saveUserPreferences({ ...(prefs ?? {}), activeTranslation: id });
    } catch {
      // non-fatal — in-memory state is already updated
    }
  },

  loadVotd: async (translationId: string) => {
    const { votdCache } = get();
    if (votdCache[translationId]) return; // Already in memory

    set({ votdLoading: true });
    try {
      const votd = await fetchVerseOfTheDay(translationId);
      if (votd) {
        set((state) => ({
          votdCache: {
            ...state.votdCache,
            [translationId]: {
              html: votd.html,
              reference: votd.reference,
              passageId: votd.passageId || (votd.data && votd.data.passage_id),
            },
          },
        }));
      }
    } catch (error) {
      console.error('Failed to load Verse of the Day', error);
    } finally {
      set({ votdLoading: false });
    }
  },
}));
