import { Image } from 'expo-image';
import { BounceCard } from '@/components/ui/BounceCard';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Play, Pause, X } from 'lucide-react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSermonStore } from '@/store/useSermonStore';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useUIStore } from '@/store/useUIStore';

interface MiniAudioPlayerProps {
  onPlayPause: () => void;
  onClose: () => void;
}

export function MiniAudioPlayer({ onPlayPause, onClose }: MiniAudioPlayerProps) {
  const router = useRouter();
  const colors = useTheme();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  
  const { currentSermon, isPlaying, currentPosition } = useSermonStore();
  const hideCompactPlayer = useUIStore((s) => s.hideCompactPlayer);

  const handlePlayPause = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPlayPause();
  };

  const handleExpand = () => {
    if (currentSermon) {
      router.push({
        pathname: '/audio-player',
        params: { id: currentSermon.id }
      });
    }
  };

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentSermon || hideCompactPlayer) return null;

  const progress = currentSermon.durationSeconds && currentSermon.durationSeconds > 0 
    ? (currentPosition / currentSermon.durationSeconds) * 100 
    : 0;

  return (
    <Animated.View 
      entering={SlideInDown.springify()}
      exiting={SlideOutDown.springify()}
      style={[
        styles.container, 
        { 
          bottom: Math.max(insets.bottom, 16) + 80, // Generous padding above tab bar
        }
      ]}
    >
      <View style={styles.innerContainer}>
        <BlurView 
          intensity={80} 
          tint={colorScheme === 'dark' ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} 
        />
        
        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.backgroundElement }]}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        <BounceCard bounceScale={0.85} 
          onPress={handleExpand}
          style={[styles.content, { backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)' }]}
        >
          {/* Thumbnail */}
          <Image 
            source={{ uri: currentSermon.thumbnailUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
          cachePolicy="memory-disk" transition={200} />

          {/* Info */}
          <View style={styles.info}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {currentSermon.title}
            </Text>
            <View style={styles.subtitle}>
              <Text style={[styles.artist, { color: colors.textSecondary }]} numberOfLines={1}>
                {currentSermon.preacherName}
              </Text>
              <Text style={[styles.time, { color: colors.textSecondary }]}>
                {formatTime(currentPosition)}
              </Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              onPress={handlePlayPause}
              style={styles.playButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isPlaying ? (
                <Pause size={24} color={colors.text} fill={colors.text} />
              ) : (
                <Play size={24} color={colors.text} fill={colors.text} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </BounceCard>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 64,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  innerContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  progressBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  progressBar: {
    height: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6596',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.two,
    paddingRight: Spacing.two,
    borderRadius: 12,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  info: {
    flex: 1,
    marginLeft: Spacing.two,
    marginRight: Spacing.two,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  artist: {
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 11,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
});
