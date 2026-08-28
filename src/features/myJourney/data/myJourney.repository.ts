import { arrayUnion, collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { getActiveDb } from '../../../firebase';
import type { BibleDailySummary } from '../domain/bibleActivity.types';

export class BibleActivityRepository {
  /**
   * Logs a chapter read idempotently.
   * Uses arrayUnion to avoid double-counting the same passage in a single day.
   */
  async logChapterRead(userId: string, passageId: string, localDateStr: string): Promise<void> {
    if (!userId || !passageId || !localDateStr) return;

    try {
      const db = getActiveDb();
      const docRef = doc(db, 'users', userId, 'bibleActivity', localDateStr);

      await setDoc(
        docRef,
        {
          dateKey: localDateStr,
          chapterIds: arrayUnion(passageId),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Failed to log chapter read:', e);
    }
  }

  /**
   * Fetches daily summaries for a given date range.
   * Useful for aggregating weekly/monthly chapter counts and reading days.
   */
  async getSummaries(userId: string, startDateStr: string, endDateStr: string): Promise<BibleDailySummary[]> {
    if (!userId) return [];

    try {
      const db = getActiveDb();
      const activityRef = collection(db, 'users', userId, 'bibleActivity');
      const q = query(
        activityRef,
        where('dateKey', '>=', startDateStr),
        where('dateKey', '<=', endDateStr)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          dateKey: data.dateKey,
          chapterIds: data.chapterIds || [],
          chapterCount: (data.chapterIds || []).length,
          updatedAt: data.updatedAt,
        };
      });
    } catch (e) {
      console.warn('Failed to get bible activity summaries:', e);
      return [];
    }
  }
}

export const bibleActivityRepository = new BibleActivityRepository();
