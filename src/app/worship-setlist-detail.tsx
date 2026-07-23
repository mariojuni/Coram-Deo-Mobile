import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Music,
  Calendar,
  User,
  Users,
  AlertCircle,
  ChevronRight,
  Hash,
  Clock,
  FileText,
  BookOpen,
} from 'lucide-react-native';

import { useAuthStore } from '@/store/useAuthStore';
import { useMinistryStore } from '@/store/useMinistryStore';
import { worshipSetlistService } from '@/features/worship/services/worshipSetlistService';
import {
  canViewMobileWorshipSetlist,
} from '@/permissions/mobileWorshipPermissions';
import type { WorshipSetlist, WorshipSetlistItem } from '@/features/worship/domain/worship.types';
import { SoftCard, getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import { BounceCard } from '@/components/ui/BounceCard';
import { useWorshipStore } from '@/store/useWorshipStore';
import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';

export default function WorshipSetlistDetailScreen() {
  const { setlistId } = useLocalSearchParams<{ setlistId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userProfile = useAuthStore((s) => s.userProfile);
  const ministries = useMinistryStore((s) => s.ministries);
  const setActiveSetlistItems = useWorshipStore((s) => s.setActiveSetlistItems);

  const userMinistries = ministries.filter((m) =>
    m.members?.some((mem) => mem.memberId === userProfile?.memberId)
  );

  const [setlist, setSetlist] = useState<WorshipSetlist | null>(null);
  const [items, setItems] = useState<WorshipSetlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!setlistId || !userProfile?.churchId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const fetchedSetlist = await worshipSetlistService.getWorshipSetlistById(
          userProfile.churchId,
          setlistId
        );

        if (!fetchedSetlist) {
          if (isMounted) {
            setError('Worship setlist not found or access denied.');
            setLoading(false);
          }
          return;
        }

        const canView = canViewMobileWorshipSetlist(userProfile, fetchedSetlist, userMinistries);
        if (!canView) {
          if (isMounted) {
            setError('You do not have permission to view this setlist.');
            setLoading(false);
          }
          return;
        }

        const fetchedItems = await worshipSetlistService.getWorshipSetlistItems(
          userProfile.churchId,
          setlistId
        );

        if (isMounted) {
          setSetlist(fetchedSetlist);
          setItems(fetchedItems);
          setActiveSetlistItems(fetchedItems);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError('We could not load the worship setlist. Please try again.');
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [setlistId, userProfile, setActiveSetlistItems]);

  const canChords = true;

  const getMinistryName = (ministryId?: string) => {
    if (!ministryId) return 'Worship Ministry';
    const found = ministries.find((m) => m.id === ministryId);
    return found?.name || 'Worship Ministry';
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: '#F7F8FC' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        {/* Header Shimmer */}
        <View style={{ paddingHorizontal: 20, paddingTop: Math.max(insets.top, 20) + 60, paddingBottom: 24, gap: 12 }}>
          <ShimmerSkeleton width={140} height={20} borderRadius={10} />
          <ShimmerSkeleton width="75%" height={32} borderRadius={10} />
          <ShimmerSkeleton width={180} height={18} borderRadius={6} />
        </View>

        {/* Song Card Shimmers */}
        <View style={{ paddingHorizontal: 20, gap: 16 }}>
          {[1, 2, 3].map((key) => (
            <SoftCard key={key} style={{ borderRadius: 24 }} innerStyle={{ borderRadius: 23 }}>
              <View style={{ padding: 20, gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <ShimmerSkeleton width={32} height={32} borderRadius={16} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <ShimmerSkeleton width="70%" height={20} borderRadius={6} />
                    <ShimmerSkeleton width="45%" height={14} borderRadius={6} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <ShimmerSkeleton width={70} height={22} borderRadius={11} />
                  <ShimmerSkeleton width={65} height={22} borderRadius={11} />
                  <ShimmerSkeleton width={80} height={22} borderRadius={11} />
                </View>
              </View>
            </SoftCard>
          ))}
        </View>
      </View>
    );
  }

  if (error || !setlist) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 20 }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.fixedBackBtnWrapper, { top: Math.max(insets.top, 24) }]}>
          <BounceCard bounceScale={0.85} style={styles.fixedBackBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
          </BounceCard>
        </View>
        <View style={styles.notFound}>
          <AlertCircle size={40} color="#EF4444" strokeWidth={2.5} />
          <Text style={styles.notFoundTitle}>Unavailable</Text>
          <Text style={styles.notFoundText}>{error || 'Setlist not found.'}</Text>
        </View>
      </View>
    );
  }

  const dateStr = setlist.serviceDate
    ? new Date(setlist.serviceDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'No date set';

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
          <View style={styles.statusRow}>
            <Text style={styles.ministryBadge}>{getMinistryName(setlist.ministryId)}</Text>
            <View
              style={[
                styles.statusBadge,
                setlist.status === 'published' ? styles.statusPublished : styles.statusDraft,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  setlist.status === 'published'
                    ? styles.statusTextPublished
                    : styles.statusTextDraft,
                ]}
              >
                {setlist.status?.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.screenTitle}>{setlist.title}</Text>
          <View style={styles.dateMeta}>
            <Calendar size={14} color="#6B7280" />
            <Text style={styles.dateMetaText}>{dateStr}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Music size={40} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>No songs added yet</Text>
            <Text style={styles.emptyStateText}>No songs in this setlist yet.</Text>
          </View>
        ) : (
          items.map((item, index) => {
            const keyToDisplay = item.selectedKey || item.song?.defaultKey;
            const tempoToDisplay = item.tempoBpm || item.song?.tempoBpm;

            return (
              <SoftCard key={item.id} style={{ borderRadius: 24 }} innerStyle={{ borderRadius: 23 }}>
                <View style={styles.songCard}>
                  {/* Top Row: Order & Title */}
                  <View style={styles.songHeader}>
                    <View style={styles.orderBadge}>
                      <Text style={styles.orderText}>{item.order || index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.songTitle}>{item.song?.title || 'Unknown Song'}</Text>
                      {item.song?.artist && (
                        <Text style={styles.artistText}>{item.song.artist}</Text>
                      )}
                    </View>
                  </View>

                  {/* Badges: Key, Capo, Tempo, Section */}
                  <View style={styles.badgeRow}>
                    {keyToDisplay ? (
                      <View style={styles.badge}>
                        <Hash size={12} color="#FF6596" />
                        <Text style={styles.badgeText}>Key: {keyToDisplay}</Text>
                      </View>
                    ) : null}

                    {item.capo !== undefined && item.capo > 0 ? (
                      <View style={[styles.badge, { backgroundColor: '#F0F9FF' }]}>
                        <Text style={[styles.badgeText, { color: '#0284C7' }]}>
                          Capo {item.capo}
                        </Text>
                      </View>
                    ) : null}

                    {tempoToDisplay ? (
                      <View style={[styles.badge, { backgroundColor: '#F0FDF4' }]}>
                        <Clock size={12} color="#16A34A" />
                        <Text style={[styles.badgeText, { color: '#16A34A' }]}>
                          {tempoToDisplay} BPM
                        </Text>
                      </View>
                    ) : null}

                    {item.section ? (
                      <View style={[styles.badge, { backgroundColor: '#FAF5FF' }]}>
                        <Text style={[styles.badgeText, { color: '#9333EA' }]}>
                          {item.section}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Notes if available */}
                  {item.transitionNotes ? (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesLabel}>Transition Notes:</Text>
                      <Text style={styles.notesContent}>{item.transitionNotes}</Text>
                    </View>
                  ) : null}

                  {item.musicianNotes ? (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesLabel}>Musician Notes:</Text>
                      <Text style={styles.notesContent}>{item.musicianNotes}</Text>
                    </View>
                  ) : null}

                  {/* Action Buttons */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      activeOpacity={0.8}
                      onPress={() =>
                        router.push({
                          pathname: '/serve-song-lyrics',
                          params: {
                            songId: item.songId,
                            setlistItemId: item.id,
                            hideChords: 'true',
                          },
                        } as any)
                      }
                    >
                      <FileText size={16} color="#4B5563" />
                      <Text style={styles.actionBtnText}>Lyrics</Text>
                    </TouchableOpacity>

                    {canChords && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnPrimary]}
                        activeOpacity={0.8}
                        onPress={() =>
                          router.push({
                            pathname: '/serve-song-lyrics',
                            params: {
                              songId: item.songId,
                              setlistItemId: item.id,
                              hideChords: 'false',
                            },
                          } as any)
                        }
                      >
                        <BookOpen size={16} color="#FFF" />
                        <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>
                          Chords
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </SoftCard>
            );
          })
        )}
      </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
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
    gap: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  screenTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },
  dateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateMetaText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  },
  content: {
    padding: 24,
    gap: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  notFoundTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  notFoundText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
  },
  songCard: {
    padding: 20,
    backgroundColor: '#FFF',
    gap: 12,
  },
  songHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  orderBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FF6596',
  },
  songTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  artistText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6596',
  },
  notesBox: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 2,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  notesContent: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  actionBtnPrimary: {
    backgroundColor: '#FF6596',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  actionBtnTextPrimary: {
    color: '#FFFFFF',
  },
});
