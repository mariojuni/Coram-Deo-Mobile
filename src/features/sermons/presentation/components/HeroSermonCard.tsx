import React from 'react';
import { View, Text, Pressable, StyleSheet, ImageBackground } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { Play } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing } from '@/constants/theme';
import type { Sermon } from '../../domain/sermon.types';
import * as Haptics from 'expo-haptics';

interface HeroSermonCardProps {
  sermon: Sermon;
  onPress: () => void;
  isNew?: boolean;
}

export function HeroSermonCard({ sermon, onPress, isNew = false }: HeroSermonCardProps) {
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

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${mins}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View style={[styles.card, animatedStyle]}>
        <ImageBackground
          source={{ uri: sermon.thumbnailUrl }}
          style={styles.imageBackground}
          imageStyle={styles.image}
        >
          {/* Top Badges */}
          <View style={styles.topBadges}>
            {isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{formatDuration(sermon.durationSeconds || 0)}</Text>
            </View>
          </View>

          {/* Bottom Content with Gradient Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']}
            style={styles.gradient}
          >
            <View style={styles.contentContainer}>
              <View style={styles.textContainer}>
                <Text style={styles.title} numberOfLines={2}>
                  {sermon.title}
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {formatDate(sermon.sermonDate)} • {sermon.preacherName}
                </Text>
              </View>
              
              <View style={styles.playButton}>
                <Play fill="#000" color="#000" size={24} />
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 200,
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  imageBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
  },
  image: {
    borderRadius: 20,
  },
  topBadges: {
    flexDirection: 'row',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  newBadge: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  newBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  durationBadge: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  gradient: {
    padding: Spacing.four,
    paddingTop: 40, // Ensure gradient fades up nicely, adjusted for 200 height
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    paddingRight: Spacing.four,
  },
  title: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 26,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4, // visually center the play triangle
  },
});
