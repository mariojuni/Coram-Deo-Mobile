import type { User } from 'firebase/auth';
import { create } from 'zustand';
import { authRepository, RegistrationPayload, fetchUserAccount, saveCachedUserProfile } from '../features/auth/data/auth.repository';
import type { AuthCredentialResult, UserAccount } from '../features/auth/domain/auth.types';
import { mapAuthError } from '../features/auth/utils/auth-error-mapper';
import { AppAuthError } from '../features/auth/domain/auth-error.types';
import { clearSensitiveCache } from '../features/files/services/fileCacheService';
import { useMemberStore } from './useMemberStore';
import { useScheduleStore } from './useScheduleStore';
import { useBiblePlanStore } from './useBiblePlanStore';
import { useSermonStore } from './useSermonStore';
import { useWorshipStore } from './useWorshipStore';
import { useDiscipleshipGroupStore } from './useDiscipleshipGroupStore';
import { useMinistryStore } from './useMinistryStore';
import { useFeedStore } from './useFeedStore';
import { useNotificationStore } from './useNotificationStore';

interface AuthState {
  currentUser: User | null;
  userProfile: UserAccount | null;
  loading: boolean;
  initialized: boolean;
  isOAuthProcessing: boolean;
  signup: (payload: RegistrationPayload) => Promise<AuthCredentialResult>;
  login: (email: string, password: string) => Promise<AuthCredentialResult>;
  loginWithGoogle: () => Promise<AuthCredentialResult>;
  loginWithApple: () => Promise<AuthCredentialResult>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  initializeAuthListener: () => void;
  updateUserProfile: (updates: Partial<UserAccount>) => void;
  refreshUserProfile: () => Promise<void>;
}

export const clearAllStoreListeners = () => {
  useMemberStore.getState().initializeMembersListener(null);
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
  useNotificationStore.getState().clearListener();
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

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  userProfile: null,
  loading: true,
  initialized: false,
  isOAuthProcessing: false,
  signup: async (payload) => {
    try {
      return await authRepository.signup(payload);
    } catch (error) {
      throw mapAuthError(error);
    }
  },
  login: async (email, password) => {
    try {
      return await authRepository.login(email, password);
    } catch (error) {
      throw mapAuthError(error);
    }
  },
  sendPasswordReset: (email) => authRepository.sendPasswordReset(email),
  loginWithGoogle: async () => {
    try {
      set({ isOAuthProcessing: true });
      authRepository.setOAuthProcessing(true);
      const result = await authRepository.loginWithGoogle();
      if (result.user) {
        const googleGivenName = (result as any)._googleGivenName ?? null;
        const googleFamilyName = (result as any)._googleFamilyName ?? null;

        const updatedProfile = await authRepository.enrichGoogleUser(
          result.user,
          result.user.email || undefined,
          result.user.phoneNumber || undefined,
          googleGivenName,
          googleFamilyName
        );

        set({ currentUser: result.user, userProfile: updatedProfile, isOAuthProcessing: false });
        authRepository.setOAuthProcessing(false);
      } else {
        set({ isOAuthProcessing: false });
        authRepository.setOAuthProcessing(false);
      }
      return result;
    } catch (error: any) {
      set({ isOAuthProcessing: false });
      authRepository.setOAuthProcessing(false);
      console.error("Google Sign-In Error", error);
      throw mapAuthError(error);
    }
  },
  loginWithApple: async () => {
    try {
      set({ isOAuthProcessing: true });
      authRepository.setOAuthProcessing(true);
      const result = await authRepository.loginWithApple();
      if (result.user) {
        const appleFullName = (result as any)._appleFullName ?? null;
        const appleEmail = (result as any)._appleEmail ?? result.user.email ?? undefined;

        const updatedProfile = await authRepository.enrichAppleUser(
          result.user,
          appleEmail,
          appleFullName,
        );

        set({ currentUser: result.user, userProfile: updatedProfile, isOAuthProcessing: false });
        authRepository.setOAuthProcessing(false);
      } else {
        set({ isOAuthProcessing: false });
        authRepository.setOAuthProcessing(false);
      }
      return result;
    } catch (error: any) {
      set({ isOAuthProcessing: false });
      authRepository.setOAuthProcessing(false);
      console.error("Apple Sign-In Error", error);
      throw mapAuthError(error);
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
    set((state) => {
      const updated = state.userProfile ? { ...state.userProfile, ...updates } : null;
      if (updated && state.currentUser) {
        saveCachedUserProfile(state.currentUser.uid, updated).catch(() => {});
      }
      return { userProfile: updated };
    });
  },
  refreshUserProfile: async () => {
    const { currentUser } = get();
    if (currentUser) {
      try {
        const profile = await fetchUserAccount(currentUser);
        if (profile) {
          set({ userProfile: profile });
        }
      } catch (err) {
        console.warn('Failed to refresh user profile:', err);
      }
    }
  }
}));
