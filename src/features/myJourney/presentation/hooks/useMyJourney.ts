import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../../../store/useAuthStore';
import { bibleActivityService } from '../../data/MyJourneyService';
import type { WeeklyBibleActivityMetrics } from '../../domain/myJourney.types';

let cachedMetrics: WeeklyBibleActivityMetrics | null = null;

export function useMyJourney() {
  const [metrics, setMetrics] = useState<WeeklyBibleActivityMetrics>(
    cachedMetrics || bibleActivityService.getEmptyMetrics()
  );
  // If we have cached data, don't show initial loading state to prevent flicker
  const [loading, setLoading] = useState(!cachedMetrics);

  const currentUser = useAuthStore((s) => s.currentUser);
  const userProfile = useAuthStore((s) => s.userProfile);

  const loadWeeklyActivity = useCallback(async () => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    // Only show loading if we don't have cached metrics
    if (!cachedMetrics) {
      setLoading(true);
    }

    try {
      // Get the current date and calculate Monday-Sunday of the current week
      const now = new Date();
      // adjust to local time week (Monday start)
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday
      const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      
      const monday = new Date(now);
      monday.setDate(now.getDate() + distanceToMonday);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const yyyyStart = monday.getFullYear();
      const mmStart = String(monday.getMonth() + 1).padStart(2, '0');
      const ddStart = String(monday.getDate()).padStart(2, '0');
      const startDateStr = `${yyyyStart}-${mmStart}-${ddStart}`;

      const yyyyEnd = sunday.getFullYear();
      const mmEnd = String(sunday.getMonth() + 1).padStart(2, '0');
      const ddEnd = String(sunday.getDate()).padStart(2, '0');
      const endDateStr = `${yyyyEnd}-${mmEnd}-${ddEnd}`;

      const effectiveChurchId = userProfile?.churchId || (userProfile as any)?.church_id || (currentUser as any)?.churchId || (currentUser as any)?.claims?.churchId || '';

      const weeklyMetrics = await bibleActivityService.getWeeklyActivity(
        currentUser.uid,
        effectiveChurchId,
        startDateStr,
        endDateStr
      );

      cachedMetrics = weeklyMetrics;
      setMetrics(weeklyMetrics);
    } catch (e) {
      console.error('Failed to load weekly bible activity:', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser, userProfile]);

  useEffect(() => {
    loadWeeklyActivity();
  }, [loadWeeklyActivity]);

  return {
    metrics,
    loading,
    refresh: loadWeeklyActivity,
  };
}
