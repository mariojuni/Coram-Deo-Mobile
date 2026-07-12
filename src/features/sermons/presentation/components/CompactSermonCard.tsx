import React from 'react';
import { View, Text, Pressable, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { ListPlus, CloudDownload, MoreVertical } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import type { Sermon } from '../../domain/sermon.types';
import * as Haptics from 'expo-haptics';

interface CompactSermonCardProps {
  sermon: Sermon;
  onPress: () => void;
}

export function CompactSermonCard({ sermon, onPress }: CompactSermonCardProps) {
  const colors = useTheme();
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

  return (
    <Pressable 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View style={[styles.container, animatedStyle]}>
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: sermon.thumbnailUrl }} 
            style={styles.thumbnail}
            resizeMode="cover"
          />
        </View>

        <View style={styles.contentContainer}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {sermon.title}
          </Text>
          <Text style={[styles.speaker, { color: colors.textSecondary }]} numberOfLines={1}>
            {sermon.preacherName}
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.iconButton} hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}>
            <ListPlus size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}>
            <CloudDownload size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} hitSlop={{ top: 10, bottom: 10, left: 5, right: 10 }}>
            <MoreVertical size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.two,
  },
  imageContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
    marginRight: Spacing.three,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: Spacing.two,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    lineHeight: 22,
  },
  speaker: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 4,
  },
});
