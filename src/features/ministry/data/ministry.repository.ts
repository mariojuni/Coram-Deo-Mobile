import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import type { Ministry, MinistryApplication, MinistryAssignment } from '../domain/ministry.types';

export const ministryRepository = {
  async getMinistries(churchId: string): Promise<Ministry[]> {
    console.log('Fetching ministries for churchId:', churchId);
    if (!churchId) return [];
    const q = query(collection(db, 'ministries'), where('churchId', '==', churchId));
    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ministry));
    console.log('Fetched raw ministries:', docs);
    return docs
      .filter((m) => m.status === 'Active' || !m.status)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  subscribeToMinistryAssignmentsByEvent(eventId: string, onData: (assignments: MinistryAssignment[]) => void): () => void {
    const q = query(collection(db, 'ministryAssignments'), where('eventId', '==', eventId));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MinistryAssignment));
      onData(data);
    });
  },

  subscribeToMinistryAssignmentsByUser(userId: string, onData: (assignments: MinistryAssignment[]) => void): () => void {
    const q = query(collection(db, 'ministryAssignments'), where('memberId', '==', userId));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MinistryAssignment));
      onData(data);
    });
  },

  subscribeToMemberAssignments(
    churchId: string,
    memberId: string,
    onData: (assignments: MinistryAssignment[]) => void
  ): () => void {
    const q = query(
      collection(db, 'ministryAssignments'),
      where('churchId', '==', churchId),
      where('memberId', '==', memberId)
    );
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MinistryAssignment));
      onData(data);
    });
  },

  subscribeToAllMinistryAssignments(churchId: string, onData: (assignments: MinistryAssignment[]) => void): () => void {
    const q = query(collection(db, 'ministryAssignments'), where('churchId', '==', churchId));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MinistryAssignment));
      onData(data);
    });
  },

  async createAssignment(assignment: Omit<MinistryAssignment, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, 'ministryAssignments'), assignment);
    return ref.id;
  },

  async updateAssignment(id: string, data: Partial<MinistryAssignment>): Promise<void> {
    await updateDoc(doc(db, 'ministryAssignments', id), { ...data, updatedAt: new Date().toISOString() });
  },

  async deleteAssignment(id: string): Promise<void> {
    await deleteDoc(doc(db, 'ministryAssignments', id));
  },

  // ── Ministry Applications ──────────────────────────────────────────────────

  subscribeToMemberApplications(
    churchId: string,
    memberId: string,
    onData: (applications: MinistryApplication[]) => void
  ): () => void {
    const q = query(
      collection(db, 'ministryApplications'),
      where('churchId', '==', churchId),
      where('memberId', '==', memberId)
    );
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MinistryApplication));
      onData(data);
    });
  },

  async submitApplication(data: Omit<MinistryApplication, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, 'ministryApplications'), data);
    return ref.id;
  },

  async withdrawApplication(id: string): Promise<void> {
    await updateDoc(doc(db, 'ministryApplications', id), {
      status: 'withdrawn',
      withdrawnAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
};
