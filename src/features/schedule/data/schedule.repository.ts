import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, runTransaction, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { getActiveDb } from '../../../firebase';
import { worshipRepository } from '../../worship/data/worship.repository';
import type { WorshipSetlistItem } from '../../worship/domain/worship.types';
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
    enableRSVP: typeof data.enableRSVP === 'boolean' ? data.enableRSVP : false,
    status: typeof data.status === 'string' ? data.status : 'Published',
    createdAt: data.createdAt,
  };
}

export const scheduleRepository = {
  subscribeToSchedules(churchId: string | undefined, onData: SchedulesListener, onError: ErrorListener): () => void {

    const scheduleQuery = query(
      collection(getActiveDb(), 'events'),
      where('churchId', '==', churchId)
    );

    let setlistUnsubscribers: (() => void)[] = [];

    const cleanupSubscribers = () => {
      setlistUnsubscribers.forEach((unsub) => unsub());
      setlistUnsubscribers = [];
    };

    const unsubEvents = onSnapshot(
      scheduleQuery,
      (snapshot) => {
        cleanupSubscribers();

        const currentSchedules = snapshot.docs.map((docSnap) => {
          const sched = toSchedule(docSnap.id, docSnap.data() as Record<string, unknown>);
          sched.songList = [];
          return sched;
        });

        // Sort schedules manually to avoid needing a composite index
        currentSchedules.sort((a, b) => a.date.localeCompare(b.date));

        // Emit initial schedules immediately
        onData([...currentSchedules]);

        if (!churchId) return;

        // Set up real-time listener for setlists of these events
        const setlistsQuery = query(collection(getActiveDb(), 'worshipSetlists'), where('churchId', '==', churchId));
        const unsubSetlists = onSnapshot(
          setlistsQuery,
          (setlistsSnap) => {
            const setlistMap: Record<string, string> = {}; // eventId -> setlistId
            const setlistStatusMap: Record<string, string> = {}; // eventId -> setlistStatus
            setlistsSnap.docs.forEach((d) => {
              const data = d.data();
              if (data.eventId) {
                setlistMap[data.eventId] = d.id;
                setlistStatusMap[data.eventId] = data.status || 'published';
              }
            });

            // Set up real-time listener for all worshipSetlistItems
            const setlistItemsQuery = query(collection(getActiveDb(), 'worshipSetlistItems'), where('churchId', '==', churchId), orderBy('order', 'asc'));
            const unsubItems = onSnapshot(
              setlistItemsQuery,
              async (itemsSnap) => {
                const rawItems = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as WorshipSetlistItem));

                // Enrich setlist items with song document data
                const enrichedItems = await Promise.all(
                  rawItems.map(async (item) => {
                    if (item.songId) {
                      try {
                        const songDoc = await getDoc(doc(getActiveDb(), 'songs', item.songId));
                        if (songDoc.exists()) {
                          item.song = { id: songDoc.id, ...songDoc.data() } as any;
                        }
                      } catch (err) {
                        console.error('Error fetching song for setlist item:', err);
                      }
                    }
                    return item;
                  })
                );

                // Group items by setlistId
                const itemsBySetlist: Record<string, WorshipSetlistItem[]> = {};
                enrichedItems.forEach((it) => {
                  if (!itemsBySetlist[it.setlistId]) itemsBySetlist[it.setlistId] = [];
                  itemsBySetlist[it.setlistId].push(it);
                });

                // Attach items to their respective event schedule
                const updatedSchedules = currentSchedules.map((schedule) => {
                  const setlistId = setlistMap[schedule.id];
                  const setlistItems = setlistId ? (itemsBySetlist[setlistId] || []) : [];
                  return {
                    ...schedule,
                    songList: setlistItems,
                    setlistStatus: setlistStatusMap[schedule.id],
                  };
                });

                onData(updatedSchedules);
              },
              (err) => console.warn('Error listening to setlist items:', err)
            );

            setlistUnsubscribers.push(unsubItems);
          },
          (err) => console.warn('Error listening to worship setlists:', err)
        );

        setlistUnsubscribers.push(unsubSetlists);
      },
      (error) => onError(error)
    );

    return () => {
      cleanupSubscribers();
      unsubEvents();
    };
  },

  async updateRsvp(eventId: string, userId: string, status: Rsvp['status']): Promise<void> {
    const scheduleDocRef = doc(getActiveDb(), 'events', eventId);

    await runTransaction(getActiveDb(), async (transaction) => {
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



  async createSchedule(data: Pick<Schedule, 'title' | 'date' | 'time' | 'endTime' | 'location'> & { churchId: string }): Promise<string> {
    let startTimestamp = null;
    if (data.date && data.time) {
      const d = new Date(data.date);
      const timeStr = String(data.time).trim();
      const timeMatch12 = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      const timeMatch24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      
      if (timeMatch12) {
        let hours = parseInt(timeMatch12[1], 10);
        const mins = parseInt(timeMatch12[2], 10);
        const isPM = timeMatch12[3].toUpperCase() === 'PM';
        if (isPM && hours < 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        d.setHours(hours, mins, 0, 0);
        startTimestamp = d;
      } else if (timeMatch24) {
        const hours = parseInt(timeMatch24[1], 10);
        const mins = parseInt(timeMatch24[2], 10);
        d.setHours(hours, mins, 0, 0);
        startTimestamp = d;
      }
    }

    const ref = await addDoc(collection(getActiveDb(), 'events'), {
      ...data,
      duties: [],
      rsvps: [],
      ...(startTimestamp && { startTimestamp }),
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },

  async updateSchedule(id: string, data: Partial<Pick<Schedule, 'title' | 'date' | 'time' | 'endTime' | 'location'>>): Promise<void> {
    let startTimestamp = undefined;
    if (data.date && data.time) {
      const d = new Date(data.date);
      const timeStr = String(data.time).trim();
      const timeMatch12 = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      const timeMatch24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      
      if (timeMatch12) {
        let hours = parseInt(timeMatch12[1], 10);
        const mins = parseInt(timeMatch12[2], 10);
        const isPM = timeMatch12[3].toUpperCase() === 'PM';
        if (isPM && hours < 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        d.setHours(hours, mins, 0, 0);
        startTimestamp = d;
      } else if (timeMatch24) {
        const hours = parseInt(timeMatch24[1], 10);
        const mins = parseInt(timeMatch24[2], 10);
        d.setHours(hours, mins, 0, 0);
        startTimestamp = d;
      }
    }

    await updateDoc(doc(getActiveDb(), 'events', id), { 
      ...data, 
      ...(startTimestamp !== undefined && { startTimestamp }),
      updatedAt: serverTimestamp() 
    });
  },

  async deleteSchedule(id: string): Promise<void> {
    await deleteDoc(doc(getActiveDb(), 'events', id));
  },
};
