/**
 * AssignMinistriesModal
 * Full-screen modal for assigning ministry roles to an event schedule.
 * Migrated to use dynamic Firebase ministries and ministryAssignments.
 */
import {
  BookOpen, Check, ChevronDown, ChevronUp, Clock, Drum, GraduationCap,
  Guitar, HandCoins, MapPin, Mic, Monitor, Piano, Search, Users, X, Shield, Music, Heart, Star, Settings
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal } from 'react-native';
import { PrayingHands } from '../ui/icons/PrayingHands';
import { ministryRepository } from '../../features/ministry/data/ministry.repository';
import type { Schedule } from '../../features/schedule/domain/schedule.types';
import { useAuthStore } from '../../store/useAuthStore';
import { useMemberStore } from '../../store/useMemberStore';
import { useMinistryStore } from '../../store/useMinistryStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { SoftCard, getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import AppModal from '@/components/ui/AppModal';
import { BlurView } from 'expo-blur';
import { BounceCard } from '@/components/ui/BounceCard';
import { formatMemberName } from '../../features/member/domain/member.utils';
import { useModalKeyboard } from '@/hooks/useModalKeyboard';

// ─── Types ───────────────────────────────────────────────────────────────────
type FilterTab = 'all' | 'unassigned' | 'assigned';

// Key format: `${ministryId}::${roleName}` -> userId
type AssignmentsMap = Record<string, string>;

// ─── Role Icon Map (Fallback Logic) ──────────────────────────────────────────
const ROLE_ICONS: Record<string, React.ReactNode> = {
  openingprayer: <PrayingHands size={18} color="#818CF8" />,
  tithesofferingprayer: <HandCoins size={18} color="#4D8BFF" />,
  techaudio: <Monitor size={18} color="#6B7280" />,
  tech: <Monitor size={18} color="#6B7280" />,
  audio: <Monitor size={18} color="#6B7280" />,
  presider: <Users size={18} color="#FF6596" />,
  scripturereading: <BookOpen size={18} color="#F59E0B" />,
  preacher: <Mic size={18} color="#FF6596" />,
  vocalist: <Mic size={18} color="#8B6FE8" />,
  bassguitar: <Guitar size={18} color="#4D8BFF" />,
  drummer: <Drum size={18} color="#EF4444" />,
  piano: <Piano size={18} color="#10B981" />,
  electricguitar: <Guitar size={18} color="#F59E0B" />,
  kids: <GraduationCap size={18} color="#F59E0B" />,
  youth: <GraduationCap size={18} color="#4D8BFF" />,
  adults: <GraduationCap size={18} color="#10B981" />,
};

const ROLE_ICON_BG: Record<string, string> = {
  openingprayer: '#E0E7FF',
  tithesofferingprayer: '#E8F0FF',
  techaudio: '#F3F4F6',
  tech: '#F3F4F6',
  audio: '#F3F4F6',
  presider: '#FFE8F0',
  scripturereading: '#FEF3C7',
  preacher: '#FFE8F0',
  vocalist: '#F3EEFF',
  bassguitar: '#E8F0FF',
  drummer: '#FEE2E2',
  piano: '#D1FAE5',
  electricguitar: '#FEF3C7',
  kids: '#FEF3C7',
  youth: '#E8F0FF',
  adults: '#D1FAE5',
};

const ICON_COMPONENTS: Record<string, any> = {
  Users, Shield, Mic, Monitor, BookOpen, Guitar, Drum, Piano, GraduationCap, Music, Heart, Star, Settings
};

const ICON_COLORS: Record<string, string> = {
  '#E0E7FF': '#818CF8', // Indigo
  '#E8F0FF': '#4D8BFF', // Blue
  '#F3F4F6': '#6B7280', // Gray
  '#FFE8F0': '#FF6596', // Pink
  '#FEF3C7': '#F59E0B', // Amber
  '#FEE2E2': '#EF4444', // Red
  '#D1FAE5': '#10B981', // Emerald
  '#F3EEFF': '#8B6FE8', // Purple
};

function normalizeRole(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAssignmentKey(ministryId: string, roleName: string) {
  return `${ministryId}::${roleName}`;
}

// ─── MemberPickerSheet ────────────────────────────────────────────────────────
interface MemberPickerSheetProps {
  roleLabel: string;
  ministry?: import('../../features/ministry/domain/ministry.types').Ministry;
  currentUserId: string | null;
  onSelect: (userId: string | null) => void;
  onClose: () => void;
  isKeyboardOpen?: boolean;
  keyboardTopInSheet?: number;
}

function MemberPickerSheet({ roleLabel, ministry, currentUserId, onSelect, onClose, isKeyboardOpen, keyboardTopInSheet }: MemberPickerSheetProps) {
  const allMembers = useMemberStore((s) => s.members);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const ministryTeam = (ministry?.members && ministry.members.length > 0) ? ministry.members : null;
    const sourceMembers = ministryTeam
      ? ministryTeam.map(m => {
          const globalMember = allMembers.find(g => g.id === m.memberId);
          return {
            id: m.memberId,
            name: formatMemberName(globalMember || m),
            role: m.role || 'Member',
            avatar: globalMember?.avatar || m.avatar
          };
        })
      : allMembers.map(g => ({
          id: g.id,
          name: formatMemberName(g),
          role: g.role || 'Member',
          avatar: g.avatar
        }));

    if (!q) return sourceMembers;
    return sourceMembers.filter((m) => (m.name ?? '').toLowerCase().includes(q) || (m.role ?? '').toLowerCase().includes(q));
  }, [ministry, query, allMembers]);

  return (
    <View style={[ms.modalContainer, { flex: 1, backgroundColor: '#FAFAFA' }]}>
      <View style={[ms.headerContainer, { paddingTop: 12 }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
        <View style={ms.dragHandle} />
        <View style={ms.headerContent}>
          <View style={{ width: 40 }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={ms.headerTitle}>Assign Member</Text>
            <Text style={ps.sheetSubtitle}>{roleLabel}</Text>
          </View>
          <BounceCard bounceScale={0.85} style={ms.headerCircle} onPress={onClose} hitSlop={8} activeOpacity={0.8}>
            <X size={24} color="#111827" strokeWidth={2} />
          </BounceCard>
        </View>
      </View>

      <View style={[{ paddingTop: 70, flex: 1 }, isKeyboardOpen && { maxHeight: keyboardTopInSheet }]}>
        <View style={ps.searchRow}>
          <Search size={16} color="#aaa" />
          <TextInput
            style={ps.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or role…"
            placeholderTextColor="#aaa"
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

        {filtered.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', fontWeight: '500' }}>
              No matching members found.
            </Text>
          </View>
        ) : (
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
                    <Image source={{ uri: item.avatar }} style={ps.avatar} />
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
      )}
      </View>
    </View>
  );
}

const ps = StyleSheet.create({
  sheet: { backgroundColor: '#fff' },
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
  const members = useMemberStore((s) => s.members);
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const _currentUser = useAuthStore((s) => s.currentUser);
  const userProfile = useAuthStore((s) => s.userProfile);
  const schedules = useScheduleStore((s) => s.schedules);

  const ministries = useMinistryStore(s => s.ministries);
  const fetchMinistries = useMinistryStore(s => s.fetchMinistries);
  const assignmentsList = useMinistryStore(s => s.assignments);
  const eventAssignments = useMemo(
    () => assignmentsList.filter(a => a.eventId === schedule.id),
    [assignmentsList, schedule.id]
  );

  useEffect(() => {
    const fetch = async () => {
      const churchId = userProfile?.churchId as string | undefined;
      if (!churchId) return;
      try { fetchMinistries(churchId); } catch {}
    };
    if (ministries.length === 0) fetch();
  }, [ministries.length, userProfile?.churchId, fetchMinistries]);

  const isStaff = ['super_admin', 'church_admin', 'ministry_leader'].includes((userProfile?.role ?? '').toLowerCase());

  const modalKeyboard = useModalKeyboard({ heightRatio: 0.85, backgroundColor: '#FAFAFA' });

  const [assignments, setAssignments] = useState<AssignmentsMap>({});
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectingRoleKey, setSelectingRoleKey] = useState<{ ministryId: string, roleName: string } | null>(null);

  const initialAssignments = useMemo(() => {
    const initialMap: AssignmentsMap = {};

    eventAssignments.forEach(a => {
      initialMap[getAssignmentKey(a.ministryId, a.roleName)] = a.memberId;
    });

    return initialMap;
  }, [eventAssignments]);

  // Initialize assignments map from store data and default ministry roles
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setAssignments(initialAssignments);
    });
    return () => cancelAnimationFrame(frame);
  }, [initialAssignments]);

  const totalRoles = useMemo(() => ministries.reduce((acc, min) => acc + (min.roles?.length || 0), 0), [ministries]);
  const assignedCount = useMemo(() => Object.keys(assignments).length, [assignments]);

  const liveSchedule = useMemo(
    () => schedules.find((s) => s.id === schedule.id) ?? schedule,
    [schedule, schedules]
  );

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  const openPicker = useCallback((ministryId: string, roleName: string) => {
    if (!isStaff) {
      Alert.alert('Permission Denied', 'Only staff members can assign ministry roles.');
      return;
    }
    setSelectingRoleKey({ ministryId, roleName });
  }, [isStaff]);

  const handleSelect = async (userId: string | null) => {
    if (!selectingRoleKey) return;
    const { ministryId, roleName } = selectingRoleKey;
    const key = getAssignmentKey(ministryId, roleName);

    // Optimistic UI update
    setAssignments((prev) => {
      const next = { ...prev };
      if (userId === null) delete next[key];
      else next[key] = userId;
      return next;
    });

    setSelectingRoleKey(null);

    // API Update
    try {
      const existing = eventAssignments.find(a => getAssignmentKey(a.ministryId, a.roleName) === key);
      const churchId = (userProfile?.churchId as string) || 'YmEc6C69Xz4DKRQaQZBV';

      if (userId === null) {
        if (existing) await ministryRepository.deleteAssignment(existing.id);
      } else {
        const member = memberById.get(userId);
        if (existing) {
          if (existing.memberId !== userId) {
            await ministryRepository.updateAssignment(existing.id, {
              memberId: userId,
              memberName: formatMemberName(member),
              status: 'Pending'
            });
          }
        } else {
          const ministry = ministries.find(m => m.id === ministryId);
          await ministryRepository.createAssignment({
            churchId,
            eventId: liveSchedule.id,
            eventName: liveSchedule.title,
            eventDate: liveSchedule.date,
            ministryId,
            ministryName: ministry?.name || 'Unknown Ministry',
            roleName,
            memberId: userId,
            memberName: formatMemberName(member),
            status: 'Pending',
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (e) {
      console.error('Failed to update assignment', e);
      Alert.alert('Update Failed', 'Could not update the assignment. Please try again.');
    }
  };

  return (
    <AppModal
      isOpen={true}
      onClose={() => {
        if (selectingRoleKey) {
          setSelectingRoleKey(null);
        } else {
          onClose();
        }
      }}
      title={selectingRoleKey ? "Assign Member" : "Assign Ministries"}
      hideHeader={true}
      hideDragHandle={true}
      {...modalKeyboard.appModalProps}
    >
      {selectingRoleKey ? (
        <MemberPickerSheet
          roleLabel={selectingRoleKey.roleName}
          ministry={ministries.find(m => m.id === selectingRoleKey.ministryId)}
          currentUserId={selectingRoleKey ? (assignments[getAssignmentKey(selectingRoleKey.ministryId, selectingRoleKey.roleName)] ?? null) : null}
          onSelect={handleSelect}
          isKeyboardOpen={modalKeyboard.isKeyboardOpen}
          keyboardTopInSheet={modalKeyboard.keyboardTopInSheet}
          onClose={() => setSelectingRoleKey(null)}
        />
      ) : (
        <View style={[ms.modalContainer, modalKeyboard.isKeyboardOpen && { flex: 1 }]}>
          <View style={[ms.headerContainer, { paddingTop: 12 }]} pointerEvents="box-none">
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
            <View style={ms.dragHandle} />
            <View style={ms.headerContent}>
              <View style={{ width: 40 }} />
              <Text style={ms.headerTitle}>Assign Ministries</Text>
              <BounceCard bounceScale={0.85} style={ms.headerCircle} onPress={onClose} hitSlop={8} activeOpacity={0.8}>
                <X size={24} color="#111827" strokeWidth={2} />
              </BounceCard>
            </View>
          </View>

          <ScrollView
            ref={modalKeyboard.scrollViewRef}
            style={modalKeyboard.scrollViewStyle}
            contentContainerStyle={{ paddingBottom: 120, paddingTop: 70 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
        <SoftCard style={{ margin: 20, marginBottom: 16, borderRadius: 16 }} innerStyle={{ borderRadius: 15 }}>
          <View style={[ms.eventCard, { margin: 0 }]}>
            <View style={ms.eventIconBox}>
              <Users size={28} color="#8B6FE8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ms.eventName} numberOfLines={1}>{liveSchedule.title}</Text>
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
        </SoftCard>

        <SoftCard style={{ marginHorizontal: 20, marginBottom: 24, borderRadius: 16 }} innerStyle={{ borderRadius: 15 }}>
          <View style={[ms.progressCard, { marginHorizontal: 0, marginBottom: 0 }]}>
            <View style={ms.progressRow}>
              <Text style={ms.progressLabel}>{assignedCount} of {totalRoles} roles assigned</Text>
            </View>
            <View style={ms.progressTrack}>
              <View style={[ms.progressFill, { width: totalRoles ? `${Math.round((assignedCount / totalRoles) * 100)}%` : '0%' }]} />
            </View>
          </View>
        </SoftCard>

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

        {ministries.map((ministry) => {
          const visibleRoles = (ministry.roles || []).filter((roleName) => {
            const key = getAssignmentKey(ministry.id, roleName);
            if (filterTab === 'assigned') return !!assignments[key];
            if (filterTab === 'unassigned') return !assignments[key];
            return true;
          });

          if (visibleRoles.length === 0) return null;

          const groupAssigned = (ministry.roles || []).filter((r) => !!assignments[getAssignmentKey(ministry.id, r)]).length;
          const isExpanded = expandedGroups[ministry.id] !== false;

          return (
            <SoftCard key={ministry.id} style={{ marginHorizontal: 20, marginBottom: 16, borderRadius: 16 }} innerStyle={{ borderRadius: 15 }}>
              <View style={[ms.groupCard, { marginHorizontal: 0, marginBottom: 0 }]}>
                <TouchableOpacity style={ms.groupHeader} onPress={() => toggleGroup(ministry.id)} activeOpacity={0.7}>
                  <View style={{ flex: 1 }}>
                    <Text style={ms.groupTitle}>{ministry.name}</Text>
                    <Text style={ms.groupMeta}>{groupAssigned}/{(ministry.roles || []).length} assigned</Text>
                  </View>
                  <View style={[ms.groupBadge, groupAssigned === (ministry.roles || []).length ? ms.groupBadgeFull : ms.groupBadgePartial]}>
                    <Text style={[ms.groupBadgeText, groupAssigned === (ministry.roles || []).length ? ms.groupBadgeTextFull : ms.groupBadgeTextPartial]}>
                      {groupAssigned === (ministry.roles || []).length ? 'Complete' : `${(ministry.roles || []).length - groupAssigned} left`}
                    </Text>
                  </View>
                  {isExpanded ? <ChevronUp size={18} color="#999" style={{ marginLeft: 8 }} /> : <ChevronDown size={18} color="#999" style={{ marginLeft: 8 }} />}
                </TouchableOpacity>

              {isExpanded && visibleRoles.map((roleName, idx) => {
                const assignKey = getAssignmentKey(ministry.id, roleName);
                const assignedUserId = assignments[assignKey];
                const assignedMember = assignedUserId ? memberById.get(assignedUserId) : null;
                const isAssigned = !!assignedUserId;

                const normRole = normalizeRole(roleName);
                
                const customDetails = ministry.roleDetails?.[roleName];
                const iconBg = customDetails?.color || ROLE_ICON_BG[normRole] || '#f3f4f6';
                const iconName = customDetails?.icon;
                const iconColor = ICON_COLORS[iconBg] || '#6B7280';
                
                let iconNode: React.ReactNode = null;
                if (iconName && ICON_COMPONENTS[iconName]) {
                  const Comp = ICON_COMPONENTS[iconName];
                  iconNode = <Comp size={18} color={iconColor} />;
                } else {
                  iconNode = ROLE_ICONS[normRole] ?? <Users size={18} color="#999" />;
                }

                const liveDuty = eventAssignments.find(a => getAssignmentKey(a.ministryId, a.roleName) === assignKey);

                // If we have an assignedUserId but no liveDuty, we check if it's the exact same as the default.
                // Actually, to make it simple: if there is no liveDuty, we show nothing (or "Saving...") until Firebase syncs.
                // But the user expects 'Awaiting Response' as soon as they tap.
                const statusLabel = liveDuty
                  ? liveDuty.status === 'Confirmed'
                    ? 'Confirmed'
                    : liveDuty.status === 'Declined'
                      ? 'Declined'
                      : 'Awaiting Response'
                  : assignedUserId
                    ? null // Show nothing for defaults until they are saved
                    : null;

                const statusColor = liveDuty
                  ? liveDuty.status === 'Confirmed'
                    ? '#22C55E'
                    : liveDuty.status === 'Declined'
                      ? '#EF4444'
                      : '#F59E0B'
                  : '#666'; // Gray for unsaved defaults

                return (
                  <View key={roleName} style={[ms.roleRow, idx > 0 && ms.roleRowBorder]}>
                    <View style={[ms.roleIconBox, { backgroundColor: iconBg }]}>
                      {iconNode}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={ms.roleLabel}>{roleName}</Text>
                      {assignedMember && statusLabel && (
                        <Text style={[ms.roleAssigneeSub, { color: statusColor }]}>{statusLabel}</Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={[ms.assignBtn, isAssigned && { borderColor: 'transparent', borderStyle: 'solid', backgroundColor: statusColor === '#22C55E' ? '#F0FDF4' : statusColor === '#EF4444' ? '#FEF2F2' : '#FFFBEB' }]}
                      onPress={() => openPicker(ministry.id, roleName)}
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
                          <Text style={[ms.assignedName, { color: statusColor }]} numberOfLines={1}>{assignedMember ? formatMemberName(assignedMember) : 'Member'}</Text>
                        </View>
                      ) : (
                        <View style={ms.unassignedRow}>
                          <Text style={ms.unassignedPlus}>+</Text>
                          <Text style={ms.unassignedText}>Assign</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <View style={[ms.statusDot, isAssigned ? { backgroundColor: statusColor } : ms.statusDotEmpty]} />
                  </View>
                );
              })}
              </View>
            </SoftCard>
          );
        })}
      </ScrollView>
      </View>
      )}
    </AppModal>
  );
}

const ms = StyleSheet.create({
  modalContainer: { backgroundColor: '#FAFAFA' },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#d1d5db',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerCircle: {
    ...getTopBarButtonShadowStyle(20),
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  templateBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EBF3FF', alignItems: 'center', justifyContent: 'center' },
  eventCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, backgroundColor: '#fff', margin: 16, marginBottom: 0, padding: 16, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  eventIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#F3EEFF', alignItems: 'center', justifyContent: 'center' },
  eventName: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  eventMetaText: { fontSize: 13, color: '#666', fontWeight: '500' },
  progressCard: { backgroundColor: '#fff', margin: 16, marginBottom: 0, padding: 16, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  progressTrack: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#22C55E', borderRadius: 3 },
  filterRow: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 14, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
  filterTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  filterTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  filterTabText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  filterTabTextActive: { color: '#1a1a1a' },
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
  roleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  roleRowBorder: { borderTopWidth: 1, borderTopColor: '#f5f5f5' },
  roleIconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  roleLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  roleAssigneeSub: { fontSize: 11, color: '#22C55E', fontWeight: '600', marginTop: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  statusDotAssigned: { backgroundColor: '#22C55E' },
  statusDotEmpty: { backgroundColor: '#F59E0B', borderWidth: 1.5, borderColor: '#F59E0B' },
  assignBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#F59E0B', borderStyle: 'dashed', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, minWidth: 110 },
  assignBtnFilled: { borderColor: 'transparent', backgroundColor: '#F0FDF4', borderStyle: 'solid' },
  assignedMemberRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assignedAvatar: { width: 22, height: 22, borderRadius: 11 },
  assignedName: { fontSize: 12, fontWeight: '700', color: '#16A34A', maxWidth: 80 },
  unassignedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  unassignedPlus: { fontSize: 16, color: '#F59E0B', fontWeight: '700', lineHeight: 18 },
  unassignedText: { fontSize: 12, fontWeight: '600', color: '#D97706' },
  saveBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 8 },
  saveButton: { backgroundColor: '#FF6596', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15, borderRadius: 16 },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
