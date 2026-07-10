import { useAuthStore } from '@/store/useAuthStore';
import { useBiblePlanStore } from '@/store/useBiblePlanStore';
import { useEffect, useMemo } from 'react';

/**
 * Loads plan days (derived from embedded readings) and progress for a specific plan.
 * Used by BiblePlanDetailScreen and BiblePlanDayScreen.
 */
export function useBiblePlanDetail(planId: string) {
  const userProfile = useAuthStore((state) => state.userProfile);
  const currentUser = useAuthStore((state) => state.currentUser);
  const churchId = userProfile?.churchId ?? null;
  const userId = currentUser?.uid ?? null;

  // Subscribe to only the slices we need — avoids unnecessary re-renders
  const plan = useBiblePlanStore((s) => s.plans.find((p) => p.id === planId) ?? null);
  const planProgress = useBiblePlanStore((s) => s.planProgress);
  const planProgressLoading = useBiblePlanStore((s) => s.planProgressLoading);
  const userBiblePlan = useBiblePlanStore((s) => s.userBiblePlans.find((p) => p.planId === planId && p.status !== 'cancelled'));
  const getDaysForPlan = useBiblePlanStore((s) => s.getDaysForPlan);
  const initializeProgressListener = useBiblePlanStore((s) => s.initializeProgressListener);

  // Derived — only recomputes when plan changes
  const days = useMemo(() => getDaysForPlan(planId), [planId, plan]);

  // Derived — only recomputes when planProgress changes, stable Set reference
  const completedDayIds = useMemo(
    () => new Set(planProgress.filter((p) => p.isCompleted).map((p) => p.dayId)),
    [planProgress]
  );

  useEffect(() => {
    if (!userId || !planId || !churchId) return;
    const unsubscribe = initializeProgressListener(userId, planId, churchId);
    return () => unsubscribe();
  }, [userId, planId, churchId]);

  const isStarted = Boolean(userBiblePlan);
  const isCompleted = userBiblePlan?.status === 'completed';
  const currentDayNumber = userBiblePlan?.currentDayNumber ?? 1;
  const progressPercentage = userBiblePlan?.progressPercentage ?? 0;

  const nextIncompleteDay = useMemo(
    () => days.find((d) => !completedDayIds.has(d.id)) ?? days[0] ?? null,
    [days, completedDayIds]
  );

  return {
    plan,
    days,
    daysLoading: false,
    userBiblePlan,
    planProgress,
    planProgressLoading,
    completedDayIds,
    isStarted,
    isCompleted,
    currentDayNumber,
    progressPercentage,
    nextIncompleteDay,
  };
}
