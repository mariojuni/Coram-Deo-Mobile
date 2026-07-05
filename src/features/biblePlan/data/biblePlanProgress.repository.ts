import {
    addDoc,
    collection,
    doc,
    getDocs,
    onSnapshot,
    query,
    updateDoc,
    where,
} from 'firebase/firestore';
import { db } from '../../../firebase';
import type { BiblePlanProgress, MarkDayCompletedPayload } from '../domain/biblePlan.types';
import { userBiblePlanRepository } from './userBiblePlan.repository';

// ─── Collection path helper ────────────────────────────────────────────────────
const progressCol = (churchId: string) =>
  collection(db, 'churches', churchId, 'biblePlanProgress');

// ─── Mapper ────────────────────────────────────────────────────────────────────

function toBiblePlanProgressModel(data: Record<string, unknown>, id: string): BiblePlanProgress {
  return {
    id,
    churchId: typeof data.churchId === 'string' ? data.churchId : '',
    planId: typeof data.planId === 'string' ? data.planId : '',
    dayId: typeof data.dayId === 'string' ? data.dayId : '',
    userId: typeof data.userId === 'string' ? data.userId : '',
    memberId: typeof data.memberId === 'string' ? data.memberId : null,
    dayNumber: typeof data.dayNumber === 'number' ? data.dayNumber : 0,
    isCompleted: Boolean(data.isCompleted),
    completedAt: (data.completedAt as BiblePlanProgress['completedAt']) ?? null,
    createdAt: (data.createdAt as BiblePlanProgress['createdAt']) ?? null,
    updatedAt: (data.updatedAt as BiblePlanProgress['updatedAt']) ?? null,
  };
}

// ─── Repository ────────────────────────────────────────────────────────────────

export const biblePlanProgressRepository = {
  /**
   * Mark a Bible Plan day as completed (idempotent).
   * Path: churches/{churchId}/biblePlanProgress
   * Also advances the userBiblePlan progress counters.
   */
  async markDayCompleted(
    payload: MarkDayCompletedPayload,
    onProgress?: (step: number, label: string) => void
  ): Promise<void> {
    const {
      churchId,
      planId,
      dayId,
      dayNumber,
      userId,
      memberId,
      totalDays,
      userBiblePlanId,
    } = payload;

    const now = new Date().toISOString();

    // Step 1: check for existing progress record
    const existingSnap = await getDocs(
      query(
        progressCol(churchId),
        where('userId', '==', userId),
        where('planId', '==', planId),
        where('dayId', '==', dayId)
      )
    );
    onProgress?.(1, 'Checking day progress…');

    // Step 2: create or update the progress record
    if (existingSnap.empty) {
      await addDoc(progressCol(churchId), {
        churchId,
        planId,
        dayId,
        userId,
        memberId: memberId ?? null,
        dayNumber,
        isCompleted: true,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      const existing = existingSnap.docs[0];
      if (!existing.data().isCompleted) {
        await updateDoc(
          doc(db, 'churches', churchId, 'biblePlanProgress', existing.id),
          { isCompleted: true, completedAt: now, updatedAt: now }
        );
      }
    }
    onProgress?.(2, 'Saving day completion…');

    // Step 3: recount completed days from Firestore (source of truth)
    const allCompletedSnap = await getDocs(
      query(
        progressCol(churchId),
        where('userId', '==', userId),
        where('planId', '==', planId),
        where('isCompleted', '==', true)
      )
    );
    const newCompletedCount = allCompletedSnap.size;
    const nextDayNumber = Math.min(dayNumber + 1, totalDays);
    onProgress?.(3, 'Counting completed days…');

    // Step 4: advance the userBiblePlan counters
    await userBiblePlanRepository.advanceToNextDay(
      userBiblePlanId,
      churchId,
      nextDayNumber,
      newCompletedCount,
      totalDays
    );
    onProgress?.(4, 'Updating your plan…');
  },

  /**
   * Check if a specific day has been completed by the user.
   */
  async getDayProgress(
    userId: string,
    planId: string,
    dayId: string,
    churchId: string
  ): Promise<BiblePlanProgress | null> {
    if (!userId || !planId || !dayId || !churchId) return null;
    const snap = await getDocs(
      query(
        progressCol(churchId),
        where('userId', '==', userId),
        where('planId', '==', planId),
        where('dayId', '==', dayId)
      )
    );
    if (snap.empty) return null;
    const first = snap.docs[0];
    return toBiblePlanProgressModel(first.data() as Record<string, unknown>, first.id);
  },

  /**
   * Fetch all progress records for a user in a specific plan.
   */
  async getPlanProgress(userId: string, planId: string, churchId: string): Promise<BiblePlanProgress[]> {
    if (!userId || !planId || !churchId) return [];
    const snap = await getDocs(
      query(
        progressCol(churchId),
        where('userId', '==', userId),
        where('planId', '==', planId)
      )
    );
    return snap.docs.map((d) =>
      toBiblePlanProgressModel(d.data() as Record<string, unknown>, d.id)
    );
  },

  /**
   * Real-time listener for all progress records of a user in a plan.
   */
  subscribeToProgressForPlan(
    userId: string,
    planId: string,
    churchId: string,
    onData: (progress: BiblePlanProgress[]) => void,
    onError: (error: Error) => void
  ): () => void {
    if (!userId || !planId || !churchId) {
      onData([]);
      return () => {};
    }
    const q = query(
      progressCol(churchId),
      where('userId', '==', userId),
      where('planId', '==', planId)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const progress = snapshot.docs.map((d) =>
          toBiblePlanProgressModel(d.data() as Record<string, unknown>, d.id)
        );
        onData(progress);
      },
      (error) => onError(error)
    );
  },

  /**
   * Returns a Set of completed dayIds for O(1) lookup.
   */
  async getCompletedDayIds(userId: string, planId: string, churchId: string): Promise<Set<string>> {
    const progress = await biblePlanProgressRepository.getPlanProgress(userId, planId, churchId);
    return new Set(progress.filter((p) => p.isCompleted).map((p) => p.dayId));
  },
};
