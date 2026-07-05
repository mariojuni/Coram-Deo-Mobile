import { useAuthStore } from '@/store/useAuthStore';
import { useBiblePlanStore } from '@/store/useBiblePlanStore';
import { useEffect } from 'react';

/**
 * Provides the list of published Bible plans for the current user's church.
 * Automatically subscribes and unsubscribes via Firestore real-time listener.
 * Returns empty data when churchId is absent.
 */
export function useBiblePlans() {
  const userProfile = useAuthStore((state) => state.userProfile);
  const churchId = userProfile?.churchId ?? null;

  const plans = useBiblePlanStore((s) => s.plans);
  const plansLoading = useBiblePlanStore((s) => s.plansLoading);
  const initializePlansListener = useBiblePlanStore((s) => s.initializePlansListener);

  useEffect(() => {
    console.log('[useBiblePlans] churchId:', churchId);
    if (!churchId) return;
    const unsubscribe = initializePlansListener(churchId);
    return () => unsubscribe();
  }, [churchId, initializePlansListener]);

  return { plans, loading: plansLoading, hasChurchId: Boolean(churchId) };
}
