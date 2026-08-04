import { Platform } from 'react-native';
import { CustomProvider, AppCheckToken } from 'firebase/app-check';

// This file creates a CustomProvider for the Firebase JS SDK
// that delegates to the React Native Firebase App Check module.
export const createReactNativeCustomProvider = (): CustomProvider => {
  return new CustomProvider({
    getToken: async (): Promise<AppCheckToken> => {
      if (Platform.OS === 'web') {
        throw new Error('CustomProvider should not be used on web.');
      }

      try {
        // Dynamically import to avoid breaking web builds
        const { firebase: rnfirebase } = require('@react-native-firebase/app');
        require('@react-native-firebase/app-check');
        
        const tokenResult = await rnfirebase.appCheck().getToken();
        
        return {
          token: tokenResult.token,
          expireTimeMillis: Date.now() + 3600000, // Roughly 1 hour, RNFB handles refresh automatically
        };
      } catch (error) {
        console.error('Failed to get App Check token from React Native Firebase', error);
        return {
          token: '',
          expireTimeMillis: 0,
        };
      }
    },
  });
};
