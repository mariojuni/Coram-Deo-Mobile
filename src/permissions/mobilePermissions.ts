import type { UserAccount, SystemRole } from '../features/auth/domain/auth.types';
import type { Ministry } from '../features/ministry/domain/ministry.types';

// ─── Core role helpers ────────────────────────────────────────────────────────

/**
 * Returns the resolved list of system roles for a user.
 * Falls back to the legacy `role` field so callers don't need to worry
 * about which Firestore format the document uses.
 */
function getSystemRoles(user?: UserAccount | null): SystemRole[] {
  if (!user) return [];
  if (Array.isArray(user.systemRoles) && user.systemRoles.length > 0) {
    return user.systemRoles;
  }
  // Legacy fallback
  if (user.role) {
    return [user.role as SystemRole];
  }
  return ['member'];
}

/** Returns true if the user holds the specified role. */
export function hasRole(user: UserAccount | null | undefined, role: SystemRole): boolean {
  return getSystemRoles(user).includes(role);
}

/** Returns true if the user holds at least one of the specified roles. */
export function hasAnyRole(user: UserAccount | null | undefined, roles: SystemRole[]): boolean {
  const userRoles = getSystemRoles(user);
  return roles.some((r) => userRoles.includes(r));
}

// ─── Status / access helpers ─────────────────────────────────────────────────

export function isActiveUser(user?: UserAccount | null): boolean {
  return user?.status?.toLowerCase() === 'active';
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

// ─── Mobile feature guards (member-safe) ─────────────────────────────────────

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

// ─── Comment guards ──────────────────────────────────────────────────────────

export function canViewComments(user?: UserAccount | null, targetVisibility?: string): boolean {
  if (!hasChurchAccess(user)) return false;
  if (targetVisibility === 'leaders_only') {
    return canModeratePrayerRequests(user);
  }
  return true;
}

export function canCreateComment(user?: UserAccount | null): boolean {
  if (hasAnyRole(user, ['super_admin', 'church_admin', 'pastor'])) return true;
  return hasMemberAccess(user);
}

export function canDeleteComment(user: UserAccount | null | undefined, authorUserId: string): boolean {
  if (!user || !user.uid) return false;
  if (user.uid === authorUserId) return true;
  return canModerateComments(user);
}

export function canModerateComments(user?: UserAccount | null): boolean {
  return hasAnyRole(user, ['super_admin', 'church_admin', 'pastor']);
}

// ─── Admin permission helpers ─────────────────────────────────────────────────

/**
 * Prayer moderation: only super_admin, church_admin, and pastor.
 * finance_admin cannot see private prayer requests unless they also hold one of these roles.
 */
export function canModeratePrayerRequests(user?: UserAccount | null): boolean {
  return hasAnyRole(user, ['super_admin', 'church_admin', 'pastor']);
}

/**
 * Giving management: finance_admin, church_admin, super_admin.
 * Covers giving records, campaigns, expenses, payment methods, and finance reports.
 */
export function canManageGiving(user?: UserAccount | null): boolean {
  return hasAnyRole(user, ['super_admin', 'church_admin', 'finance_admin']);
}

/**
 * Ministry management: super_admin and church_admin can manage all ministries.
 * pastor can manage all ministries in their church scope.
 * ministry_leader can only manage ministries listed in their managedMinistryIds.
 */
export function canManageMinistry(
  user: UserAccount | null | undefined,
  ministryId: string
): boolean {
  if (!user) return false;
  if (hasAnyRole(user, ['super_admin', 'church_admin', 'pastor'])) return true;
  if (hasRole(user, 'ministry_leader')) {
    return Array.isArray(user.managedMinistryIds) && user.managedMinistryIds.includes(ministryId);
  }
  return false;
}

/**
 * Admin portal access: any role other than member.
 * member can use normal mobile features but cannot enter the admin portal.
 */
export function canAccessAdminPortal(user?: UserAccount | null): boolean {
  return hasAnyRole(user, [
    'super_admin',
    'church_admin',
    'pastor',
    'secretary',
    'finance_admin',
    'ministry_leader',
  ]);
}

/**
 * Leaders-only prayer: the requester can always see their own request.
 * For others, only super_admin, church_admin, and pastor may view private requests.
 */
export function canViewLeadersOnlyPrayer(
  user?: UserAccount | null,
  requesterUserId?: string
): boolean {
  if (requesterUserId && user?.uid && requesterUserId === user.uid) {
    return true;
  }
  return canModeratePrayerRequests(user);
}

// ─── Staff Management & Tool Visibility ──────────────────────────────────────

import { canViewMobileWorshipSetlists } from './mobileWorshipPermissions';

export function canViewWorshipTab(user?: UserAccount | null, userMinistries?: Ministry[]): boolean {
  return canViewMobileWorshipSetlists(user, userMinistries);
}

export function canManageWorship(user?: UserAccount | null, ministryId?: string): boolean {
  if (hasAnyRole(user, ['super_admin', 'church_admin', 'pastor'])) return true;
  if (!hasMemberAccess(user)) return false;
  if (ministryId && hasRole(user, 'ministry_leader')) {
    return Array.isArray(user?.managedMinistryIds) && user.managedMinistryIds.includes(ministryId);
  }
  return false;
}

export function canAccessFinanceTools(user?: UserAccount | null): boolean {
  return canManageGiving(user);
}

export function canViewServeTools(user?: UserAccount | null, userMinistries?: Ministry[]): boolean {
  if (hasAnyRole(user, ['super_admin', 'church_admin', 'pastor', 'ministry_leader'])) return true;
  if (!hasMemberAccess(user)) return false;
  if (userMinistries && userMinistries.length > 0) {
    return userMinistries.some(m => m.status === 'Active');
  }
  return false;
}

export function canManageAnyMinistry(user?: UserAccount | null): boolean {
  return hasAnyRole(user, ['super_admin', 'church_admin', 'pastor', 'ministry_leader']); 
}

export function canViewStaffScreen(user?: UserAccount | null, userMinistries?: Ministry[]): boolean {
  return (
    canViewWorshipTab(user, userMinistries) ||
    canAccessFinanceTools(user) ||
    canViewServeTools(user, userMinistries) ||
    canManageAnyMinistry(user)
  );
}

// ─── Profile & Personal Settings ─────────────────────────────────────────────

export function canViewOwnProfile(user?: UserAccount | null): boolean {
  return isActiveUser(user);
}

export function canEditOwnProfile(user?: UserAccount | null): boolean {
  return isActiveUser(user);
}

export function canUpdateOwnAvatar(user?: UserAccount | null): boolean {
  return canEditOwnProfile(user);
}

export function canViewOwnBibleActivity(user?: UserAccount | null): boolean {
  return isActiveUser(user);
}
