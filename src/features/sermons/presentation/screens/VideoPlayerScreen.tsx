import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Maximize, 
  Volume2,
  X,
  FileText
} from 'lucide-react-native';
import { useSermonStore } from '@/store/useSermonStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from '@/hooks/use-theme';
import { Colors, Spacing } from '@/constants/theme';
import { NoteEditor } from '../components/NoteEditor';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function VideoPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  
  const progressInterval = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoViewRef = useRef<VideoView>(null);
  
  const { currentSermon, fetchSermonById, saveProgress, setCurrentPosition, setIsPlaying, addNote } = useSermonStore();
  const currentUser = useAuthStore((state) => state.currentUser);
  
  const [isPlaying, setLocalIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showNoteEditor, setShowNoteEditor] = useState(false);

  const player = useVideoPlayer(currentSermon?.videoUrl || null, player => {
    player.loop = false;
  });

  const duration = player?.duration ? player.duration * 1000 : 0;

  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    setLocalIsPlaying(isPlaying);
    setIsPlaying(isPlaying);
    
    if (isPlaying) {
      setIsBuffering(false);
    }
  });

  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'loading' || status === 'error') {
      setIsBuffering(status === 'loading');
    } else if (status === 'readyToPlay') {
      setIsBuffering(false);
    }
  });

  useEventListener(player, 'timeUpdate', (payload) => {
    const currentPos = payload.currentTime;
    setPosition(currentPos * 1000);
    setCurrentPosition(Math.floor(currentPos));

    if (currentUser && currentSermon && player.playing) {
      if (!progressInterval.current) {
        progressInterval.current = setInterval(() => {
          saveProgress(currentUser.uid, currentSermon.id, Math.floor(player.currentTime));
        }, 5000);
      }
    }
  });

  useEffect(() => {
    if (id) {
      fetchSermonById(id);
    }

    return () => {
      // Cleanup
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [id]);

  useEffect(() => {
    // Auto-hide controls after 3 seconds
    if (showControls && isPlaying) {
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [showControls, isPlaying]);

  const handlePlayPause = () => {
    if (!player) return;

    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleSeek = (seconds: number) => {
    if (!player) return;
    
    const newPosition = Math.max(0, Math.min(player.duration, player.currentTime + seconds));
    // eslint-disable-next-line react-hooks/immutability
    player.currentTime = newPosition;
  };

  const handleFullscreen = () => {
    if (videoViewRef.current) {
      videoViewRef.current.enterFullscreen();
    }
  };

  const handleClose = () => {
    router.back();
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentSermon || !currentSermon.videoUrl) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#FF6596" />
      </View>
    );
  }

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      <TouchableOpacity 
        style={styles.videoContainer}
        activeOpacity={1}
        onPress={() => setShowControls(!showControls)}
      >
        <VideoView
          ref={videoViewRef}
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
        />

        {/* Buffering Indicator */}
        {isBuffering && (
          <View style={styles.bufferingContainer}>
            <ActivityIndicator size="large" color="#FFF" />
          </View>
        )}

        {/* Controls Overlay */}
        {showControls && (
          <LinearGradient 
            colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.8)']}
            style={[styles.controlsOverlay, { paddingTop: Math.max(insets.top, Spacing.three) }]}
          >
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={28} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.titleContainer}>
                <Text style={styles.videoTitle} numberOfLines={1}>
                  {currentSermon.title}
                </Text>
                <Text style={styles.videoSubtitle}>
                  {currentSermon.speaker.name}
                </Text>
              </View>
            </View>

            {/* Center Play Button */}
            <View style={styles.centerControls}>
              <TouchableOpacity onPress={() => handleSeek(-15)} style={styles.controlButton}>
                <SkipBack size={36} color="#FFF" />
                <Text style={styles.skipText}>15</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
                {isPlaying ? (
                  <Pause size={48} color="#FFF" fill="#FFF" />
                ) : (
                  <Play size={48} color="#FFF" fill="#FFF" />
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleSeek(15)} style={styles.controlButton}>
                <SkipForward size={36} color="#FFF" />
                <Text style={styles.skipText}>15</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Bar */}
            <View style={styles.bottomBar}>
              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <Text style={styles.timeText}>{formatTime(position)}</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.bottomActions}>
                <TouchableOpacity style={styles.iconButton}>
                  <Volume2 size={24} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleFullscreen} style={styles.iconButton}>
                  <Maximize size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Floating Note Button */}
        {!showNoteEditor && (
          <TouchableOpacity
            style={styles.floatingNoteButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowNoteEditor(true);
            }}
            activeOpacity={0.8}
          >
            <FileText size={24} color="#FFF" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

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
            timestamp={Math.floor(position / 1000)}
            onSave={async (note) => {
              await addNote(note);
              setShowNoteEditor(false);
            }}
            onClose={() => setShowNoteEditor(false)}
          />
        </Modal>
      )}
    </View>
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
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  bufferingContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  closeButton: {
    padding: 8,
  },
  titleContainer: {
    flex: 1,
  },
  videoTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  videoSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
  },
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 48,
  },
  controlButton: {
    padding: 12,
    position: 'relative',
  },
  skipText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -6 }, { translateY: -8 }],
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 101, 150, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    gap: Spacing.two,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  timeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 45,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6596',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  iconButton: {
    padding: 8,
  },
  floatingNoteButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6596',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

