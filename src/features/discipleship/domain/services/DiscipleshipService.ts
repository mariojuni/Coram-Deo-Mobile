import { collection, doc, getDoc, getDocs, query, where, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';

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
  status: string;
}

export interface DiscipleshipWeek {
  id: string;
  planId: string;
  weekNumber: number;
  chapterNumber?: number;
  chapterTitle: string;
  scriptureReference: string;
  suggestedFlow?: string;
  storyText: string;
  retellInstruction?: string;
  retellActivity?: string;
  discussionQuestions?: string;
  keyTruths?: string;
  applicationQuestions?: string;
  additionalStudy?: string;
  memoryVerse?: string;
  sermonLink?: string;
  estimatedDurationMinutes?: number;
}

export interface DiscipleshipProgress {
  id: string;
  planId: string;
  weekId: string;
  weekNumber: number;
  isCompleted: boolean;
  completedAt: any;
}

export class DiscipleshipService {
  static async getPlans(churchId: string): Promise<DiscipleshipPlan[]> {
    if (!churchId) return [];
    
    const q = query(
      collection(db, 'discipleshipPlans'),
      where('churchId', '==', churchId),
      where('status', '==', 'published')
    );
    
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DiscipleshipPlan));
    return docs.sort((a, b) => {
      const timeA = (a as any).createdAt?.toMillis ? (a as any).createdAt.toMillis() : 0;
      const timeB = (b as any).createdAt?.toMillis ? (b as any).createdAt.toMillis() : 0;
      return timeB - timeA;
    });
  }

  static async getPlan(churchId: string, planId: string): Promise<DiscipleshipPlan | null> {
    if (!churchId) return null;
    const docRef = doc(db, 'discipleshipPlans', planId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists() && docSnap.data().churchId === churchId) {
      return { ...docSnap.data(), id: docSnap.id } as DiscipleshipPlan;
    }
    return null;
  }

  static async getWeeks(churchId: string, planId: string): Promise<DiscipleshipWeek[]> {
    if (!churchId) return [];
    const q = query(
      collection(db, 'discipleshipWeeks'),
      where('churchId', '==', churchId),
      where('planId', '==', planId),
      where('status', '==', 'published')
    );
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DiscipleshipWeek));
    return docs.sort((a, b) => (a.weekNumber || 0) - (b.weekNumber || 0));
  }

  static async getProgress(churchId: string, planId: string, userId: string): Promise<DiscipleshipProgress[]> {
    if (!churchId || !userId) return [];
    const q = query(
      collection(db, 'discipleshipProgress'),
      where('churchId', '==', churchId),
      where('planId', '==', planId),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DiscipleshipProgress));
  }

  static async markWeekCompleted(
    churchId: string, 
    planId: string, 
    weekId: string, 
    weekNumber: number, 
    userId: string,
    memberId?: string | null
  ): Promise<void> {
    if (!churchId || !userId) return;

    // First check if already completed
    const q = query(
      collection(db, 'discipleshipProgress'),
      where('churchId', '==', churchId),
      where('planId', '==', planId),
      where('weekId', '==', weekId),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return; // already marked
    }

    const newDocRef = doc(collection(db, 'discipleshipProgress'));
    const payload: any = {
      churchId,
      planId,
      weekId,
      userId,
      weekNumber,
      isCompleted: true,
      completedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    if (memberId) {
      payload.memberId = memberId;
    }

    await setDoc(newDocRef, payload);
  }
}
