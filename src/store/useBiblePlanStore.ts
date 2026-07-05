import { create } from 'zustand';
import { biblePlanRepository } from '../features/biblePlan/data/biblePlan.repository';
import { biblePlanProgressRepository } from '../features/biblePlan/data/biblePlanProgress.repository';
import { userBiblePlanRepository } from '../features/biblePlan/data/userBiblePlan.repository';
import type {
    BiblePlan,
    BiblePlanDay,
    BiblePlanProgress,
    MarkDayCompletedPayload,
    StartPlanPayload,
    UserBiblePlan,
} from '../features/biblePlan/domain/biblePlan.types';
import { deriveDays } from '../features/biblePlan/domain/biblePlan.types';

interface BiblePlanStore {
  // ── Published plans for the church ────────────────────────────────────────
  plans: BiblePlan[];
  plansLoading: boolean;

  // ── Current user's plan records ───────────────────────────────────────────
  userBiblePlans: UserBiblePlan[];
  userBiblePlansLoading: boolean;

  // ── Progress for the currently open plan ──────────────────────────────────
  planProgress: BiblePlanProgress[];
  planProgressLoading: boolean;

  // ── Plan-update modal (shared across day → plan navigation) ───────────────
  planUpdateVisible: boolean;
  planUpdateStep: number;
  planUpdateStepLabel: string;
  planUpdateDayNumber: number;
  planUpdateTotalDays: number;

  // ── Actions ───────────────────────────────────────────────────────────────
  initializePlansListener: (churchId: string) => () => void;
  initializeUserBiblePlansListener: (userId: string, churchId: string) => () => void;
  initializeProgressListener: (userId: string, planId: string, churchId: string) => () => void;
  startPlan: (payload: StartPlanPayload) => Promise<string>;
  markDayCompleted: (
    payload: MarkDayCompletedPayload,
    onProgress?: (step: number, label: string) => void
  ) => Promise<void>;
  openPlanUpdate: (dayNumber: number, totalDays: number) => void;
  setPlanUpdateStep: (step: number, label: string) => void;
  closePlanUpdate: () => void;

  // ── Selectors ─────────────────────────────────────────────────────────────
  getDaysForPlan: (planId: string) => BiblePlanDay[];
  getUserBiblePlanForPlan: (planId: string) => UserBiblePlan | undefined;
  getActivePlan: () => UserBiblePlan | undefined;
  isDayCompleted: (dayId: string) => boolean;
  getCompletedDayIds: () => Set<string>;
}

let plansUnsubscribe: (() => void) | null = null;
let plansChurchId: string | null = null;
let userPlansUnsubscribe: (() => void) | null = null;
let userPlansKey: string | null = null; // userId:churchId
let progressUnsubscribe: (() => void) | null = null;

export const useBiblePlanStore = create<BiblePlanStore>((set, get) => ({
  plans: [],
  plansLoading: true,
  userBiblePlans: [],
  userBiblePlansLoading: true,
  planProgress: [],
  planProgressLoading: false,
  planUpdateVisible: false,
  planUpdateStep: 0,
  planUpdateStepLabel: '',
  planUpdateDayNumber: 0,
  planUpdateTotalDays: 0,

  // ── Listeners ─────────────────────────────────────────────────────────────

  initializePlansListener: (churchId) => {
    // Already listening for same church — skip reset, just return unsub
    if (plansUnsubscribe && plansChurchId === churchId) {
      return () => { if (plansUnsubscribe) { plansUnsubscribe(); plansUnsubscribe = null; plansChurchId = null; } };
    }
    if (plansUnsubscribe) { plansUnsubscribe(); plansUnsubscribe = null; plansChurchId = null; }
    if (!churchId) {
      set({ plans: [], plansLoading: false });
      return () => {};
    }
    set({ plansLoading: true });
    plansChurchId = churchId;
    plansUnsubscribe = biblePlanRepository.subscribeToPublishedPlans(
      churchId,
      (plans) => set({ plans, plansLoading: false }),
      (error) => {
        console.error('[BiblePlanStore] plans listener error:', error);
        set({ plansLoading: false });
      }
    );
    return () => { if (plansUnsubscribe) { plansUnsubscribe(); plansUnsubscribe = null; plansChurchId = null; } };
  },

  initializeUserBiblePlansListener: (userId, churchId) => {
    const key = `${userId}:${churchId}`;
    // Already listening for same user+church — skip reset
    if (userPlansUnsubscribe && userPlansKey === key) {
      return () => { if (userPlansUnsubscribe) { userPlansUnsubscribe(); userPlansUnsubscribe = null; userPlansKey = null; } };
    }
    if (userPlansUnsubscribe) { userPlansUnsubscribe(); userPlansUnsubscribe = null; userPlansKey = null; }
    if (!userId || !churchId) {
      set({ userBiblePlans: [], userBiblePlansLoading: false });
      return () => {};
    }
    set({ userBiblePlansLoading: true });
    userPlansKey = key;
    userPlansUnsubscribe = userBiblePlanRepository.subscribeToUserBiblePlans(
      userId,
      churchId,
      (plans) => set({ userBiblePlans: plans, userBiblePlansLoading: false }),
      (error) => {
        console.error('[BiblePlanStore] userBiblePlans listener error:', error);
        set({ userBiblePlansLoading: false });
      }
    );
    return () => { if (userPlansUnsubscribe) { userPlansUnsubscribe(); userPlansUnsubscribe = null; userPlansKey = null; } };
  },

  initializeProgressListener: (userId, planId, churchId) => {
    if (progressUnsubscribe) { progressUnsubscribe(); progressUnsubscribe = null; }
    if (!userId || !planId || !churchId) {
      set({ planProgress: [], planProgressLoading: false });
      return () => {};
    }
    set({ planProgress: [], planProgressLoading: true });
    progressUnsubscribe = biblePlanProgressRepository.subscribeToProgressForPlan(
      userId,
      planId,
      churchId,
      (progress) => set({ planProgress: progress, planProgressLoading: false }),
      (error) => {
        console.error('[BiblePlanStore] progress listener error:', error);
        set({ planProgressLoading: false });
      }
    );
    return () => { if (progressUnsubscribe) { progressUnsubscribe(); progressUnsubscribe = null; } };
  },

  // ── Actions ───────────────────────────────────────────────────────────────

  startPlan: (payload) => userBiblePlanRepository.startPlan(payload),

  markDayCompleted: (payload, onProgress) =>
    biblePlanProgressRepository.markDayCompleted(payload, onProgress),

  openPlanUpdate: (dayNumber, totalDays) =>
    set({ planUpdateVisible: true, planUpdateStep: 0, planUpdateStepLabel: 'Starting…', planUpdateDayNumber: dayNumber, planUpdateTotalDays: totalDays }),

  setPlanUpdateStep: (step, label) =>
    set({ planUpdateStep: step, planUpdateStepLabel: label }),

  closePlanUpdate: () =>
    set({ planUpdateVisible: false, planUpdateStep: 0, planUpdateStepLabel: '', planUpdateDayNumber: 0, planUpdateTotalDays: 0 }),

  // ── Selectors ─────────────────────────────────────────────────────────────

  getDaysForPlan: (planId) => {
    const plan = get().plans.find((p) => p.id === planId);
    return plan ? deriveDays(plan) : [];
  },

  getUserBiblePlanForPlan: (planId) =>
    get().userBiblePlans.find((p) => p.planId === planId),

  getActivePlan: () => {
    const active = get().userBiblePlans.filter((p) => p.status === 'active');
    if (active.length === 0) return undefined;
    return active.sort((a, b) => {
      const aTime = typeof a.startedAt === 'string' ? a.startedAt : '';
      const bTime = typeof b.startedAt === 'string' ? b.startedAt : '';
      return bTime.localeCompare(aTime);
    })[0];
  },

  isDayCompleted: (dayId) =>
    get().planProgress.some((p) => p.dayId === dayId && p.isCompleted),

  getCompletedDayIds: () =>
    new Set(get().planProgress.filter((p) => p.isCompleted).map((p) => p.dayId)),
}));
