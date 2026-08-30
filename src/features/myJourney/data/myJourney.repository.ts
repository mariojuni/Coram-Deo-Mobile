import { arrayUnion, collection, doc, getDocs, query, serverTimestamp, setDoc, where, documentId } from 'firebase/firestore';
import { getActiveDb } from '../../../firebase';
import type { BibleDailySummary } from '../domain/myJourney.types';

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
    if (!userId || !startDateStr || !endDateStr) return [];

    try {
      const db = getActiveDb();
      const activityRef = collection(db, 'users', userId, 'bibleActivity');

      const [snapshot, legacyDatesDoc] = await Promise.all([
        getDocs(activityRef),
        import('firebase/firestore').then(({ getDoc }) => getDoc(doc(db, 'users', userId, 'bibleActivity', 'dates')))
      ]);
      
      const summariesMap = new Map<string, BibleDailySummary>();
      console.log(`[DEBUG] Fetched ${snapshot.docs.length} docs from bibleActivity for user ${userId}.`);

      // 1. Process standard date documents
      snapshot.docs.forEach(docSnap => {
        if (docSnap.id === 'dates') return; // skip if it's the legacy document itself
        if (docSnap.id < startDateStr || docSnap.id > endDateStr) return; // In-memory filter
        
        const data = docSnap.data() || {};
        let idsLength = 0;
        if (Array.isArray(data.chapterIds)) {
          idsLength = data.chapterIds.length;
        } else if (data.chapterIds && typeof data.chapterIds === 'object') {
          idsLength = Object.keys(data.chapterIds).length;
        }

        const chapterCount = Math.max(
          idsLength, 
          Number(data.chapterCount) || 0, 
          Number(data.chaptersRead) || 0, 
          Number(data.chapters) || 0,
          Number(data.bibleActivity) || 0
        ) || 0;

        console.log(`[DEBUG] Standard doc ${docSnap.id}: length=${idsLength}, count=${chapterCount}`);

        summariesMap.set(docSnap.id, {
          dateKey: docSnap.id,
          chapterIds: Array.isArray(data.chapterIds) ? data.chapterIds : [],
          chapterCount,
          updatedAt: data.updatedAt,
        });
      });

      // 2. Process legacy "dates" document if it exists
      if (legacyDatesDoc.exists()) {
        const legacyData = legacyDatesDoc.data() || {};
        console.log('[DEBUG] Legacy dates doc exists! Data keys:', Object.keys(legacyData));
        
        // The dates might be at the root, or nested inside a "chapterIds" map field
        let datesMap = legacyData;
        if (legacyData.chapterIds && typeof legacyData.chapterIds === 'object' && !Array.isArray(legacyData.chapterIds)) {
          datesMap = legacyData.chapterIds;
          console.log('[DEBUG] Using nested chapterIds map, keys:', Object.keys(datesMap));
        }
        
        Object.keys(datesMap).forEach(key => {
          // Only process keys that look like YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}$/.test(key) && key >= startDateStr && key <= endDateStr) {
            const dayData = datesMap[key];
            if (!dayData) return;
            
            let idsLength = 0;
            let chapterIds: string[] = [];
            
            // dayData might be an object with chapterIds, or an array itself, or just a number
            if (typeof dayData === 'object' && Array.isArray(dayData.chapterIds)) {
              chapterIds = dayData.chapterIds;
              idsLength = chapterIds.length;
            } else if (Array.isArray(dayData)) {
              chapterIds = dayData;
              idsLength = chapterIds.length;
            } else if (typeof dayData === 'number') {
              idsLength = dayData;
            } else if (typeof dayData === 'object') {
              // What if it's an object with arbitrary keys?
              idsLength = Object.keys(dayData).length;
              chapterIds = Object.keys(dayData);
            }

            console.log(`[DEBUG] Legacy date ${key}: idsLength=${idsLength}`);

            const chapterCount = Math.max(
              idsLength,
              Number(dayData.chapterCount) || 0,
              Number(dayData.chaptersRead) || 0
            ) || 0;

            if (chapterCount > 0) {
              const existing = summariesMap.get(key);
              if (existing) {
                existing.chapterCount = Math.max(existing.chapterCount, chapterCount);
                existing.chapterIds = [...new Set([...existing.chapterIds, ...chapterIds])];
              } else {
                summariesMap.set(key, {
                  dateKey: key,
                  chapterIds,
                  chapterCount,
                  updatedAt: null,
                });
              }
            }
          }
        });
      } else {
        console.log('[DEBUG] No legacy dates doc found.');
      }

      return Array.from(summariesMap.values());
    } catch (e) {
      console.warn('Failed to get bible activity summaries:', e);
      return [];
    }
  }
}

export const bibleActivityRepository = new BibleActivityRepository();
