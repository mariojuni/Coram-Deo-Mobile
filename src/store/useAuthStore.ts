import type { User } from 'firebase/auth';
import { create } from 'zustand';
import { authRepository, RegistrationPayload, fetchUserAccount } from '../features/auth/data/auth.repository';
import type { AuthCredentialResult, UserAccount } from '../features/auth/domain/auth.types';
import { clearSensitiveCache } from '../features/files/services/fileCacheService';
import { useMemberStore } from './useMemberStore';
import { useScheduleStore } from './useScheduleStore';
import { useBiblePlanStore } from './useBiblePlanStore';
import { useSermonStore } from './useSermonStore';
import { useWorshipStore } from './useWorshipStore';
import { useDiscipleshipGroupStore } from './useDiscipleshipGroupStore';
import { useMinistryStore } from './useMinistryStore';
import { useFeedStore } from './useFeedStore';

interface AuthState {
  currentUser: User | null;
  userProfile: UserAccount | null;
  loading: boolean;
  initialized: boolean;
  signup: (payload: RegistrationPayload) => Promise<AuthCredentialResult>;
  login: (email: string, password: string) => Promise<AuthCredentialResult>;
  loginWithGoogle: () => Promise<AuthCredentialResult>;
  loginWithApple: () => Promise<AuthCredentialResult>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  initializeAuthListener: () => void;
  updateUserProfile: (updates: Partial<UserAccount>) => void;
}

export const clearAllStoreListeners = () => {
  useMemberStore.getState().initializeServicesListener(null);
  useMemberStore.getState().initializeHouseholdsListener(null);
  useScheduleStore.getState().clearSchedulesListener();
  useBiblePlanStore.getState().clearAllListeners();
  useSermonStore.getState().unsubscribeSermons();
  useWorshipStore.getState().clearSetlistsListener();
  useDiscipleshipGroupStore.getState().initializeUserGroupsListener(null);
  useDiscipleshipGroupStore.getState().clearActiveGroup();
  useMinistryStore.getState().clearMinistryListeners();
  useSermonStore.setState({ sermons: [], loading: false, currentSermon: null });
  useFeedStore.getState().clearFeedsListener();
};

export const clearAllCachesAndReset = async () => {
  try {
    const currentUser = useAuthStore.getState().currentUser;
    if (currentUser) {
      try {
        const { getMessaging, getToken } = await import('@react-native-firebase/messaging');
        const messaging = getMessaging();
        const token = await getToken(messaging);
        if (token) {
          const { PushTokenService } = await import('../services/notification/PushTokenService');
          await PushTokenService.unregisterDeviceToken(currentUser.uid, token);
        }
      } catch (err) {
        console.warn('Failed to unregister push token on clearAllCachesAndReset', err);
      }
    }
    clearAllStoreListeners();
    await clearSensitiveCache();
    await import('@react-native-async-storage/async-storage').then(m => m.default.removeItem('bible_prefs'));
    await authRepository.logout();
  } catch (e) {
    console.warn('Failed during clearAllCachesAndReset', e);
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  userProfile: null,
  loading: true,
  initialized: false,
  signup: (payload) => authRepository.signup(payload),
  login: (email, password) => authRepository.login(email, password),
  sendPasswordReset: (email) => authRepository.sendPasswordReset(email),
  loginWithGoogle: async () => {
    try {
      authRepository.setOAuthProcessing(true);
      const result = await authRepository.loginWithGoogle();
      if (result.user) {
        set({ currentUser: result.user });

        const googleGivenName = (result as any)._googleGivenName ?? null;
        const googleFamilyName = (result as any)._googleFamilyName ?? null;

        authRepository.enrichGoogleUserInBackground(
          result.user,
          result.user.email || undefined,
          result.user.phoneNumber || undefined,
          googleGivenName,
          googleFamilyName
        ).then(() => {
          return fetchUserAccount(result.user);
        }).then((updatedProfile) => {
          if (updatedProfile) set({ userProfile: updatedProfile });
        }).catch((err) => {
          console.warn('[Auth Store] Background Google enrichment error:', err);
        }).finally(() => {
          authRepository.setOAuthProcessing(false);
        });
      } else {
        authRepository.setOAuthProcessing(false);
      }
      return result;
    } catch (error: any) {
      authRepository.setOAuthProcessing(false);
      console.error("Google Sign-In Error", error);
      const errorStr = String(error);
      if (errorStr.includes('NETWORK_ERROR') || errorStr.includes('network-request-failed')) {
        throw new Error('A network error occurred. Please check your internet connection and try again.');
      } else if (errorStr.includes('DEVELOPER_ERROR')) {
        throw new Error('Google Sign-In failed. Please try again.');
      } else if (errorStr.includes('SIGN_IN_CANCELLED') || errorStr.includes('canceled')) {
        throw new Error('Google Sign-In was canceled.');
      }
      throw error;
    }
  },
  loginWithApple: async () => {
    try {
      authRepository.setOAuthProcessing(true);
      const result = await authRepository.loginWithApple();
      if (result.user) {
        set({ currentUser: result.user });

        const appleFullName = (result as any)._appleFullName ?? null;
        const appleEmail = (result as any)._appleEmail ?? result.user.email ?? undefined;

        authRepository.enrichAppleUserInBackground(
          result.user,
          appleEmail,
          appleFullName,
        ).then(() => {
          return fetchUserAccount(result.user);
        }).then((updatedProfile) => {
          if (updatedProfile) set({ userProfile: updatedProfile });
        }).catch((err) => {
          console.warn('[Auth Store] Background Apple enrichment error:', err);
        }).finally(() => {
          authRepository.setOAuthProcessing(false);
        });
      } else {
        authRepository.setOAuthProcessing(false);
      }
      return result;
    } catch (error: any) {
      authRepository.setOAuthProcessing(false);
      console.error("Apple Sign-In Error", error);
      const errorStr = String(error);
      if (errorStr.includes('ERR_REQUEST_CANCELED') || errorStr.includes('canceled')) {
        throw new Error('Apple Sign-In was canceled.');
      }
      throw error;
    }
  },
  logout: async () => {
    try {
      const currentUser = useAuthStore.getState().currentUser;
      if (currentUser) {
        try {
          const { getMessaging, getToken } = await import('@react-native-firebase/messaging');
          const messaging = getMessaging();
          const token = await getToken(messaging);
          if (token) {
            const { PushTokenService } = await import('../services/notification/PushTokenService');
            await PushTokenService.unregisterDeviceToken(currentUser.uid, token);
          }
        } catch (err) {
          console.warn('Failed to unregister push token on logout', err);
        }
      }
      clearAllStoreListeners();
      await clearSensitiveCache();
      await import('@react-native-async-storage/async-storage').then(m => m.default.removeItem('bible_prefs'));
    } catch (e) {
      console.warn('Failed to clear sensitive cache on logout', e);
    }
    return authRepository.logout();
  },
  deleteAccount: async () => {
    try {
      const currentUser = useAuthStore.getState().currentUser;
      if (currentUser) {
        try {
          const { getMessaging, getToken } = await import('@react-native-firebase/messaging');
          const messaging = getMessaging();
          const token = await getToken(messaging);
          if (token) {
            const { PushTokenService } = await import('../services/notification/PushTokenService');
            await PushTokenService.unregisterDeviceToken(currentUser.uid, token);
          }
        } catch (err) {
          console.warn('Failed to unregister push token on deleteAccount', err);
        }
      }

      // Clear listeners BEFORE deleting the account to prevent Firestore permission denied errors
      clearAllStoreListeners();
      await clearSensitiveCache();
      await import('@react-native-async-storage/async-storage').then(m => m.default.removeItem('bible_prefs'));
      
      await authRepository.deleteAccount();
      set({ currentUser: null, userProfile: null });
    } catch (error: any) {
      if (error?.code === 'auth/requires-recent-login' || error?.message?.includes('recent-login')) {
         authRepository.logout();
      }
      throw error;
    }
  },
  initializeAuthListener: () => {
    authRepository.subscribeToAuthState(
      ({ user, profile }) => {
        if (!user) {
          clearAllStoreListeners();
        }
        set({
          currentUser: user,
          userProfile: profile,
          loading: false,
          initialized: true,
        });
      },
      (error) => {
        console.error('Error listening to auth state:', error);
        set({ loading: false, initialized: true });
      }
    );
  },
  updateUserProfile: (updates) => {
    set((state) => ({
      userProfile: state.userProfile ? { ...state.userProfile, ...updates } : null,
    }));
  }
}));
