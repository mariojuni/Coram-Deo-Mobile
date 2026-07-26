import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { DiscipleshipService, DiscipleshipPlan, DiscipleshipWeek, DiscipleshipProgress } from '../../domain/services/DiscipleshipService';

export function useDiscipleshipDetail(planId: string) {
  const { userProfile } = useAuthStore();
  const currentChurchId = userProfile?.churchId;
  const [plan, setPlan] = useState<DiscipleshipPlan | null>(null);
  const [weeks, setWeeks] = useState<DiscipleshipWeek[]>([]);
  const [progress, setProgress] = useState<DiscipleshipProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!currentChurchId || !planId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const [fetchedPlan, fetchedWeeks, fetchedProgress] = await Promise.all([
        DiscipleshipService.getPlan(currentChurchId, planId),
        DiscipleshipService.getWeeks(currentChurchId, planId),
        userProfile?.uid ? DiscipleshipService.getProgress(currentChurchId, planId, userProfile.uid) : Promise.resolve([])
      ]);
      
      setPlan(fetchedPlan);
      setWeeks(fetchedWeeks);
      setProgress(fetchedProgress);
    } catch (err) {
      console.error('Failed to load discipleship detail', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [currentChurchId, planId, userProfile?.uid])
  );

  const markCompleted = async (weekId: string, weekNumber: number, groupId?: string | null) => {
    if (!currentChurchId || !userProfile?.uid) return;
    
    await DiscipleshipService.markWeekCompleted(
      currentChurchId,
      planId,
      weekId,
      weekNumber,
      userProfile.uid,
      userProfile.memberId,
      groupId
    );
    
    // Refresh progress
    loadData();
  };

  return { plan, weeks, progress, loading, markCompleted };
}
