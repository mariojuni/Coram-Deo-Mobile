import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Users,
  Calendar,
  MapPin,
  ChevronRight,
  ChevronDown,
  BookOpen,
  ShieldCheck,
} from 'lucide-react-native';
import { getSoftShadowStyle } from '@/components/ui/SoftCard';

// ── Design tokens ─────────────────────────────────────────────────────────────
// Group section: pure frost/neutral
const FROST_BG      = '#F8F9FB';       // near-white frost card bg
const FROST_BORDER  = '#E8ECF0';       // subtle cool border
const FROST_ICON_BG = '#F1F4F8';       // icon box bg
const SLATE_600     = '#475569';       // icon/meta text
const SLATE_500     = '#64748B';
const SLATE_800     = '#1E293B';       // primary text
const LESSON_BG     = '#F1F5F9';       // lesson banner bg
const LESSON_LABEL  = '#64748B';       // muted lesson label
const LESSON_TITLE  = '#0F172A';       // lesson title
const BTN_DARK      = '#1E293B';       // view group button
// Ministry section keeps amber as semantic
const AMBER         = '#F59E0B';
const BRAND         = '#FF6596';       // used only for ministries Serve link
import type { DiscipleshipGroup, DiscipleshipLesson } from '@/features/discipleshipGroup/domain/discipleshipGroup.types';
import type { UserMinistryMembership } from '../hooks/useProfileDashboardData';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MyAffiliationsSectionProps {
  groups: DiscipleshipGroup[];
  groupsLoading: boolean;
  currentLessons: Record<string, DiscipleshipLesson | null>;
  groupLessons?: Record<string, DiscipleshipLesson[]>;
  userMinistries: UserMinistryMembership[];
  ministriesLoading: boolean;
  roleChips: string[];
  memberId?: string | null;
  userId?: string | null;
}

// ── Accordion wrapper ────────────────────────────────────────────────────────
interface AccordionCardProps {
  icon: React.ReactNode;
  title: string;
  badgeCount?: number;
  children: React.ReactNode;
  accentColor: string;
  initiallyOpen?: boolean;
}

function AccordionCard({ icon, title, badgeCount, children, accentColor, initiallyOpen = false }: AccordionCardProps) {
  const [open, setOpen] = useState(initiallyOpen);
  const chevronAnim = useRef(new Animated.Value(initiallyOpen ? 1 : 0)).current;

  const toggle = () => {
    LayoutAnimation.configureNext({
      duration: 280,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'spring', springDamping: 0.8 },
    });
    const next = !open;
    setOpen(next);
    Animated.spring(chevronAnim, {
      toValue: next ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();
  };

  const chevronRotation = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.accordionOuter}>
      {/* Header row — always visible */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={toggle}
        style={styles.accordionHeader}
      >
        <View style={[styles.accordionIconBox, { backgroundColor: `${accentColor}14` }]}>
          {icon}
        </View>
        <Text style={styles.accordionTitle}>{title}</Text>
        {badgeCount !== undefined && badgeCount > 0 && (
          <View style={[styles.accordionBadge, { backgroundColor: `${accentColor}18` }]}>
            <Text style={[styles.accordionBadgeText, { color: accentColor }]}>{badgeCount}</Text>
          </View>
        )}
        <Animated.View style={{ transform: [{ rotate: chevronRotation }], marginLeft: 'auto' }}>
          <ChevronDown size={18} color="#94A3B8" />
        </Animated.View>
      </TouchableOpacity>

      {/* Expandable body */}
      {open && (
        <View style={styles.accordionBody}>
          <View style={[styles.accordionBodyDivider, { backgroundColor: `${accentColor}20` }]} />
          {children}
        </View>
      )}
    </View>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function MyAffiliationsSection({
  groups,
  groupsLoading,
  currentLessons,
  groupLessons,
  userMinistries,
  ministriesLoading,
  roleChips,
  memberId,
  userId,
}: MyAffiliationsSectionProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>My Affiliations</Text>

      {/* ── A. Discipleship Group ─────────────────────────────────── */}
      <AccordionCard
        icon={<Users size={18} color={SLATE_600} />}
        title="Discipleship Group"
        badgeCount={groups.length}
        accentColor={SLATE_600}
      >
        {groupsLoading ? (
          <Text style={styles.emptyText}>Loading...</Text>
        ) : groups.length === 0 ? (
          <Text style={styles.emptyText}>Not assigned to a discipleship group yet.</Text>
        ) : (
          groups.map((group) => {
            const isLeader =
              (memberId && group.leaderMemberIds?.includes(memberId)) ||
              (userId && group.leaderUserIds?.includes(userId));
            const userRoleLabel = isLeader ? 'Leader' : 'Member';
            const currentLesson = currentLessons[group.id];
            const allLessons = groupLessons?.[group.id] || [];
            const currentWeekNum = group.currentWeekNumber || currentLesson?.weekNumber || 1;
            const previousLessons = allLessons
              .filter((l) => l.weekNumber < currentWeekNum)
              .sort((a, b) => a.weekNumber - b.weekNumber);

            return (
              <View key={group.id} style={styles.groupCard}>
                {/* Group header */}
                <View style={styles.groupHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    {!!group.description && (
                      <Text style={styles.groupDesc} numberOfLines={1}>{group.description}</Text>
                    )}
                  </View>
                  <View style={[styles.rolePill, isLeader && styles.leaderPill]}>
                    <Text style={[styles.rolePillText, isLeader && styles.leaderPillText]}>
                      {userRoleLabel}
                    </Text>
                  </View>
                </View>

                {/* Meta */}
                <View style={styles.metaRow}>
                  {!!group.meetingDay && (
                    <View style={styles.metaItem}>
                      <Calendar size={12} color={SLATE_500} />
                      <Text style={styles.metaText}>
                        {group.meetingDay}{group.meetingTime ? ` · ${group.meetingTime}` : ''}
                      </Text>
                    </View>
                  )}
                  {!!group.meetingLocation && (
                    <View style={styles.metaItem}>
                      <MapPin size={12} color={SLATE_500} />
                      <Text style={styles.metaText} numberOfLines={1}>{group.meetingLocation}</Text>
                    </View>
                  )}
                </View>

                {/* Current lesson */}
                {!!currentLesson && (
                  <TouchableOpacity
                    style={styles.lessonBanner}
                    onPress={() => {
                      const planId = group.planId || currentLesson.planId;
                      if (isLeader && planId) {
                        router.push(`/discipleship/week/${currentLesson.id}?planId=${planId}&groupId=${group.id}` as any);
                      } else {
                        router.push(`/discipleship/group/${group.id}/lesson/${currentLesson.id}` as any);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <BookOpen size={13} color={SLATE_600} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.lessonLabel}>Lesson {currentLesson.weekNumber} — Current</Text>
                      <Text style={styles.lessonTitle} numberOfLines={1}>{currentLesson.title}</Text>
                    </View>
                    <ChevronRight size={13} color={SLATE_500} />
                  </TouchableOpacity>
                )}

                {/* Previous lessons */}
                {previousLessons.length > 0 && (
                  <View style={styles.prevLessonsBox}>
                    <Text style={styles.prevLessonsLabel}>PREVIOUS LESSONS</Text>
                    {previousLessons.map((prevLesson) => (
                      <TouchableOpacity
                        key={prevLesson.id}
                        style={styles.prevLessonRow}
                        onPress={() => {
                          const planId = group.planId || prevLesson.planId;
                          if (isLeader && planId) {
                            router.push(`/discipleship/week/${prevLesson.id}?planId=${planId}&groupId=${group.id}` as any);
                          } else {
                            router.push(`/discipleship/group/${group.id}/lesson/${prevLesson.id}` as any);
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <BookOpen size={11} color="#94A3B8" style={{ marginRight: 6 }} />
                        <Text style={styles.prevLessonTitle} numberOfLines={1}>
                          Wk {prevLesson.weekNumber}: {prevLesson.title}
                        </Text>
                        <ChevronRight size={11} color="#94A3B8" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* CTA */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push(`/discipleship/group/${group.id}` as any)}
                  style={styles.viewGroupBtn}
                >
                  <Text style={styles.viewGroupBtnText}>View Group</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </AccordionCard>

      {/* ── B. Ministries ────────────────────────────────────────── */}
      <AccordionCard
        icon={<ShieldCheck size={18} color="#F59E0B" />}
        title="Ministry Memberships"
        badgeCount={userMinistries.length}
        accentColor="#F59E0B"
      >
        {ministriesLoading ? (
          <Text style={styles.emptyText}>Loading...</Text>
        ) : userMinistries.length === 0 ? (
          <Text style={styles.emptyText}>Not assigned to any ministry yet.</Text>
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
                  style={styles.serveLink}
                >
                  <Text style={styles.serveLinkText}>Serve</Text>
                  <ChevronRight size={13} color={BRAND} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </AccordionCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // ── Accordion ──────────────────────────────────────────────
  accordionOuter: {
    ...(getSoftShadowStyle(20) as any),
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 12,
  },
  accordionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  accordionBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 100,
  },
  accordionBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  accordionBody: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  accordionBodyDivider: {
    height: 1,
    marginBottom: 14,
  },

  // ── Group card ─────────────────────────────────────────────
  groupCard: {
    backgroundColor: FROST_BG,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: FROST_BORDER,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  groupName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  groupDesc: { fontSize: 12, color: '#64748B', marginTop: 2 },
  rolePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 100,
  },
  rolePillText: { fontSize: 11, fontWeight: '700', color: SLATE_600 },
  leaderPill: { backgroundColor: '#F1F5F9' },
  leaderPillText: { color: SLATE_800 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#475569', fontWeight: '500' },

  lessonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LESSON_BG,
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: FROST_BORDER,
  },
  lessonLabel: { fontSize: 11, fontWeight: '600', color: LESSON_LABEL },
  lessonTitle: { fontSize: 13, fontWeight: '700', color: LESSON_TITLE },

  prevLessonsBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    gap: 6,
  },
  prevLessonsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  prevLessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  prevLessonTitle: { flex: 1, fontSize: 12, fontWeight: '600', color: '#374151' },

  viewGroupBtn: {
    backgroundColor: BTN_DARK,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  viewGroupBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  emptyText: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic', paddingVertical: 4 },

  // ── Ministries ─────────────────────────────────────────────
  ministriesList: { gap: 8 },
  ministryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ministryName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  ministryRole: { fontSize: 12, color: '#64748B', marginTop: 1 },
  serveLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  serveLinkText: { fontSize: 13, fontWeight: '600', color: BRAND },
});
