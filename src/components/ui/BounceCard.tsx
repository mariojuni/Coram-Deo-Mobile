import React, { useRef, useState, useEffect } from 'react';
import { Animated, TouchableWithoutFeedback, AccessibilityInfo, TouchableOpacityProps } from 'react-native';
import DebouncedTouchable from '@/components/DebouncedTouchable';

interface BounceCardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: any;
  bounceScale?: number;
}

export function BounceCard({ children, style, onPress, activeOpacity = 1, bounceScale = 0.9, hitSlop, disabled, accessibilityRole = 'button', ...props }: BounceCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const lastPress = useRef(0);
  const DEBOUNCE_MS = 400;

  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      subscription.remove();
    };
  }, []);

  const pressIn = () => {
    if (disabled) return;
    const now = Date.now();
    if (now - lastPress.current < DEBOUNCE_MS) return;
    lastPress.current = now;
    if (!reduceMotion) {
      Animated.spring(scale, { toValue: bounceScale, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
    }
  };
  
  const pressOut = () => {
    if (disabled) return;
    if (!reduceMotion) {
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 18 }).start();
    }
  };

  if (onPress) {
    return (
      <DebouncedTouchable 
        activeOpacity={activeOpacity} 
        onPress={disabled ? undefined : onPress} 
        onPressIn={pressIn} 
        onPressOut={pressOut} 
        hitSlop={hitSlop} 
        disabled={disabled}
        accessibilityRole={accessibilityRole}
        {...props}
      >
        <Animated.View style={[style, { transform: [{ scale }] }]}>
          {children}
        </Animated.View>
      </DebouncedTouchable>
    );
  }

  return (
    <TouchableWithoutFeedback 
      onPressIn={pressIn} 
      onPressOut={pressOut} 
      hitSlop={hitSlop} 
      disabled={disabled}
      accessible={true}
      accessibilityRole={accessibilityRole}
      {...props}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
