import { initializeApp, deleteApp, getApps } from 'firebase/app';
import { initAppCheck, clearAppCheck } from './config/appCheck';
// @ts-ignore
import { initializeAuth, getReactNativePersistence, getAuth, browserLocalPersistence, indexedDBLocalPersistence } from 'firebase/auth';

import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getRemoteConfig, fetchAndActivate } from 'firebase/remote-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  getInitialSelectedEnvironmentSync,
  getSavedEnvironment,
  getFirebaseConfigForEnv,
  AppEnvironment,
} from './config/environments';

export let currentActiveFirebaseEnv: AppEnvironment = getInitialSelectedEnvironmentSync();

const initialConfig = getFirebaseConfigForEnv(currentActiveFirebaseEnv);
let activeApp = initializeApp(initialConfig);
import { Alert, Platform } from 'react-native';
if (Platform.OS !== 'web') {
  Alert.alert('App Env Info', `APP_ENV is: ${process.env.EXPO_PUBLIC_APP_ENV}`);
}
initAppCheck(activeApp);

let activeAuth = Platform.OS === 'web' 
  ? initializeAuth(activeApp, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] })
  : initializeAuth(activeApp, { persistence: getReactNativePersistence(AsyncStorage) });
let activeDb = getFirestore(activeApp, initialConfig.firestoreDatabaseId || 'coramdeo');
let activeStorage = getStorage(activeApp);

export const getActiveApp = () => activeApp;
export const getActiveAuth = () => activeAuth;
export const getActiveDb = () => activeDb;
export const getActiveStorage = () => activeStorage;

// NOTE: We do NOT export Proxies for App, Auth, DB, or Storage.
// In Firebase JS SDK v10+, passing a Proxy to functions like `onSnapshot` or `collection`
// strips private fields (like #client) and breaks internal WeakMaps, causing errors like:
// "TypeError: Cannot read property 'asyncQueue' of undefined"
// Repositories MUST call getActiveDb(), getActiveAuth(), etc. directly.

export const reinitFirebaseForEnv = async (targetEnv: AppEnvironment) => {
  if (targetEnv === currentActiveFirebaseEnv && activeApp) {
    return;
  }

  currentActiveFirebaseEnv = targetEnv;
  const config = getFirebaseConfigForEnv(targetEnv);

  try {
    const existingApps = getApps();
    for (const a of existingApps) {
      await deleteApp(a).catch(() => {});
    }
    clearAppCheck(); // Clear the cached AppCheck instance so it can recreate for the new app
  } catch (e) {
    console.warn('Error deleting existing Firebase app instances:', e);
  }

  // Initialize with targetEnv as name to ensure we get a fresh app instance
  activeApp = initializeApp(config, targetEnv);
  initAppCheck(activeApp);

  try {
    activeAuth = Platform.OS === 'web'
      ? initializeAuth(activeApp, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] })
      : initializeAuth(activeApp, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch (e) {
    activeAuth = getAuth(activeApp);
  }

  activeDb = getFirestore(activeApp, config.firestoreDatabaseId || 'coramdeo');
  activeStorage = getStorage(activeApp);
  console.log(`[Firebase] Successfully reinitialized default Firebase app for env '${targetEnv}' (Project: ${config.projectId}, Database ID: ${config.firestoreDatabaseId || '(default)'})`);
};

export const ensureFirebaseEnvironmentLoaded = async (): Promise<AppEnvironment> => {
  const savedEnv = await getSavedEnvironment();
  if (savedEnv !== currentActiveFirebaseEnv) {
    await reinitFirebaseForEnv(savedEnv);
  }
  return currentActiveFirebaseEnv;
};

// Initialize Remote Config for Feature Flags
let remoteConfig: any;
if (Platform.OS !== 'web' || typeof window !== 'undefined') {
  if (Platform.OS === 'web') {
    try {
      remoteConfig = getRemoteConfig(activeApp);
      remoteConfig.settings.minimumFetchIntervalMillis = process.env.EXPO_PUBLIC_APP_ENV === 'staging' ? 0 : 3600000;
      
      remoteConfig.defaultConfig = {
        givingEnabled: true,
        financeReportsEnabled: false,
        worshipSetlistEnabled: true,
        discipleshipEnabled: true,
        sundaySchoolEnabled: false,
        youtubeReferencePlayerEnabled: true,
      };

      fetchAndActivate(remoteConfig).catch((err) => {
        console.warn('Failed to fetch Remote Config', err);
      });
    } catch (e) {
      console.warn('Remote Config initialization failed', e);
    }
  } else {
    console.log('Skipping Remote Config web initialization on Mobile.');
  }
}

export { remoteConfig };
