import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { getActiveDb } from '../../../firebase';
import type { MyJourneyMilestone } from '../domain/milestone.types';

export class MyJourneyMilestoneRepository {
  /**
   * Idempotently saves a milestone. Because we use deterministic IDs,
   * if this runs multiple times (e.g., retries, offline sync), it simply merges safely.
   */
  async saveMilestone(milestone: Omit<MyJourneyMilestone, 'achievedAt'>): Promise<void> {
    try {
      const db = getActiveDb();
      const docRef = doc(db, 'users', milestone.userId, 'myJourneyMilestones', milestone.id);
      
      await setDoc(
        docRef,
        {
          ...milestone,
          achievedAt: serverTimestamp(),
        },
        { merge: true } // Crucial for idempotency
      );
    } catch (e) {
      console.warn('Failed to save milestone:', e);
    }
  }

  /**
   * Fetches all milestones for a user, ordered by achievedAt descending.
   */
  async getUserMilestones(userId: string): Promise<MyJourneyMilestone[]> {
    if (!userId) return [];
    try {
      const db = getActiveDb();
      const milestonesRef = collection(db, 'users', userId, 'myJourneyMilestones');
      const q = query(
        milestonesRef,
        orderBy('achievedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          type: data.type,
          achievedAt: data.achievedAt,
          title: data.title,
          metadata: data.metadata,
        } as MyJourneyMilestone;
      });
    } catch (e) {
      console.warn('Failed to fetch milestones:', e);
      return [];
    }
  }
}

export const myJourneyMilestoneRepository = new MyJourneyMilestoneRepository();
