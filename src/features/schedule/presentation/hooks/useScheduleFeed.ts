import { useCallback, useEffect, useState } from 'react';
import { scheduleRepository } from '../../data/schedule.repository';
import type { Rsvp, Schedule } from '../../domain/schedule.types';

import { useAuthStore } from '@/store/useAuthStore';

export function useScheduleFeed() {
  const { userProfile } = useAuthStore();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    scheduleRepository.getCachedSchedules(userProfile?.churchId ?? undefined).then((cached) => {
      if (isMounted && cached && cached.length > 0) {
        setSchedules((prev) => (prev.length === 0 ? cached : prev));
        setSchedulesLoading(false);
      }
    }).catch(console.error);

    const unsubscribe = scheduleRepository.subscribeToSchedules(
      userProfile?.churchId ?? undefined,
      (nextSchedules: Schedule[]) => {
        if (isMounted) {
          setSchedules(nextSchedules);
          setSchedulesLoading(false);
        }
      },
      (error) => {
        console.error('Error fetching schedules:', error);
        if (isMounted) setSchedulesLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [userProfile?.churchId]);

  const updateRsvp = useCallback(async (eventId: string, userId: string, status: Rsvp['status']) => {
    await scheduleRepository.updateRsvp(eventId, userId, status);
  }, []);



  return {
    schedules,
    schedulesLoading,
    updateRsvp,
  };
}

