import { View, Text, Pressable, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { Heart, Clock, User } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import type { Sermon } from '../../domain/sermon.types';
import * as Haptics from 'expo-haptics';

interface SermonCardProps {
  sermon: Sermon;
  onPress: () => void;
  onFavorite: () => void;
  isFavorited: boolean;
}

export function SermonCard({ sermon, onPress, onFavorite, isFavorited }: SermonCardProps) {
  const colors = useTheme();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${remainingMins}m`;
    }
    return `${mins} min`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const handleFavorite = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onFavorite();
  };

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.get() }]
    };
  });

  const handlePressIn = () => {
    scale.set(withTiming(0.97, { duration: 150 }));
  };

  const handlePressOut = () => {
    scale.set(withTiming(1, { duration: 150 }));
  };

  return (
    <Pressable 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View
        style={[
          styles.card,
          animatedStyle,
          { backgroundColor: colors.backgroundElement }
        ]}
      >
          {/* Thumbnail */}
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: sermon.thumbnailUrl }} 
              style={styles.thumbnail}
              resizeMode="cover"
            />
            {/* Badge for type */}
            <View style={[styles.badge, sermon.mediaType === 'video' ? styles.videoBadge : styles.audioBadge]}>
              <Text style={styles.badgeText}>{sermon.mediaType.toUpperCase()}</Text>
            </View>

            {/* Favorite button */}
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={handleFavorite}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Heart
                size={22}
                color={isFavorited ? '#FF6596' : '#FFF'}
                fill={isFavorited ? '#FF6596' : 'transparent'}
                strokeWidth={2.5}
              />
            </TouchableOpacity>
          </View>
          
          {/* Content */}
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {sermon.title}
            </Text>
            
            <View style={styles.meta}>
              <View style={styles.metaItem}>
                <User size={14} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {sermon.preacherName}
                </Text>
              </View>
              
              <View style={styles.metaItem}>
                <Clock size={14} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {formatDuration(sermon.durationSeconds || 0)}
                </Text>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={[styles.date, { color: colors.textSecondary }]}>
                {formatDate(sermon.sermonDate)}
              </Text>
              
              {sermon.seriesTitle && (
                <View style={styles.seriesTag}>
                  <Text style={styles.seriesText} numberOfLines={1}>{sermon.seriesTitle}</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginBottom: Spacing.four,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  imageContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E0E0E0',
  },
  badge: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  videoBadge: {
    backgroundColor: 'rgba(255, 59, 48, 0.95)',
  },
  audioBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.95)',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  favoriteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    padding: 10,
  },
  content: {
    padding: Spacing.four,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: Spacing.three,
    lineHeight: 28,
  },
  meta: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginBottom: Spacing.three,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  date: {
    fontSize: 13,
    fontWeight: '500',
  },
  seriesTag: {
    backgroundColor: 'rgba(100, 100, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    maxWidth: '60%',
  },
  seriesText: {
    color: '#6464FF',
    fontSize: 13,
    fontWeight: '700',
  },
});
