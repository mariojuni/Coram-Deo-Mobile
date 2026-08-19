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
  if (!dateStr) return new Date(0);
  
  // Safely parse YYYY-MM-DD
  const ymd = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  }
  
  // Safely parse MM/DD/YYYY
  const mdy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    return new Date(Number(mdy[3]), Number(mdy[1]) - 1, Number(mdy[2]));
  }

  // Fallback for ISO strings or other formats
  if (dateStr.length === 10) return new Date(`${dateStr}T00:00:00`);
  return new Date(dateStr);
}

export function useMyAssignments() {
  const userProfile = useAuthStore((s) => s.userProfile);
  const currentUser = useAuthStore((s) => s.currentUser);
  const { memberAssignments, memberAssignmentsLoading, initializeMemberAssignmentsListener } =
    useMinistryStore();

  const churchId = userProfile?.churchId ?? null;
  const memberIds = useMemo(() => {
    const ids = new Set<string>();
    if (currentUser?.uid) ids.add(currentUser.uid);
    if (userProfile?.memberId) ids.add(userProfile.memberId);
    return Array.from(ids);
  }, [currentUser?.uid, userProfile?.memberId]);

  useEffect(() => {
    if (!churchId || memberIds.length === 0) return;
    const unsub = initializeMemberAssignmentsListener(churchId, memberIds);
    return () => unsub();
  }, [churchId, memberIds, initializeMemberAssignmentsListener]);

  const filteredAssignments = useMemo(() => {
    return [...memberAssignments].filter((a) => a.eventStatus?.toLowerCase() !== 'draft').sort((a, b) =>
      parseAssignmentDate(a.eventDate).getTime() -
      parseAssignmentDate(b.eventDate).getTime()
    );
  }, [memberAssignments]);

  const grouped = useMemo<AssignmentGroup[]>(() => {
    if (!filteredAssignments.length) return [];
    const { startOfWeek, endOfWeek } = getWeekBounds();
    const now = new Date();

    const thisWeek: MinistryAssignment[] = [];
    const upcoming: MinistryAssignment[] = [];
    const past: MinistryAssignment[] = [];

    for (const a of filteredAssignments) {
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
  }, [filteredAssignments]);

  // If user has no church/member link, there's nothing to load — resolve immediately
  const resolvedLoading = (!churchId || memberIds.length === 0) ? false : memberAssignmentsLoading;

  return {
    grouped,
    allAssignments: filteredAssignments,
    loading: resolvedLoading,
    hasChurchId: !!churchId && memberIds.length > 0,
  };
}
