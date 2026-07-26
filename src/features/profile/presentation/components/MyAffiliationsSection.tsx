import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Users, Calendar, MapPin, ChevronRight, BookOpen, Shield, ShieldCheck, Sparkles } from 'lucide-react-native';
import { SoftCard } from '@/components/ui/SoftCard';
import { BounceCard } from '@/components/ui/BounceCard';
import type { DiscipleshipGroup, DiscipleshipLesson } from '@/features/discipleshipGroup/domain/discipleshipGroup.types';
import type { UserMinistryMembership } from '../hooks/useProfileDashboardData';

interface MyAffiliationsSectionProps {
  groups: DiscipleshipGroup[];
  groupsLoading: boolean;
  currentLessons: Record<string, DiscipleshipLesson | null>;
  userMinistries: UserMinistryMembership[];
  ministriesLoading: boolean;
  roleChips: string[];
  memberId?: string | null;
  userId?: string | null;
}

export function MyAffiliationsSection({
  groups,
  groupsLoading,
  currentLessons,
  userMinistries,
  ministriesLoading,
  roleChips,
  memberId,
  userId,
}: MyAffiliationsSectionProps) {
  const router = useRouter();

  const staffRoles = roleChips.filter((r) =>
    ['Super Admin', 'Church Admin', 'Pastor', 'Secretary', 'Finance Admin'].includes(r)
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>My Affiliations</Text>

      {/* ─── A. Discipleship Group Card ─── */}
      <SoftCard style={{ marginBottom: 16 }}>
        <View style={styles.sideBarContainer}>
          <View style={[styles.sideAccentBar, { backgroundColor: '#10B981' }]} />
          <View style={styles.sideBarContent}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: '#D1FAE5' }]}>
                <Users size={18} color="#10B981" />
              </View>
              <Text style={styles.cardHeaderTitle}>Discipleship Group</Text>
            </View>

            {groupsLoading ? (
              <Text style={styles.emptyText}>Loading discipleship groups...</Text>
            ) : groups.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>You are not assigned to a discipleship group yet.</Text>
              </View>
            ) : (
              groups.map((group) => {
                const isLeader =
                  (memberId && group.leaderMemberIds?.includes(memberId)) ||
                  (userId && group.leaderUserIds?.includes(userId));
                const userRoleLabel = isLeader ? 'Leader' : 'Member';
                const currentLesson = currentLessons[group.id];

                return (
                  <View key={group.id} style={styles.groupCardInner}>
                    <View style={styles.groupHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.groupName}>{group.name}</Text>
                        {!!group.description && (
                          <Text style={styles.groupLeader} numberOfLines={1}>{group.description}</Text>
                        )}
                      </View>
                      <View style={[styles.roleBadge, isLeader && styles.leaderRoleBadge]}>
                        <Text style={[styles.roleBadgeText, isLeader && styles.leaderRoleBadgeText]}>
                          {userRoleLabel}
                        </Text>
                      </View>
                    </View>

                    {/* Meeting & Location */}
                    <View style={styles.metaRow}>
                      {!!group.meetingDay && (
                        <View style={styles.metaItem}>
                          <Calendar size={13} color="#6B7280" />
                          <Text style={styles.metaText}>
                            {group.meetingDay} {group.meetingTime ? `@ ${group.meetingTime}` : ''}
                          </Text>
                        </View>
                      )}
                      {!!group.meetingLocation && (
                        <View style={styles.metaItem}>
                          <MapPin size={13} color="#6B7280" />
                          <Text style={styles.metaText} numberOfLines={1}>{group.meetingLocation}</Text>
                        </View>
                      )}
                    </View>

                    {/* Current Week / Lesson */}
                    {!!currentLesson && (
                      <View style={styles.lessonBanner}>
                        <BookOpen size={14} color="#7C3AED" style={{ marginRight: 6 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.lessonLabel}>Current Lesson (Week {currentLesson.weekNumber})</Text>
                          <Text style={styles.lessonTitle} numberOfLines={1}>{currentLesson.title}</Text>
                        </View>
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                      <BounceCard
                        style={[styles.actionBtn, styles.actionPrimaryBtn]}
                        onPress={() => router.push(`/discipleship/group/${group.id}` as any)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionPrimaryText}>View Group</Text>
                      </BounceCard>

                      {currentLesson && (
                        <BounceCard
                          style={[styles.actionBtn, styles.actionSecondaryBtn]}
                          onPress={() =>
                            router.push(`/discipleship/group/${group.id}/lesson/${currentLesson.id}` as any)
                          }
                          activeOpacity={0.8}
                        >
                          <Text style={styles.actionSecondaryText}>Current Lesson</Text>
                        </BounceCard>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </SoftCard>

      {/* ─── B. Ministries Card ─── */}
      <SoftCard style={{ marginBottom: 16 }}>
        <View style={styles.sideBarContainer}>
          <View style={[styles.sideAccentBar, { backgroundColor: '#F59E0B' }]} />
          <View style={styles.sideBarContent}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                <ShieldCheck size={18} color="#F59E0B" />
              </View>
              <Text style={styles.cardHeaderTitle}>Ministry Memberships</Text>
            </View>

            {ministriesLoading ? (
              <Text style={styles.emptyText}>Loading ministry affiliations...</Text>
            ) : userMinistries.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>You are not assigned to any ministry yet.</Text>
              </View>
            ) : (
              <View style={styles.ministriesList}>
                {userMinistries.map((min, idx) => (
                  <View key={min.id || idx} style={styles.ministryRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ministryName}>{min.ministryName}</Text>
                      <Text style={styles.ministryRole}>{min.ministryRole}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => router.push(`/(tabs)/serve` as any)}
                      activeOpacity={0.7}
                      style={styles.ministryLink}
                    >
                      <Text style={styles.ministryLinkText}>Serve</Text>
                      <ChevronRight size={14} color="#3B82F6" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </SoftCard>

      {/* ─── C. Church Roles Card ─── */}
      {staffRoles.length > 0 && (
        <SoftCard style={{ marginBottom: 16 }}>
          <View style={styles.sideBarContainer}>
            <View style={[styles.sideAccentBar, { backgroundColor: '#3B82F6' }]} />
            <View style={styles.sideBarContent}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.iconBox, { backgroundColor: '#DBEAFE' }]}>
                  <Shield size={18} color="#3B82F6" />
                </View>
                <Text style={styles.cardHeaderTitle}>Church Roles & Privileges</Text>
              </View>

              <View style={styles.staffChipsContainer}>
                {staffRoles.map((role, i) => (
                  <View key={`${role}-${i}`} style={styles.staffChip}>
                    <Sparkles size={12} color="#1D4ED8" style={{ marginRight: 4 }} />
                    <Text style={styles.staffChipText}>{role}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </SoftCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sideBarContainer: {
    flexDirection: 'row',
  },
  sideAccentBar: {
    width: 4,
    height: '100%',
  },
  sideBarContent: {
    flex: 1,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  emptyBox: { paddingVertical: 6 },
  emptyText: { fontSize: 13, color: '#6B7280', fontStyle: 'italic' },

  // Discipleship group styles
  groupCardInner: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  groupName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  groupLeader: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  roleBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: '#4338CA' },
  leaderRoleBadge: { backgroundColor: '#FEF3C7' },
  leaderRoleBadgeText: { color: '#B45309' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#4B5563', fontWeight: '500' },

  lessonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  lessonLabel: { fontSize: 11, fontWeight: '700', color: '#7C3AED' },
  lessonTitle: { fontSize: 13, fontWeight: '600', color: '#4C1D95' },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPrimaryBtn: { backgroundColor: '#111827' },
  actionPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  actionSecondaryBtn: { backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE' },
  actionSecondaryText: { color: '#4F46E5', fontSize: 13, fontWeight: '700' },

  // Ministry styles
  ministriesList: { gap: 8 },
  ministryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 14,
  },
  ministryName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  ministryRole: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  ministryLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ministryLinkText: { fontSize: 13, fontWeight: '600', color: '#3B82F6' },

  // Staff roles styles
  staffChipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  staffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  staffChipText: { fontSize: 12, fontWeight: '700', color: '#1E40AF' },
});
