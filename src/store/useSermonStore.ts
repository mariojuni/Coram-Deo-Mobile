import { create } from 'zustand';
import { sermonRepository } from '../features/sermons/data/sermon.repository';
import { downloadSermonMedia, deleteSermonMedia, getLocalSermonMediaUri } from '../features/sermons/services/sermonDownloadService';
import type {
  Sermon,
  SermonFilters,
  SermonNote,
  SermonDownload,
} from '../features/sermons/domain/sermon.types';

interface DownloadProgress {
  progress: number;
  isDownloading: boolean;
}

interface SermonState {
  // Sermons list
  sermons: Sermon[];
  loading: boolean;
  hasMore: boolean;
  lastDoc: any;
  filters: SermonFilters;
  searchQuery: string;

  // Current sermon
  currentSermon: Sermon | null;
  currentPosition: number;
  isPlaying: boolean;

  // Related sermons
  relatedSermons: Sermon[];
  relatedLoading: boolean;

  // Favorites
  favorites: Set<string>;
  favoritesLoading: boolean;

  // Notes
  notes: SermonNote[];
  notesLoading: boolean;

  // Downloads
  downloads: Map<string, DownloadProgress>;
  downloadedSermons: Set<string>;
  downloadsList: SermonDownload[];

  // Actions
  fetchSermons: (churchId: string | undefined, reset?: boolean) => Promise<void>;
  subscribeSermons: (churchId: string | undefined) => () => void;
  unsubscribeSermons: () => void;
  _unsubscribeSermons: (() => void) | null;
  searchSermons: (churchId: string | undefined, query: string) => Promise<void>;
  setSearchQuery: (churchId: string | undefined, query: string) => void;
  fetchSermonById: (id: string) => Promise<void>;
  fetchRelatedSermons: (sermon: Sermon) => Promise<void>;
  setFilters: (filters: Partial<SermonFilters>) => void;
  toggleFavorite: (userId: string, sermonId: string) => Promise<void>;
  loadFavorites: (userId: string) => Promise<void>;
  saveProgress: (churchId: string, userId: string, sermonId: string, mediaType: 'audio' | 'video', positionSeconds: number, durationSeconds: number) => Promise<void>;
  setCurrentPosition: (position: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  fetchNotes: (userId: string, sermonId: string) => Promise<void>;
  addNote: (note: Omit<SermonNote, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateNote: (noteId: string, content: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  downloadSermon: (userId: string, sermon: Sermon, mediaType?: 'audio' | 'video') => Promise<void>;
  deleteDownload: (userId: string, sermonId: string, mediaType?: 'audio' | 'video') => Promise<void>;
  loadDownloadedSermons: (userId: string) => Promise<void>;
  checkIfDownloaded: (userId: string, sermonId: string, mediaType?: 'audio' | 'video') => Promise<boolean>;
  clearCurrentSermon: () => void;
}

export const useSermonStore = create<SermonState>((set, get) => ({
  sermons: [],
  loading: false,
  hasMore: true,
  lastDoc: null,
  filters: {
    filter: 'all',
    sort: 'newest',
  },
  searchQuery: '',
  currentSermon: null,
  currentPosition: 0,
  isPlaying: false,
  relatedSermons: [],
  relatedLoading: false,
  favorites: new Set(),
  favoritesLoading: false,
  notes: [],
  notesLoading: false,
  downloads: new Map(),
  downloadedSermons: new Set(),
  downloadsList: [],
  _unsubscribeSermons: null,

  unsubscribeSermons: () => {
    const { _unsubscribeSermons } = get();
    if (_unsubscribeSermons) {
      _unsubscribeSermons();
      set({ _unsubscribeSermons: null });
    }
  },

  subscribeSermons: (churchId) => {
    get().unsubscribeSermons();

    if (!churchId) return () => {};

    set({ loading: true });

    const unsubscribe = sermonRepository.subscribeSermons(
      { ...get().filters, churchId },
      (sermons) => {
        set({ sermons, loading: false, hasMore: false });
      },
      (error) => {
        console.error('Error subscribing to sermons:', error);
        set({ loading: false });
      }
    );

    set({ _unsubscribeSermons: unsubscribe });
    return unsubscribe;
  },

  fetchSermons: async (churchId, reset = false) => {
    const { filters, lastDoc, loading, searchQuery } = get();
    if (loading) return;

    // If there's a search query, use search instead
    if (searchQuery.trim()) {
      return get().searchSermons(churchId, searchQuery);
    }

    set({ loading: true });

    try {
      const activeFilters = { ...filters, churchId };
      const result = await sermonRepository.fetchSermons(
        activeFilters,
        20,
        reset ? undefined : lastDoc
      );

      set((state) => ({
        sermons: reset ? result.sermons : [...state.sermons, ...result.sermons],
        lastDoc: result.lastDoc,
        hasMore: result.hasMore,
        loading: false,
      }));
    } catch (error) {
      console.error('Error fetching sermons:', error);
      set({ loading: false });
    }
  },

  searchSermons: async (churchId, query: string) => {
    const { filters } = get();

    set({ loading: true, searchQuery: query });

    if (!query.trim()) {
      // If query is empty, fetch normal sermons
      return get().fetchSermons(churchId, true);
    }

    try {
      const activeFilters = { ...filters, churchId };
      const result = await sermonRepository.searchSermons(query, activeFilters, 20);

      set({
        sermons: result.sermons,
        lastDoc: null,
        hasMore: result.hasMore,
        loading: false,
      });
    } catch (error) {
      console.error('Error searching sermons:', error);
      set({ loading: false });
    }
  },

  setSearchQuery: (churchId, query: string) => {
    set({ searchQuery: query });
    get().searchSermons(churchId, query);
  },

  fetchSermonById: async (id: string) => {
    set({ loading: true });
    try {
      const sermon = await sermonRepository.fetchSermonById(id);
      set({ currentSermon: sermon, loading: false });
      
      // Increment view count
      if (sermon) {
        sermonRepository.incrementViewCount(id);
      }
    } catch (error) {
      console.error('Error fetching sermon:', error);
      set({ loading: false });
    }
  },

  fetchRelatedSermons: async (sermon: Sermon) => {
    set({ relatedLoading: true });
    try {
      const related = await sermonRepository.fetchRelatedSermons(sermon);
      set({ relatedSermons: related, relatedLoading: false });
    } catch (error) {
      console.error('Error fetching related sermons:', error);
      set({ relatedLoading: false });
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      sermons: [],
      lastDoc: null,
      hasMore: true,
    }));
    // Note: setFilters will now just update the state. The component should call fetchSermons(churchId) after.
  },

  toggleFavorite: async (userId, sermonId) => {
    try {
      const isFavorited = await sermonRepository.toggleFavorite(userId, sermonId);
      set((state) => {
        const newFavorites = new Set(state.favorites);
        if (isFavorited) {
          newFavorites.add(sermonId);
        } else {
          newFavorites.delete(sermonId);
        }
        return { favorites: newFavorites };
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  },

  loadFavorites: async (userId) => {
    set({ favoritesLoading: true });
    try {
      const favoriteSermons = await sermonRepository.fetchFavorites(userId);
      const favoriteIds = new Set(favoriteSermons.map(s => s.id));
      set({ favorites: favoriteIds, favoritesLoading: false });
    } catch (error) {
      console.error('Error loading favorites:', error);
      set({ favoritesLoading: false });
    }
  },

  saveProgress: async (churchId, userId, sermonId, mediaType, positionSeconds, durationSeconds) => {
    try {
      await sermonRepository.saveProgress(churchId, userId, sermonId, mediaType, positionSeconds, durationSeconds);
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  },

  setCurrentPosition: (position) => set({ currentPosition: position }),

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  fetchNotes: async (userId, sermonId) => {
    set({ notesLoading: true });
    try {
      const notes = await sermonRepository.fetchNotes(userId, sermonId);
      set({ notes, notesLoading: false });
    } catch (error) {
      console.error('Error fetching notes:', error);
      set({ notesLoading: false });
    }
  },

  addNote: async (note) => {
    try {
      await sermonRepository.saveNote(note);
      get().fetchNotes(note.userId, note.sermonId);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  },

  updateNote: async (noteId, content) => {
    try {
      await sermonRepository.updateNote(noteId, content);
      // Refresh notes list
      const { currentSermon, notes } = get();
      if (currentSermon && notes.length > 0) {
        const firstNote = notes[0];
        get().fetchNotes(firstNote.userId, currentSermon.id);
      }
    } catch (error) {
      console.error('Error updating note:', error);
    }
  },

  deleteNote: async (noteId) => {
    try {
      await sermonRepository.deleteNote(noteId);
      // Remove from local state
      set((state) => ({
        notes: state.notes.filter(note => note.id !== noteId),
      }));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  },

  downloadSermon: async (userId: string, sermon: Sermon, mediaType?: 'audio' | 'video') => {
    const { downloads } = get();
    const typeToDownload = mediaType || (sermon.mediaType === 'video' ? 'video' : 'audio');
    const downloadKey = `${sermon.id}_${typeToDownload}`;
    
    // Set downloading state
    const newDownloads = new Map(downloads);
    newDownloads.set(downloadKey, { progress: 0, isDownloading: true });
    set({ downloads: newDownloads });

    try {
      const downloadUrl = typeToDownload === 'video' ? sermon.videoStoragePath : sermon.audioStoragePath;
      if (!downloadUrl) throw new Error(`No ${typeToDownload} url available`);
      
      await downloadSermonMedia(sermon, downloadUrl, typeToDownload, (progress) => {
        const updatedDownloads = new Map(get().downloads);
        updatedDownloads.set(downloadKey, { progress, isDownloading: true });
        set({ downloads: updatedDownloads });
      });

      // Mark as downloaded
      const finalDownloads = new Map(get().downloads);
      finalDownloads.delete(downloadKey);
      set({ 
        downloads: finalDownloads,
        downloadedSermons: new Set([...get().downloadedSermons, downloadKey])
      });
    } catch (error) {
      console.error('Error downloading sermon:', error);
      const errorDownloads = new Map(get().downloads);
      errorDownloads.delete(downloadKey);
      set({ downloads: errorDownloads });
      throw error;
    }
  },

  deleteDownload: async (userId: string, sermonId: string, mediaType?: 'audio' | 'video') => {
    try {
      const { currentSermon } = get();
      const typeToDelete = mediaType || (currentSermon?.mediaType === 'video' ? 'video' : 'audio');
      const downloadKey = `${sermonId}_${typeToDelete}`;

      if (currentSermon && currentSermon.id === sermonId) {
        await deleteSermonMedia(currentSermon, typeToDelete);
      }
      
      const newDownloaded = new Set(get().downloadedSermons);
      newDownloaded.delete(downloadKey);
      set({ downloadedSermons: newDownloaded });

    } catch (error) {
      console.error('Error deleting download:', error);
    }
  },

  loadDownloadedSermons: async (userId: string) => {
    try {
      const downloads = await sermonRepository.getDownloadedSermons(userId);
      set({
        downloadsList: downloads,
        downloadedSermons: new Set(downloads.map(d => `${d.sermonId}_audio`)) // Simplified mapping
      });
    } catch (error) {
      console.error('Error loading downloaded sermons:', error);
    }
  },

  checkIfDownloaded: async (userId: string, sermonId: string, mediaType?: 'audio' | 'video'): Promise<boolean> => {
    try {
      const { currentSermon } = get();
      const typeToCheck = mediaType || (currentSermon?.mediaType === 'video' ? 'video' : 'audio');

      if (currentSermon && currentSermon.id === sermonId) {
        const uri = await getLocalSermonMediaUri(currentSermon, typeToCheck);
        return uri !== null;
      }
      return false;
    } catch (error) {
      console.error('Error checking download status:', error);
      return false;
    }
  },

  clearCurrentSermon: () => {
    set({
      currentSermon: null,
      currentPosition: 0,
      isPlaying: false,
      notes: [],
    });
  },
}));
