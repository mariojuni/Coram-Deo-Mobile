/**
 * AssignMinistriesModal
 * Full-screen modal for assigning ministry roles to an event schedule.
 * US-01 through US-09 implementation.
 */
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Drum,
  GraduationCap,
  Guitar,
  MapPin,
  Mic,
  Monitor,
  Piano,
  Search,
  Users,
  X
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MINISTRY_ROLE_GROUPS, MINISTRY_ROLES, resolveDutyRoleId } from '../../features/schedule/domain/ministryRoles';
import type { Schedule } from '../../features/schedule/domain/schedule.types';
import { useAuthStore } from '../../store/useAuthStore';
import { useMemberStore } from '../../store/useMemberStore';
import { saveAssignments, useScheduleStore } from '../../store/useScheduleStore';

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'unassigned' | 'assigned';

// roleId → userId
type Assignments = Record<string, string>;

// ─── Role Icon Map ────────────────────────────────────────────────────────────

const ROLE_ICONS: Record<string, React.ReactNode> = {
  openingPrayer: <Users size={18} color="#8B6FE8" />,
  tithesOfferingPrayer: <BookOpen size={18} color="#4D8BFF" />,
  techAudio: <Monitor size={18} color="#6B7280" />,
  presider: <Users size={18} color="#FF6596" />,
  scriptureReading: <BookOpen size={18} color="#F59E0B" />,
  preacher: <Mic size={18} color="#FF6596" />,
  vocalist: <Mic size={18} color="#8B6FE8" />,
  bassGuitar: <Guitar size={18} color="#4D8BFF" />,
  drummer: <Drum size={18} color="#EF4444" />,
  piano: <Piano size={18} color="#10B981" />,
  electricGuitar: <Guitar size={18} color="#F59E0B" />,
  sundaySchoolKids: <GraduationCap size={18} color="#F59E0B" />,
  sundaySchoolYouth: <GraduationCap size={18} color="#4D8BFF" />,
  sundaySchoolAdults: <GraduationCap size={18} color="#10B981" />,
};

const ROLE_ICON_BG: Record<string, string> = {
  openingPrayer: '#F3EEFF',
  tithesOfferingPrayer: '#E8F0FF',
  techAudio: '#F3F4F6',
  presider: '#FFE8F0',
  scriptureReading: '#FEF3C7',
  preacher: '#FFE8F0',
  vocalist: '#F3EEFF',
  bassGuitar: '#E8F0FF',
  drummer: '#FEE2E2',
  piano: '#D1FAE5',
  electricGuitar: '#FEF3C7',
  sundaySchoolKids: '#FEF3C7',
  sundaySchoolYouth: '#E8F0FF',
  sundaySchoolAdults: '#D1FAE5',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (dateStr: string) =>
  new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

const buildInitialAssignments = (schedule: Schedule): Assignments => {
  const result: Assignments = {};
  for (const duty of schedule.duties ?? []) {
    if (duty.role.toLowerCase() === 'attendee') continue;
    if (duty.status === 'declined' || duty.status === 'declined_dismissed') continue;
    const roleId = resolveDutyRoleId(duty);
    if (roleId) result[roleId] = duty.userId;
  }
  return result;
};

// ─── MemberPickerSheet ────────────────────────────────────────────────────────

interface MemberPickerSheetProps {
  roleLabel: string;
  currentUserId: string | null;
  onSelect: (userId: string | null) => void;
  onClose: () => void;
}

function MemberPickerSheet({ roleLabel, currentUserId, onSelect, onClose }: MemberPickerSheetProps) {
  const members = useMemberStore((s) => s.members);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return members;
    return members.filter((m) => (m.name ?? '').toLowerCase().includes(q) || (m.role ?? '').toLowerCase().includes(q));
  }, [members, query]);

  return (
    <View style={ps.sheet}>
      <View style={ps.handle} />
      <View style={ps.sheetHeader}>
        <View>
          <Text style={ps.sheetTitle}>Assign Member</Text>
          <Text style={ps.sheetSubtitle}>{roleLabel}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={ps.closeBtn}>
          <X size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={ps.searchRow}>
        <Search size={16} color="#aaa" />
        <TextInput
          style={ps.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or role…"
          placeholderTextColor="#aaa"
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <X size={14} color="#aaa" />
          </TouchableOpacity>
        )}
      </View>

      {currentUserId && (
        <TouchableOpacity style={ps.clearRow} onPress={() => onSelect(null)}>
          <View style={[ps.avatarBox, { backgroundColor: '#FEE2E2' }]}>
            <X size={18} color="#EF4444" />
          </View>
          <View>
            <Text style={[ps.memberName, { color: '#EF4444' }]}>Remove Assignment</Text>
            <Text style={ps.memberRole}>Clear this role</Text>
          </View>
        </TouchableOpacity>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const isSelected = item.id === currentUserId;
          return (
            <TouchableOpacity
              style={[ps.memberRow, isSelected && ps.memberRowSelected]}
              onPress={() => onSelect(item.id)}
              activeOpacity={0.7}
            >
              {item.avatar ? (
                <Image
                  source={{ uri: item.avatar }}
                  style={ps.avatar}
                />
              ) : (
                <View style={[ps.avatarBox, { backgroundColor: '#f0f0f0' }]}>
                  <Users size={18} color="#999" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={ps.memberName}>{item.name ?? 'Unnamed Member'}</Text>
                {item.role ? <Text style={ps.memberRole}>{item.role}</Text> : null}
              </View>
              {isSelected && <Check size={18} color="#FF6596" />}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const ps = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: '#fff' },
  handle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a1a' },
  sheetSubtitle: { fontSize: 13, color: '#888', marginTop: 2 },
  closeBtn: { padding: 4 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, paddingHorizontal: 14, height: 44, backgroundColor: '#f8f9fb', borderRadius: 12, borderWidth: 1, borderColor: '#ebebeb' },
  searchInput: { flex: 1, fontSize: 15, color: '#1a1a1a' },
  clearRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  memberRowSelected: { backgroundColor: '#FFF0F5', borderRadius: 10, paddingHorizontal: 8, marginHorizontal: -8 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarBox: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  memberName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  memberRole: { fontSize: 11, color: '#888', fontWeight: '600', textTransform: 'uppercase', marginTop: 2 },
});

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface AssignMinistriesModalProps {
  schedule: Schedule;
  onClose: () => void;
}

export default function AssignMinistriesModal({ schedule, onClose }: AssignMinistriesModalProps) {
  const insets = useSafeAreaInsets();
  const members = useMemberStore((s) => s.members);
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const currentUser = useAuthStore((s) => s.currentUser);
  const userProfile = useAuthStore((s) => s.userProfile);
  const schedules = useScheduleStore((s) => s.schedules);

  const isStaff = ['staff', 'admin'].includes((userProfile?.role ?? '').toLowerCase());

  const [assignments, setAssignments] = useState<Assignments>(() => buildInitialAssignments(schedule));
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ single: true, praiseWorship: true, sundaySchool: true });
  const [selectingRoleId, setSelectingRoleId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalRoles = MINISTRY_ROLES.length;
  const assignedCount = useMemo(() => Object.keys(assignments).length, [assignments]);

  // Live schedule from store so it stays fresh
  const liveSchedule = useMemo(
    () => schedules.find((s) => s.id === schedule.id) ?? schedule,
    [schedule, schedules]
  );

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  const openPicker = useCallback((roleId: string) => {
    if (!isStaff) {
      Alert.alert('Permission Denied', 'Only staff members can assign ministry roles.');
      return;
    }
    setSelectingRoleId(roleId);
    setShowPicker(true);
  }, [isStaff]);

  const handleSelect = useCallback((userId: string | null) => {
    if (!selectingRoleId) return;
    setAssignments((prev) => {
      const next = { ...prev };
      if (userId === null) {
        delete next[selectingRoleId];
      } else {
        next[selectingRoleId] = userId;
      }
      return next;
    });
    setShowPicker(false);
    setSelectingRoleId(null);
  }, [selectingRoleId]);

  // Use previous week's assignments as template
  const handleUseTemplate = useCallback(() => {
    const prevSchedule = [...schedules]
      .filter((s) => s.id !== liveSchedule.id && s.date < liveSchedule.date && (s.duties?.length ?? 0) > 0)
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    if (!prevSchedule) {
      Alert.alert('No Template', 'No previous event with assignments found.');
      return;
    }

    Alert.alert(
      'Use Template',
      `Copy assignments from "${prevSchedule.event}" (${fmtDate(prevSchedule.date)})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy',
          onPress: () => setAssignments(buildInitialAssignments(prevSchedule)),
        },
      ]
    );
  }, [schedules, liveSchedule]);

  const handleSave = useCallback(async () => {
    if (!isStaff) {
      Alert.alert('Permission Denied', 'Only staff members can save assignments.');
      return;
    }

    const unassigned = MINISTRY_ROLES.filter((r) => !assignments[r.id]);
    if (unassigned.length > 0) {
      const names = unassigned.map((r) => r.label).join(', ');
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Unassigned Roles',
          `The following roles are still unassigned:\n${names}\n\nSave anyway?`,
          [
            { text: 'Go Back', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Save Anyway', onPress: () => resolve(true) },
          ]
        );
      });
      if (!confirmed) return;
    }

    // Warn about duplicate assignments (same person in multiple roles)
    const userRoleCounts: Record<string, string[]> = {};
    for (const [roleId, userId] of Object.entries(assignments)) {
      if (!userRoleCounts[userId]) userRoleCounts[userId] = [];
      userRoleCounts[userId].push(roleId);
    }
    const duplicates = Object.entries(userRoleCounts).filter(([, roles]) => roles.length > 1);
    if (duplicates.length > 0) {
      const warnings = duplicates.map(([uid, roles]) => {
        const name = memberById.get(uid)?.name ?? uid;
        const labels = roles.map((id) => MINISTRY_ROLES.find((r) => r.id === id)?.label ?? id).join(', ');
        return `${name}: ${labels}`;
      }).join('\n');
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Double Assignment Warning',
          `Some members are assigned to multiple roles:\n${warnings}\n\nContinue?`,
          [
            { text: 'Go Back', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Continue', onPress: () => resolve(true) },
          ]
        );
      });
      if (!confirmed) return;
    }

    setSaving(true);
    try {
      const payload = Object.entries(assignments).map(([roleId, userId]) => ({
        roleId,
        roleLabel: MINISTRY_ROLES.find((r) => r.id === roleId)?.label ?? roleId,
        userId,
      }));
      await saveAssignments(liveSchedule.id, payload, currentUser?.uid ?? 'unknown');
      Alert.alert('Saved', 'Ministry assignments have been saved successfully.', [{ text: 'OK', onPress: onClose }]);
    } catch (e) {
      console.error(e);
      Alert.alert('Save Failed', 'Could not save assignments. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [isStaff, assignments, liveSchedule.id, currentUser, memberById, onClose]);

  const selectingRole = selectingRoleId ? MINISTRY_ROLES.find((r) => r.id === selectingRoleId) : null;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {/* ── Header ── */}
      <View style={[ms.header, { paddingTop: 16 }]}>
        <TouchableOpacity onPress={onClose} style={ms.backBtn}>
          <X size={20} color="#666" />
        </TouchableOpacity>
        <Text style={ms.headerTitle}>Assign Ministries</Text>
        <TouchableOpacity onPress={handleUseTemplate} style={ms.templateBtn}>
          <Copy size={18} color="#4D8BFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: '#FAFAFA' }} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ── Event Card ── */}
        <View style={ms.eventCard}>
          <View style={ms.eventIconBox}>
            <Users size={28} color="#8B6FE8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ms.eventName} numberOfLines={1}>{liveSchedule.event}</Text>
            <View style={ms.eventMeta}>
              <Clock size={13} color="#888" />
              <Text style={ms.eventMetaText}>{liveSchedule.time}{liveSchedule.endTime ? ` – ${liveSchedule.endTime}` : ''}</Text>
            </View>
            <View style={ms.eventMeta}>
              <MapPin size={13} color="#888" />
              <Text style={ms.eventMetaText}>{liveSchedule.location}</Text>
            </View>
          </View>
        </View>

        {/* ── Progress ── */}
        <View style={ms.progressCard}>
          <View style={ms.progressRow}>
            <Text style={ms.progressLabel}>{assignedCount} of {totalRoles} roles assigned</Text>
            <TouchableOpacity onPress={handleUseTemplate} style={ms.templatePill}>
              <Copy size={13} color="#4D8BFF" />
              <Text style={ms.templatePillText}>Use Template</Text>
            </TouchableOpacity>
          </View>
          <View style={ms.progressTrack}>
            <View style={[ms.progressFill, { width: `${Math.round((assignedCount / totalRoles) * 100)}%` }]} />
          </View>
        </View>

        {/* ── Filter Tabs ── */}
        <View style={ms.filterRow}>
          {(['all', 'unassigned', 'assigned'] as FilterTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[ms.filterTab, filterTab === tab && ms.filterTabActive]}
              onPress={() => setFilterTab(tab)}
            >
              <Text style={[ms.filterTabText, filterTab === tab && ms.filterTabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Role Groups ── */}
        {MINISTRY_ROLE_GROUPS.map((group) => {
          const visibleRoles = group.roles.filter((role) => {
            if (filterTab === 'assigned') return !!assignments[role.id];
            if (filterTab === 'unassigned') return !assignments[role.id];
            return true;
          });
          if (visibleRoles.length === 0) return null;

          const groupAssigned = group.roles.filter((r) => !!assignments[r.id]).length;
          const isExpanded = expandedGroups[group.id] !== false;

          return (
            <View key={group.id} style={ms.groupCard}>
              <TouchableOpacity style={ms.groupHeader} onPress={() => toggleGroup(group.id)} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                  <Text style={ms.groupTitle}>{group.label}</Text>
                  <Text style={ms.groupMeta}>{groupAssigned}/{group.roles.length} assigned</Text>
                </View>
                <View style={[ms.groupBadge, groupAssigned === group.roles.length ? ms.groupBadgeFull : ms.groupBadgePartial]}>
                  <Text style={[ms.groupBadgeText, groupAssigned === group.roles.length ? ms.groupBadgeTextFull : ms.groupBadgeTextPartial]}>
                    {groupAssigned === group.roles.length ? 'Complete' : `${group.roles.length - groupAssigned} left`}
                  </Text>
                </View>
                {isExpanded ? <ChevronUp size={18} color="#999" style={{ marginLeft: 8 }} /> : <ChevronDown size={18} color="#999" style={{ marginLeft: 8 }} />}
              </TouchableOpacity>

              {isExpanded && visibleRoles.map((role, idx) => {
                const assignedUserId = assignments[role.id];
                const assignedMember = assignedUserId ? memberById.get(assignedUserId) : null;
                const isAssigned = !!assignedUserId;
                const icon = ROLE_ICONS[role.id];
                const iconBg = ROLE_ICON_BG[role.id] ?? '#f3f4f6';

                // Look up the actual duty status from the live schedule
                const liveDuty = assignedUserId
                  ? (liveSchedule.duties ?? []).find((d) => {
                      if (d.role.toLowerCase() === 'attendee') return false;
                      const resolvedId = d.roleId ?? resolveDutyRoleId(d);
                      return resolvedId === role.id && d.userId === assignedUserId;
                    })
                  : null;

                const statusLabel = liveDuty
                  ? liveDuty.status === 'accepted' || liveDuty.status === 'accepted_dismissed'
                    ? 'Confirmed'
                    : liveDuty.status === 'declined' || liveDuty.status === 'declined_dismissed'
                    ? 'Declined'
                    : 'Awaiting Response'
                  : assignedUserId
                  ? 'Awaiting Response'
                  : null;

                const statusColor = liveDuty
                  ? liveDuty.status === 'accepted' || liveDuty.status === 'accepted_dismissed'
                    ? '#22C55E'
                    : liveDuty.status === 'declined' || liveDuty.status === 'declined_dismissed'
                    ? '#EF4444'
                    : '#F59E0B'
                  : '#F59E0B';

                return (
                  <View key={role.id} style={[ms.roleRow, idx > 0 && ms.roleRowBorder]}>
                    <View style={[ms.roleIconBox, { backgroundColor: iconBg }]}>
                      {icon ?? <Users size={18} color="#999" />}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={ms.roleLabel}>{role.label}</Text>
                      {assignedMember && statusLabel && (
                        <Text style={[ms.roleAssigneeSub, { color: statusColor }]}>{statusLabel}</Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={[ms.assignBtn, isAssigned && { borderColor: 'transparent', borderStyle: 'solid', backgroundColor: statusColor === '#22C55E' ? '#F0FDF4' : statusColor === '#EF4444' ? '#FEF2F2' : '#FFFBEB' }]}
                      onPress={() => openPicker(role.id)}
                      activeOpacity={0.7}
                    >
                      {assignedMember ? (
                        <View style={ms.assignedMemberRow}>
                          {assignedMember.avatar ? (
                            <Image source={{ uri: assignedMember.avatar }} style={ms.assignedAvatar} />
                          ) : (
                            <View style={[ms.assignedAvatar, { backgroundColor: '#E8F0FF', alignItems: 'center', justifyContent: 'center' }]}>
                              <Users size={12} color="#4D8BFF" />
                            </View>
                          )}
                          <Text style={[ms.assignedName, { color: statusColor }]} numberOfLines={1}>{assignedMember.name ?? 'Member'}</Text>
                        </View>
                      ) : (
                        <View style={ms.unassignedRow}>
                          <Text style={ms.unassignedPlus}>+</Text>
                          <Text style={ms.unassignedText}>Assign Member</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <View style={[ms.statusDot, isAssigned ? { backgroundColor: statusColor } : ms.statusDotEmpty]} />
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      {/* ── Sticky Save Button ── */}
      <View style={[ms.saveBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={[ms.saveButton, saving && ms.saveButtonDisabled]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving ? (
            <Text style={ms.saveButtonText}>Saving…</Text>
          ) : (
            <>
              <Check size={18} color="#fff" strokeWidth={3} />
              <Text style={ms.saveButtonText}>Save Assignments</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Member Picker Sheet ── */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPicker(false)}>
        {selectingRole && (
          <MemberPickerSheet
            roleLabel={selectingRole.label}
            currentUserId={selectingRoleId ? (assignments[selectingRoleId] ?? null) : null}
            onSelect={handleSelect}
            onClose={() => { setShowPicker(false); setSelectingRoleId(null); }}
          />
        )}
      </Modal>
    </Modal>
  );
}

const ms = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a1a' },
  templateBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EBF3FF', alignItems: 'center', justifyContent: 'center' },

  // Event card
  eventCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, backgroundColor: '#fff', margin: 16, marginBottom: 0, padding: 16, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  eventIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#F3EEFF', alignItems: 'center', justifyContent: 'center' },
  eventName: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  eventMetaText: { fontSize: 13, color: '#666', fontWeight: '500' },

  // Progress
  progressCard: { backgroundColor: '#fff', margin: 16, marginBottom: 0, padding: 16, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  progressTrack: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#22C55E', borderRadius: 3 },
  templatePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EBF3FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  templatePillText: { fontSize: 12, fontWeight: '700', color: '#4D8BFF' },

  // Filter tabs
  filterRow: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 14, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
  filterTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  filterTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  filterTabText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  filterTabTextActive: { color: '#1a1a1a' },

  // Group card
  groupCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  groupTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
  groupMeta: { fontSize: 12, color: '#888', fontWeight: '500', marginTop: 1 },
  groupBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  groupBadgeFull: { backgroundColor: '#DCFCE7' },
  groupBadgePartial: { backgroundColor: '#FEF3C7' },
  groupBadgeText: { fontSize: 12, fontWeight: '700' },
  groupBadgeTextFull: { color: '#16A34A' },
  groupBadgeTextPartial: { color: '#D97706' },

  // Role row
  roleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  roleRowBorder: { borderTopWidth: 1, borderTopColor: '#f5f5f5' },
  roleIconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  roleLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  roleAssigneeSub: { fontSize: 11, color: '#22C55E', fontWeight: '600', marginTop: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  statusDotAssigned: { backgroundColor: '#22C55E' },
  statusDotEmpty: { backgroundColor: '#F59E0B', borderWidth: 1.5, borderColor: '#F59E0B' },

  // Assign button
  assignBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#F59E0B', borderStyle: 'dashed', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, minWidth: 110 },
  assignBtnFilled: { borderColor: 'transparent', backgroundColor: '#F0FDF4', borderStyle: 'solid' },
  assignedMemberRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assignedAvatar: { width: 22, height: 22, borderRadius: 11 },
  assignedName: { fontSize: 12, fontWeight: '700', color: '#16A34A', maxWidth: 80 },
  unassignedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  unassignedPlus: { fontSize: 16, color: '#F59E0B', fontWeight: '700', lineHeight: 18 },
  unassignedText: { fontSize: 12, fontWeight: '600', color: '#D97706' },

  // Save bar
  saveBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 8 },
  saveButton: { backgroundColor: '#FF6596', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15, borderRadius: 16 },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
