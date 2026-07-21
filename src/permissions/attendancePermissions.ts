import type { UserAccount } from '../features/auth/domain/auth.types';
import type { EventModel } from '../features/attendance/domain/attendance.types';

/**
 * Validates if the user can self check-in.
 * User must be active, have a churchId, and have a memberId.
 */
export function canSelfCheckIn(user: UserAccount | null | undefined): boolean {
  if (!user) return false;
  if (user.status !== 'active') return false;
  if (!user.churchId || !user.memberId) return false;
  return true;
}

/**
 * Validates if the user can manage attendance for a given event.
 * - super_admin, church_admin, pastor, secretary can manage any event's attendance.
 * - ministry_leader can manage attendance if the event.ministryId is in their managedMinistryIds.
 * - finance_admin cannot manage attendance by default unless they also have another role that permits it.
 */
export function canManageAttendance(user: UserAccount | null | undefined, event?: EventModel): boolean {
  if (!user) return false;
  if (user.status !== 'active') return false;

  const roles = user.systemRoles || [];
  
  if (
    roles.includes('super_admin') ||
    roles.includes('church_admin') ||
    roles.includes('pastor') ||
    roles.includes('secretary')
  ) {
    return true;
  }

  if (roles.includes('ministry_leader') && event && event.ministryId) {
    const managed = user.managedMinistryIds || [];
    if (managed.includes(event.ministryId)) {
      return true;
    }
  }

  return false;
}

/**
 * Validates if the user can view their own attendance history.
 * Requires active status, churchId, and memberId.
 */
export function canViewOwnAttendance(user: UserAccount | null | undefined): boolean {
  return canSelfCheckIn(user);
}

/**
 * Validates if the user can view event attendance lists (like on Staff Tools).
 * Usually the same as being able to manage attendance.
 */
export function canViewEventAttendance(user: UserAccount | null | undefined, event?: EventModel): boolean {
  return canManageAttendance(user, event);
}
