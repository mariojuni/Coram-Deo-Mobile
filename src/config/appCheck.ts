import { Platform } from 'react-native';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, AppCheck } from 'firebase/app-check';
import { app } from '../firebase'; // Assuming app will be exported or we can pass it
import { createReactNativeCustomProvider } from './CustomProvider';
import { FirebaseApp } from 'firebase/app';

let appCheckInstance: AppCheck | null = null;

export const initAppCheck = (firebaseApp: FirebaseApp) => {
  if (appCheckInstance) return appCheckInstance;

  const isProd = process.env.EXPO_PUBLIC_APP_ENV === 'production';
  const debugTokenAndroid = process.env.EXPO_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN_ANDROID;
  const debugTokenIos = process.env.EXPO_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN_IOS;

  if (Platform.OS === 'web') {
    // WEB CONFIGURATION
    const reCaptchaSiteKey = process.env.EXPO_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
    
    // Enable debug mode for web if not in production and localhost
    if (!isProd && typeof window !== 'undefined') {
      // @ts-ignore - Firebase reads this global variable for web debug token
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
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
      // 1. Initialize React Native Firebase native module
      const { firebase: rnfirebase } = require('@react-native-firebase/app');
      const rnfbAppCheck = require('@react-native-firebase/app-check').firebase.appCheck();
      
      // Determine debug provider or real provider
      if (!isProd) {
        // Staging/Dev: Use Debug Provider
        const provider = rnfirebase.appCheck.AppCheckProviderFactory.getInstance();
        provider.configure({
          android: {
            provider: 'debug',
            debugToken: debugTokenAndroid || '',
          },
          apple: {
            provider: 'debug',
            debugToken: debugTokenIos || '',
          },
        });
        console.log('RNFB App Check: Debug Provider Configured');
      } else {
        // Production: Play Integrity & App Attest
        const provider = rnfirebase.appCheck.AppCheckProviderFactory.getInstance();
        provider.configure({
          android: {
            provider: 'playIntegrity',
          },
          apple: {
            provider: 'appAttestWithDeviceCheckFallback',
          },
        });
        console.log('RNFB App Check: Production Providers Configured');
      }

      // 2. Initialize JS SDK App Check with Custom Provider bridging to RNFB
      appCheckInstance = initializeAppCheck(firebaseApp, {
        provider: createReactNativeCustomProvider(),
        isTokenAutoRefreshEnabled: true,
      });
      console.log('Firebase App Check initialized (Mobile/CustomProvider)');

    } catch (e) {
      console.warn('Failed to initialize App Check on Mobile', e);
    }
  }

  return appCheckInstance;
};
