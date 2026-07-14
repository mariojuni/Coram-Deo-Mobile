import {
    addDoc,
    collection,
    doc,
    limit,
    onSnapshot,
    orderBy,
    query,
    runTransaction,
    updateDoc,
    deleteDoc,
} from 'firebase/firestore';
import { db } from '../../../firebase';
import type { Prayer } from '../domain/prayer.types';

type PrayersListener = (prayers: Prayer[]) => void;
type ErrorListener = (error: Error) => void;

function toPrayerModel(data: Record<string, unknown>, id: string): Prayer {
  return {
    id,
    name: typeof data.requesterName === 'string' ? data.requesterName : (typeof data.name === 'string' ? data.name : ''),
    request: typeof data.requestText === 'string' ? data.requestText : (typeof data.request === 'string' ? data.request : ''),
    title: typeof data.title === 'string' ? data.title : undefined,
    content: typeof data.content === 'string' ? data.content : undefined,
    category: typeof data.category === 'string' ? (data.category as any) : undefined,
    visibility: typeof data.visibility === 'string' ? (data.visibility as any) : undefined,
    isAnonymous: typeof data.isAnonymous === 'boolean' ? data.isAnonymous : undefined,
    prayedCount: typeof data.prayedCount === 'number' ? data.prayedCount : undefined,
    userId: typeof data.userId === 'string' ? data.userId : '',
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : undefined,
    answered: Boolean(data.answered) || data.status === 'answered',
    status: typeof data.status === 'string' ? (data.status as any) : undefined,
    likes: typeof data.likes === 'number' ? data.likes : 0,
    likedBy: Array.isArray(data.likedBy) ? data.likedBy.filter((v): v is string => typeof v === 'string') : [],
    createdAt: (data.createdAt as Prayer['createdAt']) ?? null,
    updatedAt: (data.updatedAt as Prayer['updatedAt']) ?? null,
  };
}

export const prayerRepository = {
  subscribeToPrayers(churchId: string | undefined | null, onData: PrayersListener, onError: ErrorListener): () => void {
    if (!churchId) return () => {};
    const prayerQuery = query(collection(db, `churches/${churchId}/prayer_requests`), orderBy('createdAt', 'desc'));

    return onSnapshot(
      prayerQuery,
      (snapshot) => {
        const prayers = snapshot.docs.map((docSnap) => toPrayerModel(docSnap.data() as Record<string, unknown>, docSnap.id));
        onData(prayers);
      },
      (error) => {
        onError(error);
      }
    );
  },

  subscribeToLatestPrayer(
    churchId: string | undefined | null,
    onData: (prayer: Prayer | null) => void,
    onError: ErrorListener
  ): () => void {
    if (!churchId) return () => {};
    const latestPrayerQuery = query(collection(db, `churches/${churchId}/prayer_requests`), orderBy('createdAt', 'desc'), limit(1));

    return onSnapshot(
      latestPrayerQuery,
      (snapshot) => {
        if (snapshot.empty) {
          onData(null);
          return;
        }
        const first = snapshot.docs[0];
        onData(toPrayerModel(first.data() as Record<string, unknown>, first.id));
      },
      (error) => {
        onError(error);
      }
    );
  },

  async togglePrayerLike(churchId: string, prayerId: string, userId: string): Promise<void> {
    const prayerDocRef = doc(db, `churches/${churchId}/prayer_requests`, prayerId);

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(prayerDocRef);
      if (!snapshot.exists()) {
        throw new Error(`Prayer with id "${prayerId}" was not found`);
      }

      const data = snapshot.data();
      const likedBy = Array.isArray(data.likedBy) ? data.likedBy.filter((v): v is string => typeof v === 'string') : [];
      const likes = typeof data.likes === 'number' ? data.likes : 0;
      const alreadyLiked = likedBy.includes(userId);

      const nextLikedBy = alreadyLiked ? likedBy.filter((uid) => uid !== userId) : [...likedBy, userId];
      const nextLikes = alreadyLiked ? Math.max(0, likes - 1) : likes + 1;

      transaction.update(prayerDocRef, { likedBy: nextLikedBy, likes: nextLikes });
    });
  },

  async togglePrayerAnswered(churchId: string, prayerId: string, currentValue: boolean): Promise<void> {
    const prayerDocRef = doc(db, `churches/${churchId}/prayer_requests`, prayerId);
    const nextValue = !currentValue;
    await updateDoc(prayerDocRef, { 
      answered: nextValue,
      status: nextValue ? 'answered' : 'pending'
    });
  },

  async addPrayer(churchId: string, payload: { requestText: string; requesterName: string; userId: string; createdAt?: string }): Promise<string> {
    const docRef = await addDoc(collection(db, `churches/${churchId}/prayer_requests`), {
      requestText: payload.requestText,
      requesterName: payload.requesterName,
      userId: payload.userId,
      likes: 0,
      likedBy: [],
      answered: false,
      createdAt: payload.createdAt || new Date().toISOString(),
    });
    return docRef.id;
  },

  async submitPrayerRequest(payload: Omit<Prayer, 'id' | 'likes' | 'likedBy' | 'answered'>): Promise<string> {
    if (!payload.churchId) throw new Error('churchId is required');
    const docRef = await addDoc(collection(db, `churches/${payload.churchId}/prayer_requests`), {
      churchId: payload.churchId,
      userId: payload.userId,
      memberId: payload.memberId || null,
      title: payload.title,
      content: payload.content,
      category: payload.category,
      visibility: payload.visibility,
      isAnonymous: payload.isAnonymous,
      status: payload.status,
      prayedCount: 0,
      createdBy: payload.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // Legacy fallbacks for existing UI
      requestText: payload.content,
      requesterName: payload.isAnonymous ? 'Anonymous' : (payload.name || 'Anonymous'),
      likes: 0,
      likedBy: [],
      answered: false,
    });
    return docRef.id;
  },

  async updatePrayerRequest(churchId: string, prayerId: string, payload: Partial<Prayer>): Promise<void> {
    const docRef = doc(db, `churches/${churchId}/prayer_requests`, prayerId);
    
    // Ensure we also update legacy fields if title/content changes
    const updates: any = {
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    if (payload.content) {
      updates.requestText = payload.content;
    }
    
    await updateDoc(docRef, updates);
  },

  async deletePrayerRequest(churchId: string, prayerId: string): Promise<void> {
    const docRef = doc(db, `churches/${churchId}/prayer_requests`, prayerId);
    await deleteDoc(docRef);
  },
};
