import type { Duty } from './schedule.types';

export type MinistryRoleGroupId = 'single' | 'praiseWorship' | 'sundaySchool';

export interface MinistryRoleDefinition {
  id: string;
  label: string;
  aliases?: string[];
  groupId: MinistryRoleGroupId;
}

export interface MinistryRoleGroup {
  id: MinistryRoleGroupId;
  label: string;
  roles: MinistryRoleDefinition[];
}

export const MINISTRY_ROLE_GROUPS: MinistryRoleGroup[] = [
  {
    id: 'single',
    label: 'Single Ministries',
    roles: [
      { id: 'openingPrayer', label: 'Opening Prayer', groupId: 'single' },
      { id: 'tithesOfferingPrayer', label: 'Tithes & Offering Prayer', groupId: 'single', aliases: ['Tithes & Offering Prayer'] },
      { id: 'techAudio', label: 'Tech & Audio', groupId: 'single', aliases: ['Audio/Visual Tech'] },
      { id: 'presider', label: 'Presider', groupId: 'single' },
      { id: 'scriptureReading', label: 'Scripture Reading', groupId: 'single' },
      { id: 'preacher', label: 'Preacher', groupId: 'single' },
    ],
  },
  {
    id: 'praiseWorship',
    label: 'Praise & Worship Team',
    roles: [
      { id: 'vocalist', label: 'Vocalist', groupId: 'praiseWorship' },
      { id: 'bassGuitar', label: 'Bass Guitar', groupId: 'praiseWorship', aliases: ['Base Guitar'] },
      { id: 'drummer', label: 'Drummer', groupId: 'praiseWorship' },
      { id: 'piano', label: 'Piano', groupId: 'praiseWorship' },
      { id: 'electricGuitar', label: 'Electric Guitar', groupId: 'praiseWorship' },
    ],
  },
  {
    id: 'sundaySchool',
    label: 'Sunday School Teacher',
    roles: [
      { id: 'sundaySchoolKids', label: 'Sunday School Teacher (Kids)', groupId: 'sundaySchool' },
      { id: 'sundaySchoolYouth', label: 'Sunday School Teacher (Youth)', groupId: 'sundaySchool' },
      { id: 'sundaySchoolAdults', label: 'Sunday School Teacher (Adults)', groupId: 'sundaySchool' },
    ],
  },
];

export const MINISTRY_ROLES: MinistryRoleDefinition[] = MINISTRY_ROLE_GROUPS.flatMap((group) => group.roles);

function normalizeRoleName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function getMinistryRoleById(roleId: string): MinistryRoleDefinition | undefined {
  return MINISTRY_ROLES.find((role) => role.id === roleId);
}

export function resolveRoleId(roleIdentifier: string): string | null {
  const byId = getMinistryRoleById(roleIdentifier);
  if (byId) return byId.id;

  const normalized = normalizeRoleName(roleIdentifier);
  const byLabel = MINISTRY_ROLES.find((role) => normalizeRoleName(role.label) === normalized);
  if (byLabel) return byLabel.id;

  const byAlias = MINISTRY_ROLES.find((role) =>
    role.aliases?.some((alias) => normalizeRoleName(alias) === normalized)
  );
  return byAlias?.id ?? null;
}

export function resolveDutyRoleId(duty: Pick<Duty, 'role' | 'roleId'>): string | null {
  if (duty.roleId) return resolveRoleId(duty.roleId);
  return resolveRoleId(duty.role);
}
