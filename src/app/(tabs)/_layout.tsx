import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Book, Handshake, Home, Users, CheckCircle, XCircle } from 'lucide-react-native';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Animated, Platform, StyleSheet, TouchableOpacity, View, Text, ActivityIndicator, AccessibilityInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FabMenu from '../../components/Navigation/FabMenu';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { canAccessAdminPortal, canViewStaffScreen } from '../../permissions/mobilePermissions';
import { useMinistryStore } from '../../store/useMinistryStore';
import { useSermonStore } from '../../store/useSermonStore';
import { useSermonPlaybackStore } from '../../store/useSermonPlaybackStore';
import { ContinueWatchingCard } from '../../features/sermons/presentation/components/ContinueWatchingCard';
import { useRouter, usePathname } from 'expo-router';
import { useAudio } from '../../features/sermons/presentation/context/AudioContext';
import { useShallow } from 'zustand/react/shallow';

const AnimatedTabItem = ({ isFocused, route, options, onPress, IconComponent, showBadge }: any) => {
  const scale = useRef(new Animated.Value(isFocused ? 1.15 : 1)).current;
  const translateY = useRef(new Animated.Value(isFocused ? -4 : 0)).current;

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
      translateY.setValue(isFocused ? -4 : 0);
      return;
    }
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
  }, [isFocused, reduceMotion]);

  const color = isFocused ? '#FF6596' : '#D2D4E1';
  const label = options.tabBarAccessibilityLabel || options.title || route.name;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
      accessibilityHint={`Navigates to the ${label} screen`}
      testID={options.tabBarTestID}
      onPress={onPress}
      style={styles.navItem}
    >
      <Animated.View style={{ transform: [{ scale }, { translateY }] }}>
        <IconComponent size={24} color={color} />
        {showBadge && (
          <View style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: '#FF3B30',
            borderWidth: 1.5,
            borderColor: '#FFFFFF'
          }} />
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
      {showMiniPlayer && topSermon && (
        <View style={[styles.globalContinueWatching, { bottom: Math.max(insets.bottom, 16) + 64 }]}>
          <ContinueWatchingCard
            progress={topSermon.progress}
            sermon={topSermon.sermon}
            isPlaying={isCurrentAudioPlaying}
            onPlayPause={topSermon.progress.mediaType === 'audio' ? () => {
              if (audio.player?.playing) {
                audio.pauseAudio();
              } else {
                router.navigate({ pathname: '/audio-player', params: { id: topSermon.progress.sermonId } });
              }
            } : undefined}
            onDismiss={() => {
              useSermonPlaybackStore.getState().dismissSermon(topSermon.progress.sermonId);
            }}
            onPress={() => {
              if (topSermon.progress.mediaType === 'video') {
                router.navigate({ pathname: '/sermon-watch', params: { id: topSermon.progress.sermonId } });
              } else {
                router.navigate({ pathname: '/audio-player', params: { id: topSermon.progress.sermonId } });
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
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 40,
    backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'transparent',
    borderColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    boxShadow: '0px 4px 12px rgba(164, 164, 164, 0.04)',
  },
  navItem: {
    padding: 2,
    minWidth: 44,
    minHeight: 44,
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
