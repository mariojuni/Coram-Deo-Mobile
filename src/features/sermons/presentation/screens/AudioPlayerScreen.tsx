import { Image } from 'expo-image';
import { sermonRepository } from "../../data/sermon.repository";

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { 
  Play, 
  Pause,
  X,
  Heart,
  MessageSquare,
  Rewind,
  FastForward
} from 'lucide-react-native';
import { useSermonStore } from '@/store/useSermonStore';
import { useSermonPlaybackStore } from '@/store/useSermonPlaybackStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { NoteEditor } from '../components/NoteEditor';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function AudioPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  
  const { playAudio, pauseAudio, seekAudio, setRate, player } = useAudio();
  
  const isPlaying = player?.playing ?? false;
  const sound = player;
  const duration = player?.duration ?? 0;
  const progress = duration > 0 ? (player?.currentTime ?? 0) / duration : 0;

  const { 
    currentSermon, 
    fetchSermonById, 
    toggleFavorite,
    favorites,
    addNote
  } = useSermonStore();
  
  const currentUser = useAuthStore((state) => state.currentUser);
  
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [localPosition, setLocalPosition] = useState(0);

  const { updateProgress, loadProgress, getProgress } = useSermonPlaybackStore();
  const [initialSeekDone, setInitialSeekDone] = useState(false);

  useEffect(() => {
    if (id) {
      fetchSermonById(id);
    }
  }, [id]);

  const loadAudio = async () => {
    if (!currentSermon?.audioStoragePath) return;

    try {
      setIsBuffering(true);
      
      const { getLocalSermonMediaUri } = require('@/features/sermons/services/sermonDownloadService');
      const localUri = await getLocalSermonMediaUri(currentSermon, 'audio');
      
      if (localUri) {
        // Play downloaded file
        await playAudio(localUri, currentSermon.id);
      } else {
        // Play from remote
        const finalUrl = await sermonRepository.resolveMediaUrl(currentSermon.audioStoragePath);
        await playAudio(finalUrl, currentSermon.id);
        
        // Auto-download in the background
        if (currentUser) {
          const { useSermonStore: store } = require('@/store/useSermonStore');
          const isDownloaded = await store.getState().checkIfDownloaded(currentUser.uid, currentSermon.id, 'audio');
          if (!isDownloaded) {
            store.getState().downloadSermon(currentUser.uid, currentSermon, 'audio').catch(console.error);
          }
        }
      }
      
      setIsBuffering(false);
    } catch (error) {
      console.error('Error loading audio:', error);
      setIsBuffering(false);
    }
  };

  useEffect(() => {
    if (currentSermon?.audioStoragePath && !sound) {
      loadAudio();
    }
  }, [currentSermon]);

  useEffect(() => {
    if (currentUser && currentSermon && player && !initialSeekDone) {
      const init = async () => {
        const savedProgress = await loadProgress(currentUser.uid, currentSermon.id);
        if (savedProgress && savedProgress.positionSeconds > 5 && !savedProgress.completed) {
          await seekAudio(savedProgress.positionSeconds);
        }
        setInitialSeekDone(true);
      };
      init();
    }
  }, [currentUser, currentSermon, player, initialSeekDone, loadProgress]);

  useEffect(() => {
    if (currentUser && currentSermon && isPlaying) {
      const interval = setInterval(() => {
        updateProgress(
          currentSermon.churchId,
          currentUser.uid,
          currentSermon.id,
          'audio',
          Math.floor(player?.currentTime || 0),
          Math.floor(duration || 0)
        );
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentUser, currentSermon, isPlaying, duration]);

  const handlePlayPause = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isPlaying) {
      await pauseAudio();
    } else {
      if (sound) {
        const finalUrl = await sermonRepository.resolveMediaUrl(currentSermon?.audioStoragePath || '');
        await playAudio(finalUrl, currentSermon?.id || '');
      } else {
        await loadAudio();
      }
    }
  };

  const handleSeek = async (seconds: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const newPosition = Math.max(0, Math.min(duration, progress * duration + seconds));
    await seekAudio(newPosition);
  };

  const handleSpeedChange = async () => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    const nextSpeed = PLAYBACK_SPEEDS[nextIndex];

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setRate(nextSpeed);
    setPlaybackSpeed(nextSpeed);
  };

  const handleFavorite = async () => {
    if (!currentUser || !currentSermon) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await toggleFavorite(currentUser.uid, currentSermon.id);
  };

  const handleNotes = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowNoteEditor(true);
  };

  const handleClose = () => {
    router.back();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentSermon) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#FF6596" />
      </View>
    );
  }

  const isFavorited = favorites.has(currentSermon.id);
  const currentPosition = progress * duration;

  return (
    <LinearGradient 
      colors={[colors.background, 'rgba(255, 101, 150, 0.05)', colors.background]}
      style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Now Playing</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Album Art */}
      <View style={styles.artworkContainer}>
        <Image 
          source={{ uri: currentSermon.thumbnailUrl }}
          style={styles.artwork}
          resizeMode="cover"
        cachePolicy="memory-disk" transition={200} />
        {isBuffering && (
          <View style={styles.bufferingOverlay}>
            <ActivityIndicator size="large" color="#FFF" />
          </View>
        )}
      </View>

      {/* Song Info */}
      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {currentSermon.title}
        </Text>
        <Text style={[styles.artist, { color: colors.textSecondary }]}>
          {currentSermon.preacherName}
        </Text>
        {currentSermon.seriesTitle && (
          <View style={styles.seriesTag}>
            <Text style={styles.seriesText}>{currentSermon.seriesTitle}</Text>
          </View>
        )}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration > 0 ? duration : 1}
          value={isScrubbing ? localPosition : currentPosition}
          minimumTrackTintColor="#FF6596"
          maximumTrackTintColor="rgba(0, 0, 0, 0.1)"
          thumbTintColor="#FF6596"
          onSlidingStart={() => {
            setIsScrubbing(true);
            setLocalPosition(currentPosition);
          }}
          onValueChange={(val) => setLocalPosition(val)}
          onSlidingComplete={async (val) => {
            setIsScrubbing(false);
            if (player) {
              await seekAudio(val);
            }
          }}
        />
        <View style={styles.timeContainer}>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>
            {formatTime(isScrubbing ? localPosition : currentPosition)}
          </Text>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>
            {formatTime(duration)}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Top Row - Speed & Notes */}
        <View style={styles.topControls}>
          <TouchableOpacity onPress={handleSpeedChange} style={styles.speedButton}>
            <Text style={[styles.speedText, { color: colors.text }]}>
              {playbackSpeed}x
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleNotes} style={styles.iconButton}>
            <MessageSquare size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Main Controls */}
        <View style={styles.mainControls}>
          <TouchableOpacity onPress={() => handleSeek(-15)} style={styles.controlButton}>
            <Rewind size={32} color={colors.text} />
            <Text style={[styles.skipLabel, { color: colors.textSecondary }]}>15s</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
            {isPlaying ? (
              <Pause size={40} color="#FFF" fill="#FFF" />
            ) : (
              <Play size={40} color="#FFF" fill="#FFF" />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleSeek(15)} style={styles.controlButton}>
            <FastForward size={32} color={colors.text} />
            <Text style={[styles.skipLabel, { color: colors.textSecondary }]}>15s</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Row - Favorite */}
        <View style={styles.bottomControls}>
          <TouchableOpacity onPress={handleFavorite} style={styles.favoriteButton}>
            <Heart
              size={28}
              color={isFavorited ? '#FF6596' : colors.text}
              fill={isFavorited ? '#FF6596' : 'transparent'}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Note Editor Modal */}
      {currentUser && (
        <Modal
          visible={showNoteEditor}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowNoteEditor(false)}
        >
          <NoteEditor
            sermonId={currentSermon.id}
            userId={currentUser.uid}
            timestamp={Math.floor(currentPosition)}
            onSave={async (note) => {
              await addNote(note);
              setShowNoteEditor(false);
            }}
            onClose={() => setShowNoteEditor(false)}
          />
        </Modal>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  artworkContainer: {
    alignItems: 'center',
    marginTop: Spacing.four,
    marginBottom: Spacing.four,
  },
  artwork: {
    width: 320,
    height: 320,
    borderRadius: 24,
    backgroundColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  infoContainer: {
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  artist: {
    fontSize: 16,
    marginBottom: Spacing.two,
  },
  seriesTag: {
    backgroundColor: 'rgba(100, 100, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  seriesText: {
    color: '#6464FF',
    fontSize: 13,
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.four,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
  },
  controls: {
    paddingHorizontal: Spacing.four,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
  },
  speedButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  speedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  iconButton: {
    padding: 8,
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    marginBottom: Spacing.four,
  },
  controlButton: {
    alignItems: 'center',
    gap: 4,
  },
  skipLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6596',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomControls: {
    alignItems: 'center',
    paddingTop: Spacing.three,
  },
  favoriteButton: {
    padding: 12,
  },
});
