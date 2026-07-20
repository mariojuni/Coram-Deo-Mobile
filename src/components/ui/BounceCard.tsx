import React, { useRef } from 'react';
import { Animated, TouchableWithoutFeedback, Insets, TouchableOpacityProps } from 'react-native';
import DebouncedTouchable from '@/components/DebouncedTouchable';

interface BounceCardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: any;
  bounceScale?: number;
}

export function BounceCard({ children, style, onPress, activeOpacity = 1, bounceScale = 0.9, hitSlop, disabled, ...props }: BounceCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const lastPress = useRef(0);
  const DEBOUNCE_MS = 400;

  const pressIn = () => {
    if (disabled) return;
    const now = Date.now();
    if (now - lastPress.current < DEBOUNCE_MS) return;
    lastPress.current = now;
    Animated.spring(scale, { toValue: bounceScale, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  };
  
  const pressOut = () => {
    if (disabled) return;
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 18 }).start();
  };

  if (onPress) {
    return (
      <DebouncedTouchable activeOpacity={activeOpacity} onPress={disabled ? undefined : onPress} onPressIn={pressIn} onPressOut={pressOut} hitSlop={hitSlop} disabled={disabled} {...props}>
        <Animated.View style={[style, { transform: [{ scale }] }]}>
          {children}
        </Animated.View>
      </DebouncedTouchable>
    );
  }

  return (
    <TouchableWithoutFeedback onPressIn={pressIn} onPressOut={pressOut} hitSlop={hitSlop} disabled={disabled} {...props}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
