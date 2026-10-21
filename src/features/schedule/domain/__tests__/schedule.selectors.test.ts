import {
  parseTimeTo24h,
  normalizeDateToYmd,
  isScheduleCompleted,
  getUpcomingSchedules,
  getUserMinisterialRoles,
  getUserRsvpStatus,
  getMinisterialTeam,
  getUpcomingMinisterialDuties,
  getUndismissedNotificationCount,
  getUndismissedDutyNotificationsForAdmin,
} from '../schedule.selectors';
import type { Schedule } from '../schedule.types';
import type { MinistryAssignment } from '@/features/ministry/domain/ministry.types';

describe('Schedule Selectors (Domain)', () => {
  describe('parseTimeTo24h', () => {
    it('converts AM and PM times to 24-hour HH:mm format', () => {
      expect(parseTimeTo24h('09:30 AM')).toBe('09:30');
      expect(parseTimeTo24h('12:00 PM')).toBe('12:00');
      expect(parseTimeTo24h('01:15 PM')).toBe('13:15');
      expect(parseTimeTo24h('11:59 PM')).toBe('23:59');
      expect(parseTimeTo24h('12:30 AM')).toBe('00:30');
    });

    it('returns original or default format if input does not match 12h format', () => {
      expect(parseTimeTo24h('')).toBe('09:00');
      expect(parseTimeTo24h('14:00')).toBe('14:00');
    });
  });

  describe('normalizeDateToYmd', () => {
    it('formats YYYY-MM-DD and MM/DD/YYYY to YYYY-MM-DD padded format', () => {
      expect(normalizeDateToYmd('2026-5-4')).toBe('2026-05-04');
      expect(normalizeDateToYmd('2026-10-21')).toBe('2026-10-21');
      expect(normalizeDateToYmd('5/4/2026')).toBe('2026-05-04');
      expect(normalizeDateToYmd('12/25/2026')).toBe('2026-12-25');
    });

    it('returns null for empty string and original string for non-matching dates', () => {
      expect(normalizeDateToYmd('')).toBeNull();
      expect(normalizeDateToYmd('Tomorrow')).toBe('Tomorrow');
    });
  });

  describe('isScheduleCompleted', () => {
    const fixedNow = new Date('2026-10-21T12:00:00Z');

    it('returns true if status is explicitly completed', () => {
      const schedule = {
        id: 's1',
        title: 'Sunday Service',
        date: '2026-10-25',
        time: '10:00 AM',
        status: 'completed',
      } as any as Schedule;
      expect(isScheduleCompleted(schedule, fixedNow)).toBe(true);
    });

    it('returns true if date is before today', () => {
      const pastSchedule = {
        id: 's2',
        title: 'Past Event',
        date: '2026-10-20',
        time: '10:00 AM',
        status: 'published',
      } as any as Schedule;
      expect(isScheduleCompleted(pastSchedule, fixedNow)).toBe(true);
    });

    it('returns false if event is scheduled for today or in the future', () => {
      const todaySchedule = {
        id: 's3',
        title: 'Today Event',
        date: '2026-10-21',
        time: '09:00 AM',
        status: 'published',
      } as any as Schedule;
      const futureSchedule = {
        id: 's4',
        title: 'Future Event',
        date: '2026-10-25',
        time: '10:00 AM',
        status: 'published',
      } as any as Schedule;
      expect(isScheduleCompleted(todaySchedule, fixedNow)).toBe(false);
      expect(isScheduleCompleted(futureSchedule, fixedNow)).toBe(false);
    });
  });

  describe('getUpcomingSchedules', () => {
    it('filters out past schedules and sorts by date and time up to maxCount', () => {
      const schedules = [
        { id: '1', title: 'Future Late', date: '2026-10-25', time: '06:00 PM', status: 'published' },
        { id: '2', title: 'Future Early', date: '2026-10-25', time: '09:00 AM', status: 'published' },
        { id: '3', title: 'Past Event', date: '2020-01-01', time: '10:00 AM', status: 'published' },
        { id: '4', title: 'Far Future', date: '2026-11-01', time: '10:00 AM', status: 'published' },
      ] as any as Schedule[];

      const upcoming = getUpcomingSchedules(schedules, 2);
      expect(upcoming).toHaveLength(2);
      expect(upcoming[0].id).toBe('2'); // Oct 25 9am
      expect(upcoming[1].id).toBe('1'); // Oct 25 6pm
    });
  });

  describe('getUserMinisterialRoles', () => {
    const assignments: MinistryAssignment[] = [
      {
        id: 'a1',
        eventId: 's1',
        memberId: 'user_1',
        roleName: 'Worship Leader',
        status: 'Confirmed',
      } as any,
      {
        id: 'a2',
        eventId: 's1',
        memberId: 'user_1',
        roleName: 'Acoustic Guitar',
        status: 'Confirmed',
      } as any,
      {
        id: 'a3',
        eventId: 's1',
        memberId: 'user_2',
        roleName: 'Sound Tech',
        status: 'Confirmed',
      } as any,
    ];

    it('returns comma-separated roles for matching user', () => {
      const roles = getUserMinisterialRoles('s1', assignments, ['user_1']);
      expect(roles).toBe('Worship Leader, Acoustic Guitar');
    });

    it('returns null if user has no assigned duties or empty userIds', () => {
      expect(getUserMinisterialRoles('s1', assignments, ['user_99'])).toBeNull();
      expect(getUserMinisterialRoles('s1', assignments, [])).toBeNull();
    });
  });

  describe('getUserRsvpStatus', () => {
    it('returns matching status for user in rsvps array', () => {
      const schedule = {
        id: 's1',
        title: 'Event',
        date: '2026-10-25',
        time: '10:00 AM',
        rsvps: [
          { userId: 'user_1', status: 'going' },
          { userId: 'user_2', status: 'not_going' },
        ],
      } as any as Schedule;

      expect(getUserRsvpStatus(schedule, 'user_1')).toBe('going');
      expect(getUserRsvpStatus(schedule, 'user_99')).toBeNull();
    });
  });

  describe('getMinisterialTeam', () => {
    it('deduplicates assignments by memberId and excludes Declined status', () => {
      const assignments: MinistryAssignment[] = [
        { id: '1', eventId: 's1', memberId: 'm1', status: 'Confirmed' } as any,
        { id: '2', eventId: 's1', memberId: 'm1', status: 'Confirmed' } as any, // duplicate member
        { id: '3', eventId: 's1', memberId: 'm2', status: 'Declined' } as any, // declined
        { id: '4', eventId: 's2', memberId: 'm3', status: 'Confirmed' } as any, // different event
      ];

      const team = getMinisterialTeam('s1', assignments);
      expect(team).toHaveLength(1);
      expect(team[0].memberId).toBe('m1');
    });
  });

  describe('getUndismissedNotificationCount & getUndismissedDutyNotificationsForAdmin', () => {
    const assignments: MinistryAssignment[] = [
      {
        id: '1',
        eventId: 's1',
        eventName: 'Sunday Service',
        roleName: 'Keyboard',
        memberId: 'm1',
        eventDate: '2026-10-25',
        status: 'Confirmed',
        isAcknowledged: false,
      } as any,
      {
        id: '2',
        eventId: 's1',
        eventName: 'Sunday Service',
        roleName: 'Drums',
        memberId: 'm2',
        eventDate: '2026-10-25',
        status: 'Declined',
        isAcknowledged: false,
      } as any,
      {
        id: '3',
        eventId: 's1',
        memberId: 'm3',
        status: 'Confirmed',
        isAcknowledged: true, // Acknowledged
      } as any,
      {
        id: '4',
        eventId: 's1',
        memberId: 'm4',
        status: 'Pending', // Neither confirmed nor declined
        isAcknowledged: false,
      } as any,
    ];

    it('counts only unacknowledged Confirmed or Declined assignments', () => {
      expect(getUndismissedNotificationCount(assignments)).toBe(2);
    });

    it('transforms and sorts admin duty notifications', () => {
      const notifications = getUndismissedDutyNotificationsForAdmin(assignments);
      expect(notifications).toHaveLength(2);
      expect(notifications[0].action).toBe('accepted');
      expect(notifications[1].action).toBe('declined');
    });
  });
});
