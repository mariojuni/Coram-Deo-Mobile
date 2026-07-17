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

/** Normalise a raw Firestore role string to a valid SystemRole. */
function normalizeLegacyRole(raw: string): import('../domain/auth.types').SystemRole {
  const map: Record<string, import('../domain/auth.types').SystemRole> = {
    member: 'viewer',
    admin: 'church_admin',
    churchAdmin: 'church_admin',
    superAdmin: 'super_admin',
    ministryLeader: 'ministry_leader',
    financeAdmin: 'finance_admin',
  };
  return (map[raw] ?? raw) as import('../domain/auth.types').SystemRole;
}

async function fetchUserAccount(user: User): Promise<UserAccount | null> {
  const profileDocRef = doc(db, 'users', user.uid);
  const profileSnapshot = await getDoc(profileDocRef);
  if (!profileSnapshot.exists()) return null;

  const data = profileSnapshot.data() as Record<string, unknown>;

  // Ensure super admin can view the primary church details if they don't have one explicitly assigned
  if (!data.churchId && (data.role === 'super_admin' || data.role === 'admin' || (Array.isArray(data.systemRoles) && (data.systemRoles as string[]).includes('super_admin')))) {
    data.churchId = 'YmEc6C69Xz4DKRQaQZBV';
  }

  // Map legacy `name` to `firstName` and `lastName` if missing
  if (data.name && typeof data.name === 'string') {
    const parts = data.name.split(' ');
    if (!data.firstName) data.firstName = parts[0] || '';
    if (!data.lastName) data.lastName = parts.slice(1).join(' ') || '';
  }

  // Build systemRoles: prefer the stored array; fall back to migrating the legacy single role string.
  let systemRoles: import('../domain/auth.types').SystemRole[];
  if (Array.isArray(data.systemRoles) && data.systemRoles.length > 0) {
    systemRoles = (data.systemRoles as string[]).map(normalizeLegacyRole);
  } else if (data.role && typeof data.role === 'string') {
    systemRoles = [normalizeLegacyRole(data.role as string)];
  } else {
    systemRoles = ['viewer'];
  }

  // Determine primaryRole: stored value wins; otherwise use the first item in systemRoles.
  const primaryRole: import('../domain/auth.types').SystemRole =
    (data.primaryRole as import('../domain/auth.types').SystemRole) ?? systemRoles[0];

  // Keep legacy `role` in sync for any still-using callers (Firestore rules, etc.).
  const legacyRole = normalizeLegacyRole((data.role as string) ?? primaryRole);

  return {
    uid: user.uid,
    ...data,
    role: legacyRole,
    systemRoles,
    primaryRole,
  } as UserAccount;
}

GoogleSignin.configure({
  webClientId: '676505939287-eqsoa6bc8tkgkun3bmqtdmu2418hnu7m.apps.googleusercontent.com',
  iosClientId: '676505939287-r3lac99rq77b0cg1n8bk69lict7mp1j0.apps.googleusercontent.com',
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
      email: payload.email || '',
      phoneNumber: payload.phoneNumber || '',
      username: payload.username,
      authProvider: 'email',
      status: status,
      churchId: churchId,
      memberId: matchedMember?.id || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      systemRoles: ['viewer'] as import('../domain/auth.types').SystemRole[],
      primaryRole: 'viewer' as import('../domain/auth.types').SystemRole,
      role: 'viewer', // legacy compat
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
        systemRoles: ['viewer'] as import('../domain/auth.types').SystemRole[],
        primaryRole: 'viewer' as import('../domain/auth.types').SystemRole,
        role: 'viewer', // legacy compat
      };

      await setDoc(userDocRef, userAccount);
    } else {
      // User doc already exists (e.g. manually created with same UID)
      const data = userDoc.data();
      const updates: any = {};
      
      if (!data?.accountId) updates.accountId = user.uid;
      if (!data?.authUid) updates.authUid = user.uid;
      if (!data?.photoUrl && user.photoURL) updates.photoUrl = user.photoURL;
      if (user.displayName) {
        const nameParts = user.displayName.split(' ');
        if (!data?.firstName) updates.firstName = nameParts[0] || '';
        if (!data?.lastName) updates.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      }
      
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = serverTimestamp();
        await updateDoc(userDocRef, updates);
      }
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
