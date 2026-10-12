import { create } from 'zustand';
import { scheduleRepository } from '../features/schedule/data/schedule.repository';
import {
  getMinisterialTeam,
  getUndismissedDutyNotificationsForAdmin,
  getUndismissedNotificationCount,
  getUpcomingMinisterialDuties,
  getUpcomingSchedules,
  getUserMinisterialRoles,
  getUserRsvpStatus,
  isScheduleCompleted,
  parseTimeTo24h,
} from '../features/schedule/domain/schedule.selectors';
import type { Rsvp, Schedule } from '../features/schedule/domain/schedule.types';

interface ScheduleStore {
  schedules: Schedule[];
  schedulesLoading: boolean;
  initializeSchedulesListener: () => () => void;
  clearSchedulesListener: () => void;
}

let schedulesUnsubscribe: (() => void) | null = null;
let schedulesSubscriberCount = 0;


export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  schedules: [],
  schedulesLoading: true,
  initializeSchedulesListener: () => {
    schedulesSubscriberCount += 1;

    const { useAuthStore } = require('./useAuthStore');
    const churchId = useAuthStore.getState().userProfile?.churchId;

    // Load cached schedules immediately for offline / instant render
    if (get().schedules.length === 0) {
      scheduleRepository.getCachedSchedules(churchId || undefined).then((cached) => {
        if (cached && cached.length > 0 && get().schedules.length === 0) {
          set({ schedules: cached, schedulesLoading: false });
        }
      }).catch(console.error);
    }

    if (!schedulesUnsubscribe) {
      schedulesUnsubscribe = scheduleRepository.subscribeToSchedules(
        churchId || undefined,
        (nextSchedules) => {
          set({ schedules: nextSchedules, schedulesLoading: false });
        },
        (error: any) => {
          if (
            error?.code === 'permission-denied' || 
            error?.message?.includes('permission') ||
            error?.message?.includes('Firestore shutting down')
          ) {
            set({ schedulesLoading: false });
            return;
          }
          console.error('Error fetching schedules:', error);
          set({ schedulesLoading: false });
        }
      );
    }

    return () => {
      schedulesSubscriberCount = Math.max(0, schedulesSubscriberCount - 1);
      if (schedulesSubscriberCount === 0 && schedulesUnsubscribe) {
        schedulesUnsubscribe();
        schedulesUnsubscribe = null;
      };
    };
  },
  clearSchedulesListener: () => {
    if (schedulesUnsubscribe) {
      schedulesUnsubscribe();
      schedulesUnsubscribe = null;
    }
    schedulesSubscriberCount = 0;
    set({ schedules: [], schedulesLoading: false });
  },
}));

export type { Duty, Rsvp, Schedule } from '../features/schedule/domain/schedule.types';
export {
  getMinisterialTeam, getUndismissedDutyNotificationsForAdmin, getUndismissedNotificationCount, getUpcomingMinisterialDuties, getUpcomingSchedules, getUserMinisterialRoles,
  getUserRsvpStatus, isScheduleCompleted, parseTimeTo24h
};

export async function updateRsvp(eventId: string, userId: string, status: string): Promise<void> {
  const normalizedStatus: Rsvp['status'] =
    status === 'going' || status === 'maybe' || status === 'not_going' ? status : 'maybe';
  await scheduleRepository.updateRsvp(eventId, userId, normalizedStatus);
}
