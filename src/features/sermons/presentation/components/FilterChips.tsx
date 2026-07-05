import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { Video, Mic, Layers, Grid3x3 } from 'lucide-react-native';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';
import { Colors, Spacing } from '@/constants/theme';
import type { SermonFilter } from '../../domain/sermon.types';
import * as Haptics from 'expo-haptics';

interface FilterChipsProps {
  activeFilter: SermonFilter;
  onFilterChange: (filter: SermonFilter) => void;
}

const FILTERS: Array<{ value: SermonFilter; label: string; icon: typeof Video }> = [
  { value: 'all', label: 'All', icon: Grid3x3 },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'audio', label: 'Audio', icon: Mic },
  { value: 'series', label: 'Series', icon: Layers },
];

function FilterChip({ 
  filter, 
  isActive, 
  onPress, 
  colors 
}: { 
  filter: typeof FILTERS[0]; 
  isActive: boolean; 
  onPress: () => void;
  colors: any;
}) {
  const Icon = filter.icon;
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(isActive ? '#FF6596' : colors.backgroundElement, { duration: 200 }),
      borderColor: withTiming(isActive ? '#FF6596' : 'rgba(150, 150, 150, 0.2)', { duration: 200 }),
    };
  }, [isActive, colors.backgroundElement]);

  const textAnimatedStyle = useAnimatedStyle(() => {
    return {
      color: withTiming(isActive ? '#FFF' : colors.text, { duration: 200 }),
    };
  }, [isActive, colors.text]);

  const scale = useSharedValue(1);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.get() }]
    };
  });

  const handlePressIn = () => {
    scale.set(withTiming(0.95, { duration: 100 }));
  };

  const handlePressOut = () => {
    scale.set(withTiming(1, { duration: 100 }));
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View
        style={[
          styles.chip,
          animatedStyle,
          containerAnimatedStyle
        ]}
      >
          <Icon
            size={16}
            color={isActive ? '#FFF' : colors.text}
            strokeWidth={2.5}
          />
          <Animated.Text style={[styles.chipText, textAnimatedStyle]}>
            {filter.label}
          </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

export function FilterChips({ activeFilter, onFilterChange }: FilterChipsProps) {
  const colors = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {FILTERS.map((filter) => (
        <FilterChip
          key={filter.value}
          filter={filter}
          isActive={activeFilter === filter.value}
          onPress={() => onFilterChange(filter.value)}
          colors={colors}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
