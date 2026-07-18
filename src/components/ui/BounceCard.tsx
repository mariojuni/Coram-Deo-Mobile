import React, { useRef } from 'react';
import { Animated, TouchableWithoutFeedback } from 'react-native';
import DebouncedTouchable from '@/components/DebouncedTouchable';

interface BounceCardProps {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
  activeOpacity?: number;
}

export function BounceCard({ children, style, onPress, activeOpacity = 1 }: BounceCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const lastPress = useRef(0);
  const DEBOUNCE_MS = 400;

  const pressIn = () => {
    const now = Date.now();
    if (now - lastPress.current < DEBOUNCE_MS) return;
    lastPress.current = now;
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  };
  
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 15, bounciness: 12 }).start();

  if (onPress) {
    return (
      <DebouncedTouchable activeOpacity={activeOpacity} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
        <Animated.View style={[style, { transform: [{ scale }] }]}>
          {children}
        </Animated.View>
      </DebouncedTouchable>
    );
  }

  return (
    <TouchableWithoutFeedback onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
