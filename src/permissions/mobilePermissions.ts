import type { UserAccount, SystemRole } from '../features/auth/domain/auth.types';

export function isActiveUser(user?: UserAccount | null): boolean {
  return user?.status === 'active';
}

export function hasChurchAccess(user?: UserAccount | null): boolean {
  return isActiveUser(user) && !!user?.churchId;
}

export function hasMemberAccess(user?: UserAccount | null): boolean {
  return hasChurchAccess(user) && !!user?.memberId;
}

export function canAccessMobileApp(user?: UserAccount | null): boolean {
  if (user?.status === 'disabled') return false;
  return true;
}

export function canAccessChurchFeatures(user?: UserAccount | null): boolean {
  return hasChurchAccess(user);
}

export function canSubmitPrayerRequest(user?: UserAccount | null): boolean {
  return hasChurchAccess(user);
}

export function canSubmitGiving(user?: UserAccount | null): boolean {
  return hasChurchAccess(user);
}

export function canApplyToMinistry(user?: UserAccount | null): boolean {
  return hasChurchAccess(user);
}

export function canConfirmServeAssignment(user?: UserAccount | null): boolean {
  return hasChurchAccess(user);
}

export function canModeratePrayerRequests(user?: UserAccount | null): boolean {
  if (!user?.role) return false;
  return ['super_admin', 'church_admin', 'pastor'].includes(user.role.toLowerCase());
}

export function canManageGiving(user?: UserAccount | null): boolean {
  if (!user?.role) return false;
  return ['super_admin', 'church_admin', 'finance_admin'].includes(user.role.toLowerCase());
}

export function canAccessAdminPortal(user?: UserAccount | null): boolean {
  if (!user?.role) return false;
  const adminRoles = [
    'super_admin',
    'church_admin',
    'pastor',
    'secretary',
    'finance_admin',
    'ministry_leader'
  ];
  return adminRoles.includes(user.role.toLowerCase());
}

export function canViewLeadersOnlyPrayer(
  user?: UserAccount | null,
  requesterUserId?: string
): boolean {
  if (requesterUserId && user?.uid && requesterUserId === user.uid) {
    return true;
  }
  if (!user?.role) return false;
  return ['super_admin', 'church_admin', 'pastor'].includes(user.role.toLowerCase());
}
