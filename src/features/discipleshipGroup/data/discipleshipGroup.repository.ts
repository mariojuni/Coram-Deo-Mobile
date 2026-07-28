import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../../../firebase';
import type { UserAccount } from '../../auth/domain/auth.types';
import type {
  DiscipleshipGroup,
  DiscipleshipGroupPost,
  DiscipleshipLesson,
  DiscipleshipPlan,
  DiscipleshipProgress,
} from '../domain/discipleshipGroup.types';
import { hasAnyRole } from '../../../permissions/discipleshipGroupPermissions';

export class DiscipleshipGroupRepository {
  /**
   * Subscribe to groups accessible by the current user within their churchId.
   */
  subscribeToUserGroups(
    user: UserAccount,
    onNext: (groups: DiscipleshipGroup[]) => void,
    onError: (error: Error) => void
  ): () => void {
    if (!user.churchId || user.status !== 'active') {
      onNext([]);
      return () => {};
    }

    const groupsRef = collection(db, 'discipleshipGroups');
    const isAdminOrPastor = hasAnyRole(user, ['super_admin', 'church_admin', 'pastor']);
    const memberId = user.memberId;
    const uid = user.uid;

    const groupMap = new Map<string, DiscipleshipGroup>();
    const unsubs: (() => void)[] = [];

    const emitGroups = () => {
      const list = Array.from(groupMap.values()).filter((g) => g.status !== 'archived');
      onNext(list);
    };

    const safeSubscribe = (q: any) => {
      try {
        const unsub = onSnapshot(
          q,
          (snapshot: any) => {
            snapshot.docs.forEach((d: any) => {
              groupMap.set(d.id, { ...d.data(), id: d.id } as DiscipleshipGroup);
            });
            emitGroups();
          },
          (err: any) => {
            console.warn('[DiscipleshipGroupRepository] Listener query notice:', err?.message || err);
            emitGroups();
          }
        );
        unsubs.push(unsub);
      } catch (err: any) {
        console.warn('[DiscipleshipGroupRepository] Setup query notice:', err?.message || err);
      }
    };

    // Subscribe to targeted user/member queries
    if (memberId) {
      safeSubscribe(query(groupsRef, where('churchId', '==', user.churchId), where('memberIds', 'array-contains', memberId)));
      safeSubscribe(query(groupsRef, where('churchId', '==', user.churchId), where('leaderMemberIds', 'array-contains', memberId)));
    }
    if (uid) {
      safeSubscribe(query(groupsRef, where('churchId', '==', user.churchId), where('userIds', 'array-contains', uid)));
      safeSubscribe(query(groupsRef, where('churchId', '==', user.churchId), where('leaderUserIds', 'array-contains', uid)));
    }

    // For admin or pastor, also attempt broad church query
    if (isAdminOrPastor) {
      safeSubscribe(query(groupsRef, where('churchId', '==', user.churchId)));
    }

    return () => {
      unsubs.forEach((u) => {
        try {
          u();
        } catch (_) {}
      });
    };
  }

  /**
   * Fetch a single group by ID.
   */
  async getGroup(churchId: string, groupId: string): Promise<DiscipleshipGroup | null> {
    if (!churchId || !groupId) return null;
    try {
      const docRef = doc(db, 'discipleshipGroups', groupId);
      const snap = await getDoc(docRef);
      if (snap.exists() && snap.data().churchId === churchId) {
        return { ...snap.data(), id: snap.id } as DiscipleshipGroup;
      }
    } catch (err: any) {
      console.warn('[DiscipleshipGroupRepository] getGroup error:', err?.message || err);
    }
    return null;
  }

  /**
   * Fetch plan and lessons attached to a group.
   */
  async getPlanWithLessons(
    churchId: string,
    planId: string
  ): Promise<{ plan: DiscipleshipPlan | null; lessons: DiscipleshipLesson[] }> {
    if (!churchId || !planId) return { plan: null, lessons: [] };

    try {
      const planRef = doc(db, 'discipleshipPlans', planId);
      const planSnap = await getDoc(planRef);
      const plan = planSnap.exists()
        ? ({ ...planSnap.data(), id: planSnap.id } as DiscipleshipPlan)
        : null;

      // 1. Try discipleshipWeeks by planId
      const weeksQuery = query(
        collection(db, 'discipleshipWeeks'),
        where('planId', '==', planId)
      );
      const weeksSnap = await getDocs(weeksQuery);
      let lessons: DiscipleshipLesson[] = weeksSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          churchId: data.churchId || churchId,
          planId: data.planId || planId,
          weekNumber: Number(data.weekNumber || 1),
          title: data.chapterTitle || data.title || `Week ${data.weekNumber || 1}`,
          scriptureReference: data.scriptureReference || '',
          lessonContent: data.storyText || data.lessonContent || '',
          discussionQuestions: data.discussionQuestions || '',
          applicationQuestions: data.applicationQuestions || '',
          memoryVerse: data.memoryVerse || '',
          status: data.status || 'published',
        } as DiscipleshipLesson;
      });

      // 2. Fallback to discipleshipLessons by planId
      if (lessons.length === 0) {
        const lessonsQuery = query(
          collection(db, 'discipleshipLessons'),
          where('planId', '==', planId)
        );
        const lessonsSnap = await getDocs(lessonsQuery);
        lessons = lessonsSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            churchId: data.churchId || churchId,
            planId: data.planId || planId,
            weekNumber: Number(data.weekNumber || 1),
            title: data.title || data.chapterTitle || `Week ${data.weekNumber || 1}`,
            scriptureReference: data.scriptureReference || '',
            lessonContent: data.lessonContent || data.storyText || '',
            discussionQuestions: data.discussionQuestions || '',
            applicationQuestions: data.applicationQuestions || '',
            memoryVerse: data.memoryVerse || '',
            status: data.status || 'published',
          } as DiscipleshipLesson;
        });
      }

      // 3. Fallback: query all discipleshipWeeks for churchId if planId field is string/number mismatch or missing
      if (lessons.length === 0 && churchId) {
        const allWeeksQuery = query(
          collection(db, 'discipleshipWeeks'),
          where('churchId', '==', churchId)
        );
        const allWeeksSnap = await getDocs(allWeeksQuery);
        const filteredDocs = allWeeksSnap.docs.filter(
          (d) => String(d.data().planId) === String(planId)
        );
        lessons = filteredDocs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            churchId: data.churchId || churchId,
            planId: data.planId || planId,
            weekNumber: Number(data.weekNumber || 1),
            title: data.chapterTitle || data.title || `Week ${data.weekNumber || 1}`,
            scriptureReference: data.scriptureReference || '',
            lessonContent: data.storyText || data.lessonContent || '',
            discussionQuestions: data.discussionQuestions || '',
            applicationQuestions: data.applicationQuestions || '',
            memoryVerse: data.memoryVerse || '',
            status: data.status || 'published',
          } as DiscipleshipLesson;
        });
      }

      lessons.sort((a, b) => (a.weekNumber || 0) - (b.weekNumber || 0));

      return { plan, lessons };
    } catch (err: any) {
      console.warn('[DiscipleshipGroupRepository] getPlanWithLessons error:', err?.message || err);
      return { plan: null, lessons: [] };
    }
  }

  /**
   * Subscribe to progress for a group.
   */
  subscribeToGroupProgress(
    churchId: string,
    groupId: string,
    onNext: (progressList: DiscipleshipProgress[]) => void,
    onError: (error: Error) => void
  ): () => void {
    if (!churchId || !groupId) {
      onNext([]);
      return () => {};
    }
    const q = query(
      collection(db, 'discipleshipProgress'),
      where('churchId', '==', churchId),
      where('groupId', '==', groupId)
    );
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as DiscipleshipProgress));
        onNext(list);
      },
      (err) => {
        console.warn('[DiscipleshipGroupRepository] Progress permission/network warning:', err?.message || err);
        onNext([]);
      }
    );
  }

  /**
   * Save or update progress for a member in a lesson (doc ID: `${groupId}_${lessonId}_${memberId}`).
   */
  async saveMemberProgress(payload: {
    churchId: string;
    groupId: string;
    planId: string;
    lessonId: string;
    memberId: string;
    userId: string;
    weekNumber: number;
    isCompleted: boolean;
    reflectionNote?: string;
  }): Promise<void> {
    const docId = `${payload.groupId}_${payload.lessonId}_${payload.memberId}`;
    const docRef = doc(db, 'discipleshipProgress', docId);

    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await updateDoc(docRef, {
        isCompleted: payload.isCompleted,
        completedAt: payload.isCompleted ? serverTimestamp() : null,
        ...(payload.reflectionNote !== undefined && { reflectionNote: payload.reflectionNote }),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        churchId: payload.churchId,
        groupId: payload.groupId,
        planId: payload.planId,
        lessonId: payload.lessonId,
        memberId: payload.memberId,
        userId: payload.userId,
        weekNumber: payload.weekNumber,
        isCompleted: payload.isCompleted,
        completedAt: payload.isCompleted ? serverTimestamp() : null,
        reflectionNote: payload.reflectionNote || '',
        leaderNote: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  /**
   * Add or update leader note on a progress record.
   */
  async saveLeaderNote(
    churchId: string,
    groupId: string,
    lessonId: string,
    memberId: string,
    userId: string,
    planId: string,
    weekNumber: number,
    leaderNote: string
  ): Promise<void> {
    const docId = `${groupId}_${lessonId}_${memberId}`;
    const docRef = doc(db, 'discipleshipProgress', docId);

    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await updateDoc(docRef, {
        leaderNote,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        churchId,
        groupId,
        planId,
        lessonId,
        memberId,
        userId,
        weekNumber,
        isCompleted: false,
        completedAt: null,
        reflectionNote: '',
        leaderNote,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  /**
   * Subscribe to posts for a group.
   */
  subscribeToGroupPosts(
    churchId: string,
    groupId: string,
    onNext: (posts: DiscipleshipGroupPost[]) => void,
    onError: (error: Error) => void
  ): () => void {
    if (!churchId || !groupId) {
      onNext([]);
      return () => {};
    }
    const q = query(
      collection(db, 'discipleshipGroupPosts'),
      where('churchId', '==', churchId),
      where('groupId', '==', groupId)
    );
    return onSnapshot(
      q,
      (snap) => {
        const posts = snap.docs
          .map((d) => ({ ...d.data(), id: d.id } as DiscipleshipGroupPost))
          .filter((p) => p.status === 'active')
          .sort((a, b) => {
            const timeA = (a.createdAt as any)?.toMillis ? (a.createdAt as any).toMillis() : 0;
            const timeB = (b.createdAt as any)?.toMillis ? (b.createdAt as any).toMillis() : 0;
            return timeB - timeA;
          });
        onNext(posts);
      },
      (_err) => {
        onNext([]);
      }
    );
  }

  /**
   * Create a group post.
   */
  async createGroupPost(post: Omit<DiscipleshipGroupPost, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const postRef = doc(collection(db, 'discipleshipGroupPosts'));
    await setDoc(postRef, {
      ...post,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return postRef.id;
  }

  /**
   * Advance group current week and lesson ID.
   */
  async advanceGroupWeek(churchId: string, groupId: string, nextWeekNumber: number, nextLessonId?: string | null, userId?: string): Promise<void> {
    const docRef = doc(db, 'discipleshipGroups', groupId);
    await updateDoc(docRef, {
      currentWeekNumber: nextWeekNumber,
      currentLessonId: nextLessonId || null,
      updatedBy: userId || null,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Detach plan from group.
   */
  async removeGroupPlan(churchId: string, groupId: string, userId?: string): Promise<void> {
    const docRef = doc(db, 'discipleshipGroups', groupId);
    await updateDoc(docRef, {
      planId: null,
      planTitle: null,
      currentWeekNumber: null,
      currentLessonId: null,
      updatedBy: userId || null,
      updatedAt: serverTimestamp(),
    });
  }
}

export const discipleshipGroupRepository = new DiscipleshipGroupRepository();
