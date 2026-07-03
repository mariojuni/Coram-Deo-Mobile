import { getUndismissedDutyNotificationsForAdmin } from '@/features/schedule/domain/schedule.selectors';
import { useMemberStore } from '@/store/useMemberStore';
import { useMinistryStore } from '@/store/useMinistryStore';
import { ministryRepository } from '@/features/ministry/data/ministry.repository';
import { useMemo } from 'react';

export type StaffNotificationViewModel = {
  action: 'accepted' | 'declined';
  date: string;
  dateObj: Date;
  title: string;
  id: string;
  role: string;
  scheduleId: string;
  userId: string;
  userName: string;
};

export function useStaffNotifications() {
  const { assignments } = useMinistryStore();
  const members = useMemberStore((state) => state.members);

  const notifications = useMemo<StaffNotificationViewModel[]>(() => {
    const items = getUndismissedDutyNotificationsForAdmin(assignments);
    return items
      .map((item) => {
        const member = members.find((m) => m.id === item.userId);
        if (!member) return null;
        return {
          id: item.notificationId,
          scheduleId: item.scheduleId,
          userId: item.userId,
          userName: member.name || member.displayName || 'Unknown Member',
          action: item.action,
          role: item.role,
          date: item.date,
          title: item.title,
          dateObj: item.dateObj,
        };
      })
      .filter((value): value is StaffNotificationViewModel => value !== null);
  }, [members, assignments]);

  const dismissNotification = async (eventId: string, userId: string, currentStatus: string, assignmentId?: string) => {
    if (!assignmentId) return;
    await ministryRepository.updateAssignment(assignmentId, { isAcknowledged: true });
  };

  return { dismissNotification, notifications };
}
