import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { worshipRepository } from '../../worship/data/worship.repository';
import type { Duty, Rsvp, Schedule } from '../domain/schedule.types';

type SchedulesListener = (schedules: Schedule[]) => void;
type ErrorListener = (error: Error) => void;

function toDuty(value: unknown): Duty | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (typeof item.userId !== 'string' || typeof item.role !== 'string' || typeof item.status !== 'string') {
    return null;
  }

  return {
    userId: item.userId,
    role: item.role,
    status: item.status,
    roleId: typeof item.roleId === 'string' ? item.roleId : undefined,
    assignedBy: typeof item.assignedBy === 'string' ? item.assignedBy : undefined,
    assignedAt: item.assignedAt ?? undefined,
    updatedAt: item.updatedAt ?? undefined,
  };
}

function toRsvp(value: unknown): Rsvp | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (typeof item.userId !== 'string' || typeof item.status !== 'string') {
    return null;
  }

  if (item.status !== 'going' && item.status !== 'maybe' && item.status !== 'not_going') {
    return null;
  }

  return {
    userId: item.userId,
    status: item.status,
  };
}

function toSchedule(docId: string, data: Record<string, unknown>): Schedule {
  const duties = Array.isArray(data.duties) ? data.duties.map(toDuty).filter((duty): duty is Duty => duty !== null) : [];
  const rsvps = Array.isArray(data.rsvps) ? data.rsvps.map(toRsvp).filter((rsvp): rsvp is Rsvp => rsvp !== null) : [];

  return {
    id: docId,
    title: typeof data.title === 'string' ? data.title : '',
    date: typeof data.date === 'string' ? data.date : docId,
    time: typeof data.time === 'string' ? data.time : (typeof data.startTime === 'string' ? data.startTime : ''),
    endTime: typeof data.endTime === 'string' ? data.endTime : '',
    location: typeof data.location === 'string' ? data.location : '',
    duties,
    rsvps,
    songList: Array.isArray(data.songList) ? data.songList : undefined,
    createdAt: data.createdAt,
  };
}

export const scheduleRepository = {
  subscribeToSchedules(churchId: string | undefined, onData: SchedulesListener, onError: ErrorListener): () => void {
    const scheduleQuery = query(collection(db, 'events'), orderBy('date', 'asc'));

    return onSnapshot(
      scheduleQuery,
      async (snapshot) => {
        const baseSchedules = snapshot.docs.map((docSnap) => {
          const sched = toSchedule(docSnap.id, docSnap.data() as Record<string, unknown>);
          if (!sched.songList) sched.songList = [];
          return sched;
        });
        
        if (!churchId) {
           onData(baseSchedules);
           return;
        }

        const enriched = await Promise.all(
          baseSchedules.map(async (schedule) => {
            schedule.songList = [];
            try {
              const setlist = await worshipRepository.getSetlistForEvent(churchId, schedule.id);
              if (setlist) {
                 const items = await worshipRepository.getSetlistItems(churchId, setlist.id);
                 schedule.songList = items;
              }
            } catch(e) {
               console.error("Failed to fetch setlist for event", schedule.id, e);
            }
            return schedule;
          })
        );
        onData(enriched);
      },
      (error) => onError(error)
    );
  },

  async updateRsvp(eventId: string, userId: string, status: Rsvp['status']): Promise<void> {
    const scheduleDocRef = doc(db, 'events', eventId);

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(scheduleDocRef);
      if (!snapshot.exists()) {
        throw new Error(`Schedule with id "${eventId}" was not found`);
      }

      const data = snapshot.data();
      const currentRsvps = Array.isArray(data.rsvps)
        ? data.rsvps.map(toRsvp).filter((rsvp): rsvp is Rsvp => rsvp !== null)
        : [];

      const existingIndex = currentRsvps.findIndex((rsvp) => rsvp.userId === userId);
      if (existingIndex >= 0) {
        currentRsvps[existingIndex] = { userId, status };
      } else {
        currentRsvps.push({ userId, status });
      }

      transaction.update(scheduleDocRef, { rsvps: currentRsvps });
    });
  },



  async createSchedule(data: Pick<Schedule, 'title' | 'date' | 'time' | 'endTime' | 'location'>): Promise<string> {
    const ref = await addDoc(collection(db, 'events'), {
      ...data,
      duties: [],
      rsvps: [],
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },

  async updateSchedule(id: string, data: Partial<Pick<Schedule, 'title' | 'date' | 'time' | 'endTime' | 'location'>>): Promise<void> {
    await updateDoc(doc(db, 'events', id), { ...data, updatedAt: serverTimestamp() });
  },

  async deleteSchedule(id: string): Promise<void> {
    await deleteDoc(doc(db, 'events', id));
  },
};
