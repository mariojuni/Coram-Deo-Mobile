import type { Timestamp } from 'firebase/firestore';

// ─── Firestore: churches/{churchId}/bible_plans ────────────────────────────────
// Readings (days) are embedded as an array inside the plan document.
export interface PlanReading {
  day: number;            // 1-based day number
  passage: string;        // human-readable reference e.g. "Ezra 1; Acts 1"
}

export interface BiblePlan {
  id: string;
  churchId: string;       // denormalised for convenience
  title: string;
  subtitle?: string;
  description?: string;
  durationDays: number;
  startDate?: string;
  endDate?: string;
  category?: string;
  language?: string;
  visibility?: string;
  status: 'draft' | 'active' | 'completed';
  readings: PlanReading[];  // embedded day readings
  createdBy?: string;
  createdAt?: Timestamp | string | null;
  updatedAt?: Timestamp | string | null;
  publishedAt?: Timestamp | string | null;
}

// ─── Derived: BiblePlanDay ─────────────────────────────────────────────────────
// BiblePlanDay is derived from PlanReading at read time.
// dayId is a stable synthetic key: "{planId}_day_{dayNumber}"
export interface BiblePlanDay {
  id: string;             // synthetic: "{planId}_day_{dayNumber}"
  planId: string;
  churchId: string;
  dayNumber: number;
  scriptureReference: string;  // from reading.passage
  title?: string;         // optional, not in current admin schema
  devotionalNote?: string;
  reflectionQuestion?: string;
  prayerPoint?: string;
}

// ─── Firestore: churches/{churchId}/userBiblePlans ────────────────────────────
export type UserBiblePlanStatus = 'active' | 'completed' | 'abandoned';

export interface UserBiblePlan {
  id: string;
  churchId: string;
  userId: string;
  memberId?: string | null;
  planId: string;
  status: UserBiblePlanStatus;
  startedAt?: Timestamp | string | null;
  completedAt?: Timestamp | string | null;
  currentDayNumber: number;
  completedDaysCount: number;
  totalDays: number;
  progressPercentage: number;
  lastReadAt?: Timestamp | string | null;
  updatedAt?: Timestamp | string | null;
}

// ─── Firestore: churches/{churchId}/biblePlanProgress ─────────────────────────
export interface BiblePlanProgress {
  id: string;
  churchId: string;
  planId: string;
  dayId: string;          // synthetic key: "{planId}_day_{dayNumber}"
  userId: string;
  memberId?: string | null;
  dayNumber: number;
  isCompleted: boolean;
  completedAt?: Timestamp | string | null;
  createdAt?: Timestamp | string | null;
  updatedAt?: Timestamp | string | null;
}

// ─── Payload types ─────────────────────────────────────────────────────────────
export interface StartPlanPayload {
  churchId: string;
  userId: string;
  memberId?: string | null;
  planId: string;
  totalDays: number;
}

export interface MarkDayCompletedPayload {
  churchId: string;
  planId: string;
  dayId: string;
  dayNumber: number;
  userId: string;
  memberId?: string | null;
  totalDays: number;
  userBiblePlanId: string;
  currentCompletedCount: number;
}

// ─── Helper ───────────────────────────────────────────────────────────────────
/** Build a stable synthetic day ID from planId + dayNumber */
export function makeDayId(planId: string, dayNumber: number): string {
  return `${planId}_day_${dayNumber}`;
}

/** Derive BiblePlanDay array from a BiblePlan's readings */
export function deriveDays(plan: BiblePlan): BiblePlanDay[] {
  return (plan.readings ?? []).map((r) => ({
    id: makeDayId(plan.id, r.day),
    planId: plan.id,
    churchId: plan.churchId,
    dayNumber: r.day,
    scriptureReference: r.passage,
  }));
}

