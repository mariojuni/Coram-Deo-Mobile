import type { MinistryAssignment } from '@/features/ministry/domain/ministry.types';
import { useAuthStore } from '@/store/useAuthStore';
import { useMinistryStore } from '@/store/useMinistryStore';
import { useEffect, useMemo } from 'react';

export type AssignmentGroup = {
  label: 'This Week' | 'Upcoming' | 'Past';
  data: MinistryAssignment[];
};

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - day);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return { startOfWeek, endOfWeek };
}

function parseAssignmentDate(dateStr: string): Date {
  // eventDate may be 'YYYY-MM-DD' or ISO string
  if (!dateStr) return new Date(0);
  if (dateStr.length === 10) return new Date(`${dateStr}T00:00:00`);
  return new Date(dateStr);
}

export function useMyAssignments() {
  const userProfile = useAuthStore((s) => s.userProfile);
  const currentUser = useAuthStore((s) => s.currentUser);
  const { memberAssignments, memberAssignmentsLoading, initializeMemberAssignmentsListener } =
    useMinistryStore();

  const churchId = userProfile?.churchId ?? null;
  // super_admin accounts may not have a memberId set; fall back to the auth UID
  // which is what the assignment records store as their memberId
  const memberId = userProfile?.memberId ?? currentUser?.uid ?? null;

  useEffect(() => {
    if (!churchId || !memberId) return;
    const unsub = initializeMemberAssignmentsListener(churchId, memberId);
    return () => unsub();
  }, [churchId, memberId, initializeMemberAssignmentsListener]);

  const grouped = useMemo<AssignmentGroup[]>(() => {
    if (!memberAssignments.length) return [];
    const { startOfWeek, endOfWeek } = getWeekBounds();
    const now = new Date();

    const thisWeek: MinistryAssignment[] = [];
    const upcoming: MinistryAssignment[] = [];
    const past: MinistryAssignment[] = [];

    const sorted = [...memberAssignments].sort((a, b) =>
      parseAssignmentDate(a.eventDate).getTime() -
      parseAssignmentDate(b.eventDate).getTime()
    );

    for (const a of sorted) {
      const d = parseAssignmentDate(a.eventDate);
      if (d < now && d < startOfWeek) {
        past.push(a);
      } else if (d >= startOfWeek && d <= endOfWeek) {
        thisWeek.push(a);
      } else {
        upcoming.push(a);
      }
    }

    const groups: AssignmentGroup[] = [];
    if (thisWeek.length) groups.push({ label: 'This Week', data: thisWeek });
    if (upcoming.length) groups.push({ label: 'Upcoming', data: upcoming });
    if (past.length) groups.push({ label: 'Past', data: past });
    return groups;
  }, [memberAssignments]);

  // If user has no church/member link, there's nothing to load — resolve immediately
  const resolvedLoading = (!churchId || !memberId) ? false : memberAssignmentsLoading;

  return {
    grouped,
    allAssignments: memberAssignments,
    loading: resolvedLoading,
    hasChurchId: !!churchId && !!memberId,
  };
}
