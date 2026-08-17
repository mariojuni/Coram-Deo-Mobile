import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView, ActivityIndicator, Share } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Play, Pause, Maximize2, MoreVertical, Download, BookOpen, User, Calendar, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useUIStore } from '@/store/useUIStore';
import { useGlobalVideoStore } from '@/store/useGlobalVideoStore';
import { useSermonStore } from '@/store/useSermonStore';
import { useSermonPlaybackStore } from '@/store/useSermonPlaybackStore';
import { useAuthStore } from '@/store/useAuthStore';
import { SermonVideoPlayer } from './SermonVideoPlayer';
import { getLocalSermonMediaUri } from '../../services/sermonDownloadService';
import { sermonRepository } from '../../data/sermon.repository';
import { SermonActionBar } from './SermonActionBar';
import { RelatedSermonCard } from './RelatedSermonCard';
import { SermonActionMenu } from './SermonActionMenu';
import { CircularProgress } from './CircularProgress';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MINI_PLAYER_HEIGHT = 64;
const NAVY = '#1A1A1A';
const GOLD = '#FF6596';
const BEIGE = '#FAFAFA';

export function GlobalVideoPlayer() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeSermonId, playerMode, closeVideo, minimize, expand } = useGlobalVideoStore();

  const currentUser = useAuthStore((s) => s.currentUser);
  const {
    currentSermon,
    fetchSermonById,
    relatedSermons,
    relatedLoading,
    fetchRelatedSermons,
    downloadSermon,
    downloads,
    checkIfDownloaded,
    deleteDownload,
  } = useSermonStore();

  const { loadProgress, updateProgress, getProgress, unhideSermon } = useSermonPlaybackStore();

  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isProgressLoaded, setIsProgressLoaded] = useState(false);
  const [isActionMenuVisible, setIsActionMenuVisible] = useState(false);
  const progressInterval = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animation values
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const tabBarVisible = useUIStore((s) => s.tabBarVisible);
  
  const MAX_TRANSLATE_Y = SCREEN_HEIGHT - MINI_PLAYER_HEIGHT - Math.max(insets.bottom, 16) - 90; // Above tab bar
  const HIDDEN_OFFSET = 85; // Distance to slide down to stick to bottom safe area

  useEffect(() => {
    if (activeSermonId) {
      fetchSermonById(activeSermonId);
      unhideSermon(activeSermonId);
    }
  }, [activeSermonId]);

  useEffect(() => {
    if (currentUser && activeSermonId) {
      loadProgress(currentUser.uid, activeSermonId).finally(() => {
        setIsProgressLoaded(true);
      });
    } else if (!currentUser) {
      setIsProgressLoaded(true);
    }
  }, [currentUser, activeSermonId]);

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

  useEffect(() => {
    if (currentSermon) {
      fetchRelatedSermons(currentSermon);
    }
  }, [currentSermon?.id]);

  useEffect(() => {
    if (playerMode === 'expanded') {
      translateY.value = withSpring(0, { damping: 40, stiffness: 250, overshootClamping: true });
    } else if (playerMode === 'minimized') {
      const targetY = tabBarVisible ? MAX_TRANSLATE_Y : MAX_TRANSLATE_Y + HIDDEN_OFFSET;
      translateY.value = withSpring(targetY, { damping: 40, stiffness: 250, overshootClamping: true });
    } else if (playerMode === 'hidden') {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 });
    }
  }, [playerMode, tabBarVisible]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (playerMode === 'expanded') {
        translateY.value = Math.max(0, event.translationY);
      } else if (playerMode === 'minimized') {
        const targetY = tabBarVisible ? MAX_TRANSLATE_Y : MAX_TRANSLATE_Y + HIDDEN_OFFSET;
        translateY.value = Math.min(SCREEN_HEIGHT, Math.max(0, targetY + event.translationY));
      }
    })
    .onEnd((event) => {
      if (playerMode === 'expanded') {
        if (event.translationY > 150 || event.velocityY > 500) {
          runOnJS(minimize)();
        } else {
          runOnJS(expand)();
        }
      } else if (playerMode === 'minimized') {
        if (event.translationY < -50 || event.velocityY < -500) {
          runOnJS(expand)();
        } else if (event.translationY > 50 || event.velocityY > 500) {
          // Swipe down to dismiss
          runOnJS(closeVideo)();
        } else {
          runOnJS(minimize)();
        }
      }
    });

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: playerMode === 'hidden' && translateY.value >= SCREEN_HEIGHT ? 0 : 1,
    };
  });

  const animatedVideoStyle = useAnimatedStyle(() => {
    const isMin = translateY.value > MAX_TRANSLATE_Y / 2;
    // Morph from full width to card width
    const width = interpolate(translateY.value, [0, MAX_TRANSLATE_Y], [SCREEN_WIDTH, SCREEN_WIDTH - 32], Extrapolation.CLAMP);
    // Morph from 16:9 to card height
    const height = interpolate(translateY.value, [0, MAX_TRANSLATE_Y], [SCREEN_WIDTH * (9 / 16), 72], Extrapolation.CLAMP);
    const top = interpolate(translateY.value, [0, MAX_TRANSLATE_Y], [insets.top, 0], Extrapolation.CLAMP);
    const left = interpolate(translateY.value, [0, MAX_TRANSLATE_Y], [0, 16], Extrapolation.CLAMP);
    const borderRadius = interpolate(translateY.value, [0, MAX_TRANSLATE_Y], [0, 20], Extrapolation.CLAMP);
    
    // Background and shadow morphing
    const backgroundColor = interpolateColor(translateY.value, [0, MAX_TRANSLATE_Y], ['#000000', 'transparent']);
    const shadowOpacity = interpolate(translateY.value, [0, MAX_TRANSLATE_Y], [0.3, 0.04], Extrapolation.CLAMP);
    const shadowColor = interpolateColor(translateY.value, [0, MAX_TRANSLATE_Y], ['#000000', '#A4A4A4']);
    
    return {
      width,
      height,
      top,
      left,
      borderRadius,
      backgroundColor,
      shadowOpacity,
      shadowColor,
    };
  });

  const animatedInnerStyle = useAnimatedStyle(() => {
    return {
      borderRadius: interpolate(translateY.value, [0, MAX_TRANSLATE_Y], [0, 20], Extrapolation.CLAMP),
    };
  });

  const animatedContentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateY.value, [0, MAX_TRANSLATE_Y / 2], [1, 0], Extrapolation.CLAMP);
    return {
      opacity,
      pointerEvents: opacity === 0 ? 'none' : 'auto',
    };
  });

  const handleVideoProgress = (positionSec: number, durationSec: number) => {
    if (!currentUser || !currentSermon) return;
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

  const savedProgress = activeSermonId ? getProgress(activeSermonId) : undefined;
  
  if (playerMode === 'hidden' && translateY.value >= SCREEN_HEIGHT) return null;

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]} pointerEvents="box-none">
      <GestureDetector gesture={panGesture}>
        <Animated.View style={styles.contentWrapper} pointerEvents="box-none">
          
          {/* Scrollable Content (Fades out when minimized) */}
          <Animated.View style={[styles.scrollContainer, animatedContentStyle]}>
            {currentSermon && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: SCREEN_WIDTH * (9 / 16) + insets.top + 24, paddingBottom: 100, paddingHorizontal: 20 }}
              >
                {/* Copied from SermonWatchScreen */}
                {currentSermon.seriesTitle && (
                  <View style={styles.seriesBadge}>
                    <Text style={styles.seriesBadgeText}>{currentSermon.seriesTitle}</Text>
                  </View>
                )}
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={2}>{currentSermon.title}</Text>
                </View>
                {currentSermon.scriptureReference && (
                  <View style={styles.scriptureRow}>
                    <BookOpen size={14} color={GOLD} />
                    <Text style={styles.scriptureText}>{currentSermon.scriptureReference}</Text>
                  </View>
                )}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <User size={13} color="#9CA3AF" />
                    <Text style={styles.metaText}>{currentSermon.preacherName}</Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <Calendar size={13} color="#9CA3AF" />
                    <Text style={styles.metaText}>{currentSermon.sermonDate.toLocaleDateString()}</Text>
                  </View>
                </View>
                
                <SermonActionBar
                  sermon={currentSermon}
                  onWatch={() => {}}
                  onListen={() => { closeVideo(); router.push(`/audio-player?id=${currentSermon.id}`); }}
                  onDownloadAudio={() => {}}
                  isDownloading={false}
                  isDownloaded={isDownloaded}
                />
                
                <View style={styles.divider} />
                
                {currentSermon.description && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About This Sermon</Text>
                    <Text style={styles.description} numberOfLines={isDescriptionExpanded ? undefined : 4}>
                      {currentSermon.description}
                    </Text>
                  </View>
                )}
                
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Related Sermons</Text>
                  {relatedLoading ? (
                    <ActivityIndicator size="small" color={GOLD} />
                  ) : (
                    relatedSermons.map(s => (
                      <RelatedSermonCard key={s.id} sermon={s} onPress={() => useGlobalVideoStore.getState().openVideo(s.id)} />
                    ))
                  )}
                </View>
              </ScrollView>
            )}
          </Animated.View>

          {/* Video Player Header (Morphs into Card) */}
          <Animated.View style={[styles.videoHeader, animatedVideoStyle]}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.videoHeaderInner, animatedInnerStyle]}>
              {currentSermon && (
                <SermonVideoPlayer
                  sermon={currentSermon}
                  savedProgress={savedProgress}
                  onProgress={handleVideoProgress}
                  videoSource={isProgressLoaded ? videoSource : null}
                  isMinimized={playerMode === 'minimized'}
                  onClose={() => closeVideo()}
                  onExpand={() => expand()}
                />
              )}
            </Animated.View>
            
            {/* Expanded Header Overlay (Close button) */}
            <Animated.View style={[styles.expandedOverlay, animatedContentStyle, { top: insets.top + 12 }]}>
              <TouchableOpacity style={styles.backBtnInner} onPress={() => minimize()}>
                <ChevronDown size={28} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  contentWrapper: {
    flex: 1,
  },
  videoHeader: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 10,
  },
  videoHeaderInner: {
    overflow: 'hidden',
  },
  expandedOverlay: {
    position: 'absolute',
    left: 12,
    zIndex: 100,
  },
  backBtnInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniControlsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
  },
  miniTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
  },
  miniArtist: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  miniBtn: {
    padding: 8,
  },
  scrollContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BEIGE,
  },
  // Copied from SermonWatchScreen
  seriesBadge: { backgroundColor: 'rgba(255,101,150,0.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10, alignSelf: 'flex-start' },
  seriesBadgeText: { color: GOLD, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  title: { flexShrink: 1, fontSize: 22, fontWeight: '900', color: NAVY, letterSpacing: -0.3, lineHeight: 30 },
  scriptureRow: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,101,150,0.08)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, marginBottom: 12 },
  scriptureText: { color: GOLD, fontSize: 13, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  metaDivider: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB' },
  divider: { height: 1, backgroundColor: '#F0EBE3', marginVertical: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: NAVY, marginBottom: 12, letterSpacing: -0.2 },
  description: { fontSize: 15, lineHeight: 24, color: '#4B5563' },
});
