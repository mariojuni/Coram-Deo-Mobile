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
  cancelPlan: (userBiblePlanId: string, planId: string, userId: string, churchId: string) => Promise<void>;
  markDayCompleted: (
    payload: MarkDayCompletedPayload,
    onProgress?: (step: number, label: string) => void
  ) => Promise<void>;
  openPlanUpdate: (dayNumber: number, totalDays: number) => void;
  setPlanUpdateStep: (step: number, label: string) => void;
  closePlanUpdate: () => void;
  clearAllListeners: () => void;

  // ── Selectors ─────────────────────────────────────────────────────────────
  getDaysForPlan: (planId: string) => BiblePlanDay[];
  getUserBiblePlanForPlan: (planId: string) => UserBiblePlan | undefined;
  getActivePlan: () => UserBiblePlan | undefined;
  isDayCompleted: (dayId: string) => boolean;
  getCompletedDayIds: () => Set<string>;
}

let plansUnsubscribe: (() => void) | null = null;
let plansChurchId: string | null = null;
let plansRefCount = 0;

let userPlansUnsubscribe: (() => void) | null = null;
let userPlansKey: string | null = null; // userId:churchId
let userPlansRefCount = 0;

let progressUnsubscribe: (() => void) | null = null;
let progressKey: string | null = null; // userId:planId:churchId
let progressRefCount = 0;

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
    if (plansUnsubscribe && plansChurchId === churchId) {
      plansRefCount++;
      return () => {
        plansRefCount--;
        if (plansRefCount <= 0 && plansUnsubscribe) {
          plansUnsubscribe();
          plansUnsubscribe = null;
          plansChurchId = null;
        }
      };
    }
    if (plansUnsubscribe) { plansUnsubscribe(); plansUnsubscribe = null; plansChurchId = null; }
    if (!churchId) {
      set({ plans: [], plansLoading: false });
      return () => {};
    }
    set({ plansLoading: true });
    plansChurchId = churchId;
    plansRefCount = 1;
    plansUnsubscribe = biblePlanRepository.subscribeToPublishedPlans(
      churchId,
      (plans) => set({ plans, plansLoading: false }),
      (error) => {
        console.error('[BiblePlanStore] plans listener error:', error);
        set({ plansLoading: false });
      }
    );
    return () => {
      plansRefCount--;
      if (plansRefCount <= 0 && plansUnsubscribe) {
        plansUnsubscribe();
        plansUnsubscribe = null;
        plansChurchId = null;
      }
    };
  },

  initializeUserBiblePlansListener: (userId, churchId) => {
    const key = `${userId}:${churchId}`;
    if (userPlansUnsubscribe && userPlansKey === key) {
      userPlansRefCount++;
      return () => {
        userPlansRefCount--;
        if (userPlansRefCount <= 0 && userPlansUnsubscribe) {
          userPlansUnsubscribe();
          userPlansUnsubscribe = null;
          userPlansKey = null;
        }
      };
    }
    if (userPlansUnsubscribe) { userPlansUnsubscribe(); userPlansUnsubscribe = null; userPlansKey = null; }
    if (!userId || !churchId) {
      set({ userBiblePlans: [], userBiblePlansLoading: false });
      return () => {};
    }
    set({ userBiblePlansLoading: true });
    userPlansKey = key;
    userPlansRefCount = 1;
    userPlansUnsubscribe = userBiblePlanRepository.subscribeToUserBiblePlans(
      userId,
      churchId,
      (plans) => set({ userBiblePlans: plans, userBiblePlansLoading: false }),
      (error) => {
        console.error('[BiblePlanStore] userBiblePlans listener error:', error);
        set({ userBiblePlansLoading: false });
      }
    );
    return () => {
      userPlansRefCount--;
      if (userPlansRefCount <= 0 && userPlansUnsubscribe) {
        userPlansUnsubscribe();
        userPlansUnsubscribe = null;
        userPlansKey = null;
      }
    };
  },

  initializeProgressListener: (userId, planId, churchId) => {
    const key = `${userId}:${planId}:${churchId}`;
    if (progressUnsubscribe && progressKey === key) {
      progressRefCount++;
      return () => {
        progressRefCount--;
        if (progressRefCount <= 0 && progressUnsubscribe) {
          progressUnsubscribe();
          progressUnsubscribe = null;
          progressKey = null;
        }
      };
    }
    if (progressUnsubscribe) { progressUnsubscribe(); progressUnsubscribe = null; progressKey = null; }
    if (!userId || !planId || !churchId) {
      set({ planProgress: [], planProgressLoading: false });
      return () => {};
    }
    set({ planProgress: [], planProgressLoading: true });
    progressKey = key;
    progressRefCount = 1;
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
    return () => {
      progressRefCount--;
      if (progressRefCount <= 0 && progressUnsubscribe) {
        progressUnsubscribe();
        progressUnsubscribe = null;
        progressKey = null;
      }
    };
  },

  clearAllListeners: () => {
    if (plansUnsubscribe) { plansUnsubscribe(); plansUnsubscribe = null; plansChurchId = null; plansRefCount = 0; }
    if (userPlansUnsubscribe) { userPlansUnsubscribe(); userPlansUnsubscribe = null; userPlansKey = null; userPlansRefCount = 0; }
    if (progressUnsubscribe) { progressUnsubscribe(); progressUnsubscribe = null; progressKey = null; progressRefCount = 0; }
    set({
      plans: [],
      userBiblePlans: [],
      planProgress: [],
      plansLoading: false,
      userBiblePlansLoading: false,
      planProgressLoading: false,
    });
  },

  // ── Actions ───────────────────────────────────────────────────────────────

  startPlan: async (payload) => {
    const id = await userBiblePlanRepository.startPlan(payload);
    // Note: The Firestore listener will eventually pull this new record.
    // However, to ensure immediate UI updates we could optimistically insert it if needed.
    return id;
  },

  cancelPlan: async (userBiblePlanId, planId, userId, churchId) => {
    // Optimistic update to instantly clear it from UI
    set((state) => ({
      userBiblePlans: state.userBiblePlans.map((p) =>
        p.id === userBiblePlanId ? { ...p, status: 'cancelled' } : p
      ),
    }));
    await userBiblePlanRepository.cancelPlan(userBiblePlanId, churchId);
    await biblePlanProgressRepository.resetPlanProgress(userId, planId, churchId);
  },

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
    get().userBiblePlans.find((p) => p.planId === planId && p.status !== 'cancelled'),

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
