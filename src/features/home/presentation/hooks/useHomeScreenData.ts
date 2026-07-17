import { ministryRepository } from '@/features/ministry/data/ministry.repository';
import { prayerRepository } from '@/features/prayer/data/prayer.repository';
import { formatPrayerTimeAgo } from '@/features/prayer/domain/prayer.selectors';
import type { Prayer } from '@/features/prayer/domain/prayer.types';
import { getUpcomingMinisterialDuties, getUpcomingSchedules, parseTimeTo24h } from '@/features/schedule/domain/schedule.selectors';
import { useAuthStore } from '@/store/useAuthStore';
import { useBiblePlanStore } from '@/store/useBiblePlanStore';
import { useMinistryStore } from '@/store/useMinistryStore';
import {
    getUserMinisterialRoles,
    getUserRsvpStatus,
    updateRsvp,
    useScheduleStore,
} from '@/store/useScheduleStore';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

export function useHomeScreenData() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const userProfile = useAuthStore((state) => state.userProfile);
  const schedules = useScheduleStore((state) => state.schedules);
  const initializeSchedulesListener = useScheduleStore((state) => state.initializeSchedulesListener);
  const { assignments, initializeAssignmentsListener, fetchMinistries } = useMinistryStore();
  const [latestPrayer, setLatestPrayer] = useState<Prayer | null>(null);

  const initializePlansListener = useBiblePlanStore((s) => s.initializePlansListener);
  const initializeUserBiblePlansListener = useBiblePlanStore((s) => s.initializeUserBiblePlansListener);

  useEffect(() => {
    const unsubscribe = initializeSchedulesListener();
    return () => unsubscribe();
  }, [initializeSchedulesListener]);

  useEffect(() => {
    const churchId = userProfile?.churchId;
    if (!churchId) return;
    fetchMinistries(churchId);
    const unsubscribe = initializeAssignmentsListener(churchId);
    return () => unsubscribe();
  }, [fetchMinistries, initializeAssignmentsListener, userProfile?.churchId]);

  useEffect(() => {
    const churchId = userProfile?.churchId;
    if (!churchId) return;

    const unsubscribe = prayerRepository.subscribeToLatestPrayer(
      churchId,
      (prayer) => setLatestPrayer(prayer),
      (error) => {
        console.error('Error loading latest prayer:', error);
      }
    );
    return () => unsubscribe();
  }, [userProfile?.churchId]);

  // Initialize bible plan listeners so BiblePlanProgressCard has data on home screen.
  // Use useFocusEffect so listeners are re-initialized when returning from plan detail
  // (which kills the module-level subscriptions in its own cleanup).
  // Bible plan listeners are owned by BiblePlanProgressCard — subscribing here
  // without cleanup ensures they stay alive across screen transitions and don't
  // cause a loading-state flicker (and resulting layout shift) on return.
  useFocusEffect(
    useCallback(() => {
      const churchId = userProfile?.churchId;
      const userId = currentUser?.uid;
      if (!churchId || !userId) return;

      const unsubPlans = initializePlansListener(churchId);
      const unsubUserPlans = initializeUserBiblePlansListener(userId, churchId);

      return () => {
        unsubPlans();
        unsubUserPlans();
      };
    }, [userProfile?.churchId, currentUser?.uid, initializePlansListener, initializeUserBiblePlansListener])
  );

  const upcomingEvents = useMemo(() => getUpcomingSchedules(schedules, 20), [schedules]);

  const todayString = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const normalizeDateToYmd = (value: string): string | null => {
    if (!value) return null;
    const ymd = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (ymd) {
      const [, y, m, d] = ymd;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const mdy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdy) {
      const [, m, d, y] = mdy;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return null;
  };

  const todaysEvents = useMemo(
    () =>
      schedules
        .filter((event) => normalizeDateToYmd(event.date) === todayString)
        .sort((a, b) => parseTimeTo24h(a.time || '9:00 AM').localeCompare(parseTimeTo24h(b.time || '9:00 AM'))),
     
    [schedules, todayString]
  );

  const todaysEventIds = useMemo(() => new Set(todaysEvents.map((e) => e.id)), [todaysEvents]);

  const upcomingList = useMemo(
    () => upcomingEvents.filter((e) => !todaysEventIds.has(e.id)),
    [upcomingEvents, todaysEventIds]
  );

  const myUpcomingDuties = useMemo(() => {
    if (!currentUser) return [];
    return getUpcomingMinisterialDuties(schedules, assignments, currentUser.uid);
  }, [currentUser, schedules, assignments]);

  const rawDisplayName = userProfile?.fullName || currentUser?.displayName || 'Guest';
  const displayName = userProfile?.firstName || rawDisplayName.split(' ')[0];

  const handleRsvp = async (eventId: string, status: string) => {
    if (!currentUser?.uid) return;
    try {
      await updateRsvp(eventId, currentUser.uid, status);
    } catch (error) {
      console.error('RSVP error:', error);
    }
  };

  const handlePray = async (id: string) => {
    const churchId = userProfile?.churchId;
    if (!currentUser?.uid || !churchId) return;
    try {
      await prayerRepository.togglePrayerLike(churchId, id, currentUser.uid);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAnswered = async (id: string, currentValue: boolean) => {
    const churchId = userProfile?.churchId;
    if (!churchId) return;
    try {
      await prayerRepository.togglePrayerAnswered(churchId, id, currentValue);
    } catch (error) {
      console.error(error);
    }
  };

  // We change this to update the ministry assignment status directly
  const handleMinisterialDuty = async (assignmentId: string, action: 'accept' | 'cancel') => {
    if (!currentUser?.uid) return;
    const newStatus = action === 'accept' ? 'Confirmed' : 'Declined';
    await ministryRepository.updateAssignment(assignmentId, { status: newStatus });
  };

  return {
    currentUser,
    displayName,
    latestPrayer,
    myUpcomingDuties,
    upcomingEvents,
    todaysEvents,
    upcomingList,
    getUserMinisterialRoles,
    getUserRsvpStatus,
    handleMinisterialDuty,
    handlePray,
    handleRsvp,
    handleAnswered,
    formatPrayerTimeAgo,
    assignments, // Export assignments to use in home screen
  };
}
