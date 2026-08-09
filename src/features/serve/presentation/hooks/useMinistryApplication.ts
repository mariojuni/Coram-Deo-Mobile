import type { ApplicationStatus, MinistryApplication } from '@/features/ministry/domain/ministry.types';
import { useAuthStore } from '@/store/useAuthStore';
import { useMinistryApplicationStore } from '@/store/useMinistryApplicationStore';
import { useMinistryStore } from '@/store/useMinistryStore';
import { useEffect } from 'react';
import { isUserInMinistry } from '@/features/member/domain/member.utils';

export type MinistryApplicationStatus = 'none' | ApplicationStatus | 'member';

export function useMinistryApplication(ministryId: string) {
  const userProfile = useAuthStore((s) => s.userProfile);
  const currentUser = useAuthStore((s) => s.currentUser);
  const ministry = useMinistryStore((s) => s.ministries.find((m) => m.id === ministryId));
  const { myApplications, loading, subscribeToMyApplications } =
    useMinistryApplicationStore();

  const churchId = userProfile?.churchId ?? null;
  // super_admin accounts may not have memberId set; fall back to auth UID
  const memberId = userProfile?.memberId ?? currentUser?.uid ?? null;
  const userId = userProfile?.uid ?? null;

  useEffect(() => {
    if (!churchId || !memberId) return;
    const unsub = subscribeToMyApplications(churchId, memberId);
    return () => unsub();
  }, [churchId, memberId, subscribeToMyApplications]);

  const isMember = isUserInMinistry(ministry?.members, currentUser, userProfile);

  const existingApplication: MinistryApplication | undefined = myApplications.find(
    (a) => a.ministryId === ministryId && a.churchId === churchId
  );

  let applicationStatus: MinistryApplicationStatus = 'none';
  if (isMember) {
    applicationStatus = 'member';
  } else if (existingApplication) {
    applicationStatus = existingApplication.status;
  }

  // User can apply if they have churchId + memberId, are not a member,
  // and have no pending or approved application.
  const canApply =
    !!(churchId && memberId) &&
    !isMember &&
    (!existingApplication ||
      existingApplication.status === 'declined' ||
      existingApplication.status === 'withdrawn');

  return {
    existingApplication,
    applicationStatus,
    isMember,
    canApply,
    churchId,
    memberId,
    userId,
    ministry,
    loading,
  };
}
