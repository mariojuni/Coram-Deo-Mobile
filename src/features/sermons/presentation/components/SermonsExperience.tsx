import { useAuthStore } from '@/store/useAuthStore';
import { useSermonStore } from '@/store/useSermonStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Bookmark, Flame, PlayCircle, Search } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { Sermon } from '../../domain/sermon.types';

interface SermonsExperienceProps {
  searchQuery?: string;
  showSearchInput?: boolean;
}

export function SermonsExperience({ searchQuery, showSearchInput = true }: SermonsExperienceProps) {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const { sermons, loading, fetchSermons, toggleFavorite, favorites, loadFavorites } = useSermonStore();
  const [localSearch, setLocalSearch] = useState('');
  const activeSearch = searchQuery ?? localSearch;

  useEffect(() => {
    if (sermons.length === 0) {
      fetchSermons(true);
    }
  }, [fetchSermons, sermons.length]);

  useEffect(() => {
    if (currentUser) {
      loadFavorites(currentUser.uid);
    }
  }, [currentUser, loadFavorites]);

  const filteredSermons = useMemo(() => {
    const normalizedSearch = activeSearch.trim().toLowerCase();
    if (!normalizedSearch) return sermons;

    return sermons.filter((sermon) => {
      const speaker = sermon.speaker?.name?.toLowerCase() ?? '';
      const tags = sermon.tags?.join(' ').toLowerCase() ?? '';
      return (
        sermon.title.toLowerCase().includes(normalizedSearch) ||
        sermon.description.toLowerCase().includes(normalizedSearch) ||
        speaker.includes(normalizedSearch) ||
        tags.includes(normalizedSearch)
      );
    });
  }, [activeSearch, sermons]);

  const featuredSermon = filteredSermons[0] ?? null;
  const recentSermons = filteredSermons.slice(1, 6);
  const isSearching = activeSearch.trim().length > 0;
  const popularSermons = useMemo(
    () => [...filteredSermons].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 5),
    [filteredSermons]
  );

  const sermonStats = useMemo(
    () => ({
      total: sermons.length,
      videos: sermons.filter((item) => item.type === 'video').length,
      audio: sermons.filter((item) => item.type === 'audio').length,
    }),
    [sermons]
  );

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const openSermon = (id: string) => {
    router.push({ pathname: '/sermon-detail', params: { id } });
  };

  const handleToggleFavorite = async (sermonId: string) => {
    if (!currentUser) return;
    try {
      await toggleFavorite(currentUser.uid, sermonId);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['#E9F1FF', '#EDF7FF', '#F7FAFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCompact}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.heroBadge}>
            <Flame size={12} color="#1D4ED8" />
            <Text style={styles.heroBadgeText}>Word library</Text>
          </View>
          <View style={styles.heroCountPill}>
            <Text style={styles.heroCountText}>{sermonStats.total}</Text>
          </View>
        </View>

        <Text style={styles.heroTitleCompact}>Sermons</Text>
        <Text style={styles.heroSubtitleCompact}>
          Teaching archive for weekly growth.
        </Text>

        <View style={styles.quickStatsRow}>
          <View style={styles.quickStatPill}>
            <Text style={styles.quickStatValue}>{sermonStats.videos}</Text>
            <Text style={styles.quickStatLabel}>Video</Text>
          </View>
          <View style={styles.quickStatPill}>
            <Text style={styles.quickStatValue}>{sermonStats.audio}</Text>
            <Text style={styles.quickStatLabel}>Audio</Text>
          </View>
        </View>
      </LinearGradient>

      {showSearchInput && (
        <View style={styles.searchRow}>
          <Search size={16} color="#73809D" />
          <TextInput
            style={styles.searchInput}
            value={activeSearch}
            onChangeText={setLocalSearch}
            placeholder="Search sermons, speakers, or tags"
            placeholderTextColor="#94A3B8"
          />
        </View>
      )}

      {loading && sermons.length === 0 ? (
        <View style={styles.placeholderWrap}>
          <Text style={styles.placeholderSubtitle}>Loading sermons...</Text>
        </View>
      ) : filteredSermons.length === 0 ? (
        <View style={styles.placeholderWrap}>
          <Text style={styles.placeholderTitle}>No sermons found</Text>
          <Text style={styles.placeholderSubtitle}>Try a different search term.</Text>
        </View>
      ) : isSearching ? (
        <View style={styles.searchResultsList}>
          {filteredSermons.map((sermon: Sermon) => {
            const isFavorited = favorites.has(sermon.id);
            return (
              <TouchableOpacity
                key={sermon.id}
                style={styles.searchResultCard}
                activeOpacity={0.9}
                onPress={() => openSermon(sermon.id)}
              >
                <Image source={{ uri: sermon.thumbnailUrl }} style={styles.searchResultImage} resizeMode="cover" />
                <View style={styles.searchResultBody}>
                  <Text style={styles.searchResultTitle} numberOfLines={2}>{sermon.title}</Text>
                  <Text style={styles.searchResultMeta} numberOfLines={1}>
                    {sermon.speaker?.name} • {formatDate(sermon.date)} • {formatDuration(sermon.duration)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.searchResultSave, isFavorited && styles.searchResultSaveActive]}
                  onPress={() => handleToggleFavorite(sermon.id)}
                >
                  <Bookmark size={12} color={isFavorited ? '#FFFFFF' : '#1D4ED8'} fill={isFavorited ? '#FFFFFF' : 'transparent'} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <>
          {featuredSermon && (
            <TouchableOpacity activeOpacity={0.9} onPress={() => openSermon(featuredSermon.id)}>
              <View style={styles.featuredCard}>
                <Image source={{ uri: featuredSermon.thumbnailUrl }} style={styles.featuredImage} resizeMode="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(12,18,36,0.85)']}
                  style={styles.featuredOverlay}
                >
                  <View style={styles.featuredMetaRow}>
                    <Text style={styles.featuredMeta}>{formatDate(featuredSermon.date)}</Text>
                    <Text style={styles.featuredMeta}>{formatDuration(featuredSermon.duration)}</Text>
                  </View>
                  <Text style={styles.featuredTitle} numberOfLines={2}>{featuredSermon.title}</Text>
                  <Text style={styles.featuredSpeaker} numberOfLines={1}>{featuredSermon.speaker?.name}</Text>
                </LinearGradient>
              </View>
            </TouchableOpacity>
          )}

          {recentSermons.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recently Uploaded</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowList}>
                {recentSermons.map((sermon: Sermon) => {
                  const isFavorited = favorites.has(sermon.id);
                  return (
                    <TouchableOpacity
                      key={sermon.id}
                      style={styles.rowCard}
                      activeOpacity={0.9}
                      onPress={() => openSermon(sermon.id)}
                    >
                      <Image source={{ uri: sermon.thumbnailUrl }} style={styles.rowImage} resizeMode="cover" />
                      <Text style={styles.rowTitle} numberOfLines={2}>{sermon.title}</Text>
                      <Text style={styles.rowSubtitle} numberOfLines={1}>{sermon.speaker?.name}</Text>
                      <TouchableOpacity
                        style={[styles.favoriteChip, isFavorited && styles.favoriteChipActive]}
                        onPress={() => handleToggleFavorite(sermon.id)}
                      >
                        <Bookmark size={12} color={isFavorited ? '#FFFFFF' : '#1D4ED8'} fill={isFavorited ? '#FFFFFF' : 'transparent'} />
                        <Text style={[styles.favoriteChipText, isFavorited && styles.favoriteChipTextActive]}>
                          {isFavorited ? 'Saved' : 'Save'}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {popularSermons.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Most Played</Text>
              <View style={styles.popularList}>
                {popularSermons.map((sermon: Sermon) => (
                  <TouchableOpacity key={sermon.id} style={styles.popularItem} onPress={() => openSermon(sermon.id)}>
                    <Image source={{ uri: sermon.thumbnailUrl }} style={styles.popularImage} resizeMode="cover" />
                    <View style={styles.popularBody}>
                      <Text style={styles.popularTitle} numberOfLines={1}>{sermon.title}</Text>
                      <Text style={styles.popularSubtitle} numberOfLines={1}>{sermon.speaker?.name}</Text>
                    </View>
                    <View style={styles.popularViews}>
                      <PlayCircle size={13} color="#1D4ED8" />
                      <Text style={styles.popularViewsText}>{sermon.viewCount || 0}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 14,
  },
  heroCompact: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#DCE8FF',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E40AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroCountPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#CFE0FF',
  },
  heroCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  heroTitleCompact: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  heroSubtitleCompact: {
    marginTop: 2,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  quickStatsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  quickStatPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#DDE7FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickStatValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  quickStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDE4F5',
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  searchResultsList: {
    gap: 10,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5EAF6',
    padding: 8,
  },
  searchResultImage: {
    width: 76,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  searchResultBody: {
    flex: 1,
    gap: 2,
  },
  searchResultTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
  },
  searchResultMeta: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  searchResultSave: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultSaveActive: {
    borderColor: '#1D4ED8',
    backgroundColor: '#1D4ED8',
  },
  placeholderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    gap: 12,
  },
  placeholderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  featuredCard: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 210,
    backgroundColor: '#E2E8F0',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  featuredMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featuredMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  featuredSpeaker: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.2,
  },
  rowList: {
    gap: 10,
    paddingRight: 20,
  },
  rowCard: {
    width: 186,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 8,
  },
  rowImage: {
    width: '100%',
    height: 102,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
    minHeight: 36,
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  favoriteChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  favoriteChipActive: {
    borderColor: '#1D4ED8',
    backgroundColor: '#1D4ED8',
  },
  favoriteChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  favoriteChipTextActive: {
    color: '#FFFFFF',
  },
  popularList: {
    gap: 10,
  },
  popularItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
  },
  popularImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  popularBody: {
    flex: 1,
    gap: 2,
  },
  popularTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  popularSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  popularViews: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  popularViewsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
});
