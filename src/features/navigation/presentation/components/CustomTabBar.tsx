import FabMenu from '@/components/Navigation/FabMenu';
import { getTabIcon } from '@/features/navigation/presentation/tabNavigation';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSoftShadowStyle } from '@/components/ui/SoftCard';
import { BounceCard } from '@/components/ui/BounceCard';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, interpolateColor, withSpring } from 'react-native-reanimated';
import { useEffect } from 'react';

type TabRoute = {
  key: string;
  name: string;
};

type TabBarOptions = {
  href?: string | null;
  tabBarAccessibilityLabel?: string;
  tabBarTestID?: string;
};

type TabDescriptor = {
  options: TabBarOptions;
};

type NavigationEmitResult = {
  defaultPrevented: boolean;
};

type CustomTabBarProps = {
  isStaff: boolean;
  tabBarProps: {
    descriptors: Record<string, TabDescriptor>;
    navigation: unknown;
    state: {
      index: number;
      routes: TabRoute[];
    };
  };
};

// Extracted component to manage Reanimated UI threading for focus state
const AnimatedTabItem = ({ 
  route, 
  isFocused, 
  options, 
  onPress 
}: { 
  route: TabRoute; 
  isFocused: boolean; 
  options: TabBarOptions; 
  onPress: () => void 
}) => {
  const progress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isFocused ? 1 : 0, {
      damping: 20,
      stiffness: 200,
      mass: 0.5,
    });
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * -3 }], // Move up 3 pixels smoothly on focus
  }));

  const IconComponent = getTabIcon(route.name);
  const color = isFocused ? '#FF6596' : '#D2D4E1';

  return (
    <BounceCard
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarTestID}
      onPress={onPress}
      style={styles.navItem}
      bounceScale={0.9}
    >
      <Animated.View style={animatedStyle}>
        <IconComponent size={24} color={color} />
      </Animated.View>
    </BounceCard>
  );
};

export function CustomTabBar({ tabBarProps, isStaff }: CustomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { state, descriptors } = tabBarProps;
  const navigation = tabBarProps.navigation as {
    emit: (event: { canPreventDefault: true; target: string; type: 'tabPress' }) => NavigationEmitResult;
    navigate: (routeName: string) => void;
  };

  return (
    <View style={[styles.navArea, { bottom: Math.max(insets.bottom, 16) }]} pointerEvents="box-none">
      <View style={styles.navContainer}>
        {Platform.OS === 'ios' && (
          <BlurView intensity={80} tint="light" style={[StyleSheet.absoluteFill, { borderRadius: 40, overflow: 'hidden' }]} />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)', borderRadius: 40 }]} pointerEvents="none" />

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          if (options.href === null) {
            return null;
          }

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              // Defer navigation slightly so the BounceCard animation can start smoothly
              requestAnimationFrame(() => {
                navigation.navigate(route.name);
              });
            }
          };

          return (
            <AnimatedTabItem
              key={route.key}
              route={route}
              isFocused={isFocused}
              options={options}
              onPress={onPress}
            />
          );
        })}
      </View>
      <FabMenu isStaff={isStaff} />
    </View>
  );
}

const styles = StyleSheet.create({
  navArea: {
    position: 'absolute',
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  navContainer: {
    ...getSoftShadowStyle(40),
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
  },
  navItem: {
    padding: 4,
  },
});
