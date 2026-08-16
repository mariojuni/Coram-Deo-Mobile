import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type AppEnvironment = 'staging' | 'production';

export interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
  googleWebClientId?: string;
  googleIosClientId?: string;
  firestoreDatabaseId?: string;
}

export const ENV_STORAGE_KEY = 'church_app_selected_environment';

// Default build environment specified at build time ('production' or 'staging')
export const BUILD_ENV: AppEnvironment = 
  process.env.EXPO_PUBLIC_APP_ENV === 'production' ? 'production' : 'staging';

// Environment configurations (Staging and Production only)
const ENV_CONFIGS: Record<AppEnvironment, FirebaseConfig> = {
  production: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_PROD_API_KEY || "AIzaSyCiW6T8eeCy9SHaA-bP12oERod2AA4ht9A",
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_PROD_AUTH_DOMAIN || "coramdeo-prod.firebaseapp.com",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROD_PROJECT_ID || "coramdeo-prod",
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_PROD_STORAGE_BUCKET || "coramdeo-prod.firebasestorage.app",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_PROD_MESSAGING_SENDER_ID || "130463348213",
    appId: process.env.EXPO_PUBLIC_FIREBASE_PROD_APP_ID || "1:130463348213:web:56e7fc5bfd0759115d5cbc",
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_PROD_MEASUREMENT_ID || "G-7VB550X705",
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID_PROD || "130463348213-jtvok5garqt7v6d76sreg21bkotvokpo.apps.googleusercontent.com",
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID_PROD || "130463348213-7fqr37i68h4u3jt7hjj30gag2t8ntv1k.apps.googleusercontent.com",
    firestoreDatabaseId: process.env.EXPO_PUBLIC_FIREBASE_PROD_DATABASE_ID || "coramdeo",
  },
  staging: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_STAGING_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyC49Pgux68K5xpdBLCAE86kJieIaB3AYpE",
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_STAGING_AUTH_DOMAIN || process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "coramdeo-prod.firebaseapp.com",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_STAGING_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "coramdeo-prod",
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STAGING_STORAGE_BUCKET || process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "coramdeo-prod.firebasestorage.app",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_STAGING_MESSAGING_SENDER_ID || process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "130463348213",
    appId: process.env.EXPO_PUBLIC_FIREBASE_STAGING_APP_ID || process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:130463348213:web:56e7fc5bfd0759115d5cbc",
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_STAGING_MEASUREMENT_ID || process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-7VB550X705",
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID_STAGING || "130463348213-jtvok5garqt7v6d76sreg21bkotvokpo.apps.googleusercontent.com",
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID_STAGING || "130463348213-4vn6d7vfvp1bad7298agpf9n8r0npq7l.apps.googleusercontent.com",
    firestoreDatabaseId: process.env.EXPO_PUBLIC_FIREBASE_STAGING_DATABASE_ID || "coramdeo",
  },
};

/**
 * Returns allowed target environments for the current build type.
 * Production build MUST lock to production only.
 * Non-production (staging) build allows switching between staging and production.
 */
export const getAllowedEnvironments = (): AppEnvironment[] => {
  if (BUILD_ENV === 'production') {
    return ['production'];
  }
  return ['staging', 'production'];
};

/**
 * Returns the currently active Firebase environment.
 * On Web: Reads synchronously from localStorage if present.
 */
export const getInitialSelectedEnvironmentSync = (): AppEnvironment => {
  if (BUILD_ENV === 'production') {
    return 'production';
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(ENV_STORAGE_KEY) as AppEnvironment | null;
      if (saved && getAllowedEnvironments().includes(saved)) {
        return saved;
      }
    } catch (e) {
      console.warn('Failed to read environment from localStorage', e);
    }
  }
  return 'production'; // Default to production even in staging builds
};

/**
 * Reads saved environment asynchronously from AsyncStorage.
 */
export const getSavedEnvironment = async (): Promise<AppEnvironment> => {
  if (BUILD_ENV === 'production') {
    return 'production';
  }
  try {
    const saved = await AsyncStorage.getItem(ENV_STORAGE_KEY);
    if (saved && getAllowedEnvironments().includes(saved as AppEnvironment)) {
      return saved as AppEnvironment;
    }
  } catch (e) {
    console.warn('Failed to get saved environment from AsyncStorage', e);
  }
  return 'production'; // Default to production even in staging builds
};

/**
 * Saves selected environment to storage.
 */
export const setSavedEnvironment = async (env: AppEnvironment): Promise<void> => {
  if (BUILD_ENV === 'production') {
    return;
  }
  const allowed = getAllowedEnvironments();
  if (!allowed.includes(env)) {
    throw new Error(`Environment '${env}' is not allowed in ${BUILD_ENV} build.`);
  }

  try {
    await AsyncStorage.setItem(ENV_STORAGE_KEY, env);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(ENV_STORAGE_KEY, env);
    }
  } catch (e) {
    console.warn('Failed to save selected environment', e);
  }
};

/**
 * Retrieves the Firebase configuration for a given or currently selected environment.
 */
export const getFirebaseConfigForEnv = (env: AppEnvironment): FirebaseConfig => {
  if (BUILD_ENV === 'production') {
    return ENV_CONFIGS.production;
  }
  return ENV_CONFIGS[env] || ENV_CONFIGS[BUILD_ENV];
};
