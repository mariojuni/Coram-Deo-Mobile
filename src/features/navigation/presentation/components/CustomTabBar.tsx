import FabMenu from '@/components/Navigation/FabMenu';
import { getTabIcon } from '@/features/navigation/presentation/tabNavigation';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSoftShadowStyle } from '@/components/ui/SoftCard';

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
        <BlurView intensity={80} tint="light" style={[StyleSheet.absoluteFill, { borderRadius: 40, overflow: 'hidden' }]} />
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
              navigation.navigate(route.name);
            }
          };

          const color = isFocused ? '#FF6596' : '#D2D4E1';
          const IconComponent = getTabIcon(route.name);

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              style={[styles.navItem, isFocused && styles.navItemActive]}
            >
              <IconComponent size={24} color={color} />
            </TouchableOpacity>
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
  navItemActive: {
    transform: [{ translateY: -2 }],
  },
});
