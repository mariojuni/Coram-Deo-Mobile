import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithCredential,
    signInWithEmailAndPassword,
    signOut,
    type User,
} from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import type { AuthCredentialResult, UserAccount } from '../domain/auth.types';
import type { Member } from '../../member/domain/member.types';

export interface RegistrationPayload {
  email?: string;
  phoneNumber?: string;
  password?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  birthday?: string;
  gender?: string;
  address?: string;
  emergencyContact?: string;
  username: string;
}

async function findMemberByEmailOrPhone(email?: string, phone?: string): Promise<Member | null> {
  const usersRef = collection(db, 'users');
  let matchedDoc = null;

  if (email) {
    const qEmail = query(usersRef, where('email', '==', email));
    const snap = await getDocs(qEmail);
    if (!snap.empty) {
      matchedDoc = snap.docs[0];
    }
  }

  if (!matchedDoc && phone) {
    const qPhone = query(usersRef, where('phoneNumber', '==', phone));
    const snap = await getDocs(qPhone);
    if (!snap.empty) {
      matchedDoc = snap.docs[0];
    }
  }

  if (matchedDoc) {
    return { id: matchedDoc.id, ...matchedDoc.data() } as Member;
  }
  return null;
}

async function checkUsernameTaken(username: string): Promise<boolean> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', username));
  const snap = await getDocs(q);
  return !snap.empty;
}

async function fetchUserAccount(user: User): Promise<UserAccount | null> {
  const profileDocRef = doc(db, 'users', user.uid);
  const profileSnapshot = await getDoc(profileDocRef);
  if (!profileSnapshot.exists()) return null;
  
  const data = profileSnapshot.data() as Record<string, unknown>;
  
  // Ensure super admin can view the primary church details if they don't have one explicitly assigned
  if (!data.churchId && (data.role === 'super_admin' || data.role === 'admin')) {
    data.churchId = 'YmEc6C69Xz4DKRQaQZBV';
  }

  // Map legacy roles
  let role = data.role as string;
  if (role === 'member') role = 'viewer';
  if (role === 'admin') role = 'church_admin';
  if (role === 'churchAdmin') role = 'church_admin';
  if (role === 'superAdmin') role = 'super_admin';
  if (role === 'ministryLeader') role = 'ministry_leader';
  if (role === 'financeAdmin') role = 'finance_admin';

  return {
    uid: user.uid,
    ...data,
    role,
  } as UserAccount;
}

GoogleSignin.configure({
  webClientId: '676505939287-eqsoa6bc8tkgkun3bmqtdmu2418hnu7m.apps.googleusercontent.com',
});

export const authRepository = {
  async signup(payload: RegistrationPayload): Promise<AuthCredentialResult> {
    if (!payload.email && !payload.phoneNumber) {
      throw new Error('Email or phone number is required.');
    }
    if (!payload.password) {
      throw new Error('Password is required.');
    }

    const isTaken = await checkUsernameTaken(payload.username);
    if (isTaken) {
      throw new Error('Username is already taken.');
    }

    const matchedMember = await findMemberByEmailOrPhone(payload.email, payload.phoneNumber);

    if (matchedMember && matchedMember.accountId) {
      throw new Error('This email or phone number is already registered. Please log in instead.');
    }

    // Create Firebase Auth User
    const authCredential = await createUserWithEmailAndPassword(auth, payload.email || '', payload.password);
    const user = authCredential.user;

    const fullName = `${payload.firstName} ${payload.lastName}`.trim();
    let status: 'active' | 'pendingChurchLink' = 'pendingChurchLink';
    let churchId = null;

    if (matchedMember) {
      status = 'active';
      churchId = matchedMember.churchId;

      // Update Member
      const memberRef = doc(db, 'users', matchedMember.id);
      const updates: any = {
        accountId: user.uid,
        authUid: user.uid,
        updatedAt: serverTimestamp(),
      };
      if (!matchedMember.email && payload.email) updates.email = payload.email;
      if (!matchedMember.phoneNumber && payload.phoneNumber) updates.phoneNumber = payload.phoneNumber;
      if (!matchedMember.address && payload.address) updates.address = payload.address;
      if (!matchedMember.birthday && payload.birthday) updates.birthday = payload.birthday;
      if (!matchedMember.gender && payload.gender) updates.gender = payload.gender;
      
      await updateDoc(memberRef, updates);
    }

    // Create UserAccount
    const userAccount: Omit<UserAccount, 'uid'> = {
      firstName: payload.firstName,
      middleName: payload.middleName || '',
      lastName: payload.lastName,
      fullName: fullName,
      email: payload.email || '',
      phoneNumber: payload.phoneNumber || '',
      username: payload.username,
      authProvider: 'email',
      status: status,
      churchId: churchId,
      memberId: matchedMember?.id || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      role: 'viewer',
    };

    await setDoc(doc(db, 'users', user.uid), userAccount);

    return authCredential;
  },

  login(email: string, password: string): Promise<AuthCredentialResult> {
    return signInWithEmailAndPassword(auth, email, password);
  },

  async loginWithGoogle(): Promise<AuthCredentialResult> {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    const idToken = response.data?.idToken;

    if (!idToken) {
      throw new Error('No ID token found from Google Sign-In');
    }

    const googleCredential = GoogleAuthProvider.credential(idToken);
    const authCredential = await signInWithCredential(auth, googleCredential);
    const user = authCredential.user;

    // Check if user account already exists
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // New user from Google
      const email = user.email || undefined;
      const phoneNumber = user.phoneNumber || undefined;
      
      const matchedMember = await findMemberByEmailOrPhone(email, phoneNumber);

      let status: 'active' | 'pendingChurchLink' = 'pendingChurchLink';
      let churchId = null;

      if (matchedMember) {
        if (matchedMember.accountId) {
          // Member exists and already linked to another account?
          // We can't block login if Firebase auth allowed it, but we shouldn't overwrite.
          // In an ideal flow, we link accounts. For now, we will create the user account but leave unlinked
          // or link if not linked.
        } else {
          status = 'active';
          churchId = matchedMember.churchId;

          const memberRef = doc(db, 'users', matchedMember.id);
          await updateDoc(memberRef, {
            accountId: user.uid,
            authUid: user.uid,
            updatedAt: serverTimestamp(),
          });
        }
      }

      const nameParts = (user.displayName || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      const userAccount: Omit<UserAccount, 'uid'> = {
        firstName,
        lastName,
        fullName: user.displayName || '',
        email: email || '',
        phoneNumber: phoneNumber || '',
        photoUrl: user.photoURL || '',
        username: email ? email.split('@')[0] : `user${Date.now()}`,
        authProvider: 'google',
        status,
        churchId,
        memberId: matchedMember && !matchedMember.accountId ? matchedMember.id : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        role: 'viewer',
      };

      await setDoc(userDocRef, userAccount);
    }

    return authCredential;
  },

  logout(): Promise<void> {
    return signOut(auth);
  },

  subscribeToAuthState(
    onData: (data: { user: User | null; profile: UserAccount | null }) => void,
    onError: (error: Error) => void
  ): () => void {
    return onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          onData({ user: null, profile: null });
          return;
        }

        try {
          const profile = await fetchUserAccount(user);
          onData({ user, profile });
        } catch (error) {
          onError(error as Error);
          onData({ user, profile: null });
        }
      },
      onError
    );
  },
};
