/**
 * AssignMinistriesModal
 * Full-screen modal for assigning ministry roles to an event schedule.
 * Migrated to use dynamic Firebase ministries and ministryAssignments.
 */
import {
  BookOpen, Check, ChevronDown, ChevronUp, Clock, Copy, Drum, GraduationCap,
  Guitar, HandCoins, MapPin, Mic, Monitor, Piano, Search, Users, X, Shield, Music, Heart, Star, Settings
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrayingHands } from '../ui/icons/PrayingHands';
import { ModernDropdown } from '../ui/ModernDropdown';
import { ministryRepository } from '../../features/ministry/data/ministry.repository';
import type { Schedule } from '../../features/schedule/domain/schedule.types';
import { useAuthStore } from '../../store/useAuthStore';
import { useMemberStore } from '../../store/useMemberStore';
import { useMinistryStore } from '../../store/useMinistryStore';
import { useScheduleStore } from '../../store/useScheduleStore';

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

// ─── Main Modal ───────────────────────────────────────────────────────────────
interface AssignMinistriesModalProps {
  schedule: Schedule;
  onClose: () => void;
}

export default function AssignMinistriesModal({ schedule, onClose }: AssignMinistriesModalProps) {
  const insets = useSafeAreaInsets();
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

  const [assignments, setAssignments] = useState<AssignmentsMap>({});
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const initialAssignments = useMemo(() => {
    const initialMap: AssignmentsMap = {};

    ministries.forEach(ministry => {
      ministry.members?.forEach(m => {
        if (m.role) {
          const key = getAssignmentKey(ministry.id, m.role);
          initialMap[key] = m.memberId;
        }
      });
    });

    eventAssignments.forEach(a => {
      initialMap[getAssignmentKey(a.ministryId, a.roleName)] = a.memberId;
    });

    return initialMap;
  }, [eventAssignments, ministries]);

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

  const handleSelect = async (ministryId: string, roleName: string, userId: string | null) => {
    if (!isStaff) {
      Alert.alert('Permission Denied', 'Only staff members can assign ministry roles.');
      return;
    }
    
    const key = getAssignmentKey(ministryId, roleName);

    // Optimistic UI update
    setAssignments((prev) => {
      const next = { ...prev };
      if (userId === null) delete next[key];
      else next[key] = userId;
      return next;
    });

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
              memberName: member?.name || 'Unknown',
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
            memberName: member?.name || 'Unknown',
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

  // Use previous week's assignments as template (This requires fetching previous assignments, but for now we skip this or show a note)
  const handleUseTemplate = useCallback(() => {
    Alert.alert('Template Copy', 'Copying from templates is temporarily disabled while migrating to the new ministries API.');
  }, []);


  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[ms.headerContainer, { paddingTop: Math.max(insets.top, 24) }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
        <View style={ms.headerContent}>
          <TouchableOpacity style={ms.headerCircle} onPress={onClose}>
            <X size={24} color="#1a1a1a" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={ms.headerTitle} numberOfLines={1}>Assign Ministries</Text>
          <TouchableOpacity onPress={handleUseTemplate} style={ms.headerCircle}>
            <Copy size={20} color="#1a1a1a" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: '#FAFAFA' }} contentContainerStyle={{ paddingBottom: 120, paddingTop: Math.max(insets.top, 24) + 70 }}>
        <View style={ms.eventCard}>
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

        <View style={ms.progressCard}>
          <View style={ms.progressRow}>
            <Text style={ms.progressLabel}>{assignedCount} of {totalRoles} roles assigned</Text>
            <TouchableOpacity onPress={handleUseTemplate} style={ms.templatePill}>
              <Copy size={13} color="#4D8BFF" />
              <Text style={ms.templatePillText}>Use Template</Text>
            </TouchableOpacity>
          </View>
          <View style={ms.progressTrack}>
            <View style={[ms.progressFill, { width: totalRoles ? `${Math.round((assignedCount / totalRoles) * 100)}%` : '0%' }]} />
          </View>
        </View>

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

          const minMemberIds = new Set(ministry.members?.map(m => m.memberId) || []);
          const topOptions = (ministry.members || []).map(m => {
             const g = memberById.get(m.memberId);
             return {
               value: m.memberId,
               label: m.memberName ?? g?.name ?? 'Unnamed',
               icon: (m.avatar || g?.avatar) ? <Image source={{uri: m.avatar || g?.avatar}} style={{width: 24, height: 24, borderRadius: 12}} /> : <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }}><Users size={12} color="#999"/></View>
             };
          });
          const restOptions = members.filter(m => !minMemberIds.has(m.id)).map(m => ({
             value: m.id,
             label: m.name ?? 'Unnamed Member',
             icon: m.avatar ? <Image source={{uri: m.avatar}} style={{width: 24, height: 24, borderRadius: 12}} /> : <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }}><Users size={12} color="#999"/></View>
          }));
          const dropdownOptions = [...topOptions, ...restOptions];

          return (
            <View key={ministry.id} style={ms.groupCard}>
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

                    <ModernDropdown
                      options={dropdownOptions}
                      value={assignedUserId ?? undefined}
                      onSelect={(val) => handleSelect(ministry.id, roleName, val)}
                      searchable
                      clearable
                      label={`Assign ${roleName}`}
                      renderTrigger={(_selectedOption, handleOpen) => (
                        <TouchableOpacity
                          style={[ms.assignBtn, isAssigned && { borderColor: 'transparent', borderStyle: 'solid', backgroundColor: statusColor === '#22C55E' ? '#F0FDF4' : statusColor === '#EF4444' ? '#FEF2F2' : '#FFFBEB' }]}
                          onPress={() => {
                            if (!isStaff) {
                              Alert.alert('Permission Denied', 'Only staff members can assign ministry roles.');
                              return;
                            }
                            handleOpen();
                          }}
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
                              <Text style={ms.unassignedText}>Assign</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      )}
                    />
                    <View style={[ms.statusDot, isAssigned ? { backgroundColor: statusColor } : ms.statusDotEmpty]} />
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </Modal>
  );
}

const ms = StyleSheet.create({
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginHorizontal: 12,
  },
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
  templatePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EBF3FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  templatePillText: { fontSize: 12, fontWeight: '700', color: '#4D8BFF' },
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
