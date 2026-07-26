import type { UserAccount, SystemRole } from '../features/auth/domain/auth.types';
import type { DiscipleshipGroup, DiscipleshipLesson } from '../features/discipleshipGroup/domain/discipleshipGroup.types';

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

export function isSameChurch(user: UserAccount | null | undefined, churchId: string): boolean {
  if (!user || !isActiveUser(user)) return false;
  return !!user.churchId && user.churchId === churchId;
}

export function isGroupLeader(user: UserAccount | null | undefined, group: DiscipleshipGroup): boolean {
  if (!user || !isActiveUser(user) || !isSameChurch(user, group.churchId)) return false;

  // Check if memberId is in leaderMemberIds
  if (user.memberId && Array.isArray(group.leaderMemberIds) && group.leaderMemberIds.includes(user.memberId)) {
    return true;
  }

  // Check if uid is in leaderUserIds
  if (user.uid && Array.isArray(group.leaderUserIds) && group.leaderUserIds.includes(user.uid)) {
    return true;
  }

  return false;
}

export function isGroupMember(user: UserAccount | null | undefined, group: DiscipleshipGroup): boolean {
  if (!user || !isActiveUser(user) || !isSameChurch(user, group.churchId)) return false;

  // Check if memberId is in memberIds
  if (user.memberId && Array.isArray(group.memberIds) && group.memberIds.includes(user.memberId)) {
    return true;
  }

  // Check if uid is in userIds
  if (user.uid && Array.isArray(group.userIds) && group.userIds.includes(user.uid)) {
    return true;
  }

  // Group leaders are also members by definition
  return isGroupLeader(user, group);
}

export function canViewDiscipleshipGroup(user: UserAccount | null | undefined, group: DiscipleshipGroup): boolean {
  if (!user || !isActiveUser(user) || !isSameChurch(user, group.churchId)) return false;

  // Admins & Pastors can view all groups in their church
  if (hasAnyRole(user, ['super_admin', 'church_admin', 'pastor'])) return true;

  // Assigned members or group leaders can view
  return isGroupMember(user, group);
}

export function canManageDiscipleshipGroup(user: UserAccount | null | undefined, group: DiscipleshipGroup): boolean {
  if (!user || !isActiveUser(user) || !isSameChurch(user, group.churchId)) return false;

  // Admins & Pastors can manage all groups
  if (hasAnyRole(user, ['super_admin', 'church_admin', 'pastor'])) return true;

  // Group leaders can manage their assigned group
  return isGroupLeader(user, group);
}

export function canAttachPlanToGroup(user: UserAccount | null | undefined, group: DiscipleshipGroup): boolean {
  return canManageDiscipleshipGroup(user, group);
}

export function canChangeGroupPlan(user: UserAccount | null | undefined, group: DiscipleshipGroup): boolean {
  return canManageDiscipleshipGroup(user, group);
}

export function canRemoveGroupPlan(user: UserAccount | null | undefined, group: DiscipleshipGroup): boolean {
  return canManageDiscipleshipGroup(user, group);
}

export function canAdvanceGroupWeek(user: UserAccount | null | undefined, group: DiscipleshipGroup): boolean {
  return canManageDiscipleshipGroup(user, group);
}

export function canViewGroupLeaderMaterials(user: UserAccount | null | undefined, group: DiscipleshipGroup): boolean {
  if (!user || !isActiveUser(user) || !isSameChurch(user, group.churchId)) return false;

  if (hasAnyRole(user, ['super_admin', 'church_admin', 'pastor'])) return true;

  return isGroupLeader(user, group);
}

export function canViewGroupCurrentLesson(user: UserAccount | null | undefined, group: DiscipleshipGroup): boolean {
  return canViewDiscipleshipGroup(user, group);
}

export function canViewGroupLesson(
  user: UserAccount | null | undefined,
  group: DiscipleshipGroup,
  _lesson?: DiscipleshipLesson
): boolean {
  return canViewDiscipleshipGroup(user, group);
}

export function canCompleteLesson(user: UserAccount | null | undefined, group: DiscipleshipGroup): boolean {
  // Members & leaders of the group can complete lessons for themselves
  return isGroupMember(user, group);
}

export function canViewGroupProgress(user: UserAccount | null | undefined, group: DiscipleshipGroup): boolean {
  // Group leaders & admins can view progress of all members in the group
  return canManageDiscipleshipGroup(user, group);
}

export function canAddLeaderNote(user: UserAccount | null | undefined, group: DiscipleshipGroup): boolean {
  return canManageDiscipleshipGroup(user, group);
}

export function canPostGroupAnnouncement(user: UserAccount | null | undefined, group: DiscipleshipGroup): boolean {
  return canManageDiscipleshipGroup(user, group);
}

export function canPostGroupDiscussion(user: UserAccount | null | undefined, group: DiscipleshipGroup): boolean {
  return isGroupMember(user, group);
}

export function canAccessGroupsTab(user?: UserAccount | null): boolean {
  if (!user || !isActiveUser(user) || !user.churchId) return false;
  if (hasAnyRole(user, ['super_admin', 'church_admin', 'pastor'])) return true;
  return !!user.memberId;
}
