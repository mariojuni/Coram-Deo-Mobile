import { bibleNoteRepository } from '../../bibleNotes/data/bibleNote.repository';
import { bibleHighlightRepository } from '../../bibleHighlights/data/bibleHighlight.repository';
import { getActiveDb } from '../../../firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { bibleActivityRepository } from './myJourney.repository';
import type { WeeklyBibleActivityMetrics, MonthlyBibleActivityMetrics } from '../domain/myJourney.types';

const BIBLE_BOOKS: Record<string, string> = {
  'GEN': 'Genesis', 'EXO': 'Exodus', 'LEV': 'Leviticus', 'NUM': 'Numbers', 'DEU': 'Deuteronomy',
  'JOS': 'Joshua', 'JDG': 'Judges', 'RUT': 'Ruth', '1SA': '1 Samuel', '2SA': '2 Samuel',
  '1KI': '1 Kings', '2KI': '2 Kings', '1CH': '1 Chronicles', '2CH': '2 Chronicles', 'EZR': 'Ezra',
  'NEH': 'Nehemiah', 'EST': 'Esther', 'JOB': 'Job', 'PSA': 'Psalms', 'PRO': 'Proverbs',
  'ECC': 'Ecclesiastes', 'SNG': 'Song of Solomon', 'ISA': 'Isaiah', 'JER': 'Jeremiah', 'LAM': 'Lamentations',
  'EZK': 'Ezekiel', 'DAN': 'Daniel', 'HOS': 'Hosea', 'JOL': 'Joel', 'AMO': 'Amos',
  'OBA': 'Obadiah', 'JON': 'Jonah', 'MIC': 'Micah', 'NAM': 'Nahum', 'HAB': 'Habakkuk',
  'ZEP': 'Zephaniah', 'HAG': 'Haggai', 'ZEC': 'Zechariah', 'MAL': 'Malachi',
  'MAT': 'Matthew', 'MRK': 'Mark', 'LUK': 'Luke', 'JHN': 'John', 'ACT': 'Acts',
  'ROM': 'Romans', '1CO': '1 Corinthians', '2CO': '2 Corinthians', 'GAL': 'Galatians', 'EPH': 'Ephesians',
  'PHP': 'Philippians', 'COL': 'Colossians', '1TH': '1 Thessalonians', '2TH': '2 Thessalonians', '1TI': '1 Timothy',
  '2TI': '2 Timothy', 'TIT': 'Titus', 'PHM': 'Philemon', 'HEB': 'Hebrews', 'JAS': 'James',
  '1PE': '1 Peter', '2PE': '2 Peter', '1JN': '1 John', '2JN': '2 John', '3JN': '3 John',
  'JUD': 'Jude', 'REV': 'Revelation'
};

export class MyJourneyService {
  /**
   * Fetches and aggregates the weekly bible activity for a user.
   * Start and end dates must be in YYYY-MM-DD format (local time).
   */
  async getWeeklyActivity(
    userId: string,
    churchId: string, // if needed for queries
    startDateStr: string,
    endDateStr: string
  ): Promise<WeeklyBibleActivityMetrics> {
    if (!userId) {
      return this.getEmptyMetrics();
    }

    try {
      // 1. Get Daily Summaries (for chapters and reading days)
      const dailySummaries = await bibleActivityRepository.getSummaries(userId, startDateStr, endDateStr);
      
      let chaptersReadCount = 0;
      const activityMap: Record<string, boolean> = {};

      console.log(`[SVC-WEEKLY] Got ${dailySummaries.length} summaries, startDate=${startDateStr}, endDate=${endDateStr}`);
      for (const summary of dailySummaries) {
        console.log(`[SVC-WEEKLY] Summary ${summary.dateKey}: chapterCount=${summary.chapterCount}, ids=${summary.chapterIds?.length}`);
        if (summary.chapterCount > 0) {
          chaptersReadCount += summary.chapterCount;
          activityMap[summary.dateKey] = true;
        }
      }

      // Convert date strings to start/end JS dates to filter timestamps
      const startMs = new Date(`${startDateStr}T00:00:00`).getTime();
      const endMs = new Date(`${endDateStr}T23:59:59.999`).getTime();

      // Helper to add to activityMap
      const markActivity = (ts: number) => {
        const d = new Date(ts);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        activityMap[`${yyyy}-${mm}-${dd}`] = true;
      };

      // 2. Notes Created
      let notesCreatedCount = 0;
      try {
        const notes = await bibleNoteRepository.getUserNotes(userId);
        notesCreatedCount = notes.filter(n => {
          if (!n.createdAt) return false;
          const ts = (n.createdAt as Timestamp).toDate ? (n.createdAt as Timestamp).toDate().getTime() : new Date(n.createdAt as string).getTime();
          if (ts >= startMs && ts <= endMs) {
            markActivity(ts);
            return true;
          }
          return false;
        }).length;
      } catch (e) {
        console.warn('Failed to fetch user notes for activity', e);
      }

      // 3. Highlights Created
      let highlightsCreatedCount = 0;
      try {
        const highlights = await bibleHighlightRepository.getUserHighlights(userId);
        highlightsCreatedCount = highlights.filter(h => {
          if (!h.createdAt) return false;
          const ts = (h.createdAt as Timestamp).toDate ? (h.createdAt as Timestamp).toDate().getTime() : new Date(h.createdAt as string).getTime();
          if (ts >= startMs && ts <= endMs) {
            markActivity(ts);
            return true;
          }
          return false;
        }).length;
      } catch (e) {
        console.warn('Failed to fetch highlights for activity', e);
      }

      // 4. Plan Days Completed
      let planDaysCompletedCount = 0;
      try {
        // We query the biblePlanProgress collection for the user where completedAt is in range
        // Since we don't have a direct method for this user-only across all plans, we might need a custom query
        // Usually it's churches/{churchId}/biblePlanProgress where userId = userId
        if (churchId) {
          const db = getActiveDb();
          const progressRef = collection(db, 'churches', churchId, 'biblePlanProgress');
          const q = query(
            progressRef,
            where('userId', '==', userId),
            where('isCompleted', '==', true)
          );
          const snapshot = await getDocs(q);
          planDaysCompletedCount = snapshot.docs.filter(doc => {
            const data = doc.data();
            if (!data.completedAt) return false;
            const ts = data.completedAt.toDate ? data.completedAt.toDate().getTime() : new Date(data.completedAt).getTime();
            if (ts >= startMs && ts <= endMs) {
              markActivity(ts);
              return true;
            }
            return false;
          }).length;
        }
      } catch (e) {
        console.warn('Failed to fetch plan progress for activity', e);
      }

      // 5. Compute the 7-day boolean array (Mon-Sun)
      const activityByDay = Array(7).fill(false);
      let finalReadingDaysCount = 0;
      
      // Generate the 7 date strings from startDateStr to endDateStr
      const current = new Date(`${startDateStr}T00:00:00`);
      for (let i = 0; i < 7; i++) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        const dateKey = `${yyyy}-${mm}-${dd}`;
        
        if (activityMap[dateKey]) {
          activityByDay[i] = true;
          finalReadingDaysCount++;
        }
        
        current.setDate(current.getDate() + 1);
      }

      return {
        readingDaysCount: finalReadingDaysCount,
        chaptersReadCount,
        notesCreatedCount,
        highlightsCreatedCount,
        planDaysCompletedCount,
        activityByDay
      };
    } catch (e) {
      console.warn('Failed to get weekly activity:', e);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Fetches and aggregates the monthly bible activity for a user.
   * Start and end dates must be in YYYY-MM-DD format (local time).
   */
  async getMonthlyActivity(
    userId: string,
    churchId: string, // if needed for queries
    startDateStr: string,
    endDateStr: string
  ): Promise<MonthlyBibleActivityMetrics> {
    if (!userId) {
      return this.getEmptyMonthlyMetrics();
    }

    try {
      // 1. Get Daily Summaries (for chapters and reading days)
      const dailySummaries = await bibleActivityRepository.getSummaries(userId, startDateStr, endDateStr);
      
      let chaptersReadCount = 0;
      const activityMap: Record<string, boolean> = {};
      const bookCounts: Record<string, number> = {};

      for (const summary of dailySummaries) {
        if (summary.chapterCount > 0) {
          chaptersReadCount += summary.chapterCount;
          activityMap[summary.dateKey] = true;
          
          // Track book engagement for "Most Engaged Book"
          for (const chapterId of (summary.chapterIds || [])) {
            const bookId = chapterId.split('.')[0]; // e.g. "PHP.2" -> "PHP"
            if (bookId) {
              bookCounts[bookId] = (bookCounts[bookId] || 0) + 1;
            }
          }
        }
      }

      // Convert date strings to start/end JS dates to filter timestamps
      const startMs = new Date(`${startDateStr}T00:00:00`).getTime();
      const endMs = new Date(`${endDateStr}T23:59:59.999`).getTime();

      // Helper to add to activityMap
      const markActivity = (ts: number) => {
        const d = new Date(ts);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        activityMap[`${yyyy}-${mm}-${dd}`] = true;
      };

      // 2. Notes Created
      let notesCreatedCount = 0;
      try {
        const notes = await bibleNoteRepository.getUserNotes(userId);
        notesCreatedCount = notes.filter(n => {
          if (!n.createdAt) return false;
          const ts = (n.createdAt as Timestamp).toDate ? (n.createdAt as Timestamp).toDate().getTime() : new Date(n.createdAt as string).getTime();
          if (ts >= startMs && ts <= endMs) {
            markActivity(ts);
            return true;
          }
          return false;
        }).length;
      } catch (e) {
        console.warn('Failed to fetch user notes for activity', e);
      }

      // 3. Highlights Created
      let highlightsCreatedCount = 0;
      try {
        const highlights = await bibleHighlightRepository.getUserHighlights(userId);
        highlightsCreatedCount = highlights.filter(h => {
          if (!h.createdAt) return false;
          const ts = (h.createdAt as Timestamp).toDate ? (h.createdAt as Timestamp).toDate().getTime() : new Date(h.createdAt as string).getTime();
          if (ts >= startMs && ts <= endMs) {
            markActivity(ts);
            return true;
          }
          return false;
        }).length;
      } catch (e) {
        console.warn('Failed to fetch highlights for activity', e);
      }

      // 4. Plan Days Completed
      let planDaysCompletedCount = 0;
      try {
        if (churchId) {
          const db = getActiveDb();
          const progressRef = collection(db, 'churches', churchId, 'biblePlanProgress');
          const q = query(
            progressRef,
            where('userId', '==', userId),
            where('isCompleted', '==', true)
          );
          const snapshot = await getDocs(q);
          planDaysCompletedCount = snapshot.docs.filter(doc => {
            const data = doc.data();
            if (!data.completedAt) return false;
            const ts = data.completedAt.toDate ? data.completedAt.toDate().getTime() : new Date(data.completedAt).getTime();
            if (ts >= startMs && ts <= endMs) {
              markActivity(ts);
              return true;
            }
            return false;
          }).length;
        }
      } catch (e) {
        console.warn('Failed to fetch plan progress for activity', e);
      }

      // 5. Aggregate metrics
      const activityDates = Object.keys(activityMap).sort();
      let mostEngagedBook = undefined;
      
      if (Object.keys(bookCounts).length > 0) {
        let topBookId = '';
        let maxCount = 0;
        for (const [bookId, count] of Object.entries(bookCounts)) {
          if (count > maxCount) {
            maxCount = count;
            topBookId = bookId;
          }
        }
        
        if (topBookId) {
          mostEngagedBook = {
            bookId: topBookId,
            bookName: BIBLE_BOOKS[topBookId] || topBookId,
            chapterCount: maxCount
          };
        }
      }

      return {
        readingDaysCount: activityDates.length,
        chaptersReadCount,
        notesCreatedCount,
        highlightsCreatedCount,
        planDaysCompletedCount,
        activityDates,
        mostEngagedBook
      };
    } catch (e) {
      console.warn('Failed to get monthly activity:', e);
      return this.getEmptyMonthlyMetrics();
    }
  }

  getEmptyMetrics(): WeeklyBibleActivityMetrics {
    return {
      readingDaysCount: 0,
      chaptersReadCount: 0,
      notesCreatedCount: 0,
      highlightsCreatedCount: 0,
      planDaysCompletedCount: 0,
      activityByDay: Array(7).fill(false),
    };
  }

  getEmptyMonthlyMetrics(): MonthlyBibleActivityMetrics {
    return {
      readingDaysCount: 0,
      chaptersReadCount: 0,
      notesCreatedCount: 0,
      highlightsCreatedCount: 0,
      planDaysCompletedCount: 0,
      activityDates: [],
    };
  }
}

export const bibleActivityService = new MyJourneyService();
