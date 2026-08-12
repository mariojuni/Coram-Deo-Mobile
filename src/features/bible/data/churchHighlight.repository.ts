import { getActiveDb } from '@/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
} from 'firebase/firestore';

export interface ChurchHighlightPost {
  id: string;
  churchId: string;
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  passageId: string;
  bookName: string;
  chapter: number;
  verseNumber: number;
  verseRangeLabel: string;
  verseNumbers: number[];
  color: string;
  text: string;
  createdAt: any;
  likes: number;
  likedBy: string[];
  commentCount: number;
}

export interface PublishChurchHighlightInput {
  churchId: string;
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  passageId: string;
  bookName: string;
  chapter: number;
  verseNumber: number;
  verseRangeLabel: string;
  verseNumbers: number[];
  color: string;
  text?: string;
}

export const churchHighlightRepository = {
  /**
   * Publish or update a church highlight post
   */
  async publishChurchHighlight(input: PublishChurchHighlightInput): Promise<string> {
    if (!input.churchId || !input.userId) {
      console.warn('[ChurchHighlightRepository] Cannot publish highlight: missing churchId or userId', { churchId: input.churchId, userId: input.userId });
      return '';
    }

    // Do not publish or create empty highlight cards without verse text
    if (!input.text || !input.text.trim()) {
      return '';
    }

    try {
      // Create a deterministic ID per passage & merged verse range & user
      const docId = `${input.passageId}_${input.verseNumbers.join('-')}_${input.userId}`;
      const docRef = doc(getActiveDb(), `churches/${input.churchId}/verse_highlights`, docId);

      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await updateDoc(docRef, {
          color: input.color,
          text: input.text || '',
          updatedAt: serverTimestamp(),
        });
      } else {
        const postData: any = {
          id: docId,
          churchId: input.churchId,
          userId: input.userId,
          userName: input.userName,
          userPhotoUrl: input.userPhotoUrl || '',
          passageId: input.passageId,
          bookName: input.bookName,
          chapter: input.chapter,
          verseNumber: input.verseNumber,
          verseRangeLabel: input.verseRangeLabel,
          verseNumbers: input.verseNumbers,
          color: input.color,
          text: input.text || '',
          createdAt: serverTimestamp(),
          likes: 0,
          likedBy: [],
          commentCount: 0,
        };
        await setDoc(docRef, postData);
      }
      console.log('[ChurchHighlightRepository] Published church highlight successfully:', docId);
      return docId;
    } catch (error) {
      console.error('[ChurchHighlightRepository] Error publishing church highlight to Firestore:', error);
      return '';
    }
  },

  /**
   * Paginated fetch for church highlights feed
   */
  async getChurchHighlights(
    churchId: string,
    pageSize: number = 10,
    lastDoc?: any
  ) {
    if (!churchId) return { posts: [], lastDoc: undefined };

    let q = query(
      collection(getActiveDb(), `churches/${churchId}/verse_highlights`),
      limit(pageSize)
    );

    if (lastDoc) {
      const { startAfter } = await import('firebase/firestore');
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const posts: ChurchHighlightPost[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        churchId: data.churchId,
        userId: data.userId,
        userName: data.userName || 'Member',
        userPhotoUrl: data.userPhotoUrl || undefined,
        passageId: data.passageId,
        bookName: data.bookName,
        chapter: data.chapter,
        verseNumber: data.verseNumber,
        verseRangeLabel: data.verseRangeLabel || String(data.verseNumber),
        verseNumbers: data.verseNumbers || [data.verseNumber],
        color: data.color || 'yellow',
        text: data.text || '',
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date()),
        likes: data.likes || 0,
        likedBy: data.likedBy || [],
        commentCount: data.commentCount || 0,
      };
    });

    posts.sort((a, b) => {
      const timeA = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt || 0).getTime();
      const timeB = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return { posts, lastDoc: snapshot.docs[snapshot.docs.length - 1] };
  },

  /**
   * Real-time subscription to church highlights feed
   */
  subscribeChurchHighlights(
    churchId: string,
    onData: (highlights: ChurchHighlightPost[]) => void,
    pageLimit: number = 10,
    onError?: (error: Error) => void
  ) {
    if (!churchId) {
      onData([]);
      return () => {};
    }

    const q = query(
      collection(getActiveDb(), `churches/${churchId}/verse_highlights`),
      limit(pageLimit)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const posts: ChurchHighlightPost[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            churchId: data.churchId,
            userId: data.userId,
            userName: data.userName || 'Member',
            userPhotoUrl: data.userPhotoUrl || undefined,
            passageId: data.passageId,
            bookName: data.bookName,
            chapter: data.chapter,
            verseNumber: data.verseNumber,
            verseRangeLabel: data.verseRangeLabel || String(data.verseNumber),
            verseNumbers: data.verseNumbers || [data.verseNumber],
            color: data.color || 'yellow',
            text: data.text || '',
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date()),
            likes: data.likes || 0,
            likedBy: data.likedBy || [],
            commentCount: data.commentCount || 0,
          };
        });

        posts.sort((a, b) => {
          const timeA = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt || 0).getTime();
          const timeB = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        onData(posts);
      },
      (err) => {
        console.error('[ChurchHighlightRepository] Error listening to highlights subcollection:', err);
        onError?.(err);
      }
    );
  },

  /**
   * Toggle Like / Unlike on a church highlight
   */
  async toggleHighlightLike(churchId: string, highlightId: string, userId: string, isLiked: boolean) {
    if (!churchId || !highlightId || !userId) return;
    const docRef = doc(getActiveDb(), `churches/${churchId}/verse_highlights`, highlightId);

    try {
      if (isLiked) {
        await updateDoc(docRef, {
          likedBy: arrayRemove(userId),
          likes: increment(-1),
        });
      } else {
        await updateDoc(docRef, {
          likedBy: arrayUnion(userId),
          likes: increment(1),
        });
      }
    } catch (err) {
      console.error('[ChurchHighlightRepository] Failed to toggle like:', err);
    }
  },

  /**
   * Delete a church highlight post
   */
  async deleteHighlight(churchId: string, highlightId: string) {
    if (!churchId || !highlightId) return;
    try {
      await deleteDoc(doc(getActiveDb(), `churches/${churchId}/verse_highlights`, highlightId));
    } catch (err) {
      console.error('[ChurchHighlightRepository] Failed to delete highlight:', err);
    }
  },
};
