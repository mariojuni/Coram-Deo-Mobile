import { sermonRepository } from "../../data/sermon.repository";

import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, BookOpen, User, Calendar, ChevronDown, ChevronUp, Share2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useSermonStore } from '@/store/useSermonStore';
import { useSermonPlaybackStore } from '@/store/useSermonPlaybackStore';
import { useAuthStore } from '@/store/useAuthStore';
import { getLocalSermonMediaUri } from '@/features/sermons/services/sermonDownloadService';
import { SermonVideoPlayer } from '../components/SermonVideoPlayer';
import { SermonActionBar } from '../components/SermonActionBar';
import { RelatedSermonCard } from '../components/RelatedSermonCard';

const NAVY = '#1A1A1A';
const GOLD = '#FF6596';
const BEIGE = '#FAFAFA';
const OLIVE = '#C084FC';

export function SermonWatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const currentUser = useAuthStore((s) => s.currentUser);
  const userProfile = useAuthStore((s) => s.userProfile);

  const {
    currentSermon,
    loading,
    fetchSermonById,
    relatedSermons,
    relatedLoading,
    fetchRelatedSermons,
    downloadSermon,
    downloadedSermons,
    downloads,
    checkIfDownloaded,
  } = useSermonStore();

  const { loadProgress, updateProgress, getProgress } = useSermonPlaybackStore();

  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const progressInterval = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load sermon
  useEffect(() => {
    if (id) {
      fetchSermonById(id);
    }
  }, [id]);

  // Load saved progress
  useEffect(() => {
    if (currentUser && id) {
      loadProgress(currentUser.uid, id);
    }
  }, [currentUser, id]);

  // Resolve video source
  useEffect(() => {
    if (!currentSermon?.videoStoragePath) return;

    const resolve = async () => {
      try {
        const local = await getLocalSermonMediaUri(currentSermon, 'video');
        const finalUrl = local ?? await sermonRepository.resolveMediaUrl(currentSermon.videoStoragePath!);
        setVideoSource(finalUrl);
      } catch {
        const fallbackUrl = await sermonRepository.resolveMediaUrl(currentSermon.videoStoragePath!);
        setVideoSource(fallbackUrl);
      }
    };
    resolve();
  }, [currentSermon]);

  // Fetch related sermons
  useEffect(() => {
    if (currentSermon) {
      fetchRelatedSermons(currentSermon);
    }
  }, [currentSermon?.id]);

  // Check download status
  useEffect(() => {
    if (!currentUser || !currentSermon) return;
    checkIfDownloaded(currentUser.uid, currentSermon.id, 'audio').then(setIsDownloaded);
  }, [currentUser, currentSermon, downloadedSermons]);

  const savedProgress = id ? getProgress(id) : undefined;

  const handleVideoProgress = (positionSec: number, durationSec: number) => {
    if (!currentUser || !currentSermon) return;
    // Throttle: only save every ~5s by tracking last saved
    if (!progressInterval.current) {
      progressInterval.current = setTimeout(() => {
        updateProgress(
          currentSermon.churchId,
          currentUser.uid,
          currentSermon.id,
          'video',
          positionSec,
          durationSec
        );
        progressInterval.current = null;
      }, 5000);
    }
  };

  const handleWatch = () => {
    // Already on watch screen — video is inline
    // This is a no-op since player is already shown
  };

  const handleShare = async () => {
    if (!currentSermon) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `"${currentSermon.title}" by ${currentSermon.preacherName} — ${currentSermon.scriptureReference ?? ''}`,
        title: currentSermon.title,
      });
    } catch (e) {
      // User dismissed
    }
  };

  const handleListen = () => {
    if (!currentSermon) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/audio-player?id=${currentSermon.id}`);
  };

  const handleDownloadAudio = async () => {
    if (!currentUser || !currentSermon || !currentSermon.audioStoragePath) return;
    setIsDownloading(true);
    try {
      await downloadSermon(currentUser.uid, currentSermon, 'audio');
      setIsDownloaded(true);
    } catch (e) {
      console.error('Download failed:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRelatedPress = (sermonId: string) => {
    router.push({ pathname: '/sermon-watch', params: { id: sermonId } });
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  if (loading && !currentSermon) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  if (!currentSermon) return null;

  const hasVideo = currentSermon.mediaType === 'video' || currentSermon.mediaType === 'both';
  const hasAudio = currentSermon.mediaType === 'audio' || currentSermon.mediaType === 'both';
  const descriptionLong = (currentSermon.description?.length ?? 0) > 160;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ─── Video Player (sticky top) ─── */}
      {hasVideo ? (
        <View style={[styles.playerWrapper, { paddingTop: insets.top }]}>
          {/* Back button overlay */}
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 8 }]}
            onPress={() => {
              if (progressInterval.current) clearTimeout(progressInterval.current);
              router.back();
            }}
          >
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>

          <SermonVideoPlayer
            sermon={currentSermon}
            savedProgress={savedProgress}
            onProgress={handleVideoProgress}
            onComplete={() => {
              if (currentUser && currentSermon) {
                updateProgress(
                  currentSermon.churchId,
                  currentUser.uid,
                  currentSermon.id,
                  'video',
                  currentSermon.durationSeconds ?? 0,
                  currentSermon.durationSeconds ?? 0
                );
              }
            }}
            videoSource={hasVideo ? videoSource : null}
          />
        </View>
      ) : (
        // Audio-only: show back button in top bar
        <View style={[styles.audioHeader, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.audioBackBtn}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color={NAVY} />
          </TouchableOpacity>
          <Text style={styles.audioHeaderTitle} numberOfLines={1}>
            {currentSermon.title}
          </Text>
        </View>
      )}

      {/* ─── Scrollable Content ─── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Series badge */}
        {currentSermon.seriesTitle && (
          <View style={styles.seriesBadge}>
            <Text style={styles.seriesBadgeText}>{currentSermon.seriesTitle}</Text>
          </View>
        )}

        {/* Title and Share */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>{currentSermon.title}</Text>
          <TouchableOpacity onPress={handleShare} style={styles.shareBtnCompact} activeOpacity={0.7}>
            <Share2 size={20} color={NAVY} />
          </TouchableOpacity>
        </View>

        {/* Scripture reference */}
        {currentSermon.scriptureReference && (
          <View style={styles.scriptureRow}>
            <BookOpen size={14} color={GOLD} />
            <Text style={styles.scriptureText}>{currentSermon.scriptureReference}</Text>
          </View>
        )}

        {/* Meta row: preacher + date */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <User size={13} color="#9CA3AF" />
            <Text style={styles.metaText}>{currentSermon.preacherName}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Calendar size={13} color="#9CA3AF" />
            <Text style={styles.metaText}>{formatDate(currentSermon.sermonDate)}</Text>
          </View>
        </View>

        {/* Action Bar */}
        <View style={styles.actionSection}>
          <SermonActionBar
            sermon={currentSermon}
            onWatch={handleWatch}
            onListen={handleListen}
            onDownloadAudio={handleDownloadAudio}
            isDownloading={isDownloading}
            isDownloaded={isDownloaded}
          />
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Description */}
        {currentSermon.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About This Sermon</Text>
            <Text
              style={styles.description}
              numberOfLines={isDescriptionExpanded ? undefined : 4}
            >
              {currentSermon.description}
            </Text>
            {descriptionLong && (
              <TouchableOpacity
                onPress={() => setIsDescriptionExpanded((p) => !p)}
                style={styles.expandBtn}
              >
                {isDescriptionExpanded ? (
                  <ChevronUp size={16} color={GOLD} />
                ) : (
                  <ChevronDown size={16} color={GOLD} />
                )}
                <Text style={styles.expandBtnText}>
                  {isDescriptionExpanded ? 'Show less' : 'Read more'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* Related Sermons */}
        {(relatedSermons.length > 0 || relatedLoading) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Related Sermons</Text>
            {relatedLoading ? (
              <ActivityIndicator size="small" color={GOLD} style={{ marginTop: 12 }} />
            ) : (
              relatedSermons.map((s) => (
                <RelatedSermonCard
                  key={s.id}
                  sermon={s}
                  onPress={() => handleRelatedPress(s.id)}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BEIGE,
  },
  playerWrapper: {
    backgroundColor: '#000',
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    left: 12,
    zIndex: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE3',
    gap: 12,
  },
  audioBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BEIGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioHeaderTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 0,
  },
  seriesBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,101,150,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  seriesBadgeText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
    color: NAVY,
    letterSpacing: -0.3,
    lineHeight: 30,
    paddingRight: 12,
  },
  shareBtnCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(26,26,26,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -2,
  },
  scriptureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,101,150,0.08)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 12,
  },
  scriptureText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  actionSection: {
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0EBE3',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4B5563',
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  expandBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: GOLD,
  },
});
