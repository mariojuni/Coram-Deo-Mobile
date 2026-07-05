import { useMemo } from 'react';
import { useUserBiblePlans } from './useUserBiblePlans';
import { useBiblePlanStore } from '@/store/useBiblePlanStore';

/**
 * Derives the "Continue Bible Plan" state for the Home screen card.
 * Returns null when the user has no active plan or no churchId.
 */
export function useContinueBiblePlan() {
  const { activePlans, getPlanMeta, hasChurchId } = useUserBiblePlans();
  const getDaysForPlan = useBiblePlanStore((s) => s.getDaysForPlan);
  const getCompletedDayIds = useBiblePlanStore((s) => s.getCompletedDayIds);

  const continuePlanData = useMemo(() => {
    if (!hasChurchId || activePlans.length === 0) return null;

    const activeUserPlan = [...activePlans].sort((a, b) => {
      const aTime = typeof a.startedAt === 'string' ? a.startedAt : '';
      const bTime = typeof b.startedAt === 'string' ? b.startedAt : '';
      return bTime.localeCompare(aTime);
    })[0];

    const meta = getPlanMeta(activeUserPlan.planId);
    const completedIds = getCompletedDayIds();
    const planDays = getDaysForPlan(activeUserPlan.planId);
    const nextDay = planDays.find((d) => !completedIds.has(d.id)) ?? null;

    return {
      userBiblePlan: activeUserPlan,
      planTitle: meta?.title ?? 'Bible Plan',
      currentDayNumber: activeUserPlan.currentDayNumber,
      scriptureReference: nextDay?.scriptureReference ?? null,
      progressPercentage: activeUserPlan.progressPercentage,
      nextDayId: nextDay?.id ?? null,
      planId: activeUserPlan.planId,
    };
  }, [activePlans, getDaysForPlan, getPlanMeta, getCompletedDayIds, hasChurchId]);

  return { continuePlanData, hasChurchId };
}
