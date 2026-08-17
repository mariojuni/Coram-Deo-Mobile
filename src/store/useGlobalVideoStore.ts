import { create } from 'zustand';

export type PlayerMode = 'hidden' | 'minimized' | 'expanded';

export interface OriginRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GlobalVideoState {
  activeSermonId: string | null;
  playerMode: PlayerMode;
  originRect: OriginRect | null;
  openVideo: (sermonId: string, originRect?: OriginRect) => void;
  closeVideo: () => void;
  minimize: () => void;
  expand: () => void;
}

export const useGlobalVideoStore = create<GlobalVideoState>((set) => ({
  activeSermonId: null,
  playerMode: 'hidden',
  originRect: null,
  openVideo: (sermonId: string, originRect?: OriginRect) =>
    set({
      activeSermonId: sermonId,
      playerMode: 'expanded',
      originRect: originRect || null,
    }),
  closeVideo: () =>
    set({
      activeSermonId: null,
      playerMode: 'hidden',
      originRect: null,
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
