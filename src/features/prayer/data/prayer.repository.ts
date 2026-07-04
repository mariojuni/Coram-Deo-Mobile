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
    userId: typeof data.userId === 'string' ? data.userId : '',
    answered: Boolean(data.answered),
    likes: typeof data.likes === 'number' ? data.likes : 0,
    likedBy: Array.isArray(data.likedBy) ? data.likedBy.filter((v): v is string => typeof v === 'string') : [],
    createdAt: (data.createdAt as Prayer['createdAt']) ?? null,
  };
}

export const prayerRepository = {
  subscribeToPrayers(churchId: string, onData: PrayersListener, onError: ErrorListener): () => void {
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
    churchId: string,
    onData: (prayer: Prayer | null) => void,
    onError: ErrorListener
  ): () => void {
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
    await updateDoc(prayerDocRef, { answered: !currentValue });
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
};
