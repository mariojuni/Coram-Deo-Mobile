import type { UserAccount, SystemRole } from '../features/auth/domain/auth.types';
import type { MinistryApplication } from '../features/ministry/domain/ministry.types';
import { hasAnyRole, hasRole, isActiveUser, hasChurchAccess } from './mobilePermissions';

/**
 * Returns true if user is active, has a churchId, and holds a role that can access mobile ministry applications.
 * Allowed roles: super_admin, church_admin, pastor, ministry_leader.
 */
export function canAccessMobileMinistryApplications(user?: UserAccount | null): boolean {
  if (!user || !isActiveUser(user) || !hasChurchAccess(user)) {
    return false;
  }
  return hasAnyRole(user, ['super_admin', 'church_admin', 'pastor', 'ministry_leader']);
}

/**
 * Returns true if user can view the specific application.
 * super_admin, church_admin, pastor: all applications in their church.
 * ministry_leader: applications where application.ministryId is in user.managedMinistryIds.
 * secretary: view-only if existing church policy allows (we allow view if they have church access, but cannot approve).
 */
export function canViewMobileMinistryApplication(
  user?: UserAccount | null,
  application?: MinistryApplication | null
): boolean {
  if (!canAccessMobileMinistryApplications(user) || !application) {
    return false;
  }
  if (application.churchId !== user?.churchId) {
    return false;
  }
  if (hasAnyRole(user, ['super_admin', 'church_admin', 'pastor'])) {
    return true;
  }
  if (hasRole(user, 'ministry_leader')) {
    return Array.isArray(user?.managedMinistryIds) && user.managedMinistryIds.includes(application.ministryId);
  }
  if (hasRole(user, 'secretary')) {
    return true; // view only
  }
  return false;
}

/**
 * Returns true if user can review (approve/decline) the specific application.
 * super_admin, church_admin, pastor: all applications in their church.
 * ministry_leader: only applications for ministries in user.managedMinistryIds.
 * finance_admin, secretary, viewer: false by default.
 */
export function canReviewMobileMinistryApplication(
  user?: UserAccount | null,
  application?: MinistryApplication | null
): boolean {
  if (!user || !isActiveUser(user) || !hasChurchAccess(user) || !application) {
    return false;
  }
  if (application.churchId !== user.churchId) {
    return false;
  }
  if (hasAnyRole(user, ['super_admin', 'church_admin', 'pastor'])) {
    return true;
  }
  if (hasRole(user, 'ministry_leader')) {
    return Array.isArray(user.managedMinistryIds) && user.managedMinistryIds.includes(application.ministryId);
  }
  return false;
}

export function canApproveMobileMinistryApplication(
  user?: UserAccount | null,
  application?: MinistryApplication | null
): boolean {
  if (!application || application.status !== 'pending') return false;
  return canReviewMobileMinistryApplication(user, application);
}

export function canDeclineMobileMinistryApplication(
  user?: UserAccount | null,
  application?: MinistryApplication | null
): boolean {
  if (!application || application.status !== 'pending') return false;
  return canReviewMobileMinistryApplication(user, application);
}
