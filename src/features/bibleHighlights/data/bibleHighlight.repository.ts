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
  onSnapshot,
} from 'firebase/firestore';
import type { BibleHighlight } from '../domain/bibleHighlight.types';
import { commentRepository } from '@/features/comments/data/comment.repository';

const COLLECTION_NAME = 'bibleVerseHighlights';

export const bibleHighlightRepository = {
  async createHighlight(highlight: Omit<BibleHighlight, 'id' | 'createdAt' | 'updatedAt' | 'likes' | 'likedBy' | 'commentCount'>): Promise<BibleHighlight> {
    const highlightsRef = collection(getActiveDb(), COLLECTION_NAME);
    
    // We can use a deterministic ID based on visibility, passage, verses, and user
    // This prevents creating duplicate private highlights for the same verses
    const idPrefix = highlight.visibility === 'church' ? 'pub' : 'priv';
    const id = `${idPrefix}_${highlight.passageId}_${highlight.verseNumbers.join('-')}_${highlight.userId}`;
    const newHighlightRef = doc(highlightsRef, id);

    const newHighlight: any = {
      ...highlight,
      id,
      likes: 0,
      likedBy: [],
      commentCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'active',
    };

    await setDoc(newHighlightRef, newHighlight);
    return newHighlight as any as BibleHighlight;
  },

  async updateHighlight(id: string, updates: Partial<Omit<BibleHighlight, 'id' | 'createdAt'>>): Promise<void> {
    const highlightRef = doc(getActiveDb(), COLLECTION_NAME, id);
    
    const finalUpdates = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(highlightRef, finalUpdates);
  },

  async getHighlight(id: string): Promise<BibleHighlight | null> {
    const highlightRef = doc(getActiveDb(), COLLECTION_NAME, id);
    const snapshot = await getDoc(highlightRef);
    if (!snapshot.exists()) return null;
    return snapshot.data() as BibleHighlight;
  },

  async getUserHighlights(userId: string): Promise<BibleHighlight[]> {
    const highlightsRef = collection(getActiveDb(), COLLECTION_NAME);
    const q = query(
      highlightsRef,
      where('userId', '==', userId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as BibleHighlight);
  },
  
  async getUserHighlightsForPassage(userId: string, passageId: string): Promise<BibleHighlight[]> {
    const highlightsRef = collection(getActiveDb(), COLLECTION_NAME);
    const q = query(
      highlightsRef,
      where('userId', '==', userId),
      where('passageId', '==', passageId),
      where('status', '==', 'active')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as BibleHighlight);
  },
  
  subscribeUserHighlightsForPassage(userId: string, passageId: string, onData: (highlights: BibleHighlight[]) => void, onError?: (error: Error) => void) {
    if (!userId || !passageId) {
      onData([]);
      return () => {};
    }
    const q = query(
      collection(getActiveDb(), COLLECTION_NAME),
      where('userId', '==', userId),
      where('passageId', '==', passageId),
      where('status', '==', 'active')
    );
    return onSnapshot(
      q,
      (snapshot) => {
        onData(snapshot.docs.map((d) => d.data() as BibleHighlight));
      },
      (err) => {
        console.error('[BibleHighlightRepository] Error listening to user highlights:', err);
        onError?.(err);
      }
    );
  },

  async getChurchHighlights(churchId: string, pageSize = 10, lastDoc?: any) {
    let q = query(
      collection(getActiveDb(), COLLECTION_NAME),
      where('churchId', '==', churchId),
      where('visibility', '==', 'church'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    if (lastDoc) {
      const { startAfter } = await import('firebase/firestore');
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const posts = snapshot.docs.map((d) => d.data() as BibleHighlight);
    return { posts, lastDoc: snapshot.docs[snapshot.docs.length - 1] };
  },

  subscribeChurchHighlights(
    churchId: string,
    onData: (highlights: BibleHighlight[]) => void,
    pageLimit: number = 10,
    onError?: (error: Error) => void
  ) {
    if (!churchId) {
      onData([]);
      return () => {};
    }

    const q = query(
      collection(getActiveDb(), COLLECTION_NAME),
      where('churchId', '==', churchId),
      where('visibility', '==', 'church'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(pageLimit)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        onData(snapshot.docs.map((d) => d.data() as BibleHighlight));
      },
      (err) => {
        console.error('[BibleHighlightRepository] Error listening to church highlights:', err);
        onError?.(err);
      }
    );
  },

  async deleteHighlight(id: string): Promise<void> {
    const highlightRef = doc(getActiveDb(), COLLECTION_NAME, id);
    // Hard delete private highlights or soft delete church posts
    const snapshot = await getDoc(highlightRef);
    if (!snapshot.exists()) return;
    
    const highlight = snapshot.data() as BibleHighlight;
    if (highlight.visibility === 'church') {
      await updateDoc(highlightRef, {
        status: 'deleted',
        updatedAt: serverTimestamp(),
      });
      // Delete associated comments
      try {
        if (highlight.churchId) {
          await commentRepository.deleteAllCommentsForTarget(highlight.churchId, 'church_highlight', id);
        }
      } catch (e) {}
    } else {
      // For private highlights, we can just delete the document entirely to save space
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(highlightRef);
    }
  },

  async toggleLike(highlightId: string, userId: string): Promise<void> {
    const highlightRef = doc(getActiveDb(), COLLECTION_NAME, highlightId);
    await runTransaction(getActiveDb(), async (transaction) => {
      const docSnap = await transaction.get(highlightRef);
      if (!docSnap.exists()) {
        throw new Error('Highlight does not exist!');
      }

      const data = docSnap.data() as BibleHighlight;
      const likedBy = data.likedBy || [];
      const hasLiked = likedBy.includes(userId);

      if (hasLiked) {
        transaction.update(highlightRef, {
          likedBy: arrayRemove(userId),
          likes: increment(-1),
        });
      } else {
        transaction.update(highlightRef, {
          likedBy: arrayUnion(userId),
          likes: increment(1),
        });
      }
    });
  }
};
