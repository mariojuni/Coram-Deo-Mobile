import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import type { Sermon } from '../../domain/sermon.types';
import * as Haptics from 'expo-haptics';

interface HorizontalSermonCardProps {
  sermon: Sermon;
  onPress: () => void;
}

export function HorizontalSermonCard({ sermon, onPress }: HorizontalSermonCardProps) {
  const colors = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.get() }]
    };
  });

  const handlePressIn = () => {
    scale.set(withTiming(0.95, { duration: 150 }));
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

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={styles.pressable}
    >
      <Animated.View style={[styles.container, animatedStyle]}>
        {/* Thumbnail */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: sermon.thumbnailUrl }}
            style={styles.image}
            resizeMode="cover"
          />
          {/* Duration Badge */}
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(sermon.duration)}</Text>
          </View>
        </View>

        {/* Text Content */}
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {sermon.title}
          </Text>
          <Text style={[styles.speaker, { color: colors.textSecondary }]} numberOfLines={1}>
            {sermon.speaker.name}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginRight: Spacing.four,
  },
  container: {
    width: 190, 
  },
  imageContainer: {
    width: '100%',
    height: 106, // Maintains ~16:9 aspect ratio
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
    marginBottom: Spacing.two,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    paddingRight: Spacing.two,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  speaker: {
    fontSize: 12,
    fontWeight: '500',
  },
});
