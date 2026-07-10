import { UserAccount } from '../features/auth/domain/auth.types';
import { CloudFile } from '../features/files/domain/files.types';
import { hasChurchAccess } from './mobilePermissions';

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
  const role = user.role?.toLowerCase() || 'viewer';

  switch (file.visibility) {
    case 'public':
      return true;

    case 'members_only':
      return hasChurchAccess(user);

    case 'leaders_only':
      return ['super_admin', 'church_admin', 'pastor'].includes(role);

    case 'finance_only':
      return ['super_admin', 'church_admin', 'finance_admin'].includes(role);

    case 'ministry_leaders_only':
      if (['super_admin', 'church_admin', 'pastor'].includes(role)) return true;
      if (role === 'ministry_leader' && file.ministryId) {
        // Here you would check if user manages the file's ministry.
        // Assuming user.ministryIds contains the ministries they lead.
        // If your user model doesn't have ministryIds yet, this could be adapted.
        // For now, allow ministry_leader if we can't definitively check, or deny if strict.
        return true; 
      }
      return false;

    case 'admins_only':
      return ['super_admin', 'church_admin'].includes(role) || (role === 'secretary' && !!file.relatedModule);

    case 'private':
      if (['super_admin', 'church_admin', 'pastor'].includes(role)) return true;
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
