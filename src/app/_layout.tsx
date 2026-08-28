import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useColorScheme, View, Text, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import * as ScreenOrientation from 'expo-screen-orientation';
import { AnimatedSplashScreen } from '@/features/splash/AnimatedSplashScreen';
import { VersionProvider } from '@/features/bible/presentation/context/VersionManagerContext';
import { AudioProvider } from '../features/sermons/presentation/context/AudioContext';
import '../global.css';
import { useAuthStore } from '../store/useAuthStore';
import { useBibleVersionStore } from '../store/useBibleVersionStore';
import { useMemberStore } from '../store/useMemberStore';
import { canAccessMobileApp } from '../permissions/mobilePermissions';
import PrayerRequestModal from '../features/prayer/presentation/components/PrayerRequestModal';
import { useUIStore } from '../store/useUIStore';
import { getMessaging, onMessage, onNotificationOpenedApp, getInitialNotification, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import { PushTokenService } from '../services/notification/PushTokenService';
import { useNotificationStore } from '../store/useNotificationStore';
import { NotificationNavigationResolver } from '../services/notification/NotificationNavigationResolver';

// Register background handler outside of React component lifecycle
try {
  setBackgroundMessageHandler(getMessaging(), async (remoteMessage: any) => {
    console.log('Message handled in the background!', remoteMessage);
  });
} catch (e) {
  // Ignore missing native module in Expo Go
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({});
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  const { prayerModalOpen, editingPrayer, closePrayerModal } = useUIStore();

  const initialized = useAuthStore((state) => state.initialized);
  const currentUser = useAuthStore((state) => state.currentUser);
  const initializeAuthListener = useAuthStore((state) => state.initializeAuthListener);
  const initializeMembersListener = useMemberStore((state) => state.initializeMembersListener);
  const initializeServicesListener = useMemberStore((state) => state.initializeServicesListener);
  const initializeHouseholdsListener = useMemberStore((state) => state.initializeHouseholdsListener);
  const initializeNotificationListener = useNotificationStore((state) => state.initializeListener);
  const loadTranslation = useBibleVersionStore((state) => state.loadTranslation);
  const segments = useSegments();
  const router = useRouter();
  const [hasSeenWalkthrough, setHasSeenWalkthrough] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('hasSeenWalkthrough').then((value) => {
      setHasSeenWalkthrough(value === 'true');
    });
  }, []);

  useEffect(() => {
    const allowedLandscapeRoutes = ['bible', 'version-manager', 'bible-notes', '[dayId]'];
    const isLandscapeAllowed = segments.some(segment => allowedLandscapeRoutes.includes(segment));

    if (isLandscapeAllowed) {
      ScreenOrientation.unlockAsync().catch(() => {});
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    }
  }, [segments]);

  useEffect(() => {
    const initEnvAndAuth = async () => {
      try {
        const { ensureFirebaseEnvironmentLoaded } = await import('../firebase');
        await ensureFirebaseEnvironmentLoaded();
      } catch (e) {
        console.warn('Failed to ensure firebase environment loaded on layout mount:', e);
      }
      initializeAuthListener();
    };
    initEnvAndAuth();
  }, [initializeAuthListener]);

  // Load active Bible translation once on app start — global source of truth
  useEffect(() => {
    loadTranslation();
  }, [loadTranslation]);

  const userProfile = useAuthStore((state) => state.userProfile);

  useEffect(() => {
    if (initialized) {
      initializeMembersListener(userProfile?.churchId);
      initializeServicesListener(userProfile?.churchId);
      initializeHouseholdsListener(userProfile?.churchId);
      
      if (currentUser?.uid) {
        PushTokenService.registerDeviceToken(currentUser.uid);
        const unsubscribeNotifications = initializeNotificationListener(currentUser.uid);
        return () => {
          unsubscribeNotifications();
        };
      }
    }
  }, [initialized, userProfile?.churchId, currentUser?.uid, initializeMembersListener, initializeServicesListener, initializeHouseholdsListener, initializeNotificationListener]);

  // Foreground notification handler
  useEffect(() => {
    try {
      const messaging = getMessaging();
      const unsubscribe = onMessage(messaging, async (remoteMessage: any) => {
        console.log('A new FCM message arrived!', JSON.stringify(remoteMessage));
        // Handled by Firebase backend increasing the unread count implicitly, 
        // but UI can show a toast here if desired.
      });
      return unsubscribe;
    } catch (e) {
      console.warn('Firebase Messaging not available (Native Module missing):', e);
      return () => {};
    }
  }, []);

  // Background / Terminated notification deep linking
  const [handledInitial, setHandledInitial] = useState(false);
  useEffect(() => {
    if (!initialized || hasSeenWalkthrough === null || handledInitial) return;
    
    try {
      const messaging = getMessaging();

      // Background
      onNotificationOpenedApp(messaging, (remoteMessage: any) => {
        console.log('Notification caused app to open from background state:', remoteMessage?.notification);
        // Data payload should contain category, sourceId
        if (remoteMessage?.data) {
          const destination = NotificationNavigationResolver.resolveDestination(remoteMessage.data as any);
          if (destination) {
            router.push(destination as any);
          }
        }
      });

      // Terminated
      getInitialNotification(messaging)
        .then((remoteMessage: any) => {
          if (remoteMessage) {
            console.log('Notification caused app to open from quit state:', remoteMessage?.notification);
            if (remoteMessage.data) {
              const destination = NotificationNavigationResolver.resolveDestination(remoteMessage.data as any);
              if (destination) {
                setTimeout(() => {
                  router.push(destination as any);
                }, 500); // Give layout time to mount
              }
            }
          }
        });
        
      setHandledInitial(true);
    } catch (e) {
      console.warn('Firebase Messaging not available (Native Module missing):', e);
    }
  }, [initialized, hasSeenWalkthrough, router, handledInitial]);

  const appReady = loaded && initialized && hasSeenWalkthrough !== null;

  useEffect(() => {
    if (!appReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inPendingScreen = segments[0] === 'pending-church-link';
    const inDisabledScreen = segments[0] === 'disabled-account';
    const inWalkthrough = segments[0] === 'walkthrough';
    
    // Using strict super_admin bypass — checks systemRoles array (multi-role compatible)
    const isSuperAdmin = Array.isArray(userProfile?.systemRoles)
      ? userProfile.systemRoles.includes('super_admin')
      : userProfile?.role === 'super_admin';
    const isPending = !isSuperAdmin && (userProfile?.status === 'pending_church_link' || (!userProfile?.churchId && currentUser));
    
    const isDisabled = currentUser && (userProfile?.status === 'disabled' || !canAccessMobileApp(userProfile));

    if (!currentUser) {
      if (!hasSeenWalkthrough && !inWalkthrough && !inAuthGroup) {
        router.replace('/walkthrough');
      } else if (hasSeenWalkthrough && !inAuthGroup && !inWalkthrough) {
        router.replace('/(auth)/login');
      }
    } else if (isDisabled && !inDisabledScreen) {
       router.replace('/disabled-account');
    } else if (currentUser && !isDisabled && isPending && !inPendingScreen) {
      // Redirect to pending screen
      router.replace('/pending-church-link');
    } else if (currentUser && !isPending && !isDisabled && (inAuthGroup || inPendingScreen || inDisabledScreen || inWalkthrough)) {
      // Redirect to main app
      router.replace('/(tabs)');
    }
  }, [currentUser, userProfile, initialized, hasSeenWalkthrough, segments, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AudioProvider>
          <VersionProvider>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="walkthrough" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="pending-church-link" options={{ headerShown: false }} />
              <Stack.Screen name="disabled-account" options={{ headerShown: false }} />
              <Stack.Screen name="scanner" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen name="my-qr" options={{ presentation: 'transparentModal', animation: 'none', headerShown: false }} />
              <Stack.Screen name="more" options={{ headerShown: false }} />
              <Stack.Screen name="giving" options={{ headerShown: false }} />
              <Stack.Screen name="giving-campaign-detail" options={{ headerShown: false }} />
              <Stack.Screen name="giving-form" options={{ headerShown: false }} />
              <Stack.Screen name="version-manager" options={{ presentation: 'transparentModal', animation: 'none', headerShown: false }} />
              <Stack.Screen name="create-setlist" options={{ presentation: 'transparentModal', animation: 'none', headerShown: false }} />
              <Stack.Screen name="assign-ministries" options={{ presentation: 'transparentModal', animation: 'none', headerShown: false }} />
              <Stack.Screen name="audio-player" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen name="sermon-watch" options={{ headerShown: false }} />
              <Stack.Screen name="sermon-detail" options={{ headerShown: false }} />
              <Stack.Screen name="serve-assignment-detail" options={{ headerShown: false }} />
              <Stack.Screen name="serve-ministry-detail" options={{ headerShown: false }} />
              <Stack.Screen name="ministry-application" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen name="bible-notes/editor" options={{ presentation: 'fullScreenModal', headerShown: false }} />
              <Stack.Screen name="bible-plans" options={{ headerShown: false }} />
              <Stack.Screen name="discipleship" options={{ headerShown: false }} />
              <Stack.Screen name="staff-finance" options={{ headerShown: false }} />
              <Stack.Screen name="staff-ministry-applications" options={{ headerShown: false }} />
              <Stack.Screen name="staff-ministry-application-detail" options={{ headerShown: false }} />
              <Stack.Screen name="profile" options={{ headerShown: false }} />
              <Stack.Screen name="notifications" options={{ presentation: 'fullScreenModal', headerShown: false }} />
              <Stack.Screen name="+not-found" />
            </Stack>
          </VersionProvider>
          <PrayerRequestModal 
            isOpen={prayerModalOpen} 
            onClose={closePrayerModal} 
            initialData={editingPrayer} 
          />

        </AudioProvider>
      </ThemeProvider>
      {showAnimatedSplash && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 99999, elevation: 99999, backgroundColor: '#FAFAFA' }]}>
          <AnimatedSplashScreen onAnimationFinish={() => setShowAnimatedSplash(false)} />
        </View>
      )}
    </GestureHandlerRootView>
  );
}
