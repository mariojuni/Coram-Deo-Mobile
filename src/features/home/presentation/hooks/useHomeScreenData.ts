import { prayerRepository } from '@/features/prayer/data/prayer.repository';
import { formatPrayerTimeAgo } from '@/features/prayer/domain/prayer.selectors';
import type { Prayer } from '@/features/prayer/domain/prayer.types';
import { getUpcomingMinisterialDuties, getUpcomingSchedules } from '@/features/schedule/domain/schedule.selectors';
import { useAuthStore } from '@/store/useAuthStore';
import { useMinistryStore } from '@/store/useMinistryStore';
import {
  getUserMinisterialRoles,
  getUserRsvpStatus,
  updateRsvp,
  useScheduleStore,
} from '@/store/useScheduleStore';
import { ministryRepository } from '@/features/ministry/data/ministry.repository';
import { useEffect, useMemo, useState } from 'react';

export function useHomeScreenData() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const userProfile = useAuthStore((state) => state.userProfile);
  const schedules = useScheduleStore((state) => state.schedules);
  const initializeSchedulesListener = useScheduleStore((state) => state.initializeSchedulesListener);
  const { assignments, initializeAssignmentsListener, fetchMinistries } = useMinistryStore();
  const [latestPrayer, setLatestPrayer] = useState<Prayer | null>(null);

  useEffect(() => {
    const unsubscribe = initializeSchedulesListener();
    return () => unsubscribe();
  }, [initializeSchedulesListener]);

  useEffect(() => {
    const churchId = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
    fetchMinistries(churchId as string);
    const unsubscribe = initializeAssignmentsListener(churchId as string);
    return () => unsubscribe();
  }, [fetchMinistries, initializeAssignmentsListener, userProfile?.churchId]);

  useEffect(() => {
    const unsubscribe = prayerRepository.subscribeToLatestPrayer(
      (prayer) => setLatestPrayer(prayer),
      (error) => {
        console.error('Error loading latest prayer:', error);
      }
    );
    return () => unsubscribe();
  }, []);

  const upcomingEvents = useMemo(() => getUpcomingSchedules(schedules), [schedules]);

  const myUpcomingDuties = useMemo(() => {
    if (!currentUser) return [];
    return getUpcomingMinisterialDuties(schedules, assignments, currentUser.uid);
  }, [currentUser, schedules, assignments]);

  const rawDisplayName = userProfile?.name || currentUser?.displayName || 'Guest';
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
    if (!currentUser?.uid) return;
    try {
      await prayerRepository.togglePrayerLike(id, currentUser.uid);
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
