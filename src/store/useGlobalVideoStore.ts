import { create } from 'zustand';

export type PlayerMode = 'hidden' | 'minimized' | 'expanded';

interface GlobalVideoState {
  activeSermonId: string | null;
  playerMode: PlayerMode;
  openVideo: (sermonId: string) => void;
  closeVideo: () => void;
  minimize: () => void;
  expand: () => void;
}

export const useGlobalVideoStore = create<GlobalVideoState>((set) => ({
  activeSermonId: null,
  playerMode: 'hidden',
  openVideo: (sermonId: string) =>
    set({
      activeSermonId: sermonId,
      playerMode: 'expanded',
    }),
  closeVideo: () =>
    set({
      activeSermonId: null,
      playerMode: 'hidden',
    }),
  minimize: () =>
    set({
      playerMode: 'minimized',
    }),
  expand: () =>
    set({
      playerMode: 'expanded',
    }),
}));
