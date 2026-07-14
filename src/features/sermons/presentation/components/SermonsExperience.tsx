import { Image } from 'expo-image';
import { useAuthStore } from '@/store/useAuthStore';
import { useSermonStore } from '@/store/useSermonStore';
import { useSermonPlaybackStore } from '@/store/useSermonPlaybackStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  BookOpen,
  Download,
  Headphones,
  Play,
  Search,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Sermon } from '../../domain/sermon.types';

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const NAVY = '#1A1A1A';
const GOLD = '#FF6596';
const BEIGE = '#FAFAFA';
const OLIVE = '#C084FC';

interface SermonsExperienceProps {
  searchQuery?: string;
  showSearchInput?: boolean;
}

export function SermonsExperience({ searchQuery, showSearchInput = true }: SermonsExperienceProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((s) => s.currentUser);
  const userProfile = useAuthStore((s) => s.userProfile);

  const { sermons, loading, subscribeSermons, loadFavorites } = useSermonStore();
  const { loadAllProgresses, getInProgressSermons, progresses } = useSermonPlaybackStore();

  const [localSearch, setLocalSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'video' | 'audio' | 'series'>('all');

  const activeSearch = searchQuery ?? localSearch;
  const churchId = userProfile?.churchId;

  // ── Fetch sermons ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (churchId) {
      const unsubscribe = subscribeSermons(churchId);
      return () => unsubscribe();
    }
  }, [churchId]);

  useEffect(() => {
    if (currentUser) {
      loadFavorites(currentUser.uid);
      loadAllProgresses(currentUser.uid);
    }
  }, [currentUser]);

  // ── Filter & Search ────────────────────────────────────────────────────────
  const filteredSermons = useMemo(() => {
    let list = sermons;

    if (filterType === 'video') list = list.filter((s) => s.mediaType === 'video' || s.mediaType === 'both');
    else if (filterType === 'audio') list = list.filter((s) => s.mediaType === 'audio' || s.mediaType === 'both');
    else if (filterType === 'series') list = list.filter((s) => !!s.seriesId);

    const q = activeSearch.trim().toLowerCase();
    if (!q) return list;

    return list.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.preacherName?.toLowerCase().includes(q) ||
        s.seriesTitle?.toLowerCase().includes(q) ||
        s.scriptureReference?.toLowerCase().includes(q)
    );
  }, [sermons, activeSearch, filterType]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const featuredSermon = filteredSermons[0] ?? null;
  const recentSermons = filteredSermons.slice(1, 7);
  const isSearching = activeSearch.trim().length > 0;

  const sermonSeries = useMemo(() => {
    const map = new Map<string, { title: string; count: number; thumb?: string }>();
    sermons.forEach((s) => {
      if (s.seriesId && s.seriesTitle) {
        if (!map.has(s.seriesId)) {
          map.set(s.seriesId, { title: s.seriesTitle, count: 0, thumb: s.thumbnailUrl });
        }
        map.get(s.seriesId)!.count++;
      }
    });
    return Array.from(map.entries()).map(([id, val]) => ({ id, ...val }));
  }, [sermons]);

  const inProgressList = getInProgressSermons().filter((p) => !p.completed).slice(0, 3);
  const inProgressWithSermons = inProgressList
    .map((p) => ({ progress: p, sermon: sermons.find((s) => s.id === p.sermonId) ?? null }))
    .filter((item) => item.sermon !== null);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const openSermon = (id: string) => {
    router.push({ pathname: '/sermon-watch', params: { id } });
  };

  const openAudioPlayer = (id: string) => {
    router.push({ pathname: '/audio-player', params: { id } });
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading && sermons.length === 0) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={styles.loadingText}>Loading sermons...</Text>
      </View>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!loading && sermons.length === 0) {
    return (
      <View style={styles.centerBox}>
        <BookOpen size={56} color="#D1C4B0" strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>No Sermons Yet</Text>
        <Text style={styles.emptySubtitle}>
          Check back soon — new sermons will appear here as they're published.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BEIGE }}>
      {/* ── Search bar ── */}
      {showSearchInput && (
        <View style={styles.searchWrap}>
          {searchOpen ? (
            <View style={styles.searchRow}>
              <Search size={16} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search sermons, scripture, speaker..."
                placeholderTextColor="#B0B8C8"
                value={localSearch}
                onChangeText={setLocalSearch}
                autoFocus
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => {
                  setLocalSearch('');
                  setSearchOpen(false);
                }}
              >
                <X size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.searchTrigger}
              onPress={() => setSearchOpen(true)}
              activeOpacity={0.7}
            >
              <Search size={16} color="#9CA3AF" />
              <Text style={styles.searchPlaceholder}>Search sermons...</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: inProgressWithSermons.length > 0 && !isSearching ? 100 : 40 }}
      >
        {/* ── Filter chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {(['all', 'video', 'audio', 'series'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filterType === f && styles.filterChipActive]}
              onPress={() => setFilterType(f)}
            >
              <Text style={[styles.filterChipText, filterType === f && styles.filterChipTextActive]}>
                {f === 'all' ? 'All' : f === 'video' ? 'Video' : f === 'audio' ? 'Audio' : 'Series'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Search results ── */}
        {isSearching ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {filteredSermons.length} result{filteredSermons.length !== 1 ? 's' : ''}
            </Text>
            {filteredSermons.length === 0 ? (
              <View style={styles.searchEmpty}>
                <Text style={styles.searchEmptyText}>No sermons match your search.</Text>
              </View>
            ) : (
              filteredSermons.map((s) => (
                <SearchResultCard key={s.id} sermon={s} onPress={() => openSermon(s.id)} />
              ))
            )}
          </View>
        ) : (
          <>
            {/* ── Latest Sermon (Featured) ── */}
            {featuredSermon && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Latest Sermon</Text>
                <FeaturedCard
                  sermon={featuredSermon}
                  onPress={() => openSermon(featuredSermon.id)}
                  onListen={() => openAudioPlayer(featuredSermon.id)}
                />
              </View>
            )}

            {/* ── Recent Sermons ── */}
            {recentSermons.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Sermons</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                >
                  {recentSermons.map((s) => (
                    <SermonTileCard
                      key={s.id}
                      sermon={s}
                      onPress={() => openSermon(s.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── Series ── */}
            {sermonSeries.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Series</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                >
                  {sermonSeries.map((series) => (
                    <TouchableOpacity
                      key={series.id}
                      style={styles.seriesCard}
                      onPress={() => setFilterType('series')}
                      activeOpacity={0.85}
                    >
                      {series.thumb ? (
                        <Image
                          source={{ uri: series.thumb }}
                          style={styles.seriesThumb}
                          resizeMode="cover"
                        cachePolicy="memory-disk" transition={200} />
                      ) : (
                        <View style={[styles.seriesThumb, { backgroundColor: '#DDE1E8' }]} />
                      )}
                      <LinearGradient
                        colors={['transparent', 'rgba(26,26,26,0.88)']}
                        style={StyleSheet.absoluteFill}
                      />
                      <View style={styles.seriesInfo}>
                        <Text style={styles.seriesTitle} numberOfLines={2}>
                          {series.title}
                        </Text>
                        <Text style={styles.seriesCount}>{series.count} sermons</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── Downloaded shortcut ── */}
            <View style={[styles.section, { paddingHorizontal: 20 }]}>
              <TouchableOpacity
                style={styles.downloadShortcut}
                onPress={() => router.push('/downloads' as any)}
                activeOpacity={0.85}
              >
                <Download size={18} color={OLIVE} />
                <Text style={styles.downloadShortcutText}>My Downloaded Sermons</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function FeaturedCard({ sermon, onPress, onListen }: { sermon: Sermon; onPress: () => void; onListen: () => void }) {
  const hasVideo = sermon.mediaType === 'video' || sermon.mediaType === 'both';
  const hasAudio = sermon.mediaType === 'audio' || sermon.mediaType === 'both';
  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m} min`;
  };

  return (
    <TouchableOpacity style={styles.featuredCard} onPress={onPress} activeOpacity={0.9}>
      {sermon.thumbnailUrl ? (
        <Image source={{ uri: sermon.thumbnailUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" cachePolicy="memory-disk" transition={200} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#DDE1E8' }]} />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(26,26,26,0.95)']}
        style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
      />

      {/* Main Play Icon Overlay */}
      {hasVideo && (
        <View style={styles.featuredPlayOverlay}>
          <View style={styles.featuredPlayButton}>
            <Play size={24} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
          </View>
        </View>
      )}

      {/* Content */}
      <View style={styles.featuredContent}>
        {sermon.seriesTitle && (
          <View style={styles.featuredSeriesBadge}>
            <Text style={styles.featuredSeriesBadgeText}>{sermon.seriesTitle}</Text>
          </View>
        )}
        <Text style={styles.featuredTitle} numberOfLines={2}>{sermon.title}</Text>
        <Text style={styles.featuredMeta}>
          {sermon.preacherName} • {formatDate(sermon.sermonDate)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function SermonTileCard({ sermon, onPress }: { sermon: Sermon; onPress: () => void }) {
  const hasVideo = sermon.mediaType === 'video' || sermon.mediaType === 'both';
  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity style={styles.tileCard} onPress={onPress} activeOpacity={0.88}>
      {/* Thumbnail */}
      <View style={styles.tileThumbnailWrap}>
        {sermon.thumbnailUrl ? (
          <Image source={{ uri: sermon.thumbnailUrl }} style={styles.tileThumbnail} resizeMode="cover" cachePolicy="memory-disk" transition={200} />
        ) : (
          <View style={[styles.tileThumbnail, { backgroundColor: '#DDE1E8' }]} />
        )}
        {/* Media indicator */}
        <View style={[styles.tileMediaBadge, hasVideo ? styles.videoBadge : styles.audioBadge]}>
          {hasVideo ? (
            <Play size={9} color="#fff" fill="#fff" />
          ) : (
            <Headphones size={9} color="#fff" />
          )}
        </View>
        {/* Duration */}
        {sermon.durationSeconds ? (
          <View style={styles.tileDurationBadge}>
            <Text style={styles.tileDurationText}>{formatDuration(sermon.durationSeconds)}</Text>
          </View>
        ) : null}
      </View>

      {/* Info */}
      <Text style={styles.tileTitle} numberOfLines={2}>{sermon.title}</Text>
      {sermon.scriptureReference ? (
        <Text style={styles.tileScripture} numberOfLines={1}>{sermon.scriptureReference}</Text>
      ) : null}
      <Text style={styles.tileMeta} numberOfLines={1}>{sermon.preacherName}</Text>
    </TouchableOpacity>
  );
}

function SearchResultCard({ sermon, onPress }: { sermon: Sermon; onPress: () => void }) {
  const hasVideo = sermon.mediaType === 'video' || sermon.mediaType === 'both';
  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <TouchableOpacity style={styles.searchCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.searchThumbWrap}>
        {sermon.thumbnailUrl ? (
          <Image source={{ uri: sermon.thumbnailUrl }} style={styles.searchThumb} resizeMode="cover" cachePolicy="memory-disk" transition={200} />
        ) : (
          <View style={[styles.searchThumb, { backgroundColor: '#DDE1E8' }]} />
        )}
        <View style={[styles.tileMediaBadge, hasVideo ? styles.videoBadge : styles.audioBadge]}>
          {hasVideo ? <Play size={9} color="#fff" fill="#fff" /> : <Headphones size={9} color="#fff" />}
        </View>
      </View>
      <View style={styles.searchInfo}>
        <Text style={styles.searchTitle} numberOfLines={2}>{sermon.title}</Text>
        {sermon.scriptureReference ? (
          <Text style={styles.searchScripture} numberOfLines={1}>{sermon.scriptureReference}</Text>
        ) : null}
        <Text style={styles.searchMeta} numberOfLines={1}>
          {sermon.preacherName} · {formatDate(sermon.sermonDate)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
    backgroundColor: BEIGE,
  },
  loadingText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: NAVY,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E8E2D9',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: '#B0B8C8',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: GOLD,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: NAVY,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E8E2D9',
  },
  filterChipActive: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  section: {
    paddingTop: 4,
    paddingBottom: 8,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: NAVY,
    letterSpacing: -0.3,
    paddingHorizontal: 20,
  },
  horizontalList: {
    gap: 12,
    paddingHorizontal: 20,
  },
  // Featured card
  floatingContinueWatching: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  // Featured card
  featuredCard: {
    marginHorizontal: 20,
    height: 320,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#DDE1E8',
    justifyContent: 'flex-end',
  },
  featuredPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredPlayButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,101,150,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  featuredContent: {
    padding: 24,
    gap: 8,
    position: 'relative',
    zIndex: 10,
  },
  featuredSeriesBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,101,150,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,101,150,0.3)',
  },
  featuredSeriesBadgeText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuredTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  featuredMeta: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  // Tile card
  tileCard: {
    width: 160,
    gap: 6,
  },
  tileThumbnailWrap: {
    width: '100%',
    height: 100,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#DDE1E8',
    position: 'relative',
  },
  tileThumbnail: {
    width: '100%',
    height: '100%',
  },
  tileMediaBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: { backgroundColor: GOLD },
  audioBadge: { backgroundColor: OLIVE },
  tileDurationBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tileDurationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
    lineHeight: 17,
  },
  tileScripture: {
    fontSize: 11,
    color: GOLD,
    fontWeight: '600',
  },
  tileMeta: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  // Series
  seriesCard: {
    width: 150,
    height: 110,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#DDE1E8',
    justifyContent: 'flex-end',
  },
  seriesThumb: {
    ...StyleSheet.absoluteFill,
  },
  seriesInfo: {
    padding: 10,
  },
  seriesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 17,
  },
  seriesCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  // Search results
  searchEmpty: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  searchEmptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  searchCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchThumbWrap: {
    width: 90,
    height: 68,
    position: 'relative',
  },
  searchThumb: {
    width: '100%',
    height: '100%',
    backgroundColor: '#DDE1E8',
  },
  searchInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
    gap: 3,
  },
  searchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
    lineHeight: 17,
  },
  searchScripture: {
    fontSize: 11,
    color: GOLD,
    fontWeight: '600',
  },
  searchMeta: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  // Download shortcut
  downloadShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E8E2D9',
    borderStyle: 'dashed',
  },
  downloadShortcutText: {
    fontSize: 14,
    fontWeight: '700',
    color: OLIVE,
  },
});
