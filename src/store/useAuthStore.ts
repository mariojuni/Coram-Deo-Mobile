import type { User } from 'firebase/auth';
import { create } from 'zustand';
import { authRepository, RegistrationPayload, fetchUserAccount } from '../features/auth/data/auth.repository';
import type { AuthCredentialResult, UserAccount } from '../features/auth/domain/auth.types';
import { clearSensitiveCache } from '../features/files/services/fileCacheService';
import { useMemberStore } from './useMemberStore';
import { useScheduleStore } from './useScheduleStore';
import { useBiblePlanStore } from './useBiblePlanStore';

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
    } catch (error) {
      console.error("Google Sign-In Error", error);
      throw error;
    }
  },
  logout: async () => {
    try {
      useMemberStore.getState().initializeMembersListener(null);
      useMemberStore.getState().initializeServicesListener(null);
      useScheduleStore.getState().clearSchedulesListener();
      useBiblePlanStore.getState().clearAllListeners();
      await clearSensitiveCache();
    } catch (e) {
      console.warn('Failed to clear sensitive cache on logout', e);
    }
    return authRepository.logout();
  },
  initializeAuthListener: () => {
    authRepository.subscribeToAuthState(
      ({ user, profile }) => {
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
