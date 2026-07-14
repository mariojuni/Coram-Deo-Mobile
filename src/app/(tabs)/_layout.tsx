import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Book, Handshake, Home, Users } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FabMenu from '../../components/Navigation/FabMenu';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { canAccessAdminPortal } from '../../permissions/mobilePermissions';
import { useSermonStore } from '../../store/useSermonStore';
import { useSermonPlaybackStore } from '../../store/useSermonPlaybackStore';
import { ContinueWatchingCard } from '../../features/sermons/presentation/components/ContinueWatchingCard';
import { useRouter, usePathname } from 'expo-router';
import { useAudio } from '../../features/sermons/presentation/context/AudioContext';
import { useShallow } from 'zustand/react/shallow';

const AnimatedTabItem = ({ isFocused, route, options, onPress, IconComponent }: any) => {
  const scale = useRef(new Animated.Value(isFocused ? 1.15 : 1)).current;
  const translateY = useRef(new Animated.Value(isFocused ? -4 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isFocused ? 1.15 : 1,
        useNativeDriver: true,
        friction: 5,
        tension: 100,
      }),
      Animated.spring(translateY, {
        toValue: isFocused ? -4 : 0,
        useNativeDriver: true,
        friction: 5,
        tension: 100,
      })
    ]).start();
  }, [isFocused]);

  const color = isFocused ? '#FF6596' : '#D2D4E1';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarTestID}
      onPress={onPress}
      style={styles.navItem}
    >
      <Animated.View style={{ transform: [{ scale }, { translateY }] }}>
        <IconComponent size={24} color={color} />
      </Animated.View>
    </TouchableOpacity>
  );
};

function CustomTabBar({ state, descriptors, navigation, isStaff }: any) {
  const insets = useSafeAreaInsets();
  const tabBarVisible = useUIStore((s) => s.tabBarVisible);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: tabBarVisible ? 0 : 120,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [tabBarVisible]);

  return (
    <Animated.View
      style={[
        styles.navArea,
        { bottom: Math.max(insets.bottom, 16), transform: [{ translateY: slideAnim }] },
      ]}
      pointerEvents="box-none"
    >
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
              <AnimatedTabItem
                key={route.key}
                isFocused={isFocused}
                route={route}
                options={options}
                onPress={onPress}
                IconComponent={IconComponent}
              />
            );
          })}
        </View>
        <FabMenu isStaff={isStaff} />
      </Animated.View>
  );
}

export default function TabLayout() {
  const { userProfile } = useAuthStore();
  const isStaff = canAccessAdminPortal(userProfile);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { sermons, currentSermon, relatedSermons } = useSermonStore();
  const inProgressList = useSermonPlaybackStore(useShallow((state) => 
    state.getInProgressSermons().filter((p) => !p.completed).slice(0, 3)
  ));
  
  console.log("inProgressList length:", inProgressList.length, "progress:", inProgressList[0]?.progressPercent);

  const audio = useAudio();

  const inProgressWithSermons = inProgressList
    .map((p) => {
      const sermon = sermons.find((s) => s.id === p.sermonId) 
        ?? relatedSermons.find((s) => s.id === p.sermonId)
        ?? (currentSermon?.id === p.sermonId ? currentSermon : null);
      return { progress: p, sermon };
    })
    .filter((item) => item.sermon !== null);

  const pathname = usePathname();
  const showMiniPlayer = pathname.startsWith('/community') || pathname.startsWith('/sermons');
  
  const topSermon = inProgressWithSermons.length > 0 ? inProgressWithSermons[0] : null;
  const isCurrentAudioPlaying = topSermon?.progress.mediaType === 'audio' && (audio.player?.playing ?? false);

  return (
    <View style={{ flex: 1 }}>
      <Tabs 
        screenOptions={{ 
          headerShown: false,
          freezeOnBlur: false,
        }}
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

      {/* ── Global Floating Continue Watching ── */}
      {showMiniPlayer && topSermon && (
        <View style={[styles.globalContinueWatching, { bottom: Math.max(insets.bottom, 16) + 64 }]}>
          <ContinueWatchingCard
            progress={topSermon.progress}
            sermon={topSermon.sermon}
            isPlaying={isCurrentAudioPlaying}
            onPlayPause={() => {
              if (topSermon.progress.mediaType === 'video') {
                router.push({ pathname: '/sermon-watch', params: { id: topSermon.progress.sermonId } });
              } else {
                if (audio.player?.playing) {
                  audio.pauseAudio();
                } else {
                  // When paused, navigate to player to guarantee correct sermon loads and resumes
                  router.push({ pathname: '/audio-player', params: { id: topSermon.progress.sermonId } });
                }
              }
            }}
            onDismiss={() => {
              useSermonPlaybackStore.getState().dismissSermon(topSermon.progress.sermonId);
            }}
            onPress={() => {
              if (topSermon.progress.mediaType === 'video') {
                router.push({ pathname: '/sermon-watch', params: { id: topSermon.progress.sermonId } });
              } else {
                router.push({ pathname: '/audio-player', params: { id: topSermon.progress.sermonId } });
              }
            }}
          />
        </View>
      )}
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
    zIndex: 200,
    elevation: 10,
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
  },
  globalContinueWatching: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
  }
});
