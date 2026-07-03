import type { Schedule } from './schedule.types';
import type { MinistryAssignment } from '../../ministry/domain/ministry.types';

/**
 * Parses a time string like "09:00 AM" into 24h "HH:mm" format.
 */
export function parseTimeTo24h(timeStr: string): string {
  if (!timeStr) return '09:00';
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return timeStr;
  const [, hours, minutes, modifier] = match;
  let h = parseInt(hours, 10);
  if (modifier.toUpperCase() === 'PM' && h < 12) h += 12;
  if (modifier.toUpperCase() === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${minutes}`;
}

/**
 * Returns only upcoming schedules (today's events still in progress + future),
 * sorted by date then start time.
 */
export function getUpcomingSchedules(schedules: Schedule[], maxCount = 5): Schedule[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return schedules
    .filter((schedule) => {
      if (schedule.date > todayStr) return true;
      if (schedule.date < todayStr) return false;

      let endTimeParsed = parseTimeTo24h(schedule.endTime || schedule.time);
      if (!schedule.endTime) {
        let h = parseInt(endTimeParsed.split(':')[0], 10) + 2;
        if (h > 23) h = 23;
        endTimeParsed = `${String(h).padStart(2, '0')}:${endTimeParsed.split(':')[1]}`;
      }

      return endTimeParsed >= currentTimeStr;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return parseTimeTo24h(a.time).localeCompare(parseTimeTo24h(b.time));
    })
    .slice(0, maxCount);
}

/**
 * Extracts the current user's ministerial duty roles from assignments for a schedule.
 */
export function getUserMinisterialRoles(scheduleId: string, assignments: MinistryAssignment[], userId: string): string | null {
  const myDuties = assignments.filter(
    (a) =>
      a.eventId === scheduleId &&
      a.memberId === userId
  );

  if (myDuties.length === 0) return null;
  return myDuties.map((a) => a.roleName).join(', ');
}

/**
 * Gets the current user's RSVP status for a schedule.
 * Checks the `rsvps` array.
 */
export function getUserRsvpStatus(schedule: Schedule, userId: string): string | null {
  if (schedule.rsvps && Array.isArray(schedule.rsvps)) {
    const myRsvp = schedule.rsvps.find((rsvp) => rsvp.userId === userId);
    if (myRsvp) return myRsvp.status;
  }
  return null;
}

/**
 * Returns deduplicated ministerial team members (unique by memberId) for a schedule.
 */
export function getMinisterialTeam(scheduleId: string, assignments: MinistryAssignment[]): MinistryAssignment[] {
  const seen = new Set<string>();
  return assignments.filter((a) => {
    if (a.eventId !== scheduleId) return false;
    if (!a.memberId) return false;
    if (a.status === 'Declined') return false;
    if (seen.has(a.memberId)) return false;
    seen.add(a.memberId);
    return true;
  });
}

/**
 * Returns upcoming schedules where the user has active ministerial duties,
 * ordered by date and time.
 */
export function getUpcomingMinisterialDuties(schedules: Schedule[], assignments: MinistryAssignment[], userId: string): Schedule[] {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return schedules
    .filter((schedule) => {
      if (schedule.date < todayStr) return false;
      return getUserMinisterialRoles(schedule.id, assignments, userId) !== null;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || '').localeCompare(b.time || '');
    });
}

export function getUndismissedNotificationCount(assignments: MinistryAssignment[]): number {
  return assignments.filter((a) => !a.isAcknowledged && (a.status === 'Confirmed' || a.status === 'Declined')).length;
}

export type StaffDutyNotification = {
  action: 'accepted' | 'declined';
  date: string;
  dateObj: Date;
  title: string;
  notificationId: string;
  role: string;
  scheduleId: string;
  userId: string;
  assignmentId: string;
};

export function getUndismissedDutyNotificationsForAdmin(assignments: MinistryAssignment[]): StaffDutyNotification[] {
  return assignments
    .filter((a) => !a.isAcknowledged && (a.status === 'Confirmed' || a.status === 'Declined'))
    .map<StaffDutyNotification>((a) => {
      const isAccepted = a.status === 'Confirmed';
      const eventDateStr = a.eventDate || new Date().toISOString().split('T')[0];
      return {
        action: isAccepted ? 'accepted' : 'declined',
        date: new Date(`${eventDateStr}T00:00:00`).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        dateObj: new Date(`${eventDateStr}T00:00:00`),
        title: a.eventName || 'Sunday Worship Service',
        notificationId: a.id,
        role: a.roleName,
        scheduleId: a.eventId,
        userId: a.memberId,
        assignmentId: a.id,
      };
    })
    .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
}
