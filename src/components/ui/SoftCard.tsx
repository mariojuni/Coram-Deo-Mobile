import React from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';

export interface SoftCardProps extends ViewProps {
  children: React.ReactNode;
  /** Style applied to the outer wrapper (handles shadow and margins) */
  style?: StyleProp<ViewStyle>;
  /** Style applied to the inner wrapper (handles padding, background, flex) */
  innerStyle?: StyleProp<ViewStyle>;
  /** If true, the outer wrapper will be an Animated.View */
  isAnimated?: boolean;
}

/**
 * A standardized card component that solves the iOS shadow clipping issue.
 * 
 * It uses an outer container for the border radius and soft pink shadow,
 * and an inner container with `overflow: 'hidden'` to clip the contents to the radius.
 */
export const SoftCard = React.forwardRef<any, SoftCardProps>(({
  children,
  style,
  innerStyle,
  isAnimated,
  ...rest
}, ref) => {
  if (isAnimated) {
    return (
      <Animated.View ref={ref} style={[styles.outer, style]} {...rest}>
        <View style={[styles.inner, innerStyle]}>
          {children}
        </View>
      </Animated.View>
    );
  }

  return (
    <View ref={ref} style={[styles.outer, style]} {...rest}>
      <View style={[styles.inner, innerStyle]}>
        {children}
      </View>
    </View>
  );
});

export const getSoftShadowStyle = (borderRadius?: number): ViewStyle => {
  const baseStyle: ViewStyle = {
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 4px 12px rgba(164, 164, 164, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  };
  
  if (borderRadius !== undefined) {
    baseStyle.borderRadius = borderRadius;
  }
  
  return baseStyle;
};

export const getTopBarButtonShadowStyle = (borderRadius?: number): ViewStyle => {
  const baseStyle: ViewStyle = {
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  };
  
  if (borderRadius !== undefined) {
    baseStyle.borderRadius = borderRadius;
  }
  
  return baseStyle;
};

const styles = StyleSheet.create({
  outer: getSoftShadowStyle(20),
  inner: {
    borderRadius: 19,
    overflow: 'hidden',
  }
});
