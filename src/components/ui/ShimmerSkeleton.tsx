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
const SHIMMER_HIGHLIGHT_WIDTH = 220;

interface ShimmerSkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A shimmer placeholder that animates a left-to-right gradient highlight sweep.
 * Uses react-native-reanimated + expo-linear-gradient for a polished effect.
 */
export default function ShimmerSkeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: ShimmerSkeletonProps) {
  const translateX = useSharedValue(-SHIMMER_HIGHLIGHT_WIDTH);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(SCREEN_WIDTH + SHIMMER_HIGHLIGHT_WIDTH, {
        duration: 1600,
        easing: Easing.linear,
      }),
      -1,   // infinite
      false // don't reverse
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
          backgroundColor: '#EFEFEF',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255, 255, 255, 0.80)',
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
