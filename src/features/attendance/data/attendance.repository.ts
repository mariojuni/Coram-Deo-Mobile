import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where, getDoc, writeBatch, increment } from 'firebase/firestore';
import { getActiveDb } from '../../../firebase';
import type { AttendanceRecord, CreateAttendanceRecordInput } from '../domain/attendance.types';

type AttendanceRecordsListener = (records: AttendanceRecord[]) => void;
type ErrorListener = (error: Error) => void;

function toAttendanceRecordModel(id: string, data: Record<string, unknown>): AttendanceRecord {
  return {
    id: `${data.eventId}_${id}`, // Compose ID so we have both eventId and memberId for deletion
    churchId: typeof data.churchId === 'string' ? data.churchId : '',
    eventId: typeof data.eventId === 'string' ? data.eventId : '',
    eventTitle: typeof data.eventTitle === 'string' ? data.eventTitle : '',
    memberId: typeof data.memberId === 'string' ? data.memberId : '',
    status: (data.status as AttendanceRecord['status']) || 'Present',
    checkInMethod: (data.checkInMethod as AttendanceRecord['checkInMethod']) || 'manual_mobile',
    checkedInAt: typeof data.checkedInAt === 'string' ? data.checkedInAt : new Date().toISOString(),
    checkedInBy: typeof data.checkedInBy === 'string' ? data.checkedInBy : '',
    source: (data.source as AttendanceRecord['source']) || 'mobile',
    note: typeof data.note === 'string' ? data.note : undefined,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
    timestamp: data.timestamp as any,
  };
}

export const attendanceRepository = {
  subscribeByEventId(eventId: string, churchId: string, onData: AttendanceRecordsListener, onError: ErrorListener): () => void {
    const attendanceQuery = query(
      collection(getActiveDb(), 'attendance_sessions', eventId, 'records')
    );

    return onSnapshot(
      attendanceQuery,
      (snapshot) => {
        const records = snapshot.docs.map((docSnap) => toAttendanceRecordModel(docSnap.id, docSnap.data() as Record<string, unknown>));
        // Sort by checkedInAt descending
        records.sort((a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime());
        onData(records);
      },
      (error) => onError(error)
    );
  },

  subscribeMyAttendance(memberId: string, churchId: string, onData: AttendanceRecordsListener, onError: ErrorListener): () => void {
    const { collectionGroup } = require('firebase/firestore');
    const attendanceQuery = query(
      collectionGroup(getActiveDb(), 'records'),
      where('memberId', '==', memberId),
      where('churchId', '==', churchId)
    );

    return onSnapshot(
      attendanceQuery,
      (snapshot) => {
        const records = snapshot.docs.map((docSnap) => toAttendanceRecordModel(docSnap.id, docSnap.data() as Record<string, unknown>));
        records.sort((a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime());
        onData(records);
      },
      (error) => onError(error)
    );
  },

  async createAttendanceRecord(input: CreateAttendanceRecordInput): Promise<void> {
    const sessionRef = doc(getActiveDb(), 'attendance_sessions', input.eventId);
    await setDoc(sessionRef, {
      id: input.eventId,
      churchId: input.churchId,
      eventId: input.eventId,
      eventTitle: input.eventTitle,
      date: input.eventDate, // Important for web
      updatedAt: serverTimestamp()
    }, { merge: true });

    const recordRef = doc(getActiveDb(), 'attendance_sessions', input.eventId, 'records', input.memberId);
    
    const docSnap = await getDoc(recordRef);
    if (docSnap.exists()) {
      throw new Error('Already checked in for this event');
    }

    const now = new Date().toISOString();
    await setDoc(recordRef, {
      ...input,
      createdAt: now,
      updatedAt: now,
      timestamp: now,
      memberName: input.memberName,
      type: input.type || 'Member',
    }, { merge: false });
  },

  async bulkCreateAttendanceRecords(inputs: CreateAttendanceRecordInput[]): Promise<void> {
    if (inputs.length === 0) return;

    // Firestore allows up to 500 operations per batch. We do 2 per input.
    const chunkSize = 250;
    for (let i = 0; i < inputs.length; i += chunkSize) {
      const chunk = inputs.slice(i, i + chunkSize);
      const batch = writeBatch(getActiveDb());

      for (const input of chunk) {
        const sessionRef = doc(getActiveDb(), 'attendance_sessions', input.eventId);
        batch.set(sessionRef, {
          id: input.eventId,
          churchId: input.churchId,
          eventId: input.eventId,
          eventTitle: input.eventTitle,
          date: input.eventDate,
          status: 'Open',
          metrics: {
            [input.status.toLowerCase()]: increment(1)
          },
          updatedAt: serverTimestamp()
        }, { merge: true });

        const recordRef = doc(getActiveDb(), 'attendance_sessions', input.eventId, 'records', input.memberId);
        const now = new Date().toISOString();
        batch.set(recordRef, {
          ...input,
          createdAt: now,
          updatedAt: now,
          timestamp: now,
          memberName: input.memberName,
          type: input.type || 'Member',
        }, { merge: false });
      }

      await batch.commit();
    }
  },

  async deleteAttendanceRecord(recordId: string): Promise<void> {
    // If recordId includes an underscore, it's the old format. Otherwise, we can't easily extract eventId from just memberId.
    // Assuming recordId is passed as 'eventId_memberId' for delete operations from UI
    if (recordId.includes('_')) {
      const [eventId, memberId] = recordId.split('_');
      const recordRef = doc(getActiveDb(), 'attendance_sessions', eventId, 'records', memberId);
      
      const snap = await getDoc(recordRef);
      if (snap.exists()) {
        const data = snap.data();
        const status = (data.status || 'present').toLowerCase();
        
        await deleteDoc(recordRef);
        
        const sessionRef = doc(getActiveDb(), 'attendance_sessions', eventId);
        await setDoc(sessionRef, {
          metrics: {
            [status]: increment(-1)
          }
        }, { merge: true });
      }
    }
  },
};
