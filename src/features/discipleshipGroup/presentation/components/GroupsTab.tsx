import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BookOpen, Calendar, ChevronRight, MapPin, Users, UserCheck } from 'lucide-react-native';
import { BounceCard } from '../../../../components/ui/BounceCard';
import { SoftCard } from '../../../../components/ui/SoftCard';
import { useAuthStore } from '../../../../store/useAuthStore';
import { useMemberStore } from '../../../../store/useMemberStore';
import { useDiscipleshipGroupStore } from '../../../../store/useDiscipleshipGroupStore';
import { canAccessGroupsTab, hasAnyRole } from '../../../../permissions/discipleshipGroupPermissions';
import type { DiscipleshipGroup } from '../../domain/discipleshipGroup.types';

interface SubScreenProps {
  searchQuery: string;
}

export function GroupsTab({ searchQuery }: SubScreenProps) {
  const router = useRouter();
  const userProfile = useAuthStore((state) => state.userProfile);
  const members = useMemberStore((state) => state.members);

  const {
    groups,
    groupsLoading,
    groupsError,
    initializeUserGroupsListener,
  } = useDiscipleshipGroupStore();

  useEffect(() => {
    const unsubscribe = initializeUserGroupsListener(userProfile);
    return () => unsubscribe();
  }, [userProfile, initializeUserGroupsListener]);

  const filteredGroups = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q) ||
        g.groupType.toLowerCase().includes(q)
    );
  }, [groups, searchQuery]);

  if (!canAccessGroupsTab(userProfile)) {
    return null;
  }

  const getLeaderNames = (group: DiscipleshipGroup): string => {
    if (!group.leaderMemberIds || group.leaderMemberIds.length === 0) {
      return 'No leader assigned';
    }
    const leaderNames = group.leaderMemberIds
      .map((mId) => {
        const m = members.find((mem) => mem.id === mId);
        return m ? `${m.firstName || ''} ${m.lastName || ''}`.trim() : null;
      })
      .filter(Boolean);
    return leaderNames.length > 0 ? leaderNames.join(', ') : 'Group Leader';
  };

  const formatGroupTypeLabel = (type: string) => {
    switch (type) {
      case 'discipleship':
        return 'Discipleship Group';
      case 'small_group':
        return 'Small Group';
      case 'bible_study':
        return 'Bible Study';
      case 'youth_group':
        return 'Youth Group';
      default:
        return 'Group';
    }
  };



  if (groupsLoading) {
    return (
      <View style={styles.placeholderWrap}>
        <ActivityIndicator size="large" color="#FF6596" />
        <Text style={styles.placeholderSubtitle}>Loading groups…</Text>
      </View>
    );
  }

  if (groupsError) {
    return (
      <View style={styles.placeholderWrap}>
        <Text style={styles.placeholderTitle}>Error</Text>
        <Text style={styles.placeholderSubtitle}>{groupsError}</Text>
      </View>
    );
  }

  if (filteredGroups.length === 0) {
    const isAdminOrPastor = hasAnyRole(userProfile, ['super_admin', 'church_admin', 'pastor']);
    return (
      <View style={styles.placeholderWrap}>
        <Users size={36} color="#9CA3AF" />
        <Text style={styles.placeholderTitle}>
          {isAdminOrPastor ? 'No groups found' : 'No groups assigned'}
        </Text>
        <Text style={styles.placeholderSubtitle}>
          {searchQuery
            ? 'No groups match your search criteria.'
            : isAdminOrPastor
            ? 'No discipleship or small groups have been created in your church yet.'
            : 'You are not assigned to a group yet.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {filteredGroups.map((group) => {
        const isLeader =
          (!!userProfile?.memberId && group.leaderMemberIds?.includes(userProfile.memberId)) ||
          (!!userProfile?.uid && group.leaderUserIds?.includes(userProfile.uid));

        return (
          <BounceCard
            key={group.id}
            activeOpacity={0.92}
            onPress={() => router.push(`/discipleship/group/${group.id}` as any)}
            style={{ marginBottom: 14 }}
          >
            <SoftCard innerStyle={styles.cardInner}>
              <LinearGradient
                colors={['#FF6596', '#B66DFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientHeader}
              />

              <View style={styles.cardContent}>
                {/* Header row */}
                <View style={styles.topRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>
                        {formatGroupTypeLabel(group.groupType)}
                      </Text>
                    </View>
                    <Text style={styles.groupName}>{group.name}</Text>
                  </View>
                  {isLeader && (
                    <View style={styles.leaderTag}>
                      <UserCheck size={12} color="#10B981" />
                      <Text style={styles.leaderTagText}>Leader</Text>
                    </View>
                  )}
                </View>

                {group.description ? (
                  <Text style={styles.description} numberOfLines={2}>
                    {group.description}
                  </Text>
                ) : null}

                {/* Meta details */}
                <View style={styles.metaStack}>
                  {group.planTitle ? (
                    <View style={styles.metaRow}>
                      <BookOpen size={13} color="#FF6596" />
                      <Text style={styles.metaText} numberOfLines={1}>
                        Plan: <Text style={styles.metaBold}>{group.planTitle}</Text> (Wk {group.currentWeekNumber || 1})
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.metaRow}>
                    <UserCheck size={13} color="#6B7280" />
                    <Text style={styles.metaText} numberOfLines={1}>
                      Leader: <Text style={styles.metaBold}>{getLeaderNames(group)}</Text>
                    </Text>
                  </View>

                  {(group.meetingDay || group.meetingTime) ? (
                    <View style={styles.metaRow}>
                      <Calendar size={13} color="#6B7280" />
                      <Text style={styles.metaText}>
                        {group.meetingDay || 'Every week'}{' '}
                        {group.meetingTime ? `at ${group.meetingTime}` : ''}
                      </Text>
                    </View>
                  ) : null}

                  {group.meetingLocation ? (
                    <View style={styles.metaRow}>
                      <MapPin size={13} color="#6B7280" />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {group.meetingLocation}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Footer / Open Button */}
                <View style={styles.actionRow}>
                  <View style={styles.membersPill}>
                    <Users size={12} color="#4B5563" />
                    <Text style={styles.membersCountText}>
                      {(group.memberIds?.length || 0) + (group.leaderMemberIds?.length || 0)} members
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.openBtn}
                    onPress={() => router.push(`/discipleship/group/${group.id}` as any)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.openBtnText}>Open Group</Text>
                    <ChevronRight size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </SoftCard>
          </BounceCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  overline: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6596',
    letterSpacing: 1.2,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  placeholderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  cardInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradientHeader: {
    height: 4,
    width: '100%',
  },
  cardContent: {
    padding: 16,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8B5CF6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  leaderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  leaderTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  description: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  metaStack: {
    gap: 6,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  metaBold: {
    fontWeight: '700',
    color: '#374151',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  membersPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  membersCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF6596',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  openBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
