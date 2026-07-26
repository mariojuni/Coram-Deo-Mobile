import type { Timestamp } from 'firebase/firestore';

export type GroupType =
  | 'discipleship'
  | 'small_group'
  | 'bible_study'
  | 'youth_group'
  | 'other';

export type PostType = 'announcement' | 'discussion' | 'prayer' | 'reflection';
export type PostStatus = 'active' | 'hidden' | 'deleted';
export type GroupStatus = 'active' | 'inactive' | 'archived';

export interface DiscipleshipGroup {
  id: string;
  churchId: string;
  name: string;
  description?: string;
  groupType: GroupType;
  planId?: string | null;
  planTitle?: string;
  currentLessonId?: string | null;
  currentWeekNumber?: number;
  leaderMemberIds: string[];
  leaderUserIds?: string[];
  memberIds: string[];
  userIds?: string[];
  meetingDay?: string;
  meetingTime?: string;
  meetingLocation?: string;
  status: GroupStatus;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string | Timestamp | any;
  updatedAt?: string | Timestamp | any;
}

export interface DiscipleshipPlan {
  id: string;
  churchId: string;
  title: string;
  subtitle?: string;
  description?: string;
  category?: string;
  language?: string;
  coverImageUrl?: string;
  totalWeeks: number;
  status: 'draft' | 'published' | 'archived';
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string | Timestamp | any;
  updatedAt?: string | Timestamp | any;
}

export interface DiscipleshipLesson {
  id: string;
  churchId: string;
  planId: string;
  weekNumber: number;
  title: string;
  scriptureReference?: string;
  lessonContent?: string;
  discussionQuestions?: string;
  applicationQuestions?: string;
  memoryVerse?: string;
  status?: string;
  createdAt?: string | Timestamp | any;
  updatedAt?: string | Timestamp | any;
}

export interface DiscipleshipProgress {
  id: string; // Document ID format: `${groupId}_${lessonId}_${memberId}`
  churchId: string;
  groupId: string;
  planId: string;
  lessonId: string;
  memberId: string;
  userId: string;
  weekNumber: number;
  isCompleted: boolean;
  completedAt?: string | Timestamp | any;
  reflectionNote?: string;
  leaderNote?: string;
  createdAt?: string | Timestamp | any;
  updatedAt?: string | Timestamp | any;
}

export interface DiscipleshipGroupPost {
  id: string;
  churchId: string;
  groupId: string;
  authorUserId: string;
  authorMemberId?: string;
  authorName?: string;
  authorPhotoUrl?: string;
  type: PostType;
  content: string;
  status: PostStatus;
  createdAt?: string | Timestamp | any;
  updatedAt?: string | Timestamp | any;
}
