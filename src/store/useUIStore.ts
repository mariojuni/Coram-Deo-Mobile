import { create } from 'zustand';

interface UIStore {
  tabBarVisible: boolean;
  setTabBarVisible: (visible: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  tabBarVisible: true,
  setTabBarVisible: (visible) => set({ tabBarVisible: visible }),
}));
