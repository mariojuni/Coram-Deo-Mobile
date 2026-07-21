import { create } from 'zustand';

import type { Prayer } from '@/features/prayer/domain/prayer.types';

interface UIStore {
  tabBarVisible: boolean;
  setTabBarVisible: (visible: boolean) => void;
  prayerModalOpen: boolean;
  editingPrayer: Prayer | null;
  syncToastMessage: string;
  openPrayerModal: (prayer?: Prayer) => void;
  closePrayerModal: () => void;
  setSyncToastMessage: (msg: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  tabBarVisible: true,
  setTabBarVisible: (visible) => set({ tabBarVisible: visible }),
  prayerModalOpen: false,
  editingPrayer: null,
  syncToastMessage: '',
  openPrayerModal: (prayer) => set({ prayerModalOpen: true, editingPrayer: prayer || null }),
  closePrayerModal: () => set({ prayerModalOpen: false, editingPrayer: null }),
  setSyncToastMessage: (msg) => set({ syncToastMessage: msg }),
}));
