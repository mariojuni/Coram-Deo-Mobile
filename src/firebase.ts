import { initializeApp } from 'firebase/app';
import { initAppCheck } from './config/appCheck';
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';

import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getRemoteConfig, fetchAndActivate } from 'firebase/remote-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);

// Initialize App Check before Auth, Firestore, and Storage
initAppCheck(app);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Remote Config for Feature Flags
let remoteConfig;
if (Platform.OS !== 'web' || typeof window !== 'undefined') {
  remoteConfig = getRemoteConfig(app);
  remoteConfig.settings.minimumFetchIntervalMillis = process.env.EXPO_PUBLIC_APP_ENV === 'staging' ? 0 : 3600000;
  
  // Set default values for feature flags
  remoteConfig.defaultConfig = {
    givingEnabled: true,
    financeReportsEnabled: false,
    worshipSetlistEnabled: true,
    discipleshipEnabled: true,
    sundaySchoolEnabled: false,
    youtubeReferencePlayerEnabled: true,
  };

  fetchAndActivate(remoteConfig).catch((err) => {
    console.warn("Failed to fetch Remote Config", err);
  });
}
export { remoteConfig };

