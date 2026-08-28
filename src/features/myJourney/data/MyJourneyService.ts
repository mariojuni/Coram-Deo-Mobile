import { bibleNoteRepository } from '../../bibleNotes/data/bibleNote.repository';
import { bibleHighlightRepository } from '../../bibleHighlights/data/bibleHighlight.repository';
import { getActiveDb } from '../../../firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { bibleActivityRepository } from './myJourney.repository';
import type { WeeklyBibleActivityMetrics } from '../domain/myJourney.types';

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

      for (const summary of dailySummaries) {
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
}

export const bibleActivityService = new MyJourneyService();
