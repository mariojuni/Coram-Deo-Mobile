import { useAuthStore } from '@/store/useAuthStore';
import { useBiblePlanStore } from '@/store/useBiblePlanStore';
import { useEffect } from 'react';

/**
 * Provides the current user's Bible plan records (active + completed).
 * Used by MyBiblePlanProgressScreen and the Continue Bible Plan card.
 */
export function useUserBiblePlans() {
  const userProfile = useAuthStore((state) => state.userProfile);
  const currentUser = useAuthStore((state) => state.currentUser);
  const churchId = userProfile?.churchId ?? null;
  const userId = currentUser?.uid ?? null;

  const userBiblePlans = useBiblePlanStore((s) => s.userBiblePlans);
  const userBiblePlansLoading = useBiblePlanStore((s) => s.userBiblePlansLoading);
  const plans = useBiblePlanStore((s) => s.plans);
  const initializeUserBiblePlansListener = useBiblePlanStore((s) => s.initializeUserBiblePlansListener);

  useEffect(() => {
    if (!userId || !churchId) return;
    const unsubscribe = initializeUserBiblePlansListener(userId, churchId);
    return () => unsubscribe();
  }, [userId, churchId, initializeUserBiblePlansListener]);

  const activePlans = userBiblePlans.filter((p) => p.status === 'active');
  const completedPlans = userBiblePlans.filter((p) => p.status === 'completed');

  /** Enrich a UserBiblePlan with its BiblePlan metadata */
  const getPlanMeta = (planId: string) => plans.find((p) => p.id === planId) ?? null;

  const getUserBiblePlanForPlan = (planId: string) =>
    userBiblePlans.find((p) => p.planId === planId && p.status !== 'cancelled');

  return {
    userBiblePlans,
    activePlans,
    completedPlans,
    loading: userBiblePlansLoading,
    hasChurchId: Boolean(churchId),
    getPlanMeta,
    getUserBiblePlanForPlan,
  };
}
