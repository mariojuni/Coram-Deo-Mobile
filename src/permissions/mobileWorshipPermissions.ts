import type { UserAccount, SystemRole } from '../features/auth/domain/auth.types';
import type { Ministry } from '../features/ministry/domain/ministry.types';
import type { WorshipSetlist } from '../features/worship/domain/worship.types';

function getSystemRoles(user?: UserAccount | null): SystemRole[] {
  if (!user) return [];
  if (Array.isArray(user.systemRoles) && user.systemRoles.length > 0) {
    return user.systemRoles;
  }
  if (user.role) {
    return [user.role as SystemRole];
  }
  return ['viewer'];
}

export function hasRole(user: UserAccount | null | undefined, role: SystemRole): boolean {
  return getSystemRoles(user).includes(role);
}

export function hasAnyRole(user: UserAccount | null | undefined, roles: SystemRole[]): boolean {
  const userRoles = getSystemRoles(user);
  return roles.some((r) => userRoles.includes(r));
}

export function isActiveUser(user?: UserAccount | null): boolean {
  return user?.status?.toLowerCase() === 'active';
}

export function hasChurchAccess(user?: UserAccount | null): boolean {
  return isActiveUser(user) && !!user?.churchId;
}

export function hasMemberAccess(user?: UserAccount | null): boolean {
  return hasChurchAccess(user) && !!user?.memberId;
}

export interface AssignmentPermissionCheckParams {
  assignment: {
    memberId?: string;
    userId?: string;
    status?: string;
    ministryType?: string;
    ministryName?: string;
    canViewSongList?: boolean;
    churchId?: string;
  } | null | undefined;
  ministry: {
    name?: string;
    churchId?: string;
    type?: string;
    features?: {
      songListEnabled?: boolean;
    };
  } | null | undefined;
  event: {
    churchId?: string;
    status?: string;
    date?: string;
  } | null | undefined;
  setlist: {
    churchId?: string;
    status?: string;
  } | null | undefined;
}

/**
 * Mobile access evaluation:
 * Serve → My Schedule → Assignment Detail → Worship Resources
 *
 * Shows Worship Resources only if:
 * - user is active
 * - user has churchId
 * - user has memberId
 * - assignment belongs to current user/member
 * - assignment.status is not declined or cancelled
 * - assignment.ministryType == worship
 * - ministry.features.songListEnabled == true
 * - assignment.canViewSongList == true
 * - event is published
 * - event is upcoming or currently active
 * - worship setlist is published
 */
export function canViewSongListFromAssignment(
  user: UserAccount | null | undefined,
  params: AssignmentPermissionCheckParams
): boolean {
  if (!user) return false;
  if (user.status && user.status.toLowerCase() !== 'active') return false;
  if (!user.churchId) return false;

  const { assignment, ministry, event, setlist } = params;
  if (!assignment) return false;

  // Data scoping check by churchId
  if (assignment.churchId && assignment.churchId !== user.churchId) return false;
  if (ministry?.churchId && ministry.churchId !== user.churchId) return false;
  if (event?.churchId && event.churchId !== user.churchId) return false;
  if (setlist?.churchId && setlist.churchId !== user.churchId) return false;

  // Assignment belongs to current user/member
  const userMemberId = user.memberId || user.uid || user.id;
  const isUserAssignment =
    !assignment.memberId ||
    assignment.memberId === userMemberId ||
    assignment.memberId === user.memberId ||
    assignment.memberId === user.uid ||
    assignment.memberId === user.id ||
    assignment.userId === user.id ||
    assignment.userId === user.uid;
  if (!isUserAssignment) return false;

  // Assignment status check
  const assignmentStatus = (assignment.status || '').toLowerCase();
  if (assignmentStatus === 'declined' || assignmentStatus === 'cancelled') return false;

  // Ministry type & flag check
  const rawType = (assignment.ministryType || ministry?.type || '').toLowerCase();
  const rawMinName = (assignment.ministryName || ministry?.name || '').toLowerCase();
  const isWorshipMinistry =
    rawType === 'worship' ||
    rawMinName.includes('worship') ||
    rawMinName.includes('praise');
  if (!isWorshipMinistry) return false;

  // Ministry songListEnabled flag check
  if (ministry && ministry.features !== undefined) {
    if (ministry.features.songListEnabled !== true) return false;
  }

  // Assignment flag check
  if (assignment.canViewSongList === false) return false;

  // Event status check (if event provided)
  if (event?.status && event.status.toLowerCase() !== 'published') return false;

  // Event upcoming or active date check (normalize timezone)
  const eventDateStr = event?.date || (assignment as any).eventDate;
  if (eventDateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parsedDate = eventDateStr.length === 10 ? new Date(`${eventDateStr}T00:00:00`) : new Date(eventDateStr);
    if (!isNaN(parsedDate.getTime()) && parsedDate < today) {
      return false;
    }
  }

  // Worship setlist published check (if setlist exists)
  if (setlist && setlist.status && setlist.status.toLowerCase() !== 'published') return false;

  return true;
}

/**
 * User can save personal arrangement only if canViewSongListFromAssignment returns true.
 */
export function canSavePersonalArrangement(
  user: UserAccount | null | undefined,
  params: AssignmentPermissionCheckParams
): boolean {
  return canViewSongListFromAssignment(user, params);
}

/**
 * Checks whether the user can view worship setlists in mobile app.
 */
export function canViewMobileWorshipSetlists(
  user?: UserAccount | null,
  userMinistries?: Ministry[]
): boolean {
  if (!hasChurchAccess(user)) return false;

  // Global administrative & pastoral roles
  if (hasAnyRole(user, ['super_admin', 'church_admin', 'pastor'])) return true;

  // Ministry leaders
  if (hasRole(user, 'ministry_leader')) return true;

  // Must have member access for ministry-level feature flag checks
  if (!hasMemberAccess(user)) return false;

  // Check active ministry membership and feature flags
  if (userMinistries && userMinistries.length > 0) {
    return userMinistries.some((m) => {
      const isMinistryActive = m.status?.toLowerCase() === 'active';
      return isMinistryActive && m.features?.songListEnabled === true;
    });
  }

  return false;
}

/**
 * Checks whether a user can view a specific worship setlist.
 */
export function canViewMobileWorshipSetlist(
  user: UserAccount | null | undefined,
  setlist: WorshipSetlist | null | undefined,
  userMinistries?: Ministry[]
): boolean {
  if (!user || !setlist) return false;
  if (!hasChurchAccess(user) || setlist.churchId !== user.churchId) return false;

  // Admins & Pastors can view any setlist (draft or published)
  if (hasAnyRole(user, ['super_admin', 'church_admin', 'pastor'])) return true;

  // Ministry leader managing this specific ministry can view draft or published
  if (hasRole(user, 'ministry_leader') && setlist.ministryId) {
    if (Array.isArray(user.managedMinistryIds) && user.managedMinistryIds.includes(setlist.ministryId)) {
      return true;
    }
  }

  // Normal team members (or leaders viewing other ministries) can only view published setlists
  if (setlist.status !== 'published') return false;

  return canViewMobileWorshipSetlists(user, userMinistries);
}

/**
 * Checks whether a user can create new worship setlists.
 */
export function canCreateMobileWorshipSetlists(
  user?: UserAccount | null,
  userMinistries?: Ministry[]
): boolean {
  if (!hasChurchAccess(user)) return false;
  if (hasAnyRole(user, ['super_admin', 'church_admin', 'pastor'])) return true;
  if (hasRole(user, 'ministry_leader')) return true;

  if (userMinistries && userMinistries.length > 0) {
    return userMinistries.some((m) => {
      const isMinistryActive = m.status?.toLowerCase() === 'active';
      return isMinistryActive && m.features?.songListEnabled === true;
    });
  }

  return false;
}

/**
 * Checks whether a user can manage (edit/save official setlist) a specific worship setlist.
 */
export function canManageMobileWorshipSetlist(
  user: UserAccount | null | undefined,
  setlist: WorshipSetlist | null | undefined,
  userMinistries?: Ministry[]
): boolean {
  if (!user || !setlist) return false;
  if (!hasChurchAccess(user) || setlist.churchId !== user.churchId) return false;

  if (hasAnyRole(user, ['super_admin', 'church_admin', 'pastor'])) return true;

  if (hasRole(user, 'ministry_leader')) {
    if (setlist.ministryId && Array.isArray(user.managedMinistryIds) && user.managedMinistryIds.includes(setlist.ministryId)) {
      return true;
    }
    // Fallback: if user leads any active worship ministry
    if (userMinistries && userMinistries.length > 0) {
      return userMinistries.some(m => m.status?.toLowerCase() === 'active' && m.features?.songListEnabled === true);
    }
    return true;
  }

  return false;
}


