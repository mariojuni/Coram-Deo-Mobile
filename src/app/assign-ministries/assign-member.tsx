import { Check, Search, Users, X, ArrowLeft } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { BounceCard } from '@/components/ui/BounceCard';
import { useMemberStore } from '@/store/useMemberStore';
import { useMinistryStore } from '@/store/useMinistryStore';
import { useScheduleStore } from '@/store/useScheduleStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatMemberName, createMemberIdMap } from '@/features/member/domain/member.utils';
import { ministryRepository } from '@/features/ministry/data/ministry.repository';
import { getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';

function getAssignmentKey(ministryId: string, roleName: string) {
  return `${ministryId}::${roleName}`;
}

export default function AssignMemberScreen() {
  const router = useRouter();
  const { scheduleId, ministryId, roleName } = useLocalSearchParams<{ scheduleId: string; ministryId: string; roleName: string }>();

  const allMembers = useMemberStore((s) => s.members);
  const memberById = useMemo(() => createMemberIdMap(allMembers), [allMembers]);
  const ministries = useMinistryStore(s => s.ministries);
  const assignmentsList = useMinistryStore(s => s.assignments);
  const schedules = useScheduleStore(s => s.schedules);
  const userProfile = useAuthStore(s => s.userProfile);

  const ministry = useMemo(() => ministries.find(m => m.id === ministryId), [ministries, ministryId]);
  const liveSchedule = useMemo(() => schedules.find(s => s.id === scheduleId), [schedules, scheduleId]);
  
  const currentUserId = useMemo(() => {
    if (!scheduleId || !ministryId || !roleName) return null;
    const assignment = assignmentsList.find(a => a.eventId === scheduleId && a.ministryId === ministryId && a.roleName === roleName);
    return assignment ? assignment.memberId : null;
  }, [assignmentsList, scheduleId, ministryId, roleName]);

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
            avatar: globalMember?.photoUrl || globalMember?.avatar || (m as any).photoUrl || (m as any).avatar
          };
        })
      : []; // Only list members if they are in the ministry roster

    const uniqueSourceMembers = Array.from(new Map(sourceMembers.map(m => [m.id, m])).values())
      .filter(m => m.name && m.name !== 'Unnamed Member'); // Filter out unnamed members

    if (!q) return uniqueSourceMembers;
    return uniqueSourceMembers.filter((m) => (m.name ?? '').toLowerCase().includes(q) || (m.role ?? '').toLowerCase().includes(q));
  }, [ministry, query, allMembers]);

  const handleSelect = async (userId: string | null) => {
    if (!ministryId || !roleName || !scheduleId || !liveSchedule) return;

    try {
      const existing = assignmentsList.find(a => a.eventId === scheduleId && a.ministryId === ministryId && a.roleName === roleName);
      const churchId = userProfile?.churchId as string | undefined;
      if (!churchId) {
        Alert.alert('Error', 'Missing church context. Cannot update assignment.');
        return;
      }

      // Optimistic navigation back
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace({ pathname: '/assign-ministries', params: { scheduleId } });
      }

      if (userId === null) {
        if (existing) await ministryRepository.deleteAssignment(existing.id);
      } else {
        const member = memberById.get(userId);
        if (existing) {
          if (existing.memberId !== userId) {
            await ministryRepository.updateAssignment(existing.id, {
              memberId: userId,
              memberName: formatMemberName(member),
              status: 'Pending',
              eventStatus: liveSchedule.status,
            });
          }
        } else {
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
            eventStatus: liveSchedule.status,
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
    <View style={[ms.modalContainer, { flex: 1 }]}>
      <View style={[ms.headerContainer, { paddingTop: 12 }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
        <View style={ms.dragHandle} />
        <View style={ms.headerContent}>
          <BounceCard bounceScale={0.85} style={ms.headerCircle} onPress={() => router.back()} hitSlop={8} activeOpacity={0.8}>
            <ArrowLeft size={24} color="#111827" strokeWidth={2} />
          </BounceCard>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={ms.headerTitle}>Assign Member</Text>
            <Text style={ps.sheetSubtitle}>{roleName}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <View style={{ paddingTop: 90, flex: 1 }}>
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
          <TouchableOpacity style={ps.clearRow} onPress={() => handleSelect(null)}>
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
              {query.length > 0 ? 'No matching members found.' : 'No members in this ministry roster.'}
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
                  onPress={() => handleSelect(item.id)}
                  activeOpacity={0.7}
                >
                  {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={ps.avatar} transition={200} cachePolicy="memory-disk" contentFit="cover" />
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
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginHorizontal: 12,
  },
});

const ps = StyleSheet.create({
  sheetSubtitle: { fontSize: 13, color: '#888', marginTop: 2, textAlign: 'center' },
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
