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

interface AuthState {
  currentUser: User | null;
  userProfile: UserAccount | null;
  loading: boolean;
  initialized: boolean;
  signup: (payload: RegistrationPayload) => Promise<AuthCredentialResult>;
  login: (email: string, password: string) => Promise<AuthCredentialResult>;
  loginWithGoogle: () => Promise<AuthCredentialResult>;
  logout: () => Promise<void>;
  initializeAuthListener: () => void;
  updateUserProfile: (updates: Partial<UserAccount>) => void;
}

const clearAllStoreListeners = () => {
  useMemberStore.getState().initializeMembersListener(null);
  useMemberStore.getState().initializeServicesListener(null);
  useScheduleStore.getState().clearSchedulesListener();
  useBiblePlanStore.getState().clearAllListeners();
  useSermonStore.getState().unsubscribeSermons();
  useWorshipStore.getState().clearSetlistsListener();
  useDiscipleshipGroupStore.getState().initializeUserGroupsListener(null);
  useDiscipleshipGroupStore.getState().clearActiveGroup();
  useMinistryStore.getState().clearMinistryListeners();
  useSermonStore.setState({ sermons: [], loading: false, currentSermon: null });
};

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  userProfile: null,
  loading: true,
  initialized: false,
  signup: (payload) => authRepository.signup(payload),
  login: (email, password) => authRepository.login(email, password),
  loginWithGoogle: async () => {
    try {
      const result = await authRepository.loginWithGoogle();
      if (result.user) {
        const updatedProfile = await fetchUserAccount(result.user);
        if (updatedProfile) {
          set({ userProfile: updatedProfile });
        }
      }
      return result;
    } catch (error: any) {
      console.error("Google Sign-In Error", error);
      const errorStr = String(error);
      if (errorStr.includes('NETWORK_ERROR') || errorStr.includes('network-request-failed')) {
        throw new Error('A network error occurred. Please check your internet connection and try again.');
      } else if (errorStr.includes('DEVELOPER_ERROR')) {
        throw new Error('Google Sign-In is misconfigured on this device.');
      } else if (errorStr.includes('SIGN_IN_CANCELLED') || errorStr.includes('canceled')) {
        throw new Error('Google Sign-In was canceled.');
      }
      throw error;
    }
  },
  logout: async () => {
    try {
      clearAllStoreListeners();
      await clearSensitiveCache();
    } catch (e) {
      console.warn('Failed to clear sensitive cache on logout', e);
    }
    return authRepository.logout();
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
