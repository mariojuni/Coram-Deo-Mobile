import type { UserAccount } from '../features/auth/domain/auth.types';
import { hasAnyRole } from './mobilePermissions';

/**
 * Returns true if the user can access the Finance Tools section in Staff Management.
 * Roles: super_admin, church_admin, finance_admin
 */
export function canAccessFinanceTools(user?: UserAccount | null): boolean {
  return hasAnyRole(user, ['super_admin', 'church_admin', 'finance_admin']);
}

/**
 * Returns true if the user can create giving records manually (which are auto-approved).
 */
export function canCreateGivingRecord(user?: UserAccount | null): boolean {
  return hasAnyRole(user, ['super_admin', 'church_admin', 'finance_admin']);
}

/**
 * Returns true if the user can verify (approve/reject) pending giving records.
 */
export function canVerifyGivingRecord(user?: UserAccount | null): boolean {
  return hasAnyRole(user, ['super_admin', 'church_admin', 'finance_admin']);
}

/**
 * Returns true if the user can create an expense.
 */
export function canCreateExpense(user?: UserAccount | null): boolean {
  return hasAnyRole(user, ['super_admin', 'church_admin', 'finance_admin']);
}

/**
 * Returns true if the user can view the Finance Summary dashboard.
 * Pastors are also allowed to view the summary in this policy.
 */
export function canViewFinanceSummary(user?: UserAccount | null): boolean {
  return hasAnyRole(user, ['super_admin', 'church_admin', 'finance_admin', 'pastor']);
}
