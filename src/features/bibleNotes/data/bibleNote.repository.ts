import { getActiveDb } from '@/firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction,
  arrayUnion,
  arrayRemove,
  increment,
  Query,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import type { BibleNote } from '../domain/bibleNote.types';

const COLLECTION_NAME = 'bibleNotes';

export const bibleNoteRepository = {
  async createNote(note: Omit<BibleNote, 'id' | 'createdAt' | 'updatedAt' | 'likes' | 'likedBy' | 'commentCount'>): Promise<BibleNote> {
    const notesRef = collection(getActiveDb(), COLLECTION_NAME);
    const newNoteRef = doc(notesRef);
    const id = newNoteRef.id;

    const newNote: any = {
      ...note,
      id,
      likes: 0,
      likedBy: [],
      commentCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'active',
    };

    if (note.visibility === 'church') {
      newNote.moderationStatus = 'published';
    }

    await setDoc(newNoteRef, newNote);
    return newNote as any as BibleNote;
  },

  async updateNote(id: string, updates: Partial<Omit<BibleNote, 'id' | 'createdAt'>>): Promise<void> {
    const noteRef = doc(getActiveDb(), COLLECTION_NAME, id);
    
    // Add updatedAt
    const finalUpdates = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    
    if (updates.visibility === 'church' && !updates.moderationStatus) {
      finalUpdates.moderationStatus = 'published';
    }

    await updateDoc(noteRef, finalUpdates);
  },

  async getNote(id: string): Promise<BibleNote | null> {
    const noteRef = doc(getActiveDb(), COLLECTION_NAME, id);
    const snapshot = await getDoc(noteRef);
    if (!snapshot.exists()) return null;
    return snapshot.data() as BibleNote;
  },

  async getUserNotes(userId: string): Promise<BibleNote[]> {
    const notesRef = collection(getActiveDb(), COLLECTION_NAME);
    const q = query(
      notesRef,
      where('userId', '==', userId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as BibleNote);
  },

  async getChurchNotes(churchId: string, limitCount = 50): Promise<BibleNote[]> {
    const notesRef = collection(getActiveDb(), COLLECTION_NAME);
    const q = query(
      notesRef,
      where('churchId', '==', churchId),
      where('visibility', '==', 'church'),
      where('status', '==', 'active'),
      where('moderationStatus', '==', 'published'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as BibleNote);
  },

  async deleteNote(id: string): Promise<void> {
    const noteRef = doc(getActiveDb(), COLLECTION_NAME, id);
    await updateDoc(noteRef, {
      status: 'deleted',
      updatedAt: serverTimestamp(),
    });
  },

  async toggleLike(noteId: string, userId: string): Promise<void> {
    const noteRef = doc(getActiveDb(), COLLECTION_NAME, noteId);
    await runTransaction(getActiveDb(), async (transaction) => {
      const noteDoc = await transaction.get(noteRef);
      if (!noteDoc.exists()) {
        throw new Error('Note does not exist!');
      }

      const note = noteDoc.data() as BibleNote;
      const likedBy = note.likedBy || [];
      const hasLiked = likedBy.includes(userId);

      if (hasLiked) {
        transaction.update(noteRef, {
          likedBy: arrayRemove(userId),
          likes: increment(-1),
        });
      } else {
        transaction.update(noteRef, {
          likedBy: arrayUnion(userId),
          likes: increment(1),
        });
      }
    });
  }
};
