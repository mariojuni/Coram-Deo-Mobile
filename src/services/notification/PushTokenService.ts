import { getMessaging, requestPermission, getToken, AuthorizationStatus, registerDeviceForRemoteMessages, isDeviceRegisteredForRemoteMessages } from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getActiveDb, currentActiveFirebaseEnv } from '../../firebase';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

export class PushTokenService {
  /**
   * Request permission for push notifications and register device token.
   */
  static async registerDeviceToken(userId: string): Promise<string | null> {
    try {
      try {
        const messaging = getMessaging();
        const authStatus = await requestPermission(messaging);
        const enabled =
          authStatus === AuthorizationStatus.AUTHORIZED ||
          authStatus === AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.log('Push notification permission denied.');
          return null;
        }

        // On iOS, we must register for remote messages before calling getToken
        if (Platform.OS === 'ios' && !isDeviceRegisteredForRemoteMessages(messaging)) {
          if (Device.isDevice) {
            await registerDeviceForRemoteMessages(messaging);
          } else {
            console.log('Skipping APNs registration on iOS Simulator.');
            return null; // FCM tokens require physical devices on iOS (or special macOS 13+ config)
          }
        }

        // Get the token
        const token = await getToken(messaging);
        if (token) {
          await this.saveTokenToFirestore(userId, token, true);
        }
        return token;
      } catch (e: any) {
        if (e?.message?.includes('NativeRNFBTurboMessaging') || e?.message?.includes('Native module')) {
          console.warn('Firebase Messaging not available (Native Module missing). Please rebuild the dev client.');
        } else {
          throw e;
        }
      }
    } catch (error) {
      console.error('Error registering device token:', error);
    }
    return null;
  }

  /**
   * Update the user's permission state or refresh token.
   */
  static async saveTokenToFirestore(userId: string, token: string, notificationsEnabled: boolean): Promise<void> {
    if (!userId || !token) return;

    try {
      // In a real app we might want to get a unique device id using expo-device or similar.
      // For now, we'll use the token itself as the document id or a known device id.
      // To prevent token duplication, using the token string as the ID ensures uniqueness.
      const deviceId = token; // Or use a persistent device ID

      const environment = currentActiveFirebaseEnv || 'staging';

      const db = getActiveDb();
      const tokenRef = doc(db, `userPushTokens/${userId}/devices`, deviceId);
      await setDoc(tokenRef, {
        userId,
        deviceId,
        token,
        platform: Platform.OS,
        environment,
        appVersion: Constants.expoConfig?.version || '1.0.0',
        notificationsEnabled,
        lastSeenAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

    } catch (error) {
      console.error('Error saving push token to Firestore:', error);
    }
  }

  /**
   * Unregister a token (e.g., on logout)
   */
  static async unregisterDeviceToken(userId: string, token: string): Promise<void> {
    if (!userId || !token) return;
    try {
      const db = getActiveDb();
      const tokenRef = doc(db, `userPushTokens/${userId}/devices`, token);
      await setDoc(tokenRef, {
        notificationsEnabled: false,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error('Error unregistering device token:', error);
    }
  }
}
