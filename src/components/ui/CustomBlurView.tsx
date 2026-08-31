import { BlurView, BlurViewProps } from 'expo-blur';
import React from 'react';
import { Platform } from 'react-native';

export interface CustomBlurViewProps extends BlurViewProps {
  fallbackBackgroundColor?: string;
}

export function CustomBlurView({
  style,
  intensity = 80,
  tint = 'light',
  fallbackBackgroundColor = 'rgba(255, 255, 255, 0.85)',
  children,
  blurTarget,
  ...rest
}: CustomBlurViewProps) {
  // Android tends to render the blur tint much heavier/more opaque than iOS.
  // We reduce the intensity heavily to thin out the white tint, while relying on a lower blurReductionFactor for the blur radius.
  const adjustedIntensity = Platform.OS === 'android' ? Math.max(1, intensity * 0.4) : intensity;

  return (
    <BlurView
      intensity={adjustedIntensity}
      tint={tint}
      style={[
        style,
        // Remove any extra background opacity on Android to keep it as clear as possible
        Platform.OS === 'android' && tint === 'light' && { backgroundColor: 'transparent' }
      ]}
      blurTarget={blurTarget}
      blurMethod={blurTarget ? "dimezisBlurViewSdk31Plus" : undefined}
      blurReductionFactor={Platform.OS === 'android' ? 3 : undefined} // Lower factor = higher blur radius
      {...rest}
    >
      {children}
    </BlurView>
  );
}
