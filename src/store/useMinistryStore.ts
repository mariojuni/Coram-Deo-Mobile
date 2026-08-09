import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ministryRepository } from '../features/ministry/data/ministry.repository';
import type { Ministry, MinistryAssignment } from '../features/ministry/domain/ministry.types';

interface MinistryStore {
  ministries: Ministry[];
  ministriesLoading: boolean;
  assignments: MinistryAssignment[];
  assignmentsLoading: boolean;
  memberAssignments: MinistryAssignment[];
  memberAssignmentsLoading: boolean;
  fetchMinistries: (churchId: string) => Promise<void>;
  initializeAssignmentsListener: (churchId: string) => () => void;
  initializeMemberAssignmentsListener: (churchId: string, memberIds: string[]) => () => void;
  clearMinistryListeners: () => void;
  getAssignmentsForEvent: (eventId: string) => MinistryAssignment[];
  getUserAssignments: (userId: string) => MinistryAssignment[];
  hasNewAssignment: boolean;
  lastViewedAssignmentCount: number;
  markAssignmentsViewed: () => Promise<void>;
  loadViewedAssignmentCount: () => Promise<void>;
}

let assignmentsUnsubscribe: (() => void) | null = null;
let assignmentsSubscriberCount = 0;

let memberAssignmentsUnsubscribe: (() => void) | null = null;
let memberAssignmentsSubscriberCount = 0;

export const useMinistryStore = create<MinistryStore>((set, get) => ({
  ministries: [],
  ministriesLoading: true,
  assignments: [],
  assignmentsLoading: true,
  memberAssignments: [],
  memberAssignmentsLoading: false,
  hasNewAssignment: false,
  lastViewedAssignmentCount: 0,

  clearMinistryListeners: () => {
    if (assignmentsUnsubscribe) {
      assignmentsUnsubscribe();
      assignmentsUnsubscribe = null;
    }
    assignmentsSubscriberCount = 0;
    if (memberAssignmentsUnsubscribe) {
      memberAssignmentsUnsubscribe();
      memberAssignmentsUnsubscribe = null;
    }
    memberAssignmentsSubscriberCount = 0;
    set({ assignments: [], memberAssignments: [], assignmentsLoading: false, memberAssignmentsLoading: false });
  },

  loadViewedAssignmentCount: async () => {
    try {
      const stored = await AsyncStorage.getItem('lastViewedAssignmentCount');
      if (stored) {
        set({ lastViewedAssignmentCount: parseInt(stored, 10) });
      }
    } catch {
      // ignore
    }
  },

  markAssignmentsViewed: async () => {
    const currentCount = get().memberAssignments.length;
    set({ lastViewedAssignmentCount: currentCount, hasNewAssignment: false });
    try {
      await AsyncStorage.setItem('lastViewedAssignmentCount', currentCount.toString());
    } catch {
      // ignore
    }
  },

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

  initializeMemberAssignmentsListener: (churchId: string, memberIds: string[]) => {
    memberAssignmentsSubscriberCount += 1;
    if (!memberAssignmentsUnsubscribe) {
      set({ memberAssignmentsLoading: true });
      memberAssignmentsUnsubscribe = ministryRepository.subscribeToMemberAssignments(
        churchId,
        memberIds,
        (data) => {
          set((state) => {
            const hasNew = data.length > state.lastViewedAssignmentCount;
            return {
              memberAssignments: data,
              memberAssignmentsLoading: false,
              hasNewAssignment: state.hasNewAssignment || hasNew,
            };
          });
        }
      );
    }

    return () => {
      memberAssignmentsSubscriberCount = Math.max(0, memberAssignmentsSubscriberCount - 1);
      if (memberAssignmentsSubscriberCount === 0 && memberAssignmentsUnsubscribe) {
        memberAssignmentsUnsubscribe();
        memberAssignmentsUnsubscribe = null;
        // Keep loading:false so re-entering the screen doesn't flash a spinner
        // before the cached Firestore snapshot arrives
        set({ memberAssignments: [] });
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
