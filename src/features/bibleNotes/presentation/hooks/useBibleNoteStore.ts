import { create } from 'zustand';
import type { BibleNoteScripture, BibleNoteVisibility } from '@/features/bibleNotes/domain/bibleNote.types';

interface BibleNoteState {
  noteContent: string;
  visibility: BibleNoteVisibility;
  scriptures: BibleNoteScripture[];
  noteIdToEdit: string | null;

  setNoteContent: (content: string) => void;
  setVisibility: (visibility: BibleNoteVisibility) => void;
  setScriptures: (scriptures: BibleNoteScripture[]) => void;
  addScripture: (scripture: BibleNoteScripture) => void;
  removeScripture: (index: number) => void;
  reset: () => void;
  initializeEditor: (initialScriptures: BibleNoteScripture[], noteId?: string | null, content?: string, visibility?: BibleNoteVisibility) => void;
}

export const useBibleNoteStore = create<BibleNoteState>((set) => ({
  noteContent: '',
  visibility: 'private',
  scriptures: [],
  noteIdToEdit: null,

  setNoteContent: (content) => set({ noteContent: content }),
  setVisibility: (visibility) => set({ visibility }),
  setScriptures: (scriptures) => set({ scriptures }),
  addScripture: (scripture) => set((state) => ({ scriptures: [...state.scriptures, scripture] })),
  removeScripture: (index) => set((state) => ({
    scriptures: state.scriptures.filter((_, i) => i !== index),
  })),
  reset: () => set({ noteContent: '', visibility: 'private', scriptures: [], noteIdToEdit: null }),
  initializeEditor: (initialScriptures, noteId = null, content = '', visibility = 'private') => set({
    scriptures: initialScriptures || [],
    noteIdToEdit: noteId,
    noteContent: content || '',
    visibility,
  }),
}));
