import { ministryRepository } from '@/features/ministry/data/ministry.repository';
import { prayerRepository } from '@/features/prayer/data/prayer.repository';
import { formatPrayerTimeAgo } from '@/features/prayer/domain/prayer.selectors';
import type { Prayer } from '@/features/prayer/domain/prayer.types';
import { getUpcomingMinisterialDuties, getUpcomingSchedules } from '@/features/schedule/domain/schedule.selectors';
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

  const upcomingEvents = useMemo(() => getUpcomingSchedules(schedules), [schedules]);

  const myUpcomingDuties = useMemo(() => {
    if (!currentUser) return [];
    return getUpcomingMinisterialDuties(schedules, assignments, currentUser.uid);
  }, [currentUser, schedules, assignments]);

  const rawDisplayName = userProfile?.fullName || currentUser?.displayName || 'Guest';
  const displayName = rawDisplayName.split(' ')[0];

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
    getUserMinisterialRoles,
    getUserRsvpStatus,
    handleMinisterialDuty,
    handlePray,
    handleRsvp,
    formatPrayerTimeAgo,
    assignments, // Export assignments to use in home screen
  };
}
