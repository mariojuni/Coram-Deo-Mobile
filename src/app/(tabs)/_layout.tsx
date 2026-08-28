import { BlurView } from 'expo-blur';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Book, CheckCircle, Handshake, Home, Users, XCircle } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Platform, StyleSheet, Text, TouchableOpacity, View, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import FabMenu from '../../components/Navigation/FabMenu';
import BibleFilledIcon from '../../components/Navigation/Icons/BibleFilledIcon';
import BibleStrokeIcon from '../../components/Navigation/Icons/BibleStrokeIcon';
import CommunityFilledIcon from '../../components/Navigation/Icons/CommunityFilledIcon';
import CommunityStrokeIcon from '../../components/Navigation/Icons/CommunityStrokeIcon';
import HomeFilledIcon from '../../components/Navigation/Icons/HomeFilledIcon';
import HomeStrokeIcon from '../../components/Navigation/Icons/HomeStrokeIcon';
import ServeFilledIcon from '../../components/Navigation/Icons/ServeFilledIcon';
import ServeStrokeIcon from '../../components/Navigation/Icons/ServeStrokeIcon';
import { ContinueWatchingCard } from '../../features/sermons/presentation/components/ContinueWatchingCard';
import { GlobalVideoPlayer } from '../../features/sermons/presentation/components/GlobalVideoPlayer';
import { useAudio } from '../../features/sermons/presentation/context/AudioContext';
import { canViewStaffScreen } from '../../permissions/mobilePermissions';
import { useAuthStore } from '../../store/useAuthStore';
import { useMinistryStore } from '../../store/useMinistryStore';
import { useSermonPlaybackStore } from '../../store/useSermonPlaybackStore';
import { useSermonStore } from '../../store/useSermonStore';
import { useUIStore } from '../../store/useUIStore';

const AnimatedTabItem = ({ isFocused, route, options, onPress, IconComponent, showBadge, onLayout }: any) => {
  const [isVisuallyFocused, setIsVisuallyFocused] = useState(isFocused);

  useEffect(() => {
    if (isFocused) {
      const timer = setTimeout(() => setIsVisuallyFocused(true), 200); // Wait for native spring animation
      return () => clearTimeout(timer);
    } else {
      setIsVisuallyFocused(false);
    }
  }, [isFocused]);

  const scale = useRef(new Animated.Value(isVisuallyFocused ? 1.15 : 1)).current;

  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      scale.setValue(isFocused ? 1.15 : 1);
      return;
    }
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isVisuallyFocused ? 1.15 : 1,
        useNativeDriver: true,
        friction: 5,
        tension: 100,
      })
    ]).start();
  }, [isVisuallyFocused, reduceMotion]);

  const isHome = route.name === 'index';
  const isBible = route.name === 'bible';
  const isCommunity = route.name === 'community';
  const isServe = route.name === 'serve';
  const color = isVisuallyFocused ? '#FF6596' : '#D2D4E1';
  const label = options.tabBarAccessibilityLabel || options.title || route.name;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
      accessibilityHint={`Navigates to the ${label} screen`}
      testID={options.tabBarTestID}
      onPress={onPress}
      style={[styles.navItem, { zIndex: 2, elevation: 2 }]}
      onLayout={onLayout ? (e) => onLayout(route.key, e.nativeEvent.layout) : undefined}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {isHome ? (
          isVisuallyFocused ? (
            <HomeFilledIcon color={color} width={28} height={28} />
          ) : (
            <HomeStrokeIcon color={color} width={28} height={28} />
          )
        ) : isBible ? (
          isVisuallyFocused ? (
            <BibleFilledIcon color={color} width={28} height={28} />
          ) : (
            <BibleStrokeIcon color={color} width={28} height={28} />
          )
        ) : isCommunity ? (
          isVisuallyFocused ? (
            <CommunityFilledIcon color={color} width={28} height={28} />
          ) : (
            <CommunityStrokeIcon color={color} width={28} height={28} />
          )
        ) : isServe ? (
          isVisuallyFocused ? (
            <ServeFilledIcon color={color} width={28} height={28} />
          ) : (
            <ServeStrokeIcon color={color} width={28} height={28} />
          )
        ) : (
          <IconComponent size={24} color={color} />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};
function CustomTabBar({ state, descriptors, navigation, isStaff }: any) {
  const insets = useSafeAreaInsets();
  const tabBarVisible = useUIStore((s) => s.tabBarVisible);
  const hasNewAssignment = useMinistryStore((s) => s.hasNewAssignment);
  const memberAssignments = useMinistryStore((s) => s.memberAssignments);

  const hasAwaitingAssignment = memberAssignments.some(
    (a) => (a.status || '').toLowerCase() === 'pending'
  );

  const slideAnim = useRef(new Animated.Value(0)).current;

  const [tabLayouts, setTabLayouts] = useState<{ [key: string]: { x: number, width: number, height: number, y: number } }>({});
  const activeTabX = useRef(new Animated.Value(0)).current;
  const activeTabY = useRef(new Animated.Value(0)).current;
  const activeTabWidth = useRef(new Animated.Value(0)).current;
  const activeTabHeight = useRef(new Animated.Value(0)).current;

  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const stateRef = useRef(state);
  const tabLayoutsRef = useRef(tabLayouts);
  const navigationRef = useRef(navigation);

  useEffect(() => {
    stateRef.current = state;
    tabLayoutsRef.current = tabLayouts;
    navigationRef.current = navigation;
  }, [state, tabLayouts, navigation]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        isDragging.current = true;
        activeTabX.stopAnimation();
        activeTabY.stopAnimation();
        // Use pageX - 24 (container's left offset) to avoid child coordinate issues
        const touchX = evt.nativeEvent.pageX - 24;
        dragStartX.current = touchX;
        activeTabX.setValue(touchX - 32);
      },
      onPanResponderMove: (evt, gestureState) => {
        let newX = dragStartX.current + gestureState.dx - 32;
        
        const layouts = tabLayoutsRef.current;
        const keys = Object.keys(layouts);
        if (keys.length > 0) {
          let minX = Infinity;
          let maxX = -Infinity;
          keys.forEach(key => {
            if (layouts[key].x < minX) minX = layouts[key].x;
            if (layouts[key].x > maxX) maxX = layouts[key].x;
          });
          
          if (newX < minX) newX = minX;
          if (newX > maxX) newX = maxX;
        }
        
        activeTabX.setValue(newX);
      },
      onPanResponderRelease: (evt, gestureState) => {
        isDragging.current = false;
        const finalX = dragStartX.current + gestureState.dx;
        
        let nearestTabKey: string | null = null;
        let minDistance = Infinity;
        
        const layouts = tabLayoutsRef.current;
        Object.keys(layouts).forEach(key => {
          const layout = layouts[key];
          const tabCenterX = layout.x + layout.width / 2;
          const distance = Math.abs(finalX - tabCenterX);
          if (distance < minDistance) {
            minDistance = distance;
            nearestTabKey = key;
          }
        });
        
        const currentState = stateRef.current;
        const currentNavigation = navigationRef.current;

        if (nearestTabKey && currentState) {
          const route = currentState.routes.find((r: any) => r.key === nearestTabKey);
          if (route) {
            const isFocused = currentState.routes[currentState.index].key === nearestTabKey;
            
            if (route.name === 'serve') {
              useMinistryStore.getState().markAssignmentsViewed();
            }
            const event = currentNavigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              currentNavigation.navigate(route.name);
            } else if (isFocused) {
               const layout = layouts[nearestTabKey];
               if (layout) {
                 Animated.spring(activeTabX, {
                   toValue: layout.x,
                   useNativeDriver: false,
                   friction: 9,
                   tension: 65,
                 }).start();
               }
            }
          }
        }
      },
      onPanResponderTerminate: () => {
         isDragging.current = false;
         const currentState = stateRef.current;
         const layouts = tabLayoutsRef.current;
         if (currentState && currentState.routes[currentState.index]) {
             const layout = layouts[currentState.routes[currentState.index].key];
             if (layout) {
                 Animated.spring(activeTabX, {
                     toValue: layout.x,
                     useNativeDriver: false,
                     friction: 9,
                     tension: 65,
                 }).start();
             }
         }
      }
    })
  ).current;

  useEffect(() => {
    if (isDragging.current) return;
    const currentRoute = state.routes[state.index];
    if (!currentRoute) return;
    const layout = tabLayouts[currentRoute.key];
    if (layout) {
      Animated.spring(activeTabX, {
        toValue: layout.x,
        useNativeDriver: false,
        friction: 9,
        tension: 65,
      }).start();
      Animated.spring(activeTabY, {
        toValue: layout.y,
        useNativeDriver: false,
        friction: 9,
        tension: 65,
      }).start();
    }
  }, [state.index, tabLayouts, state.routes]);

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
      <View style={styles.navContainer} {...panResponder.panHandlers}>
        {/* Standard frosted background for both platforms */}
        <BlurView intensity={80} tint="light" style={[StyleSheet.absoluteFill, { borderRadius: 40, overflow: 'hidden' }]} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: 40 }]} pointerEvents="none" />

        {/* Sliding Highlight Background */}
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 64,
            height: 52,
            transform: [
              { translateX: activeTabX },
              { translateY: activeTabY },
            ],
            backgroundColor: 'rgba(255, 101, 150, 0.04)',
            borderRadius: 30, // completely rounded pill
            opacity: Object.keys(tabLayouts).length > 0 ? 1 : 0,
            zIndex: 1,
          }}
          pointerEvents="none"
        />

        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          if (options.href === null) {
            return null;
          }

          const onPress = () => {
            if (route.name === 'serve') {
              useMinistryStore.getState().markAssignmentsViewed();
            }
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
              showBadge={route.name === 'serve' && hasNewAssignment && hasAwaitingAssignment}
              onLayout={(key: string, layout: any) => {
                setTabLayouts(prev => ({ ...prev, [key]: layout }));
              }}
            />
          );
        })}
      </View>
      <FabMenu isStaff={isStaff} />
    </Animated.View>
  );
}

export default function TabLayout() {
  const userProfile = useAuthStore((state) => state.userProfile);
  const currentUser = useAuthStore((state) => state.currentUser);
  const initializeMemberAssignmentsListener = useMinistryStore(
    (s) => s.initializeMemberAssignmentsListener
  );

  useEffect(() => {
    useMinistryStore.getState().loadViewedAssignmentCount();
  }, []);

  useEffect(() => {
    const churchId = userProfile?.churchId;
    const ids = new Set<string>();
    if (currentUser?.uid) ids.add(currentUser.uid);
    if (userProfile?.memberId) ids.add(userProfile.memberId);

    if (!churchId || ids.size === 0) return;

    const unsub = initializeMemberAssignmentsListener(churchId, Array.from(ids));
    return () => unsub();
  }, [userProfile?.churchId, userProfile?.memberId, currentUser?.uid, initializeMemberAssignmentsListener]);

  const syncToastMessage = useUIStore((s) => s.syncToastMessage);
  const syncToastType = useUIStore((s) => s.syncToastType);

  // Get active ministries for the user to check staff/tool permissions
  const ministries = useMinistryStore((state) => state.ministries);
  const userMinistries = useMemo(() => {
    return ministries.filter(
      (m) => m.members?.some((mem) => mem.memberId === userProfile?.memberId)
    );
  }, [ministries, userProfile?.memberId]);

  // Check if they have access to the Staff tab
  const isStaff = canViewStaffScreen(userProfile, userMinistries);

  const insets = useSafeAreaInsets();
  const router = useRouter();

  const sermons = useSermonStore((state) => state.sermons);
  const currentSermon = useSermonStore((state) => state.currentSermon);
  const relatedSermons = useSermonStore((state) => state.relatedSermons);
  const inProgressList = useSermonPlaybackStore(useShallow((state) =>
    state.getInProgressSermons().filter((p) => !p.completed).slice(0, 3)
  ));

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

  const renderTabBar = useCallback((props: any) => {
    return <CustomTabBar {...props} isStaff={isStaff} />;
  }, [isStaff]);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          freezeOnBlur: false,
        }}
        tabBar={renderTabBar}
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
      {showMiniPlayer && topSermon && topSermon.progress.mediaType === 'audio' && (
        <View style={[styles.globalContinueWatching, { bottom: Math.max(insets.bottom, 16) + 64 }]}>
          <ContinueWatchingCard
            progress={topSermon.progress}
            sermon={topSermon.sermon}
            isPlaying={isCurrentAudioPlaying}
            onPlayPause={topSermon.progress.mediaType === 'audio' ? () => {
              if (audio.player?.playing) {
                audio.pauseAudio();
              } else {
                router.navigate({ pathname: '/audio-player' as any, params: { id: topSermon.progress.sermonId } });
              }
            } : undefined}
            onDismiss={() => {
              useSermonPlaybackStore.getState().dismissSermon(topSermon.progress.sermonId);
            }}
            onPress={() => {
              if (topSermon.progress.mediaType === 'video') {
                router.navigate({ pathname: '/sermon-watch' as any, params: { id: topSermon.progress.sermonId } });
              } else {
                router.navigate({ pathname: '/audio-player' as any, params: { id: topSermon.progress.sermonId } });
              }
            }}
          />
        </View>
      )}
      {/* ── Global Sync Toast ── */}
      {!!syncToastMessage && (
        <View style={[
          styles.floatingToast,
          { bottom: Math.max(insets.bottom, 16) + 64 },
          syncToastType === 'error' && { backgroundColor: '#FEE2E2', borderColor: 'rgba(220,38,38,0.5)' }
        ]}>
          {syncToastType === 'error' ? (
            <XCircle size={18} color="#991B1B" style={{ marginRight: 10 }} />
          ) : (syncToastType === 'success' || syncToastMessage.includes('Successfully')) ? (
            <CheckCircle size={18} color="#03543F" style={{ marginRight: 10 }} />
          ) : (
            <ActivityIndicator size="small" color="#03543F" style={{ marginRight: 10 }} />
          )}
          <Text style={[
            styles.floatingToastText,
            syncToastType === 'error' && { color: '#991B1B' }
          ]}>{syncToastMessage}</Text>
        </View>
      )}

      <GlobalVideoPlayer />
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
    ...Platform.select({
      ios: { zIndex: 200 },
      android: { zIndex: 200, elevation: 0 },
    }),
  },
  navContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 40,
    backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'transparent',
    borderColor: 'rgba(255,255,255,0.5)',
    borderWidth: 0,
    boxShadow: '0px 20px 60px rgba(0, 0, 0, 0.06)',
  },
  navItem: {
    padding: 2,
    minWidth: 64,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navItemActive: {
    transform: [{ translateY: -2 }],
  },
  globalContinueWatching: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
  },
  floatingToast: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 40,
    borderWidth: 1,
    backgroundColor: '#DEF7EC',
    borderColor: 'rgba(49,196,141,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingToastText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#03543F',
  },
});
