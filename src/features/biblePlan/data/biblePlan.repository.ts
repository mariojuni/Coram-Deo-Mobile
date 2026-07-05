import {
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    where,
} from 'firebase/firestore';
import { db } from '../../../firebase';
import type { BiblePlan, BiblePlanDay, PlanReading } from '../domain/biblePlan.types';
import { deriveDays } from '../domain/biblePlan.types';

// ─── Mapper ────────────────────────────────────────────────────────────────────

function toBiblePlanModel(data: Record<string, unknown>, id: string, churchId: string): BiblePlan {
    const rawReadings = Array.isArray(data.readings) ? data.readings : [];
    const readings: PlanReading[] = rawReadings
      .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
      .map((r) => ({
        day: typeof r.day === 'number' ? r.day : 0,
        passage: typeof r.passage === 'string' ? r.passage : '',
      }))
      .filter((r) => r.day > 0 && r.passage.length > 0)
      .sort((a, b) => a.day - b.day);

    return {
      id,
      churchId,
      title: typeof data.title === 'string' ? data.title : '',
      subtitle: typeof data.subtitle === 'string' ? data.subtitle : undefined,
      description: typeof data.description === 'string' ? data.description : undefined,
      durationDays: typeof data.durationDays === 'number' ? data.durationDays : readings.length,
      startDate: typeof data.startDate === 'string' ? data.startDate : undefined,
      endDate: typeof data.endDate === 'string' ? data.endDate : undefined,
      category: typeof data.category === 'string' ? data.category : undefined,
      language: typeof data.language === 'string' ? data.language : undefined,
      visibility: typeof data.visibility === 'string' ? data.visibility : undefined,
      status: (data.status as BiblePlan['status']) ?? 'draft',
      readings,
      createdBy: typeof data.createdBy === 'string' ? data.createdBy : undefined,
      createdAt: (data.createdAt as BiblePlan['createdAt']) ?? null,
      updatedAt: (data.updatedAt as BiblePlan['updatedAt']) ?? null,
      publishedAt: (data.publishedAt as BiblePlan['publishedAt']) ?? null,
    };
}

// ─── Repository ────────────────────────────────────────────────────────────────

type PlansListener = (plans: BiblePlan[]) => void;
type ErrorListener = (error: Error) => void;

export const biblePlanRepository = {
    /**
     * One-time fetch of all active (published) Bible plans for a church.
     * Path: churches/{churchId}/bible_plans
     * NOTE: Admin portal uses status='active' for live plans, not 'published'.
     */
    async getPublishedPlans(churchId: string): Promise<BiblePlan[]> {
      if (!churchId) return [];
      console.log('[biblePlanRepository] fetching plans for churchId:', churchId);
      const q = query(
        collection(db, 'churches', churchId, 'bible_plans'),
        where('status', '==', 'active')
      );
      const snap = await getDocs(q);
      console.log('[biblePlanRepository] found', snap.size, 'plans');
      const plans = snap.docs.map((d) =>
        toBiblePlanModel(d.data() as Record<string, unknown>, d.id, churchId)
      );
      return plans.sort((a, b) => {
        const aTime = typeof a.createdAt === 'string' ? a.createdAt : '';
        const bTime = typeof b.createdAt === 'string' ? b.createdAt : '';
        return bTime.localeCompare(aTime);
      });
    },

    /**
     * Real-time listener for active Bible plans.
     * Path: churches/{churchId}/bible_plans where status == active
     */
    subscribeToPublishedPlans(
      churchId: string,
      onData: PlansListener,
      onError: ErrorListener
    ): () => void {
      if (!churchId) {
        onData([]);
        return () => {};
      }
      console.log('[biblePlanRepository] subscribing to plans for churchId:', churchId);
      const q = query(
        collection(db, 'churches', churchId, 'bible_plans'),
        where('status', '==', 'active')
      );
      return onSnapshot(
        q,
        (snapshot) => {
          console.log('[biblePlanRepository] snapshot received, docs:', snapshot.size);
          const plans = snapshot.docs.map((d) =>
            toBiblePlanModel(d.data() as Record<string, unknown>, d.id, churchId)
          );
          console.log('[biblePlanRepository] plan ids:', plans.map((p) => p.id));
          plans.sort((a, b) => {
            const aTime = typeof a.createdAt === 'string' ? a.createdAt : '';
            const bTime = typeof b.createdAt === 'string' ? b.createdAt : '';
            return bTime.localeCompare(aTime);
          });
          onData(plans);
        },
        (error) => {
          console.error('[biblePlanRepository] snapshot error:', error);
          onError(error);
        }
      );
    },

    /**
     * Fetch a single Bible plan by ID, validating church ownership and published status.
     */
    async getPlanById(planId: string, churchId: string): Promise<BiblePlan | null> {
      if (!planId || !churchId) return null;
      const snap = await getDoc(doc(db, 'churches', churchId, 'bible_plans', planId));
      if (!snap.exists()) return null;
      const data = snap.data() as Record<string, unknown>;
      if (data.status !== 'active') return null;
      return toBiblePlanModel(data, snap.id, churchId);
    },

    /**
     * Derive the days (readings) for a plan from the embedded readings array.
     * No extra Firestore query needed — readings are part of the plan document.
     */
    getDaysForPlan(plan: BiblePlan): BiblePlanDay[] {
      return deriveDays(plan);
    },
};

