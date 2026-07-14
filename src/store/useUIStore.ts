import { create } from 'zustand';

import type { Prayer } from '@/features/prayer/domain/prayer.types';

interface UIStore {
  tabBarVisible: boolean;
  setTabBarVisible: (visible: boolean) => void;
  prayerModalOpen: boolean;
  editingPrayer: Prayer | null;
  openPrayerModal: (prayer?: Prayer) => void;
  closePrayerModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  tabBarVisible: true,
  setTabBarVisible: (visible) => set({ tabBarVisible: visible }),
  prayerModalOpen: false,
  editingPrayer: null,
  openPrayerModal: (prayer) => set({ prayerModalOpen: true, editingPrayer: prayer || null }),
  closePrayerModal: () => set({ prayerModalOpen: false, editingPrayer: null }),
}));
