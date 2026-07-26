import { create } from 'zustand';
import type { UserAccount } from '../features/auth/domain/auth.types';
import { discipleshipGroupRepository } from '../features/discipleshipGroup/data/discipleshipGroup.repository';
import type {
  DiscipleshipGroup,
  DiscipleshipGroupPost,
  DiscipleshipLesson,
  DiscipleshipPlan,
  DiscipleshipProgress,
  PostType,
} from '../features/discipleshipGroup/domain/discipleshipGroup.types';

interface DiscipleshipGroupStoreState {
  groups: DiscipleshipGroup[];
  groupsLoading: boolean;
  groupsError: string | null;

  activeGroup: DiscipleshipGroup | null;
  activePlan: DiscipleshipPlan | null;
  activeLessons: DiscipleshipLesson[];
  activeGroupLoading: boolean;

  groupProgress: DiscipleshipProgress[];
  groupPosts: DiscipleshipGroupPost[];
  postsLoading: boolean;

  // Listeners
  initializeUserGroupsListener: (user: UserAccount | null) => () => void;
  loadGroupDetails: (churchId: string, groupId: string) => Promise<void>;
  subscribeToGroupDetails: (churchId: string, groupId: string) => () => void;

  // Actions
  saveMemberProgress: (payload: {
    churchId: string;
    groupId: string;
    planId: string;
    lessonId: string;
    memberId: string;
    userId: string;
    weekNumber: number;
    isCompleted: boolean;
    reflectionNote?: string;
  }) => Promise<void>;

  saveLeaderNote: (payload: {
    churchId: string;
    groupId: string;
    lessonId: string;
    memberId: string;
    userId: string;
    planId: string;
    weekNumber: number;
    leaderNote: string;
  }) => Promise<void>;

  createPost: (payload: {
    churchId: string;
    groupId: string;
    authorUserId: string;
    authorMemberId?: string;
    authorName?: string;
    authorPhotoUrl?: string;
    type: PostType;
    content: string;
  }) => Promise<void>;

  advanceGroupWeek: (churchId: string, groupId: string, nextWeekNumber: number, nextLessonId?: string | null, userId?: string) => Promise<void>;
  removeGroupPlan: (churchId: string, groupId: string, userId?: string) => Promise<void>;

  clearActiveGroup: () => void;
}

let groupsUnsubscribe: (() => void) | null = null;
let progressUnsubscribe: (() => void) | null = null;
let postsUnsubscribe: (() => void) | null = null;

export const useDiscipleshipGroupStore = create<DiscipleshipGroupStoreState>((set, get) => ({
  groups: [],
  groupsLoading: true,
  groupsError: null,

  activeGroup: null,
  activePlan: null,
  activeLessons: [],
  activeGroupLoading: false,

  groupProgress: [],
  groupPosts: [],
  postsLoading: false,

  initializeUserGroupsListener: (user) => {
    if (groupsUnsubscribe) {
      groupsUnsubscribe();
      groupsUnsubscribe = null;
    }

    if (!user || !user.churchId || user.status !== 'active') {
      set({ groups: [], groupsLoading: false, groupsError: null });
      return () => {};
    }

    set({ groupsLoading: true, groupsError: null });

    groupsUnsubscribe = discipleshipGroupRepository.subscribeToUserGroups(
      user,
      (groups) => {
        set({ groups, groupsLoading: false, groupsError: null });
      },
      (error) => {
        console.warn('[DiscipleshipGroupStore] Listener warning:', error);
        set({ groupsLoading: false, groupsError: null });
      }
    );

    return () => {
      if (groupsUnsubscribe) {
        groupsUnsubscribe();
        groupsUnsubscribe = null;
      }
    };
  },

  loadGroupDetails: async (churchId, groupId) => {
    set({ activeGroupLoading: true });
    try {
      const group = await discipleshipGroupRepository.getGroup(churchId, groupId);
      if (!group) {
        set({ activeGroup: null, activePlan: null, activeLessons: [], activeGroupLoading: false });
        return;
      }

      let plan: DiscipleshipPlan | null = null;
      let lessons: DiscipleshipLesson[] = [];

      if (group.planId) {
        const result = await discipleshipGroupRepository.getPlanWithLessons(churchId, group.planId);
        plan = result.plan;
        lessons = result.lessons;
      }

      set({
        activeGroup: group,
        activePlan: plan,
        activeLessons: lessons,
        activeGroupLoading: false,
      });
    } catch (error) {
      console.error('[DiscipleshipGroupStore] Error loading group details:', error);
      set({ activeGroupLoading: false });
    }
  },

  subscribeToGroupDetails: (churchId, groupId) => {
    if (progressUnsubscribe) {
      progressUnsubscribe();
      progressUnsubscribe = null;
    }
    if (postsUnsubscribe) {
      postsUnsubscribe();
      postsUnsubscribe = null;
    }

    if (!churchId || !groupId) {
      return () => {};
    }

    set({ postsLoading: true });

    progressUnsubscribe = discipleshipGroupRepository.subscribeToGroupProgress(
      churchId,
      groupId,
      (progressList) => set({ groupProgress: progressList }),
      (err) => console.error('[DiscipleshipGroupStore] Progress error:', err)
    );

    postsUnsubscribe = discipleshipGroupRepository.subscribeToGroupPosts(
      churchId,
      groupId,
      (posts) => set({ groupPosts: posts, postsLoading: false }),
      (err) => {
        console.error('[DiscipleshipGroupStore] Posts error:', err);
        set({ postsLoading: false });
      }
    );

    return () => {
      if (progressUnsubscribe) {
        progressUnsubscribe();
        progressUnsubscribe = null;
      }
      if (postsUnsubscribe) {
        postsUnsubscribe();
        postsUnsubscribe = null;
      }
    };
  },

  saveMemberProgress: async (payload) => {
    await discipleshipGroupRepository.saveMemberProgress(payload);
  },

  saveLeaderNote: async (payload) => {
    await discipleshipGroupRepository.saveLeaderNote(
      payload.churchId,
      payload.groupId,
      payload.lessonId,
      payload.memberId,
      payload.userId,
      payload.planId,
      payload.weekNumber,
      payload.leaderNote
    );
  },

  createPost: async (payload) => {
    await discipleshipGroupRepository.createGroupPost({
      ...payload,
      status: 'active',
    });
  },

  advanceGroupWeek: async (churchId, groupId, nextWeekNumber, nextLessonId, userId) => {
    await discipleshipGroupRepository.advanceGroupWeek(churchId, groupId, nextWeekNumber, nextLessonId, userId);
    await get().loadGroupDetails(churchId, groupId);
  },

  removeGroupPlan: async (churchId, groupId, userId) => {
    await discipleshipGroupRepository.removeGroupPlan(churchId, groupId, userId);
    await get().loadGroupDetails(churchId, groupId);
  },

  clearActiveGroup: () => {
    if (progressUnsubscribe) {
      progressUnsubscribe();
      progressUnsubscribe = null;
    }
    if (postsUnsubscribe) {
      postsUnsubscribe();
      postsUnsubscribe = null;
    }
    set({
      activeGroup: null,
      activePlan: null,
      activeLessons: [],
      groupProgress: [],
      groupPosts: [],
    });
  },
}));
