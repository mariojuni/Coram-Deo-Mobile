import { authRepository, saveCachedUserProfile, getCachedUserProfile, clearCachedUserProfile } from '../auth.repository';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as firebaseAuth from 'firebase/auth';
import * as firestore from 'firebase/firestore';
import { AppAuthError } from '../../domain/auth-error.types';

// Mock Firebase Auth functions
jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signOut: jest.fn(),
  GoogleAuthProvider: {
    credential: jest.fn(),
  },
  OAuthProvider: jest.fn(),
  signInWithCredential: jest.fn(),
  onAuthStateChanged: jest.fn(),
  deleteUser: jest.fn(),
}));

// Mock Google Signin
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
}));

// Mock Firebase core instance helpers (4 levels up from __tests__)
jest.mock('../../../../firebase', () => ({
  getActiveApp: jest.fn(() => ({ name: 'test-app', options: { projectId: 'test-project' } })),
  getActiveAuth: jest.fn(() => ({
    app: { name: 'test-app', options: { projectId: 'test-project' } },
    currentUser: null,
  })),
  getActiveDb: jest.fn(() => ({})),
  getActiveStorage: jest.fn(() => ({})),
  currentActiveFirebaseEnv: 'development',
}));

jest.mock('@/firebase', () => ({
  getActiveApp: jest.fn(() => ({ name: 'test-app', options: { projectId: 'test-project' } })),
  getActiveAuth: jest.fn(() => ({
    app: { name: 'test-app', options: { projectId: 'test-project' } },
    currentUser: null,
  })),
  getActiveDb: jest.fn(() => ({})),
  getActiveStorage: jest.fn(() => ({})),
  currentActiveFirebaseEnv: 'development',
}));




describe('Auth Repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore?.();
    (console.error as jest.Mock).mockRestore?.();
  });


  describe('User Profile Local Caching', () => {
    const mockUserAccount: any = {
      uid: 'u-123',
      id: 'u-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      role: 'member',
      status: 'active',
    };

    it('saves user profile to AsyncStorage with cached prefix', async () => {
      await saveCachedUserProfile('u-123', mockUserAccount);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'cached_user_profile_u-123',
        JSON.stringify(mockUserAccount)
      );
    });

    it('retrieves user profile from AsyncStorage if present', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockUserAccount));

      const result = await getCachedUserProfile('u-123');
      expect(result).toEqual(mockUserAccount);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('cached_user_profile_u-123');
    });

    it('returns null if no cached profile exists in AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await getCachedUserProfile('non-existent');
      expect(result).toBeNull();
    });

    it('clears specific user profile cache when uid is provided', async () => {
      await clearCachedUserProfile('u-123');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('cached_user_profile_u-123');
    });
  });

  describe('sendPasswordReset', () => {
    it('throws error if email is empty', async () => {
      await expect(authRepository.sendPasswordReset('')).rejects.toThrow('Email address is required.');
    });

    it('throws error if email is invalid format', async () => {
      await expect(authRepository.sendPasswordReset('invalid-email')).rejects.toThrow(
        'Please enter a valid email address.'
      );
    });

    it('calls Firebase sendPasswordResetEmail for valid email', async () => {
      (firebaseAuth.sendPasswordResetEmail as jest.Mock).mockResolvedValueOnce(undefined);

      await authRepository.sendPasswordReset('test@example.com');
      expect(firebaseAuth.sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com'
      );
    });

    it('throws a friendly network error when Firebase returns network failure', async () => {
      (firebaseAuth.sendPasswordResetEmail as jest.Mock).mockRejectedValueOnce({
        code: 'auth/network-request-failed',
      });

      await expect(authRepository.sendPasswordReset('test@example.com')).rejects.toThrow(
        'We could not send the reset link right now. Please try again later.'
      );
    });

    it('silently resolves for unknown errors to prevent email enumeration', async () => {
      (firebaseAuth.sendPasswordResetEmail as jest.Mock).mockRejectedValueOnce({
        code: 'auth/user-not-found',
      });

      await expect(authRepository.sendPasswordReset('nonexistent@example.com')).resolves.toBeUndefined();
    });
  });

  describe('login with Email and Password', () => {
    it('calls signInWithEmailAndPassword directly when identifier contains @', async () => {
      const mockResult = { user: { uid: 'user-1' } };
      (firebaseAuth.signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce(mockResult);

      const result = await authRepository.login('member@church.org', 'ValidPass123!');

      expect(firebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'member@church.org',
        'ValidPass123!'
      );
      expect(result).toBe(mockResult);
    });

    it('maps Firebase invalid credential error to strongly typed AppAuthError', async () => {
      (firebaseAuth.signInWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({
        code: 'auth/invalid-credential',
        message: 'Bad credential',
      });

      await expect(authRepository.login('member@church.org', 'WrongPass')).rejects.toThrow(AppAuthError);
    });
  });

  describe('login with Username', () => {
    it('looks up email by username in Firestore and authenticates with found email', async () => {
      const mockDocs = [
        {
          data: () => ({ email: 'resolved@church.org', username: 'pastorjohn' }),
        },
      ];
      (firestore.getDocs as jest.Mock).mockResolvedValueOnce({
        empty: false,
        docs: mockDocs,
      });

      const mockAuthResult = { user: { uid: 'pastor-uid' } };
      (firebaseAuth.signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce(mockAuthResult);

      const result = await authRepository.login('pastorjohn', 'SecretPassword');

      expect(firestore.getDocs).toHaveBeenCalled();
      expect(firebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'resolved@church.org',
        'SecretPassword'
      );
      expect(result).toBe(mockAuthResult);
    });

    it('throws AppAuthError AUTH-1003 if username is not found in Firestore', async () => {
      (firestore.getDocs as jest.Mock).mockResolvedValue({
        empty: true,
        docs: [],
      });

      await expect(authRepository.login('unknownuser', 'any-pass')).rejects.toThrow(AppAuthError);
    });
  });
});
