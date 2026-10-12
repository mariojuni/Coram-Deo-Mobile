import type { AttendanceCheckin } from './attendance.types';

export function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getAttendanceStats(todayCheckins: AttendanceCheckin[], memberCount: number) {
  const checkedInMembers = todayCheckins.filter((checkin) => checkin.type === 'member');
  const firstTimeVisitors = todayCheckins.filter(
    (checkin) => checkin.role === 'First-time Visitor' || (checkin as any).status === 'new'
  );
  const totalRegisteredMembers = memberCount || 1;
  const checkedInRatio = Math.round((checkedInMembers.length / totalRegisteredMembers) * 100);

  return {
    checkedInMembers,
    firstTimeVisitors,
    totalRegisteredMembers,
    checkedInRatio,
  };
}

export function sortCheckinsByNewest(checkins: AttendanceCheckin[]): AttendanceCheckin[] {
  const toMillis = (timestamp: AttendanceCheckin['timestamp']): number => {
    if (!timestamp) return 0;
    if (timestamp instanceof Date) return timestamp.getTime();
    if (typeof timestamp === 'number') return timestamp;
    if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().getTime();
    }
    return 0;
  };

  return [...checkins].sort((a, b) => {
    const timeA = toMillis(a.timestamp);
    const timeB = toMillis(b.timestamp);
    return timeB - timeA;
  });
}
