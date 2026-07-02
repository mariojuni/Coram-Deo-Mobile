import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { resolveRoleId } from '../domain/ministryRoles';
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
    event: typeof data.event === 'string' ? data.event : '',
    date: typeof data.date === 'string' ? data.date : docId,
    time: typeof data.time === 'string' ? data.time : '',
    endTime: typeof data.endTime === 'string' ? data.endTime : '',
    location: typeof data.location === 'string' ? data.location : '',
    duties,
    rsvps,
    createdAt: data.createdAt,
  };
}

export const scheduleRepository = {
  subscribeToSchedules(onData: SchedulesListener, onError: ErrorListener): () => void {
    const scheduleQuery = query(collection(db, 'schedules'), orderBy('date', 'asc'));

    return onSnapshot(
      scheduleQuery,
      (snapshot) => {
        const schedules = snapshot.docs.map((docSnap) => toSchedule(docSnap.id, docSnap.data() as Record<string, unknown>));
        onData(schedules);
      },
      (error) => onError(error)
    );
  },

  async updateRsvp(eventId: string, userId: string, status: Rsvp['status']): Promise<void> {
    const scheduleDocRef = doc(db, 'schedules', eventId);

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

  async updateMinisterialDuty(eventId: string, userId: string, action: 'accept' | 'cancel', roleId?: string): Promise<void> {
    const scheduleDocRef = doc(db, 'schedules', eventId);

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(scheduleDocRef);
      if (!snapshot.exists()) {
        throw new Error(`Schedule with id "${eventId}" was not found`);
      }

      const data = snapshot.data();
      const rawDuties: Record<string, unknown>[] = Array.isArray(data.duties)
        ? (data.duties as unknown[]).filter(
            (d): d is Record<string, unknown> => !!d && typeof d === 'object'
          )
        : [];

      const newStatus = action === 'accept' ? 'accepted' : 'declined';
      const updatedDuties = rawDuties.map((duty) => {
        if (duty.userId !== userId) return duty;
        if (duty.role?.toString().toLowerCase() === 'attendee') return duty;
        // If a specific roleId is provided, only update that exact duty
        if (roleId) {
          const dutyRoleId = duty.roleId ?? resolveRoleId(String(duty.role ?? ''));
          if (dutyRoleId !== roleId) return duty;
        }
        return { ...duty, status: newStatus, updatedAt: new Date().toISOString() };
      });

      transaction.update(scheduleDocRef, { duties: updatedDuties });
    });
  },

  async dismissNotification(eventId: string, userId: string, currentStatus: string): Promise<void> {
    const scheduleDocRef = doc(db, 'schedules', eventId);

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(scheduleDocRef);
      if (!snapshot.exists()) {
        throw new Error(`Schedule with id "${eventId}" was not found`);
      }

      const data = snapshot.data();
      const rawDuties: Record<string, unknown>[] = Array.isArray(data.duties)
        ? (data.duties as unknown[]).filter(
            (d): d is Record<string, unknown> => !!d && typeof d === 'object'
          )
        : [];

      const updatedDuties = rawDuties.map((duty) => {
        if (duty.userId !== userId) return duty;
        if (currentStatus === 'accepted' && duty.status === 'accepted') {
          return { ...duty, status: 'accepted_dismissed' };
        }
        if (currentStatus === 'declined' && duty.status === 'declined') {
          return { ...duty, status: 'declined_dismissed' };
        }
        return duty;
      });

      transaction.update(scheduleDocRef, { duties: updatedDuties });
    });
  },

  /**
   * Persist ministry assignments for an event.
   * Preserves existing accepted/declined status when the same member keeps the same role.
   * Resets status to 'pending' only when a role is newly assigned or reassigned to a different member.
   */
  async saveAssignments(
    eventId: string,
    assignments: { roleId: string; roleLabel: string; userId: string }[],
    adminUserId: string
  ): Promise<void> {
    const scheduleDocRef = doc(db, 'schedules', eventId);
    // serverTimestamp() cannot be used inside array elements in Firestore,
    // so we use a plain ISO string for per-duty timestamps.
    const now = new Date().toISOString();

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(scheduleDocRef);
      if (!snapshot.exists()) {
        throw new Error(`Schedule with id "${eventId}" was not found`);
      }

      const data = snapshot.data();
      // Use raw Firestore objects to avoid spreading `undefined` values that Firestore rejects.
      const rawDuties: Record<string, unknown>[] = Array.isArray(data.duties)
        ? (data.duties as unknown[]).filter((d): d is Record<string, unknown> => !!d && typeof d === 'object')
        : [];

      // Keep legacy attendee entries (RSVP-style duties) untouched
      const attendeeDuties = rawDuties.filter(
        (d) => typeof d.role === 'string' && d.role.toLowerCase() === 'attendee'
      );

      // For matching existing duties, use raw objects too so we preserve all original fields
      const existingMinistryDuties = rawDuties.filter(
        (d) => typeof d.role === 'string' && d.role.toLowerCase() !== 'attendee'
      );

      const newDuties = assignments.map(({ roleId, roleLabel, userId }) => {
        // Find an existing duty for the exact same role + same user to preserve their response status
        const existing = existingMinistryDuties.find((d) => {
          const resolvedId = typeof d.roleId === 'string' ? d.roleId : resolveRoleId(String(d.role ?? ''));
          return resolvedId === roleId && d.userId === userId;
        });

        if (existing) {
          // Re-use the raw Firestore object (no undefined fields) and update mutable fields
          return {
            ...existing,
            role: roleLabel,
            roleId,
            assignedBy: adminUserId,
            updatedAt: now,
          };
        }

        return {
          roleId,
          role: roleLabel,
          userId,
          status: 'pending',
          assignedBy: adminUserId,
          assignedAt: now,
          updatedAt: now,
        };
      });

      transaction.update(scheduleDocRef, {
        duties: [...attendeeDuties, ...newDuties],
        updatedAt: serverTimestamp(),
      });
    });
  },

  async createSchedule(data: Pick<Schedule, 'event' | 'date' | 'time' | 'endTime' | 'location'>): Promise<string> {
    const ref = await addDoc(collection(db, 'schedules'), {
      ...data,
      duties: [],
      rsvps: [],
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },

  async updateSchedule(id: string, data: Partial<Pick<Schedule, 'event' | 'date' | 'time' | 'endTime' | 'location'>>): Promise<void> {
    await updateDoc(doc(db, 'schedules', id), { ...data, updatedAt: serverTimestamp() });
  },

  async deleteSchedule(id: string): Promise<void> {
    await deleteDoc(doc(db, 'schedules', id));
  },
};
