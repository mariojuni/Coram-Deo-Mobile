import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  doc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getActiveDb } from '../../../firebase';
import type { StartPlanPayload, UserBiblePlan, UserBiblePlanStatus } from '../domain/biblePlan.types';

// ─── Collection path helper ────────────────────────────────────────────────────
const userBiblePlansCol = (churchId: string) =>
  collection(getActiveDb(), 'churches', churchId, 'userBiblePlans');

// ─── Mapper ────────────────────────────────────────────────────────────────────

function toUserBiblePlanModel(data: Record<string, unknown>, id: string): UserBiblePlan {
  return {
    id,
    churchId: typeof data.churchId === 'string' ? data.churchId : '',
    userId: typeof data.userId === 'string' ? data.userId : '',
    memberId: typeof data.memberId === 'string' ? data.memberId : null,
    planId: typeof data.planId === 'string' ? data.planId : '',
    status: (data.status as UserBiblePlanStatus) ?? 'active',
    startedAt: (data.startedAt as UserBiblePlan['startedAt']) ?? null,
    completedAt: (data.completedAt as UserBiblePlan['completedAt']) ?? null,
    currentDayNumber: typeof data.currentDayNumber === 'number' ? data.currentDayNumber : 1,
    completedDaysCount: typeof data.completedDaysCount === 'number' ? data.completedDaysCount : 0,
    totalDays: typeof data.totalDays === 'number' ? data.totalDays : 0,
    progressPercentage: typeof data.progressPercentage === 'number' ? data.progressPercentage : 0,
    lastReadAt: (data.lastReadAt as UserBiblePlan['lastReadAt']) ?? null,
    updatedAt: (data.updatedAt as UserBiblePlan['updatedAt']) ?? null,
  };
}

// ─── Repository ────────────────────────────────────────────────────────────────

export const userBiblePlanRepository = {
  /**
   * Start a Bible plan for a user.
   * Path: churches/{churchId}/userBiblePlans
   * Duplicate-safe: returns existing record ID if already active.
   */
  async startPlan(payload: StartPlanPayload): Promise<string> {
    const { churchId, userId, memberId, planId, totalDays } = payload;

    const existingSnap = await getDocs(
      query(
        userBiblePlansCol(churchId),
        where('userId', '==', userId),
        where('planId', '==', planId),
        where('status', '==', 'active')
      )
    );
    if (!existingSnap.empty) return existingSnap.docs[0].id;

    const now = new Date().toISOString();
    const newRecord: Omit<UserBiblePlan, 'id'> = {
      churchId,
      userId,
      memberId: memberId ?? null,
      planId,
      status: 'active',
      startedAt: now,
      completedAt: null,
      currentDayNumber: 1,
      completedDaysCount: 0,
      totalDays,
      progressPercentage: 0,
      lastReadAt: null,
      updatedAt: now,
    };

    const docRef = await addDoc(userBiblePlansCol(churchId), newRecord);
    return docRef.id;
  },

  /**
   * Cancel an active Bible plan for a user.
   */
  async cancelPlan(userBiblePlanId: string, churchId: string): Promise<void> {
    const planRef = doc(getActiveDb(), 'churches', churchId, 'userBiblePlans', userBiblePlanId);
    await updateDoc(planRef, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Get a user's record for a specific plan (any status).
   */
  async getUserBiblePlan(userId: string, planId: string, churchId: string): Promise<UserBiblePlan | null> {
    if (!userId || !planId || !churchId) return null;
    const snap = await getDocs(
      query(
        userBiblePlansCol(churchId),
        where('userId', '==', userId),
        where('planId', '==', planId)
      )
    );
    if (snap.empty) return null;
    const first = snap.docs[0];
    return toUserBiblePlanModel(first.data() as Record<string, unknown>, first.id);
  },

  /**
   * Real-time listener for all of a user's Bible plans (active + completed).
   */
  subscribeToUserBiblePlans(
    userId: string,
    churchId: string,
    onData: (plans: UserBiblePlan[]) => void,
    onError: (error: Error) => void
  ): () => void {
    if (!userId || !churchId) {
      onData([]);
      return () => {};
    }
    const q = query(userBiblePlansCol(churchId), where('userId', '==', userId));
    return onSnapshot(
      q,
      (snapshot) => {
        const plans = snapshot.docs.map((d) =>
          toUserBiblePlanModel(d.data() as Record<string, unknown>, d.id)
        );
        onData(plans);
      },
      (error) => onError(error)
    );
  },

  /**
   * Update fields on a UserBiblePlan document.
   */
  async updateUserBiblePlan(
    id: string,
    churchId: string,
    data: Partial<Omit<UserBiblePlan, 'id'>>
  ): Promise<void> {
    await updateDoc(doc(getActiveDb(), 'churches', churchId, 'userBiblePlans', id), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Atomically advance currentDayNumber and update progress.
   * Sets status to 'completed' when all days are done.
   */
  async advanceToNextDay(
    userBiblePlanId: string,
    churchId: string,
    nextDayNumber: number,
    completedDaysCount: number,
    totalDays: number
  ): Promise<void> {
    const planRef = doc(getActiveDb(), 'churches', churchId, 'userBiblePlans', userBiblePlanId);
    const progressPercentage = totalDays > 0
      ? Math.round((completedDaysCount / totalDays) * 100)
      : 0;
    const isCompleted = completedDaysCount >= totalDays;
    const now = new Date().toISOString();

    await runTransaction(getActiveDb(), async (transaction) => {
      const snap = await transaction.get(planRef);
      if (!snap.exists()) throw new Error('UserBiblePlan not found');
      transaction.update(planRef, {
        currentDayNumber: nextDayNumber,
        completedDaysCount,
        progressPercentage,
        status: isCompleted ? 'completed' : 'active',
        ...(isCompleted && { completedAt: now }),
        lastReadAt: now,
        updatedAt: now,
      });
    });
  },
};
