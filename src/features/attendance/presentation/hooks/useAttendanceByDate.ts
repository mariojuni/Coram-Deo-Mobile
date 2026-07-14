import { useEffect, useState } from 'react';
import { attendanceRepository } from '../../data/attendance.repository';
import type { AttendanceCheckin } from '../../domain/attendance.types';

export function useAttendanceByDate(date: string, options?: { membersOnly?: boolean }) {
  const [checkins, setCheckins] = useState<AttendanceCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscribe = options?.membersOnly
      ? attendanceRepository.subscribeMemberCheckinsByDate
      : attendanceRepository.subscribeByDate;

    const unsubscribe = subscribe(
      date,
      (nextCheckins) => {
        setCheckins(nextCheckins);
        setLoading(false);
      },
      (error) => {
        if (error.message.includes('Missing or insufficient permissions')) {
          // Ignore error during logout race conditions
          setLoading(false);
          return;
        }
        console.error('Error fetching attendance check-ins:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [date, options?.membersOnly]);

  return { checkins, loading };
}
