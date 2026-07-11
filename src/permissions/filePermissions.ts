import { UserAccount } from '../features/auth/domain/auth.types';
import { CloudFile } from '../features/files/domain/files.types';
import { hasAnyRole, hasRole, hasChurchAccess } from './mobilePermissions';

export function canAccessCloudFile(user: UserAccount | null | undefined, file: CloudFile): boolean {
  if (!user) {
    return file.visibility === 'public';
  }

  // 1. Check user status
  if (user.status === 'disabled') {
    return false;
  }

  // 2. Check churchId
  if (file.churchId !== user.churchId) {
    return false;
  }

  // 3. Check file visibility & 4. Check role or ownership
  switch (file.visibility) {
    case 'public':
      return true;

    case 'members_only':
      return hasChurchAccess(user);

    case 'leaders_only':
      return hasAnyRole(user, ['super_admin', 'church_admin', 'pastor']);

    case 'finance_only':
      return hasAnyRole(user, ['super_admin', 'church_admin', 'finance_admin']);

    case 'ministry_leaders_only':
      if (hasAnyRole(user, ['super_admin', 'church_admin', 'pastor'])) return true;
      if (hasRole(user, 'ministry_leader') && file.ministryId) {
        // Only allow if this specific ministry is in the user's managed list.
        return Array.isArray(user.managedMinistryIds) && user.managedMinistryIds.includes(file.ministryId);
      }
      return false;

    case 'admins_only':
      return (
        hasAnyRole(user, ['super_admin', 'church_admin']) ||
        (hasRole(user, 'secretary') && !!file.relatedModule)
      );

    case 'private':
      if (hasAnyRole(user, ['super_admin', 'church_admin', 'pastor'])) return true;
      return file.ownerUserId === user.uid || file.ownerMemberId === user.memberId;

    default:
      return false;
  }
}

export function isSensitiveFile(file: CloudFile): boolean {
  return [
    'finance_only',
    'admins_only',
    'private',
  ].includes(file.visibility) || file.relatedModule === 'giving' || file.relatedModule === 'finance';
}

export function canCacheFile(user: UserAccount | null | undefined, file: CloudFile): boolean {
  return canAccessCloudFile(user, file);
}

export function shouldClearOnLogout(file: CloudFile): boolean {
  return isSensitiveFile(file);
}
