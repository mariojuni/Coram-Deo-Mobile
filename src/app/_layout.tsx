import '../utils/initDefaultFont';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { useColorScheme, View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
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
import { useNetworkStore } from '../store/useNetworkStore';

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
  const [loaded, fontError] = useFonts({
    Inter: require('../../assets/fonts/Inter-VariableFont_opsz,wght.ttf'),
    'Inter-Regular': require('../../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../../assets/fonts/Inter-Bold.ttf'),
    'Inter-ExtraBold': require('../../assets/fonts/Inter-ExtraBold.ttf'),
    'Inter-Italic': require('../../assets/fonts/Inter-Italic.ttf'),
    'Inter-MediumItalic': require('../../assets/fonts/Inter-MediumItalic.ttf'),
    'Inter-SemiBoldItalic': require('../../assets/fonts/Inter-SemiBoldItalic.ttf'),
    'Inter-BoldItalic': require('../../assets/fonts/Inter-BoldItalic.ttf'),
    Montserrat: require('../../assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Regular': require('../../assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Medium': require('../../assets/fonts/Montserrat-Medium.ttf'),
    'Montserrat-SemiBold': require('../../assets/fonts/Montserrat-SemiBold.ttf'),
    'Montserrat-Bold': require('../../assets/fonts/Montserrat-Bold.ttf'),
    'Montserrat-ExtraBold': require('../../assets/fonts/Montserrat-ExtraBold.ttf'),
    'Montserrat-Italic': require('../../assets/fonts/Montserrat-Italic.ttf'),
    'Montserrat-MediumItalic': require('../../assets/fonts/Montserrat-MediumItalic.ttf'),
    'Montserrat-SemiBoldItalic': require('../../assets/fonts/Montserrat-SemiBoldItalic.ttf'),
    'Montserrat-BoldItalic': require('../../assets/fonts/Montserrat-BoldItalic.ttf'),
    Lora: require('../../assets/fonts/Lora-Regular.ttf'),
    'Lora-Regular': require('../../assets/fonts/Lora-Regular.ttf'),
    'Lora-Medium': require('../../assets/fonts/Lora-Medium.ttf'),
    'Lora-SemiBold': require('../../assets/fonts/Lora-SemiBold.ttf'),
    'Lora-Bold': require('../../assets/fonts/Lora-Bold.ttf'),
    'Lora-Italic': require('../../assets/fonts/Lora-Italic.ttf'),
    'Lora-BoldItalic': require('../../assets/fonts/Lora-BoldItalic.ttf'),
    Roboto: require('../../assets/fonts/Roboto-Regular.ttf'),
    'Roboto-Regular': require('../../assets/fonts/Roboto-Regular.ttf'),
    'Roboto-Medium': require('../../assets/fonts/Roboto-Medium.ttf'),
    'Roboto-SemiBold': require('../../assets/fonts/Roboto-SemiBold.ttf'),
    'Roboto-Bold': require('../../assets/fonts/Roboto-Bold.ttf'),
    'Roboto-Italic': require('../../assets/fonts/Roboto-Italic.ttf'),
    'Roboto-BoldItalic': require('../../assets/fonts/Roboto-BoldItalic.ttf'),
  });
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);
  const [splashAnimationFinished, setSplashAnimationFinished] = useState(false);

  useEffect(() => {
    if (splashAnimationFinished && (loaded || fontError)) {
      setShowAnimatedSplash(false);
    }
  }, [splashAnimationFinished, loaded, fontError]);

  const { prayerModalOpen, editingPrayer, closePrayerModal } = useUIStore();

  const initialized = useAuthStore((state) => state.initialized);
  const currentUser = useAuthStore((state) => state.currentUser);
  const isOAuthProcessing = useAuthStore((state) => state.isOAuthProcessing);
  const initializeAuthListener = useAuthStore((state) => state.initializeAuthListener);
  const initializeMembersListener = useMemberStore((state) => state.initializeMembersListener);
  const initializeServicesListener = useMemberStore((state) => state.initializeServicesListener);
  const initializeHouseholdsListener = useMemberStore((state) => state.initializeHouseholdsListener);
  const initializeNotificationListener = useNotificationStore((state) => state.initializeListener);
  const loadTranslation = useBibleVersionStore((state) => state.loadTranslation);
  const segments = useSegments();
  const router = useRouter();
  const [hasSeenWalkthrough, setHasSeenWalkthrough] = useState<boolean | null>(null);
  const lastOrientationUnlockedRef = useRef<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('hasSeenWalkthrough').then((value) => {
      setHasSeenWalkthrough(value === 'true');
    });
  }, []);

  useEffect(() => {
    const { width, height } = Dimensions.get('screen');
    const smallestDimension = Math.min(width, height);
    const isTabletDevice = (Platform.OS === 'ios' && Platform.isPad) || smallestDimension >= 600;

    const allowedLandscapeRoutes = ['bible', 'version-manager', 'bible-notes', '[dayId]'];
    const isLandscapeAllowed = segments.some(segment => allowedLandscapeRoutes.includes(segment));
    const shouldUnlock = isTabletDevice || isLandscapeAllowed;

    if (lastOrientationUnlockedRef.current !== shouldUnlock) {
      lastOrientationUnlockedRef.current = shouldUnlock;
      if (shouldUnlock) {
        ScreenOrientation.unlockAsync().catch(() => {});
      } else {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      }
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

  // Initialize network connectivity monitoring
  useEffect(() => {
    const unsubscribe = useNetworkStore.getState().initializeListener();
    return () => {
      unsubscribe();
    };
  }, []);

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
    
    // Prevent premature navigation during OAuth processing where currentUser is set 
    // but userProfile is still being enriched.
    if (isOAuthProcessing) return;
    if (currentUser && !userProfile) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inPendingScreen = segments[0] === 'pending-church-link';
    const inDisabledScreen = segments[0] === 'disabled-account';
    const inWalkthrough = (segments[0] as string) === 'walkthrough';
    const inCompleteProfile = (segments[0] as string) === 'complete-profile';
    
    // Using strict super_admin bypass — checks systemRoles array (multi-role compatible)
    const isSuperAdmin = Array.isArray(userProfile?.systemRoles)
      ? userProfile.systemRoles.includes('super_admin')
      : userProfile?.role === 'super_admin';
    const isPendingChurch = !isSuperAdmin && (userProfile?.status === 'pending_church_link' || (!userProfile?.churchId && currentUser));
    const userProviders = Array.isArray(userProfile?.providers) ? userProfile.providers : [];
    const authProvider = userProfile?.authProvider || '';
    const authUserProviders = (currentUser?.providerData || []).map((p) => p?.providerId).filter(Boolean) as string[];
    const allProviders = Array.from(new Set([...userProviders, ...authUserProviders]));

    const isOAuth = 
      authProvider === 'google' || 
      authProvider === 'apple' || 
      allProviders.includes('google.com') || 
      allProviders.includes('apple.com');

    // If onboardingStatus is PENDING_PROFILE, or if an OAuth user has not yet COMPLETED their profile,
    // they MUST complete their profile before anything else.
    const isPendingProfile =
      !isSuperAdmin &&
      (userProfile?.onboardingStatus === 'PENDING_PROFILE' ||
        (isOAuth && userProfile?.onboardingStatus !== 'COMPLETED'));
    
    const isDisabled = currentUser && (userProfile?.status === 'disabled' || !canAccessMobileApp(userProfile));

    if (!currentUser) {
      if (!hasSeenWalkthrough && !inWalkthrough && !inAuthGroup) {
        router.replace('/walkthrough');
      } else if (hasSeenWalkthrough && !inAuthGroup && !inWalkthrough) {
        router.replace('/(auth)/login');
      }
    } else if (isDisabled && !inDisabledScreen) {
       router.replace('/disabled-account');
    } else if (currentUser && !isDisabled && isPendingProfile && !inCompleteProfile) {
       // Force user to complete their profile before anything else
       router.replace('/complete-profile' as any);
    } else if (currentUser && !isDisabled && !isPendingProfile && isPendingChurch && !inPendingScreen) {
      // Redirect to pending screen
      router.replace('/pending-church-link');
    } else if (currentUser && !isPendingChurch && !isDisabled && !isPendingProfile && (inAuthGroup || inPendingScreen || inDisabledScreen || inWalkthrough || inCompleteProfile)) {
      // Redirect to main app
      router.replace('/(tabs)');
    }
  }, [currentUser, userProfile, initialized, hasSeenWalkthrough, segments, router, isOAuthProcessing]);

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
              <Stack.Screen name="complete-profile" options={{ headerShown: false }} />
              <Stack.Screen name="disabled-account" options={{ headerShown: false }} />
              <Stack.Screen name="scanner" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen name="my-qr" options={{ presentation: 'transparentModal', animation: 'none', headerShown: false }} />
              <Stack.Screen name="my-journey" options={{ headerShown: false }} />
              <Stack.Screen name="more" options={{ headerShown: false }} />
              <Stack.Screen name="giving" options={{ headerShown: false }} />
              <Stack.Screen name="giving-campaign-detail" options={{ headerShown: false }} />
              <Stack.Screen name="giving-form" options={{ headerShown: false }} />
              <Stack.Screen name="version-manager" options={{ presentation: 'transparentModal', animation: 'none', headerShown: false }} />
              <Stack.Screen name="create-setlist" options={{ presentation: 'transparentModal', animation: 'none', headerShown: false }} />
              <Stack.Screen name="assign-ministries" options={{ presentation: 'transparentModal', animation: 'none', headerShown: false }} />
              <Stack.Screen name="audio-player" options={{ presentation: 'modal', headerShown: false }} />
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
          <AnimatedSplashScreen
            onAnimationFinish={() => {
              setSplashAnimationFinished(true);
              if (loaded || fontError) {
                setShowAnimatedSplash(false);
              }
            }}
          />
        </View>
      )}
    </GestureHandlerRootView>
  );
}
