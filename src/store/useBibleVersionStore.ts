import { getUserPreferences, saveUserPreferences } from '@/utils/bibleApi';
import { create } from 'zustand';

interface BibleVersionState {
  activeTranslation: string | number;
  isLoaded: boolean;
  /** Load from AsyncStorage — call once on app start */
  loadTranslation: () => Promise<void>;
  /** Persist + broadcast a new translation choice */
  setTranslation: (id: string | number) => Promise<void>;
}

export const useBibleVersionStore = create<BibleVersionState>((set, get) => ({
  activeTranslation: '',
  isLoaded: false,

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
}));
