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

export const useScheduleStore = create<ScheduleStore>((set) => ({
  schedules: [],
  schedulesLoading: true,
  initializeSchedulesListener: () => {
    schedulesSubscriberCount += 1;

    if (!schedulesUnsubscribe) {
      schedulesUnsubscribe = scheduleRepository.subscribeToSchedules(
        (nextSchedules) => {
          set({ schedules: nextSchedules, schedulesLoading: false });
        },
        (error) => {
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
  getUserRsvpStatus, parseTimeTo24h
};

export async function updateRsvp(eventId: string, userId: string, status: string): Promise<void> {
  const normalizedStatus: Rsvp['status'] =
    status === 'going' || status === 'maybe' || status === 'not_going' ? status : 'maybe';
  await scheduleRepository.updateRsvp(eventId, userId, normalizedStatus);
}
