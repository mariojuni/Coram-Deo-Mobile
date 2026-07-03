import { create } from 'zustand';
import { ministryRepository } from '../features/ministry/data/ministry.repository';
import type { Ministry, MinistryAssignment } from '../features/ministry/domain/ministry.types';

interface MinistryStore {
  ministries: Ministry[];
  ministriesLoading: boolean;
  assignments: MinistryAssignment[];
  assignmentsLoading: boolean;
  fetchMinistries: (churchId: string) => Promise<void>;
  initializeAssignmentsListener: (churchId: string) => () => void;
  getAssignmentsForEvent: (eventId: string) => MinistryAssignment[];
  getUserAssignments: (userId: string) => MinistryAssignment[];
}

let assignmentsUnsubscribe: (() => void) | null = null;
let assignmentsSubscriberCount = 0;

export const useMinistryStore = create<MinistryStore>((set, get) => ({
  ministries: [],
  ministriesLoading: true,
  assignments: [],
  assignmentsLoading: true,

  fetchMinistries: async (churchId: string) => {
    set({ ministriesLoading: true });
    try {
      const data = await ministryRepository.getMinistries(churchId);
      set({ ministries: data, ministriesLoading: false });
    } catch (e) {
      console.error('Failed to fetch ministries', e);
      set({ ministriesLoading: false });
    }
  },

  initializeAssignmentsListener: (churchId: string) => {
    assignmentsSubscriberCount += 1;
    if (!assignmentsUnsubscribe) {
      assignmentsUnsubscribe = ministryRepository.subscribeToAllMinistryAssignments(churchId, (data) => {
        set({ assignments: data, assignmentsLoading: false });
      });
    }

    return () => {
      assignmentsSubscriberCount = Math.max(0, assignmentsSubscriberCount - 1);
      if (assignmentsSubscriberCount === 0 && assignmentsUnsubscribe) {
        assignmentsUnsubscribe();
        assignmentsUnsubscribe = null;
      }
    };
  },

  getAssignmentsForEvent: (eventId: string) => {
    return get().assignments.filter(a => a.eventId === eventId);
  },

  getUserAssignments: (userId: string) => {
    return get().assignments.filter(a => a.memberId === userId);
  }
}));

export * from '../features/ministry/domain/ministry.types';
