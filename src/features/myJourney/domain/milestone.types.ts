import { Timestamp } from 'firebase/firestore';

export type MyJourneyMilestoneType =
  | "first_bible_note"
  | "first_highlight"
  | "reading_plan_completed"
  | "bible_book_completed"; // Future proof

export interface MyJourneyMilestone {
  id: string; // Deterministic ID
  userId: string;
  type: MyJourneyMilestoneType;
  achievedAt: Timestamp | Date | string;
  title: string;
  metadata?: {
    planId?: string;
    planTitle?: string;
    bookId?: string;
    bookName?: string;
  };
}
