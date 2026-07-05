import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { DiscipleshipService, DiscipleshipPlan } from '../../domain/services/DiscipleshipService';

export function useDiscipleshipPlans() {
  const { userProfile } = useAuthStore();
  const currentChurchId = userProfile?.churchId;
  const [plans, setPlans] = useState<DiscipleshipPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPlans() {
      if (!currentChurchId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await DiscipleshipService.getPlans(currentChurchId);
        setPlans(data);
      } catch (err) {
        console.error('Failed to load discipleship plans', err);
      } finally {
        setLoading(false);
      }
    }

    loadPlans();
  }, [currentChurchId]);

  return { plans, loading };
}
