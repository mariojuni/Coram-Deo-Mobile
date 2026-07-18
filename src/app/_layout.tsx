import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { AudioProvider } from '../features/sermons/presentation/context/AudioContext';
import '../global.css';
import { useAuthStore } from '../store/useAuthStore';
import { useBibleVersionStore } from '../store/useBibleVersionStore';
import { useMemberStore } from '../store/useMemberStore';
import { canAccessMobileApp } from '../permissions/mobilePermissions';
import PrayerRequestModal from '../features/prayer/presentation/components/PrayerRequestModal';
import { useUIStore } from '../store/useUIStore';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({});

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
    initializeAuthListener();
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

  useEffect(() => {
    if (loaded && initialized && hasSeenWalkthrough !== null) {
      SplashScreen.hideAsync();
    }
  }, [loaded, initialized, hasSeenWalkthrough]);


  useEffect(() => {
    if (!initialized || hasSeenWalkthrough === null) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inPendingScreen = segments[0] === 'pending-access';
    const inWalkthrough = segments[0] === 'walkthrough';
    
    // Using strict super_admin bypass — checks systemRoles array (multi-role compatible)
    const isSuperAdmin = Array.isArray(userProfile?.systemRoles)
      ? userProfile.systemRoles.includes('super_admin')
      : userProfile?.role === 'super_admin';
    const isPending = !isSuperAdmin && (userProfile?.status === 'pendingChurchLink' || (!userProfile?.churchId && currentUser));
    
    const isDisabled = currentUser && !canAccessMobileApp(userProfile);

    if (currentUser && isDisabled) {
      useAuthStore.getState().logout();
      import('react-native').then(({ Alert }) => {
        Alert.alert('Account Disabled', 'Your account has been disabled. Please contact your church admin.');
      });
      return;
    }

    if (!currentUser) {
      if (!hasSeenWalkthrough && !inWalkthrough && !inAuthGroup) {
        router.replace('/walkthrough');
      } else if (hasSeenWalkthrough && !inAuthGroup && !inWalkthrough) {
        router.replace('/(auth)/login');
      }
    } else if (currentUser && isPending && !inPendingScreen) {
      // Redirect to pending screen
      router.replace('/pending-access');
    } else if (currentUser && !isPending && !isDisabled && (inAuthGroup || inPendingScreen || inWalkthrough)) {
      // Redirect to main app
      router.replace('/(tabs)');
    }
  }, [currentUser, userProfile, initialized, hasSeenWalkthrough, segments, router]);

  if (!loaded || !initialized || hasSeenWalkthrough === null) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AudioProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="walkthrough" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="pending-access" options={{ headerShown: false }} />
            <Stack.Screen name="scanner" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="my-qr" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="more" options={{ headerShown: false }} />
            <Stack.Screen name="giving" options={{ headerShown: false }} />
            <Stack.Screen name="version-manager" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="audio-player" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="sermon-watch" options={{ headerShown: false }} />
            <Stack.Screen name="sermon-detail" options={{ headerShown: false }} />
            <Stack.Screen name="serve-assignment-detail" options={{ headerShown: false }} />
            <Stack.Screen name="serve-ministry-detail" options={{ headerShown: false }} />
            <Stack.Screen name="ministry-application" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="bible-plans" options={{ headerShown: false }} />
            <Stack.Screen name="staff-finance" options={{ headerShown: false }} />
            <Stack.Screen name="profile" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <PrayerRequestModal 
            isOpen={prayerModalOpen} 
            onClose={closePrayerModal} 
            initialData={editingPrayer} 
          />
        </AudioProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
