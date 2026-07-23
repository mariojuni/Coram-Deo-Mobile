import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Music, Calendar, Clock, AlertCircle, ChevronRight } from 'lucide-react-native';

import { useAuthStore } from '@/store/useAuthStore';
import { useMinistryStore } from '@/store/useMinistryStore';
import { worshipSetlistService } from '@/features/worship/services/worshipSetlistService';
import { canViewMobileWorshipSetlists } from '@/permissions/mobileWorshipPermissions';
import type { WorshipSetlist } from '@/features/worship/domain/worship.types';
import { SoftCard, getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import { BounceCard } from '@/components/ui/BounceCard';
import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';

export default function WorshipSetlistsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userProfile = useAuthStore((s) => s.userProfile);
  const ministries = useMinistryStore((s) => s.ministries);

  const userMinistries = ministries.filter((m) =>
    m.members?.some((mem) => mem.memberId === userProfile?.memberId)
  );

  const hasAccess = canViewMobileWorshipSetlists(userProfile, userMinistries);

  const [setlists, setSetlists] = useState<WorshipSetlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabFilter, setTabFilter] = useState<'upcoming' | 'this_month' | 'past'>('upcoming');

  useEffect(() => {
    if (!userProfile?.churchId || !hasAccess) {
      setLoading(false);
      return;
    }
    let isMounted = true;
    setLoading(true);
    setError(null);

    worshipSetlistService
      .getUpcomingWorshipSetlistsForUser(userProfile, userMinistries)
      .then((data) => {
        if (isMounted) {
          setSetlists(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) {
          setError('We could not load the worship setlist. Please try again.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userProfile, hasAccess]);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const filteredSetlists = setlists.filter((item) => {
    if (!item.serviceDate) return tabFilter === 'upcoming';
    const itemDate = new Date(item.serviceDate + 'T00:00:00');
    const itemTime = itemDate.getTime();

    if (tabFilter === 'upcoming') {
      return itemTime >= startOfToday;
    } else if (tabFilter === 'this_month') {
      return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
    } else if (tabFilter === 'past') {
      return itemTime < startOfToday;
    }
    return true;
  });

  const getMinistryName = (ministryId?: string) => {
    if (!ministryId) return 'Worship Ministry';
    const found = ministries.find((m) => m.id === ministryId);
    return found?.name || 'Worship Ministry';
  };

  return (
    <View style={[styles.screen, { backgroundColor: '#F7F8FC' }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <LinearGradient
        colors={['#FFE8F1', '#F5F2FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 20) + 52 }]}
      >
        <View style={styles.headerTitleContainer}>
          <Text style={styles.screenTitle}>Worship Setlists</Text>
          <Text style={styles.screenSubtitle}>View upcoming songs, keys, lyrics, and chords</Text>
        </View>

        {/* Tab Filters */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, tabFilter === 'upcoming' && styles.tabItemActive]}
            onPress={() => setTabFilter('upcoming')}
          >
            <Text style={[styles.tabText, tabFilter === 'upcoming' && styles.tabTextActive]}>Upcoming</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, tabFilter === 'this_month' && styles.tabItemActive]}
            onPress={() => setTabFilter('this_month')}
          >
            <Text style={[styles.tabText, tabFilter === 'this_month' && styles.tabTextActive]}>This Month</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, tabFilter === 'past' && styles.tabItemActive]}
            onPress={() => setTabFilter('past')}
          >
            <Text style={[styles.tabText, tabFilter === 'past' && styles.tabTextActive]}>Past</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Fixed Back Button */}
      <View style={[styles.fixedBackBtnWrapper, { top: Math.max(insets.top, 24) }]}>
        <BounceCard
          bounceScale={0.85}
          style={styles.fixedBackBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
        </BounceCard>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {!hasAccess ? (
          <View style={styles.stateContainer}>
            <AlertCircle size={40} color="#EF4444" />
            <Text style={styles.stateTitle}>No Access</Text>
            <Text style={styles.stateText}>You do not have permission to view this worship setlist.</Text>
          </View>
        ) : loading ? (
          <View style={{ gap: 16 }}>
            {[1, 2, 3].map((key) => (
              <SoftCard key={key} style={{ borderRadius: 24 }} innerStyle={{ borderRadius: 23 }}>
                <View style={{ padding: 20, gap: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <ShimmerSkeleton width={120} height={18} borderRadius={6} />
                    <ShimmerSkeleton width={70} height={20} borderRadius={10} />
                  </View>
                  <ShimmerSkeleton width="80%" height={24} borderRadius={8} />
                  <ShimmerSkeleton width={140} height={16} borderRadius={6} />
                </View>
              </SoftCard>
            ))}
          </View>
        ) : error ? (
          <View style={styles.stateContainer}>
            <AlertCircle size={40} color="#EF4444" />
            <Text style={styles.stateTitle}>Error</Text>
            <Text style={styles.stateText}>{error}</Text>
          </View>
        ) : filteredSetlists.length === 0 ? (
          <View style={styles.stateContainer}>
            <Music size={40} color="#9CA3AF" />
            <Text style={styles.stateTitle}>No setlists found</Text>
            <Text style={styles.stateText}>No worship setlists available yet.</Text>
          </View>
        ) : (
          filteredSetlists.map((item) => {
            const dateStr = item.serviceDate
              ? new Date(item.serviceDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'No date';

            return (
              <SoftCard key={item.id} style={{ borderRadius: 24 }} innerStyle={{ borderRadius: 23 }}>
                <TouchableOpacity
                  style={styles.card}
                  activeOpacity={0.75}
                  onPress={() =>
                    router.push({
                      pathname: '/worship-setlist-detail',
                      params: { setlistId: item.id },
                    } as any)
                  }
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.statusRow}>
                        <Text style={styles.ministryBadge}>{getMinistryName(item.ministryId)}</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            item.status === 'published' ? styles.statusPublished : styles.statusDraft,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              item.status === 'published'
                                ? styles.statusTextPublished
                                : styles.statusTextDraft,
                            ]}
                          >
                            {item.status?.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                    </View>
                    <ChevronRight size={20} color="#9CA3AF" />
                  </View>

                  <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                      <Calendar size={14} color="#6B7280" />
                      <Text style={styles.metaText}>{dateStr}</Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.viewBtnText}>View Setlist</Text>
                    <ChevronRight size={16} color="#FF6596" />
                  </View>
                </TouchableOpacity>
              </SoftCard>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 16,
  },
  fixedBackBtnWrapper: {
    position: 'absolute',
    left: 20,
    zIndex: 100,
  },
  fixedBackBtn: {
    ...getTopBarButtonShadowStyle(20),
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    gap: 4,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FF6596',
    fontWeight: '800',
  },
  content: {
    padding: 24,
    gap: 16,
  },
  stateContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  stateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  card: {
    padding: 20,
    backgroundColor: '#FFF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  ministryBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8B6FE8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusPublished: {
    backgroundColor: '#ECFDF5',
  },
  statusDraft: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextPublished: {
    color: '#10B981',
  },
  statusTextDraft: {
    color: '#F59E0B',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  viewBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6596',
  },
});
