import React, { useEffect } from 'react';
import { StyleSheet, View, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { BrandColors } from '@/constants/theme';

interface AnimatedSplashScreenProps {
  onAnimationFinish: () => void;
}

export function AppLogoSvg({
  size = 140,
  dotScale = 1,
  glowOpacity = 1,
}: {
  size?: number;
  dotScale?: number;
  glowOpacity?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 400 400" fill="none">
      <Defs>
        <LinearGradient id="archGradient" x1="80" y1="80" x2="320" y2="320" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#4F3894"/>
          <Stop offset="45%" stopColor="#8B4FB3"/>
          <Stop offset="75%" stopColor="#E84F7A"/>
          <Stop offset="100%" stopColor="#FF5252"/>
        </LinearGradient>
        <RadialGradient id="centerGlow" cx="200" cy="200" r="35" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={glowOpacity}/>
          <Stop offset="40%" stopColor="#FF94B8" stopOpacity={glowOpacity * 0.8}/>
          <Stop offset="75%" stopColor="#E84F7A" stopOpacity={glowOpacity * 0.4}/>
          <Stop offset="100%" stopColor="#E84F7A" stopOpacity="0"/>
        </RadialGradient>
      </Defs>

      {/* Main Arch Shape with background cutout matching home screen */}
      <Path d="M 100,320 L 100,180 A 100,100 0 0,1 300,180 L 300,320 L 200,270 Z" fill="url(#archGradient)"/>
      <Path d="M 145,270 L 145,180 A 55,55 0 0,1 255,180 L 255,270 Z" fill="#FAFAFA"/>

      {/* Animated Glowing Center Dot */}
      <Circle cx="200" cy="200" r={24 * dotScale} fill="url(#centerGlow)"/>
      <Circle cx="200" cy="200" r={8 * dotScale} fill="#FFFFFF"/>
    </Svg>
  );
}

export function AnimatedSplashScreen({ onAnimationFinish }: AnimatedSplashScreenProps) {
  // Motion animation shared values
  const logoScale = useSharedValue(0.85);
  const logoTranslateY = useSharedValue(15);
  const dotPulse = useSharedValue(0.9);
  const opacity = useSharedValue(1);

  useEffect(() => {
    let isMounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!isMounted) return;

      if (reduceMotion) {
        // Skip heavy motion if user requested reduced motion
        setTimeout(() => {
          if (isMounted) {
            onAnimationFinish();
          }
        }, 800);
      } else {
        // Gentle spring-like entrance & subtle float motion
        logoScale.value = withSequence(
          withTiming(1.04, { duration: 800, easing: Easing.out(Easing.back(1.5)) }),
          withTiming(1.0, { duration: 600, easing: Easing.inOut(Easing.ease) })
        );

        logoTranslateY.value = withSequence(
          withTiming(0, { duration: 800, easing: Easing.out(Easing.quad) }),
          withTiming(-4, { duration: 500, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 500, easing: Easing.inOut(Easing.quad) })
        );

        // Center dot pulse motion
        dotPulse.value = withRepeat(
          withSequence(
            withTiming(1.15, { duration: 700, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.9, { duration: 700, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );

        // Smooth fade-out after ~1.8s
        opacity.value = withSequence(
          withTiming(1, { duration: 1400 }),
          withTiming(0, { duration: 450, easing: Easing.out(Easing.ease) })
        );

        const timer = setTimeout(() => {
          if (isMounted) {
            onAnimationFinish();
          }
        }, 1850);

        return () => {
          clearTimeout(timer);
        };
      }
    });

    return () => {
      isMounted = false;
    };
  }, [onAnimationFinish, logoScale, logoTranslateY, dotPulse, opacity]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { translateY: logoTranslateY.value },
    ],
  }));

  return (
    <Animated.View
      style={[styles.container, animatedContainerStyle]}
      accessible={true}
      accessibilityLabel="Loading app"
      accessibilityRole="header"
      accessibilityViewIsModal={true}
    >
      <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
        <AppLogoSvg size={140} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
