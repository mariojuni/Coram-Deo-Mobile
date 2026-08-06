import { Platform } from 'react-native';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, AppCheck } from 'firebase/app-check';
import { createReactNativeCustomProvider } from './CustomProvider';
import { FirebaseApp } from 'firebase/app';

let appCheckInstance: AppCheck | null = null;
let rnfbAppCheckInstance: any = null;

export const clearAppCheck = () => {
  appCheckInstance = null;
  // Note: we intentionally keep rnfbAppCheckInstance alive — RNFB App Check
  // on [DEFAULT] cannot be re-initialized once set up. We just re-wrap it
  // for the new JS SDK firebase app instance.
};

export const initAppCheck = (firebaseApp: FirebaseApp) => {
  if (appCheckInstance) return appCheckInstance;

  // Determine environment dynamically from the FirebaseApp options
  const isProd = firebaseApp.options?.projectId === 'coramdeo-prod' || process.env.EXPO_PUBLIC_APP_ENV === 'production';
  const debugTokenAndroid = process.env.EXPO_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN_ANDROID;
  // If we are in Prod and testing locally, use the specific Prod Simulator debug token
  const debugTokenIos = isProd ? "D2989A35-D9BF-4363-A640-A87FDBCB7686" : process.env.EXPO_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN_IOS;
  const debugTokenWeb = process.env.EXPO_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN_WEB;

  if (Platform.OS === 'web') {
    // WEB CONFIGURATION
    const reCaptchaSiteKey = process.env.EXPO_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
    
    // Enable debug mode for web if token is provided or not in production
    if (!isProd && typeof window !== 'undefined') {
      // @ts-ignore - Firebase reads this global variable for web debug token
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugTokenWeb || true;
    }

    if (reCaptchaSiteKey) {
      appCheckInstance = initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaEnterpriseProvider(reCaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
      console.log('Firebase App Check initialized (Web/reCAPTCHA)');
    } else {
      console.warn('Skipping App Check web init: Missing reCAPTCHA site key.');
    }
  } else {
    // MOBILE CONFIGURATION (React Native)
    try {
      if (!isProd) {
        // ── STAGING / DEV ──────────────────────────────────────────────────────
        // The RNFB native layer is always bound to the [DEFAULT] Firebase app
        // (GoogleService-Info.plist), which is the PRODUCTION project.
        // Bridging that token for a STAGING JS SDK app would make App Check
        // reject every request because the token belongs to a different project.
        //
        // Fix: Skip App Check entirely for staging on mobile. The staging
        // Firebase project should have App Check enforcement disabled so requests
        // go through without a token. This is safe — staging is not production.
        console.log(`Firebase App Check: Skipping for STAGING mobile environment (${firebaseApp.options?.projectId}). Ensure App Check enforcement is disabled in the staging Firebase Console.`);
        // appCheckInstance stays null — no token will be attached to requests.
      } else {
        // ── PRODUCTION ─────────────────────────────────────────────────────────
        // 1. Initialize React Native Firebase App Check Provider
        const Device = require('expo-device');
        const { initializeAppCheck: initializeRNFBAppCheck, ReactNativeFirebaseAppCheckProvider } = require('@react-native-firebase/app-check');
        const rnfirebase = require('@react-native-firebase/app').default || require('@react-native-firebase/app');

        // The native RNFB app is always [DEFAULT], loaded from GoogleService-Info.plist.
        // In the Production scheme that plist IS the prod plist, so bridging is safe.
        const rnfbApp = rnfirebase.app();

        const provider = new ReactNativeFirebaseAppCheckProvider();

        if (!Device.isDevice) {
          // Production on Simulator: fall back to debug provider
          provider.configure({
            android: { provider: 'debug', debugToken: debugTokenAndroid || '' },
            apple:   { provider: 'debug', debugToken: debugTokenIos   || '' },
          });
          console.log(`RNFB App Check: Debug Provider Configured (Prod Simulator) for ${rnfbApp.name}`);
        } else {
          // Production on real device: Play Integrity & App Attest
          provider.configure({
            android: { provider: 'playIntegrity' },
            apple:   { provider: 'appAttestWithDeviceCheckFallback' },
          });
          console.log(`RNFB App Check: Production Providers Configured for ${rnfbApp.name} (${rnfbApp.options?.projectId || 'default'})`);
        }

        // Initialize the native RNFB module only once
        if (!rnfbAppCheckInstance) {
          rnfbAppCheckInstance = initializeRNFBAppCheck(rnfbApp, {
            provider: provider,
            isTokenAutoRefreshEnabled: true,
          });
        }

        // 2. Bridge the RNFB token into the JS SDK App Check instance
        appCheckInstance = initializeAppCheck(firebaseApp, {
          provider: createReactNativeCustomProvider(rnfbAppCheckInstance),
          isTokenAutoRefreshEnabled: true,
        });
        console.log(`Firebase App Check initialized (Mobile/CustomProvider Bridged) for ${firebaseApp.name}`);
      }
    } catch (e) {
      console.warn('Failed to initialize App Check on Mobile', e);
    }
  }

  return appCheckInstance;
};
