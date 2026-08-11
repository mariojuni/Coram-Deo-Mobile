import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { Bookmark, BookOpen, Calendar, ChevronRight, Share as ShareIcon, Trash2, ChevronDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SoftCard } from '@/components/ui/SoftCard';
import { BounceCard } from '@/components/ui/BounceCard';
import type { UserHighlightItem } from '../hooks/useProfileDashboardData';
import type { SermonNote } from '@/features/sermons/domain/sermon.types';
import type { UserBiblePlan, BiblePlan } from '@/features/biblePlan/domain/biblePlan.types';
import { saveUserPreferences, getUserPreferences } from '@/features/bible/data/bible.repository';

type ActivityTabKey = 'all' | 'highlights' | 'notes' | 'plans';

interface ProfileActivityTabsProps {
  highlights: UserHighlightItem[];
  highlightsLoading: boolean;
  notes: SermonNote[];
  notesLoading: boolean;
  activePlans: UserBiblePlan[];
  plansMeta: BiblePlan[];
  plansLoading: boolean;
  onRemoveHighlight?: (passageId: string, verseNumber: number) => void;
}

const PAGE_SIZE = 15;

export function ProfileActivityTabs({
  highlights,
  highlightsLoading,
  notes,
  notesLoading,
  activePlans,
  plansMeta,
  plansLoading,
  onRemoveHighlight,
}: ProfileActivityTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActivityTabKey>('all');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  const tabs: { key: ActivityTabKey; label: string; count: number }[] = useMemo(
    () => [
      { key: 'all', label: 'All', count: highlights.length + notes.length + activePlans.length },
      { key: 'highlights', label: 'Highlights', count: highlights.length },
      { key: 'notes', label: 'Notes', count: notes.length },
      { key: 'plans', label: 'Plans', count: activePlans.length },
    ],
    [highlights.length, notes.length, activePlans.length]
  );

  const handleOpenBiblePassage = useCallback(
    async (passageId: string) => {
      try {
        const prefs = await getUserPreferences();
        const [book, chapter] = passageId.split('.');
        await saveUserPreferences({
          ...prefs,
          activeBook: book || 'GEN',
          activeChapter: chapter || '1',
          activePassageId: passageId,
        });
        router.navigate('/(tabs)/bible');
      } catch (e) {
        console.error('Failed to open passage:', e);
        router.navigate('/(tabs)/bible');
      }
    },
    [router]
  );

  const handleShareHighlight = useCallback(async (item: UserHighlightItem) => {
    try {
      const cleanText = item.text ? item.text.replace(/{{note:[0-9]+}}/g, '').trim() : '';
      const msg = cleanText
        ? `"${cleanText}" — ${item.bookName} ${item.chapter}:${item.verseNumber}`
        : `${item.bookName} ${item.chapter}:${item.verseNumber}`;
      await Share.share({ message: msg });
    } catch (e) {
      console.error('Failed to share highlight:', e);
    }
  }, []);

  const handleConfirmRemove = useCallback(
    (item: UserHighlightItem) => {
      Alert.alert(
        'Remove Highlight',
        `Are you sure you want to remove the highlight for ${item.bookName} ${item.chapter}:${item.verseNumber}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => onRemoveHighlight?.(item.passageId, item.verseNumber),
          },
        ]
      );
    },
    [onRemoveHighlight]
  );

  const getColorHex = useCallback((colorName: string) => {
    const map: Record<string, string> = {
      yellow: '#F59E0B',
      pink: '#EC4899',
      blue: '#3B82F6',
      green: '#10B981',
    };
    return map[colorName] || '#F59E0B';
  }, []);

  // Memoized Highlight Items
  const displayedHighlights = useMemo(
    () => highlights.slice(0, visibleCount),
    [highlights, visibleCount]
  );

  const renderedHighlights = useMemo(() => {
    if (highlightsLoading) {
      return <Text style={styles.loadingText}>Loading highlights...</Text>;
    }
    if (highlights.length === 0) {
      if (activeTab !== 'highlights') return null;
      return (
        <SoftCard style={styles.emptyCard}>
          <View style={styles.emptyContainer}>
            <Bookmark size={32} color="#9CA3AF" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>No Highlights Yet</Text>
            <Text style={styles.emptySubtitle}>Verses you highlight while reading will appear here.</Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => router.navigate('/(tabs)/bible')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyActionBtnText}>Read the Bible</Text>
            </TouchableOpacity>
          </View>
        </SoftCard>
      );
    }

    return (
      <View>
        {displayedHighlights.map((item) => (
          <BounceCard
            key={item.id}
            style={{ marginBottom: 10 }}
            onPress={() => handleOpenBiblePassage(item.passageId)}
            activeOpacity={0.85}
          >
            <SoftCard>
              <View style={styles.sideBarCardContainer}>
                <View style={[styles.sideAccentBar, { backgroundColor: getColorHex(item.color) }]} />
                <View style={styles.sideBarCardContent}>
                  <View style={styles.highlightHeader}>
                    <Text style={styles.highlightReference}>
                      {item.bookName} {item.chapter}:{item.verseNumber}
                    </Text>

                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        onPress={() => handleShareHighlight(item)}
                        style={styles.iconBtn}
                        activeOpacity={0.7}
                        hitSlop={8}
                      >
                        <ShareIcon size={15} color="#6B7280" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleConfirmRemove(item)}
                        style={styles.iconBtn}
                        activeOpacity={0.7}
                        hitSlop={8}
                      >
                        <Trash2 size={15} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {!!item.text ? (
                    <Text style={styles.scriptureText}>"{item.text.replace(/{{note:[0-9]+}}/g, '').trim()}"</Text>
                  ) : (
                    <Text style={styles.scriptureTextFallback}>Tap card to read passage in Bible</Text>
                  )}
                </View>
              </View>
            </SoftCard>
          </BounceCard>
        ))}

        {highlights.length > visibleCount && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            activeOpacity={0.8}
          >
            <Text style={styles.loadMoreText}>Show More Highlights ({highlights.length - visibleCount} remaining)</Text>
            <ChevronDown size={14} color="#3B82F6" />
          </TouchableOpacity>
        )}
      </View>
    );
  }, [
    highlights,
    displayedHighlights,
    highlightsLoading,
    visibleCount,
    getColorHex,
    handleConfirmRemove,
    handleOpenBiblePassage,
    handleShareHighlight,
    router,
    activeTab,
  ]);

  // Memoized Notes Items
  const renderedNotes = useMemo(() => {
    if (notesLoading) {
      return <Text style={styles.loadingText}>Loading notes...</Text>;
    }
    if (notes.length === 0) {
      if (activeTab !== 'notes') return null;
      return (
        <SoftCard style={styles.emptyCard}>
          <View style={styles.emptyContainer}>
            <BookOpen size={32} color="#9CA3AF" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>No Notes Yet</Text>
            <Text style={styles.emptySubtitle}>Sermon notes you save will appear here.</Text>
          </View>
        </SoftCard>
      );
    }
    return notes.map((note) => (
      <SoftCard key={note.id} style={{ marginBottom: 10 }}>
        <View style={styles.sideBarCardContainer}>
          <View style={[styles.sideAccentBar, { backgroundColor: '#8B5CF6' }]} />
          <View style={styles.sideBarCardContent}>
            <View style={styles.noteHeader}>
              <View style={styles.noteIconBox}>
                <BookOpen size={14} color="#8B5CF6" />
              </View>
              <Text style={styles.noteDate}>
                {note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'Note'}
              </Text>
            </View>
            <Text style={styles.noteBody} numberOfLines={4}>{note.content}</Text>
          </View>
        </View>
      </SoftCard>
    ));
  }, [notes, notesLoading, activeTab]);

  // Memoized Plans Items
  const renderedPlans = useMemo(() => {
    if (plansLoading) {
      return <Text style={styles.loadingText}>Loading plans...</Text>;
    }
    if (activePlans.length === 0) {
      if (activeTab !== 'plans') return null;
      return (
        <SoftCard style={styles.emptyCard}>
          <View style={styles.emptyContainer}>
            <Calendar size={32} color="#9CA3AF" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>No Active Plans Yet</Text>
            <Text style={styles.emptySubtitle}>Active reading plans will appear here.</Text>
          </View>
        </SoftCard>
      );
    }
    return activePlans.map((plan) => {
      const meta = plansMeta.find((p) => p.id === plan.planId);
      const title = meta?.title || 'Bible Reading Plan';
      const progressPercent = Math.min(
        100,
        plan.progressPercentage ??
          Math.round(((plan.completedDaysCount || 0) / (meta?.durationDays || plan.totalDays || 30)) * 100)
      );

      return (
        <BounceCard
          key={plan.id}
          style={{ marginBottom: 10 }}
          onPress={() => router.push(`/bible-plans/${plan.planId}` as any)}
          activeOpacity={0.8}
        >
          <SoftCard>
            <View style={styles.sideBarCardContainer}>
              <View style={[styles.sideAccentBar, { backgroundColor: '#3B82F6' }]} />
              <View style={styles.sideBarCardContent}>
                <View style={styles.planHeader}>
                  <View style={styles.planIconBox}>
                    <Calendar size={16} color="#3B82F6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planTitle}>{title}</Text>
                    <Text style={styles.planSubtitle}>{progressPercent}% completed</Text>
                  </View>
                  <ChevronRight size={18} color="#C1C7D0" />
                </View>

                <View style={styles.progressBarBg}>
                  <LinearGradient
                    colors={['#3B82F6', '#60A5FA']}
                    style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </View>
              </View>
            </View>
          </SoftCard>
        </BounceCard>
      );
    });
  }, [activePlans, plansLoading, plansMeta, router, activeTab]);

  const handleTabChange = useCallback((key: ActivityTabKey) => {
    setActiveTab(key);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>My Activity</Text>

      {/* Instant Tab Bar Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScroll}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabChip, isActive && styles.activeTabChip]}
              onPress={() => handleTabChange(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabChipText, isActive && styles.activeTabChipText]}>
                {tab.label}
              </Text>
              <View style={[styles.badge, isActive && styles.activeBadge]}>
                <Text style={[styles.badgeText, isActive && styles.activeBadgeText]}>
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Feed Area */}
      <View style={styles.feedBody}>
        {activeTab === 'all' && (
          <View>
            {highlights.length === 0 && notes.length === 0 && activePlans.length === 0 ? (
              <SoftCard style={styles.emptyCard}>
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No Activity Records</Text>
                  <Text style={styles.emptySubtitle}>Your recent activity will be displayed here.</Text>
                </View>
              </SoftCard>
            ) : (
              <>
                {renderedHighlights}
                {renderedNotes}
                {renderedPlans}
              </>
            )}
          </View>
        )}

        {activeTab === 'highlights' && renderedHighlights}
        {activeTab === 'notes' && renderedNotes}
        {activeTab === 'plans' && renderedPlans}
      </View>
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
  tabsScroll: { gap: 8, paddingBottom: 12 },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeTabChip: { backgroundColor: '#111827', borderColor: '#111827' },
  tabChipText: { fontSize: 13, fontWeight: '700', color: '#4B5563' },
  activeTabChipText: { color: '#FFFFFF' },
  badge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeBadge: { backgroundColor: 'rgba(255,255,255,0.25)' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  activeBadgeText: { color: '#FFFFFF' },

  feedBody: { gap: 8 },
  loadingText: { fontSize: 13, color: '#6B7280', fontStyle: 'italic', paddingVertical: 16, textAlign: 'center' },

  sideBarCardContainer: {
    flexDirection: 'row',
    minHeight: 60,
  },
  sideAccentBar: {
    width: 4,
    height: '100%',
  },
  sideBarCardContent: {
    flex: 1,
    padding: 12,
  },

  emptyCard: { paddingVertical: 20 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 4 },
  emptySubtitle: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginBottom: 14 },
  emptyActionBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
  },
  emptyActionBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  highlightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  highlightReference: { fontSize: 14, fontWeight: '800', color: '#111827' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { padding: 2 },
  scriptureText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#374151',
    lineHeight: 18,
    marginVertical: 2,
  },
  scriptureTextFallback: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', marginVertical: 2 },

  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  noteIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteDate: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  noteBody: { fontSize: 13, color: '#111827', lineHeight: 18 },

  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  planIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  planSubtitle: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  progressBarBg: {
    height: 5,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 3 },

  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 8,
    gap: 6,
  },
  loadMoreText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
});
