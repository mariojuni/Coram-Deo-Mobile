import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useColorScheme, View, Text, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
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
    }
  }, [initialized, userProfile?.churchId, initializeMembersListener, initializeServicesListener]);

  useEffect(() => {
    // On fresh install, trigger background download of default Bible (NASB2020: 2692)
    const initOfflineBible = async () => {
      try {
        const { isBibleOffline } = await import('../utils/offlineDb');
        const offline = await isBibleOffline('2692');
        if (!offline) {
          console.log('Initiating background download of default Bible (2692)...');
          const { downloadBibleOffline } = await import('../utils/bibleApi');
          downloadBibleOffline('2692');
        }
      } catch (e) {
        console.error('Failed to init offline bible sync:', e);
      }
    };
    initOfflineBible();
  }, []);

  const appReady = loaded && initialized && hasSeenWalkthrough !== null;





  useEffect(() => {
    if (!initialized || hasSeenWalkthrough === null) return;

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
              <Stack.Screen name="audio-player" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen name="sermon-watch" options={{ headerShown: false }} />
              <Stack.Screen name="sermon-detail" options={{ headerShown: false }} />
              <Stack.Screen name="serve-assignment-detail" options={{ headerShown: false }} />
              <Stack.Screen name="serve-ministry-detail" options={{ headerShown: false }} />
              <Stack.Screen name="ministry-application" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen name="bible-plans" options={{ headerShown: false }} />
              <Stack.Screen name="discipleship" options={{ headerShown: false }} />
              <Stack.Screen name="staff-finance" options={{ headerShown: false }} />
              <Stack.Screen name="staff-ministry-applications" options={{ headerShown: false }} />
              <Stack.Screen name="staff-ministry-application-detail" options={{ headerShown: false }} />
              <Stack.Screen name="profile" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
            </Stack>
          </VersionProvider>
          <PrayerRequestModal 
            isOpen={prayerModalOpen} 
            onClose={closePrayerModal} 
            initialData={editingPrayer} 
          />
          {process.env.EXPO_PUBLIC_APP_ENV !== 'production' && (
            <View pointerEvents="none" style={{
              position: 'absolute',
              top: 40, // Below status bar usually
              alignSelf: 'center',
              backgroundColor: 'rgba(255, 165, 0, 0.9)',
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 16,
              zIndex: 9999,
              elevation: 9999,
            }}>
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>
                {require('../firebase').currentActiveFirebaseEnv.toUpperCase()} ENVIRONMENT
              </Text>
            </View>
          )}
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
