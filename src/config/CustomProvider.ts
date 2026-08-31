import { Platform } from 'react-native';
import { CustomProvider, AppCheckToken } from 'firebase/app-check';
import { Alert } from 'react-native';

// This file creates a CustomProvider for the Firebase JS SDK
// that delegates to the React Native Firebase App Check module.
export const createReactNativeCustomProvider = (rnfbAppCheckInstance: any): CustomProvider => {
  return new CustomProvider({
    getToken: async (): Promise<AppCheckToken> => {
      if (Platform.OS === 'web') {
        throw new Error('CustomProvider should not be used on web.');
      }

      try {
        const tokenResult = await rnfbAppCheckInstance.getToken(false);
        
        return {
          token: tokenResult.token,
          expireTimeMillis: Date.now() + 3600000, // Roughly 1 hour, RNFB handles refresh automatically
        };
      } catch (error: any) {
        if (__DEV__) {
          console.warn('App Check failed in DEV (likely simulator). Returning dummy token.', error);
          return {
            token: 'dummy-token-for-simulator',
            expireTimeMillis: Date.now() + 3600000,
          };
        }

        console.error('Failed to get App Check token from React Native Firebase', error);
        // Add an artificial delay to prevent immediate infinite loops if the JS SDK retries instantly
        await new Promise(resolve => setTimeout(resolve, 10000));
        throw error;
      }
    },
  });
};
