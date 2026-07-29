import React, { useEffect } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { StyleProp, ViewStyle, DimensionValue } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SHIMMER_HIGHLIGHT_WIDTH = SCREEN_WIDTH * 0.65;

interface ShimmerSkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  /** Override the base background color */
  baseColor?: string;
}

/**
 * Modern shimmer placeholder that sweeps a brand-tinted highlight left→right.
 * Uses the app's pink → purple palette for a cohesive, premium look.
 */
export default function ShimmerSkeleton({
  width = '100%',
  height = 20,
  borderRadius = 12,
  style,
  baseColor = '#EDF0F7',
}: ShimmerSkeletonProps) {
  const translateX = useSharedValue(-SHIMMER_HIGHLIGHT_WIDTH);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(SCREEN_WIDTH + SHIMMER_HIGHLIGHT_WIDTH, {
        duration: 2600,
        easing: Easing.bezier(0.4, 0, 0.6, 1),
      }),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseColor,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255, 101, 150, 0.06)',
            'rgba(182, 109, 255, 0.09)',
            'rgba(255, 255, 255, 0.60)',
            'rgba(182, 109, 255, 0.09)',
            'rgba(255, 101, 150, 0.06)',
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: SHIMMER_HIGHLIGHT_WIDTH, height: '100%' }}
        />
      </Animated.View>
    </View>
  );
}
