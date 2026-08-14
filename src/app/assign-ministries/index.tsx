import {
  BookOpen, Check, ChevronDown, ChevronUp, Clock, Drum, GraduationCap,
  Guitar, HandCoins, MapPin, Mic, Monitor, Piano, Search, Users, X, Shield, Music, Heart, Star, Settings
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { PrayingHands } from '@/components/ui/icons/PrayingHands';
import { ministryRepository } from '@/features/ministry/data/ministry.repository';
import type { Schedule } from '@/features/schedule/domain/schedule.types';
import { useAuthStore } from '@/store/useAuthStore';
import { useMemberStore } from '@/store/useMemberStore';
import { useMinistryStore } from '@/store/useMinistryStore';
import { useScheduleStore } from '@/store/useScheduleStore';
import { SoftCard, getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import { BlurView } from 'expo-blur';
import { BounceCard } from '@/components/ui/BounceCard';
import { formatMemberName, createMemberIdMap } from '@/features/member/domain/member.utils';
import { useLocalSearchParams, useRouter } from 'expo-router';

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

function getAssignmentKey(ministryId: string, roleName: string) {
  return `${ministryId}::${roleName}`;
}

export default function AssignMinistriesScreen() {
  const router = useRouter();
  const { scheduleId } = useLocalSearchParams<{ scheduleId: string }>();

  const members = useMemberStore((s) => s.members);
  const memberById = useMemo(() => createMemberIdMap(members), [members]);
  const userProfile = useAuthStore((s) => s.userProfile);
  const schedules = useScheduleStore((s) => s.schedules);

  const ministries = useMinistryStore(s => s.ministries);
  const fetchMinistries = useMinistryStore(s => s.fetchMinistries);
  const assignmentsList = useMinistryStore(s => s.assignments);

  const liveSchedule = useMemo(
    () => schedules.find((s) => s.id === scheduleId),
    [scheduleId, schedules]
  );

  const eventAssignments = useMemo(
    () => assignmentsList.filter(a => a.eventId === scheduleId),
    [assignmentsList, scheduleId]
  );

  useEffect(() => {
    const fetch = async () => {
      const churchId = userProfile?.churchId as string | undefined;
      if (!churchId) return;
      try { fetchMinistries(churchId); } catch {}
    };
    if (ministries.length === 0) fetch();
  }, [ministries.length, userProfile?.churchId, fetchMinistries]);

  const [assignments, setAssignments] = useState<AssignmentsMap>({});
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const initialAssignments = useMemo(() => {
    const initialMap: AssignmentsMap = {};
    eventAssignments.forEach(a => {
      initialMap[getAssignmentKey(a.ministryId, a.roleName)] = a.memberId;
    });
    return initialMap;
  }, [eventAssignments]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setAssignments(initialAssignments);
    });
    return () => cancelAnimationFrame(frame);
  }, [initialAssignments]);

  const totalRoles = useMemo(() => ministries.reduce((acc, min) => acc + (min.roles?.length || 0), 0), [ministries]);
  const assignedCount = useMemo(() => Object.keys(assignments).length, [assignments]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  const openPicker = useCallback((ministryId: string, roleName: string) => {
    router.push({
      pathname: '/assign-ministries/assign-member',
      params: { scheduleId, ministryId, roleName }
    });
  }, [router, scheduleId]);

  if (!liveSchedule) {
    return (
      <View style={[ms.modalContainer, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
        <Text>Schedule not found.</Text>
      </View>
    );
  }

  return (
    <View style={[ms.modalContainer, { flex: 1 }]}>
      <View style={[ms.headerContainer, { paddingTop: 12 }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
        <View style={ms.dragHandle} />
        <View style={ms.headerContent}>
          <View style={{ width: 40 }} />
          <Text style={ms.headerTitle}>Assign Ministries</Text>
          <BounceCard bounceScale={0.85} style={ms.headerCircle} onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/attendance');
          }} hitSlop={8} activeOpacity={0.8}>
            <X size={24} color="#111827" strokeWidth={2} />
          </BounceCard>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: 70 }} showsVerticalScrollIndicator={false}>
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

                const statusLabel = liveDuty
                  ? liveDuty.status === 'Confirmed'
                    ? 'Confirmed'
                    : liveDuty.status === 'Declined'
                      ? 'Declined'
                      : 'Awaiting Response'
                  : assignedUserId
                    ? null
                    : null;

                const statusColor = liveDuty
                  ? liveDuty.status === 'Confirmed'
                    ? '#22C55E'
                    : liveDuty.status === 'Declined'
                      ? '#EF4444'
                      : '#F59E0B'
                  : '#666';

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
                          {assignedMember.photoUrl ? (
                            <Image source={{ uri: assignedMember.photoUrl }} style={ms.assignedAvatar} />
                          ) : (
                            <Image source={{ uri: `https://ui-avatars.com/api/?name=User&background=f0f0f0&color=999` }} style={ms.assignedAvatar} />
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
});
