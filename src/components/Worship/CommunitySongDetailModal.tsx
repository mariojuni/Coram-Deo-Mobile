import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { X, Music } from 'lucide-react-native';
import AppModal from '@/components/ui/AppModal';
import { BlurView } from 'expo-blur';
import { BounceCard } from '@/components/ui/BounceCard';
import { getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import type { Song } from '@/features/worship/domain/worship.types';
import { canViewLyricsInDirectory } from '@/permissions/communitySongsPermissions';
import { YouTubePlayerView } from '@/components/Worship/YouTubePlayerView';

interface CommunitySongDetailModalProps {
  song: Song | null;
  onClose: () => void;
}

export function CommunitySongDetailModal({
  song,
  onClose,
}: CommunitySongDetailModalProps) {
  if (!song) return null;

  const showLyrics = canViewLyricsInDirectory(song);
  const youtubeVideoId = song.mediaReferences?.youtubeVideoId || song.youtubeVideoId;
  const youtubeUrl = song.mediaReferences?.youtubeUrl;

  return (
    <AppModal
      isOpen={!!song}
      onClose={onClose}
      title={song.title || 'Song Details'}
      hideHeader={true}
      hideDragHandle={true}
      containerStyle={{ paddingHorizontal: 0, paddingBottom: 0, backgroundColor: '#FAFAFA' }}
      heightRatio={0.85}
      dynamicHeight={true}
    >
      <View style={styles.modalContainer}>
        {/* ─── Clean Header (Drag Handle & Close Button) ───────────────────── */}
        <View style={[styles.headerContainer, { paddingTop: 10 }]} pointerEvents="box-none">
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.75)' }]} pointerEvents="none" />
          <View style={styles.dragHandle} />
          <View style={styles.headerContent}>
            <View style={styles.headerCirclePlaceholder} />
            <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={onClose} hitSlop={8} activeOpacity={0.8}>
              <X size={22} color="#111827" strokeWidth={2} />
            </BounceCard>
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: 64 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.contentWrap}>
            {/* ─── Sleek Hero Card ───────────────────────────────────────── */}
            <View style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <View style={styles.musicIconWrap}>
                  <Music size={20} color="#FF6596" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroTitle} numberOfLines={2}>{song.title}</Text>
                  <Text style={styles.heroArtist} numberOfLines={1}>
                    {song.artist || song.composer || 'Unknown Artist'}
                  </Text>
                </View>
              </View>

              {/* Meta Pills Row */}
              <View style={styles.pillsRow}>
                {song.category ? (
                  <View style={[styles.pill, styles.categoryPill]}>
                    <Text style={[styles.pillText, styles.categoryPillText]}>{song.category}</Text>
                  </View>
                ) : null}

                {song.language ? (
                  <View style={[styles.pill, styles.languagePill]}>
                    <Text style={[styles.pillText, styles.languagePillText]}>{song.language}</Text>
                  </View>
                ) : null}

                {song.copyrightInfo ? (
                  <View style={[styles.pill, styles.copyrightPill]}>
                    <Text style={[styles.pillText, styles.copyrightPillText]} numberOfLines={1}>
                      {song.copyrightInfo}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* ─── YouTube Reference Video ────────────────────────────────── */}
            {youtubeVideoId ? (
              <YouTubePlayerView 
                videoId={youtubeVideoId} 
                youtubeUrl={youtubeUrl} 
                title={song.title} 
              />
            ) : null}

            {/* ─── Lyrics Section ──────────────────────────────────────────── */}
            {showLyrics && song.lyrics ? (
              <View style={styles.lyricsCard}>
                <Text style={styles.lyricsHeaderTitle}>LYRICS</Text>
                <Text style={styles.lyricsBodyText}>{song.lyrics}</Text>
              </View>
            ) : (
              <View style={styles.noLyricsCard}>
                <Text style={styles.noLyricsText}>
                  Lyrics are not available in the directory.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { backgroundColor: '#FAFAFA' },
  scrollContent: { paddingBottom: 40 },
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
    width: 36,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerCircle: {
    ...getTopBarButtonShadowStyle(18),
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCirclePlaceholder: { width: 36, height: 36 },
  contentWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  /* Hero Card */
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.03)',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  musicIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFE8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  heroArtist: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  categoryPill: {
    backgroundColor: '#FFE8F0',
  },
  categoryPillText: {
    color: '#FF6596',
  },
  languagePill: {
    backgroundColor: '#F3E8FF',
  },
  languagePillText: {
    color: '#8B5CF6',
  },
  copyrightPill: {
    backgroundColor: '#F3F4F6',
  },
  copyrightPillText: {
    color: '#6B7280',
  },
  /* Lyrics Card */
  lyricsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.03)',
  },
  lyricsHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6596',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  lyricsBodyText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  noLyricsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  noLyricsText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
