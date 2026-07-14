import { create } from 'zustand';
import { SermonPlaybackProgress } from '../features/sermons/domain/sermon.types';
import { sermonRepository } from '../features/sermons/data/sermon.repository';

interface SermonPlaybackState {
  progresses: Record<string, SermonPlaybackProgress>; // Key: sermonId
  dismissedSermons: Record<string, boolean>; // Key: sermonId
  loading: boolean;
  
  loadProgress: (userId: string, sermonId: string) => Promise<SermonPlaybackProgress | null>;
  loadAllProgresses: (userId: string) => Promise<void>;
  updateProgress: (
    churchId: string,
    userId: string, 
    sermonId: string, 
    mediaType: 'audio' | 'video', 
    positionSeconds: number, 
    durationSeconds: number
  ) => Promise<void>;
  getProgress: (sermonId: string) => SermonPlaybackProgress | undefined;
  getInProgressSermons: () => SermonPlaybackProgress[];
  clearProgress: (sermonId: string) => void;
  dismissSermon: (sermonId: string) => void;
  unhideSermon: (sermonId: string) => void;
}

export const useSermonPlaybackStore = create<SermonPlaybackState>((set, get) => ({
  progresses: {},
  dismissedSermons: {},
  loading: false,

  loadProgress: async (userId, sermonId) => {
    try {
      const progress = await sermonRepository.fetchProgress(userId, sermonId);
      if (progress) {
        set((state) => ({
          progresses: {
            ...state.progresses,
            [sermonId]: progress,
          },
        }));
      }
      return progress;
    } catch (error) {
      console.error('Error loading progress:', error);
      return null;
    }
  },

  loadAllProgresses: async (userId) => {
    set({ loading: true });
    try {
      const all = await sermonRepository.fetchAllProgresses(userId);
      const progressMap: Record<string, SermonPlaybackProgress> = {};
      all.forEach((p) => {
        progressMap[p.sermonId] = p;
      });
      set({ progresses: progressMap, loading: false });
    } catch (error) {
      console.error('Error loading all progresses:', error);
      set({ loading: false });
    }
  },

  updateProgress: async (churchId, userId, sermonId, mediaType, positionSeconds, durationSeconds) => {
    const progressPercent = durationSeconds > 0 ? (positionSeconds / durationSeconds) * 100 : 0;
    const completed = progressPercent >= 95;

    const progress: SermonPlaybackProgress = {
      churchId,
      userId,
      sermonId,
      mediaType,
      positionSeconds,
      durationSeconds,
      progressPercent,
      completed,
      lastPlayedAt: new Date(),
      createdAt: get().progresses[sermonId]?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };

    // Optimistic local update
    set((state) => ({
      progresses: {
        ...state.progresses,
        [sermonId]: progress,
      },
    }));

    try {
      await sermonRepository.saveProgress(
        churchId,
        userId,
        sermonId,
        mediaType,
        positionSeconds,
        durationSeconds
      );
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  },

  getProgress: (sermonId) => {
    return get().progresses[sermonId];
  },

  getInProgressSermons: () => {
    const progresses = get().progresses;
    const dismissedSermons = get().dismissedSermons;
    return Object.values(progresses).filter(
      (p) => p.positionSeconds > 5 && !p.completed && !dismissedSermons[p.sermonId]
    ).sort((a, b) => b.lastPlayedAt.getTime() - a.lastPlayedAt.getTime());
  },

  clearProgress: (sermonId) => {
    set((state) => {
      const next = { ...state.progresses };
      delete next[sermonId];
      return { progresses: next };
    });
  },

  dismissSermon: (sermonId) => {
    set((state) => ({
      dismissedSermons: { ...state.dismissedSermons, [sermonId]: true }
    }));
  },

  unhideSermon: (sermonId) => {
    set((state) => ({
      dismissedSermons: { ...state.dismissedSermons, [sermonId]: false }
    }));
  },
}));
