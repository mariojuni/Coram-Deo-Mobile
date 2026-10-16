import React, { ReactNode } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

interface AdaptiveContainerProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  type?: 'reading' | 'content' | 'dashboard' | 'form';
  center?: boolean;
}

/**
 * AdaptiveContainer keeps content within ergonomic readable/usable measures
 * preventing wide-screen stretched layouts on iPads and tablets.
 */
export function AdaptiveContainer({
  children,
  style,
  type = 'content',
  center = true,
}: AdaptiveContainerProps) {
  const { maxReadingWidth, maxContentWidth, maxDashboardWidth, maxFormWidth } = useResponsiveLayout();

  const maxWidth =
    type === 'reading'
      ? maxReadingWidth
      : type === 'dashboard'
      ? maxDashboardWidth
      : type === 'form'
      ? maxFormWidth
      : maxContentWidth;

  return (
    <View
      style={[
        styles.base,
        { maxWidth },
        center && styles.center,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
  },
  center: {
    alignSelf: 'center',
  },
});
