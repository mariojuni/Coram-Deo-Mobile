import { ministryRepository } from '@/features/ministry/data/ministry.repository';
import { NotificationRepository } from '@/services/notification/NotificationRepository';
import { prayerRepository } from '@/features/prayer/data/prayer.repository';
import { formatPrayerTimeAgo } from '@/features/prayer/domain/prayer.selectors';
import type { Prayer } from '@/features/prayer/domain/prayer.types';
import { getUpcomingMinisterialDuties, getUpcomingSchedules, parseTimeTo24h, normalizeDateToYmd } from '@/features/schedule/domain/schedule.selectors';
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
  const activeSchedules = useMemo(() => schedules.filter(s => {
    const status = s.status?.toLowerCase();
    return status === 'published' || status === 'cancelled';
  }), [schedules]);

  const assignments = useMinistryStore((state) => state.assignments);
  const initializeAssignmentsListener = useMinistryStore((state) => state.initializeAssignmentsListener);
  const fetchMinistries = useMinistryStore((state) => state.fetchMinistries);
  const [latestPrayer, setLatestPrayer] = useState<Prayer | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryTrigger, setRetryTrigger] = useState(false);

  const initializePlansListener = useBiblePlanStore((s) => s.initializePlansListener);
  const initializeUserBiblePlansListener = useBiblePlanStore((s) => s.initializeUserBiblePlansListener);

  useEffect(() => {
    if (!userProfile?.churchId) return;
    const unsubscribe = initializeSchedulesListener();
    return () => unsubscribe();
  }, [initializeSchedulesListener, userProfile?.churchId]);

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
      (error: any) => {
        if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
          return;
        }
        console.error('Error fetching latest prayer:', error);
        setHasError(true);
      }
    );
    return () => unsubscribe();
  }, [userProfile?.churchId, retryTrigger]);

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


  const todayString = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);



  const todaysEvents = useMemo(
    () =>
      activeSchedules
        .filter((event) => normalizeDateToYmd(event.date) === todayString)
        .sort((a, b) => parseTimeTo24h(a.time || '9:00 AM').localeCompare(parseTimeTo24h(b.time || '9:00 AM'))),
     
    [activeSchedules, todayString]
  );

  const todaysEventIds = useMemo(() => new Set(todaysEvents.map((event) => event.id)), [todaysEvents]);

  const upcomingEvents = useMemo(() => getUpcomingSchedules(activeSchedules, 20), [activeSchedules]);

  const upcomingList = useMemo(
    () => upcomingEvents.filter((e) => !todaysEventIds.has(e.id)),
    [upcomingEvents, todaysEventIds]
  );

  const myUpcomingDuties = useMemo(() => {
    const memberIds = new Set<string>();
    if (currentUser?.uid) memberIds.add(currentUser.uid);
    if (userProfile?.memberId) memberIds.add(userProfile.memberId);
    
    if (memberIds.size === 0) return [];
    return getUpcomingMinisterialDuties(activeSchedules, assignments, Array.from(memberIds));
  }, [currentUser?.uid, userProfile?.memberId, activeSchedules, assignments]);

  const rawDisplayName = [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ') || currentUser?.displayName || 'Guest';
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
    
    if (action === 'cancel') {
      await NotificationRepository.deleteNotificationBySourceId(currentUser.uid, assignmentId);
    }
  };

  const clearError = () => setHasError(false);
  const retry = () => {
    clearError();
    setRetryTrigger(prev => !prev);
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
    assignments,
    hasError,
    clearError,
    retry,
  };
}
