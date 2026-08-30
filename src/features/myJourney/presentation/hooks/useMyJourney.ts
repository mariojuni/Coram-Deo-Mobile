import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../../../store/useAuthStore';
import { bibleActivityService } from '../../data/MyJourneyService';
import type { WeeklyBibleActivityMetrics, MonthlyBibleActivityMetrics } from '../../domain/myJourney.types';

let cachedWeeklyMetrics: WeeklyBibleActivityMetrics | null = null;
let cachedWeeklyUserId: string | null = null;
const cachedMonthlyMetrics: Record<string, MonthlyBibleActivityMetrics> = {}; // key: YYYY-MM
let cachedMonthlyUserId: string | null = null;

export function useMyJourney() {
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyBibleActivityMetrics>(
    cachedWeeklyMetrics || bibleActivityService.getEmptyMetrics()
  );
  
  // Month state
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [monthlyMetrics, setMonthlyMetrics] = useState<MonthlyBibleActivityMetrics>(
    bibleActivityService.getEmptyMonthlyMetrics()
  );
  const [prevMonthlyMetrics, setPrevMonthlyMetrics] = useState<MonthlyBibleActivityMetrics>(
    bibleActivityService.getEmptyMonthlyMetrics()
  );

  const [loading, setLoading] = useState(!cachedWeeklyMetrics);
  const [loadingMonth, setLoadingMonth] = useState(false);

  const currentUser = useAuthStore((s) => s.currentUser);
  const userProfile = useAuthStore((s) => s.userProfile);

  const getEffectiveChurchId = useCallback(() => {
    return userProfile?.churchId || (userProfile as any)?.church_id || (currentUser as any)?.churchId || (currentUser as any)?.claims?.churchId || '';
  }, [currentUser, userProfile]);

  const loadWeeklyActivity = useCallback(async () => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    // Bust cache if user changed
    if (cachedWeeklyUserId !== currentUser.uid) {
      cachedWeeklyMetrics = null;
      cachedWeeklyUserId = currentUser.uid;
      // Also bust monthly cache
      if (cachedMonthlyUserId !== currentUser.uid) {
        Object.keys(cachedMonthlyMetrics).forEach(k => delete cachedMonthlyMetrics[k]);
        cachedMonthlyUserId = currentUser.uid;
      }
    }

    // Do not clear the cache immediately to prevent layout shift while refreshing data
    if (!cachedWeeklyMetrics) {
      setLoading(true);
    }

    try {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const distanceToSunday = -dayOfWeek;
      
      const sunday = new Date(now);
      sunday.setDate(now.getDate() + distanceToSunday);
      
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);

      const yyyyStart = sunday.getFullYear();
      const mmStart = String(sunday.getMonth() + 1).padStart(2, '0');
      const ddStart = String(sunday.getDate()).padStart(2, '0');
      const startDateStr = `${yyyyStart}-${mmStart}-${ddStart}`;

      const yyyyEnd = saturday.getFullYear();
      const mmEnd = String(saturday.getMonth() + 1).padStart(2, '0');
      const ddEnd = String(saturday.getDate()).padStart(2, '0');
      const endDateStr = `${yyyyEnd}-${mmEnd}-${ddEnd}`;

      const weekly = await bibleActivityService.getWeeklyActivity(
        currentUser.uid,
        getEffectiveChurchId(),
        startDateStr,
        endDateStr
      );

      cachedWeeklyMetrics = weekly;
      setWeeklyMetrics(weekly);
    } catch (e) {
      console.error('Failed to load weekly bible activity:', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser, getEffectiveChurchId]);

  const loadMonthlyActivityForDate = useCallback(async (date: Date) => {
    if (!currentUser?.uid) return;

    setLoadingMonth(true);
    try {
      // Calculate start and end of current month
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const monthKey = `${yyyy}-${mm}`;
      
      const startOfMonth = new Date(yyyy, date.getMonth(), 1);
      const endOfMonth = new Date(yyyy, date.getMonth() + 1, 0); // last day
      
      const startStr = `${yyyy}-${mm}-01`;
      const endStr = `${yyyy}-${mm}-${String(endOfMonth.getDate()).padStart(2, '0')}`;

      // Calculate start and end of previous month
      const prevDate = new Date(yyyy, date.getMonth() - 1, 1);
      const pYyyy = prevDate.getFullYear();
      const pMm = String(prevDate.getMonth() + 1).padStart(2, '0');
      const prevMonthKey = `${pYyyy}-${pMm}`;
      
      const prevEndOfMonth = new Date(pYyyy, prevDate.getMonth() + 1, 0);
      const pStartStr = `${pYyyy}-${pMm}-01`;
      const pEndStr = `${pYyyy}-${pMm}-${String(prevEndOfMonth.getDate()).padStart(2, '0')}`;

      const churchId = getEffectiveChurchId();
      const now = new Date();
      const isCurrentMonth = (yyyy === now.getFullYear() && date.getMonth() === now.getMonth());

      // Always re-fetch current month (data changes as user reads).
      // For past months, only use cache if it has non-zero data.
      let currentMonthData = isCurrentMonth ? null : cachedMonthlyMetrics[monthKey];
      if (!currentMonthData || currentMonthData.chaptersReadCount === 0) {
        currentMonthData = await bibleActivityService.getMonthlyActivity(currentUser.uid, churchId, startStr, endStr);
        // Only cache if we got real data, so stale zeros don't persist
        if (currentMonthData.chaptersReadCount > 0 || currentMonthData.readingDaysCount > 0) {
          cachedMonthlyMetrics[monthKey] = currentMonthData;
        }
      }

      // Fetch previous month — only cache non-empty results
      let prevMonthData = cachedMonthlyMetrics[prevMonthKey];
      if (!prevMonthData || prevMonthData.chaptersReadCount === 0) {
        prevMonthData = await bibleActivityService.getMonthlyActivity(currentUser.uid, churchId, pStartStr, pEndStr);
        if (prevMonthData.chaptersReadCount > 0 || prevMonthData.readingDaysCount > 0) {
          cachedMonthlyMetrics[prevMonthKey] = prevMonthData;
        }
      }

      setMonthlyMetrics(currentMonthData);
      setPrevMonthlyMetrics(prevMonthData);

    } catch (e) {
      console.error('Failed to load monthly bible activity:', e);
    } finally {
      setLoadingMonth(false);
    }
  }, [currentUser, getEffectiveChurchId]);

  useEffect(() => {
    loadWeeklyActivity();
  }, [loadWeeklyActivity]);

  useEffect(() => {
    loadMonthlyActivityForDate(currentMonthDate);
  }, [currentMonthDate, loadMonthlyActivityForDate]);

  const goToPreviousMonth = useCallback(() => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonthDate(prev => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      const now = new Date();
      // Prevent going to future months
      if (next.getFullYear() > now.getFullYear() || 
         (next.getFullYear() === now.getFullYear() && next.getMonth() > now.getMonth())) {
        return prev;
      }
      return next;
    });
  }, []);

  return {
    metrics: weeklyMetrics,
    loading,
    
    // Month state
    monthlyMetrics,
    prevMonthlyMetrics,
    currentMonthDate,
    loadingMonth,
    goToPreviousMonth,
    goToNextMonth,
    
    refresh: () => {
      loadWeeklyActivity();
      loadMonthlyActivityForDate(currentMonthDate);
    },
  };
}
