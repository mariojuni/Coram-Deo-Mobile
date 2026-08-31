import React from 'react';
import { View, StyleSheet, Platform, ViewProps } from 'react-native';
import { BlurView, BlurViewProps } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

export interface CustomBlurViewProps extends BlurViewProps {
  fallbackBackgroundColor?: string;
}

export function CustomBlurView({
  style,
  intensity = 80,
  tint = 'light',
  fallbackBackgroundColor = 'rgba(255, 255, 255, 0.85)',
  children,
  ...rest
}: CustomBlurViewProps) {
  return (
    <BlurView 
      intensity={intensity} 
      tint={tint} 
      style={style}
      blurMethod="dimezisBlurViewSdk31Plus" // Uses reliable RenderEffect on Android 12+
      {...rest}
    >
      {children}
    </BlurView>
  );
}
