import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export function SegmentedControl({ options, selectedIndex, onChange }: SegmentedControlProps) {
  const colors = useTheme();
  const [widths, setWidths] = useState<number[]>(new Array(options.length).fill(0));
  const translateX = useSharedValue(0);

  const handleLayout = (event: LayoutChangeEvent, index: number) => {
    const { width } = event.nativeEvent.layout;
    const newWidths = [...widths];
    newWidths[index] = width;
    setWidths(newWidths);
  };

  React.useEffect(() => {
    let offset = 0;
    for (let i = 0; i < selectedIndex; i++) {
      offset += widths[i];
    }
    translateX.value = withSpring(offset, { damping: 20, stiffness: 200 });
  }, [selectedIndex, widths, translateX]);

  const activeIndicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      width: widths[selectedIndex] || 0,
    };
  });

  return (
    <View style={styles.container}>
      <View style={[styles.background, { backgroundColor: 'transparent' }]}>
        {widths[selectedIndex] > 0 && (
          <Animated.View
            style={[
              styles.activeIndicator,
              { backgroundColor: 'rgba(255, 101, 150, 0.15)' },
              activeIndicatorStyle,
            ]}
          />
        )}
        
        {options.map((option, index) => {
          const isActive = selectedIndex === index;
          
          return (
            <Pressable
              key={option}
              onLayout={(e) => handleLayout(e, index)}
              style={styles.option}
              onPress={() => {
                if (index !== selectedIndex) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onChange(index);
                }
              }}
            >
              <Text
                style={[
                  styles.optionText,
                  { 
                    color: isActive ? '#FF6596' : colors.textSecondary,
                    fontWeight: isActive ? '700' : '600'
                  }
                ]}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: Spacing.four,
  },
  background: {
    flexDirection: 'row',
    position: 'relative',
    borderRadius: 12,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 8,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 16,
  },
});
