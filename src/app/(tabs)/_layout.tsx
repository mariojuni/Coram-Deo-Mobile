import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Book, Handshake, Home, Users } from 'lucide-react-native';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FabMenu from '../../components/Navigation/FabMenu';
import { useAuthStore } from '../../store/useAuthStore';

function CustomTabBar({ state, descriptors, navigation, isStaff }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.navArea, { bottom: Math.max(insets.bottom, 16) }]} pointerEvents="box-none">
      <View style={styles.navContainer}>
        {/* Standard frosted background for both platforms */}
        <BlurView intensity={80} tint="light" style={[StyleSheet.absoluteFill, { borderRadius: 40, overflow: 'hidden' }]} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)', borderRadius: 40 }]} pointerEvents="none" />
          
          {state.routes.map((route: any, index: number) => {
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
            const iconByRoute = {
              index: Home,
              bible: Book,
              community: Users,
              serve: Handshake,
            } as const;
            const IconComponent = iconByRoute[route.name as keyof typeof iconByRoute];

            if (!IconComponent) {
              return null;
            }

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

export default function TabLayout() {
  const { userProfile } = useAuthStore();
  const isStaff = ['super_admin', 'church_admin', 'ministry_leader'].includes(userProfile?.role?.toLowerCase() || '');

  return (
    <View style={{ flex: 1 }}>
      <Tabs 
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomTabBar {...props} isStaff={isStaff} />}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="bible" options={{ title: 'Bible' }} />
        <Tabs.Screen name="prayer" options={{ title: 'Prayer', href: null }} />
        <Tabs.Screen name="community" options={{ title: 'Community' }} />
        <Tabs.Screen name="sermons" options={{ title: 'Sermons', href: null }} />
        <Tabs.Screen name="serve" options={{ title: 'Serve' }} />
        {/* Staff tab — hidden from bottom bar; accessible via FAB sub-menu */}
        <Tabs.Screen
          name="attendance"
          options={{ title: 'Staff', href: null }}
        />
      </Tabs>
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
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 40,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
    borderColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
  },
  navItem: {
    padding: 4,
  },
  navItemActive: {
    transform: [{ translateY: -2 }],
  }
});
