import { Timestamp } from 'firebase/firestore';

export interface BibleDailySummary {
  dateKey: string; // YYYY-MM-DD in local time
  chapterIds: string[]; // e.g. ["GEN.1", "PHP.2"]
  chapterCount: number; // chapterIds.length
  updatedAt: Timestamp | string | Date | null;
}

export interface WeeklyBibleActivityMetrics {
  readingDaysCount: number;
  chaptersReadCount: number;
  notesCreatedCount: number;
  highlightsCreatedCount: number;
  planDaysCompletedCount: number;
  activityByDay: boolean[]; // 7 elements (Mon-Sun), true if activity occurred
}
