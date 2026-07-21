import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../../firebase";
import type { AuthCredentialResult, UserAccount } from "../domain/auth.types";
import type { Member } from "../../member/domain/member.types";

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

async function findMemberByEmailOrPhone(
  email?: string,
  phone?: string
): Promise<Member | null> {
  const usersRef = collection(db, "users");
  let matchedDoc = null;

  if (email) {
    const cleanEmail = email.trim().toLowerCase();
    const qEmail = query(usersRef, where("email", "==", cleanEmail));
    const snap = await getDocs(qEmail);
    if (!snap.empty) {
      matchedDoc = snap.docs.find(d => d.data().churchId) || snap.docs[0];
    } else {
      // Fallback: search all users for case-insensitive and space-insensitive match
      // In case the admin added the email with trailing spaces or uppercase
      const allUsersSnap = await getDocs(usersRef);
      const matches = allUsersSnap.docs.filter(d => {
        const data = d.data();
        return typeof data.email === 'string' && data.email.trim().toLowerCase() === cleanEmail;
      });
      if (matches.length > 0) {
        const match = matches.find(d => d.data().churchId) || matches[0];
        matchedDoc = match;
        // Auto-fix the dirty data in Firestore
        await updateDoc(doc(db, "users", match.id), { email: cleanEmail });
      }
    }
  }

  if (!matchedDoc && phone) {
    const qPhone = query(usersRef, where("phoneNumber", "==", phone));
    const snap = await getDocs(qPhone);
    if (!snap.empty) {
      matchedDoc = snap.docs.find(d => d.data().churchId) || snap.docs[0];
    }
  }

  if (matchedDoc) {
    return { id: matchedDoc.id, ...matchedDoc.data() } as Member;
  }
  return null;
}

async function checkUsernameTaken(username: string): Promise<boolean> {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("username", "==", username));
  const snap = await getDocs(q);
  return !snap.empty;
}

/** Normalise a raw Firestore role string to a valid SystemRole. */
function normalizeLegacyRole(
  raw: string
): import("../domain/auth.types").SystemRole {
  const map: Record<string, import("../domain/auth.types").SystemRole> = {
    member: "viewer",
    admin: "church_admin",
    churchAdmin: "church_admin",
    superAdmin: "super_admin",
    ministryLeader: "ministry_leader",
    financeAdmin: "finance_admin",
  };
  return (map[raw] ?? raw) as import("../domain/auth.types").SystemRole;
}

export async function fetchUserAccount(user: User): Promise<UserAccount | null> {
  const profileDocRef = doc(db, 'users', user.uid);
  const profileSnapshot = await getDoc(profileDocRef);
  if (!profileSnapshot.exists()) return null;

  const data = profileSnapshot.data() as Record<string, unknown>;

  // Ensure super admin can view the primary church details if they don't have one explicitly assigned
  if (
    !data.churchId &&
    (data.role === "super_admin" ||
      data.role === "admin" ||
      (Array.isArray(data.systemRoles) &&
        (data.systemRoles as string[]).includes("super_admin")))
  ) {
    data.churchId = "YmEc6C69Xz4DKRQaQZBV";
  }

  // Build systemRoles: prefer the stored array; fall back to migrating the legacy single role string.
  let systemRoles: import("../domain/auth.types").SystemRole[];
  if (Array.isArray(data.systemRoles) && data.systemRoles.length > 0) {
    systemRoles = (data.systemRoles as string[]).map(normalizeLegacyRole);
  } else if (data.role && typeof data.role === "string") {
    systemRoles = [normalizeLegacyRole(data.role as string)];
  } else {
    systemRoles = ["viewer"];
  }

  // Determine primaryRole: stored value wins; otherwise use the first item in systemRoles.
  const primaryRole: import("../domain/auth.types").SystemRole =
    (data.primaryRole as import("../domain/auth.types").SystemRole) ??
    systemRoles[0];

  let status = data.status as import("../domain/auth.types").UserAccount['status'];
  if (status === 'pendingChurchLink') {
    status = 'pending_church_link';
  }

  // Populate new fields if missing
  const emailLowercase = data.emailLowercase || (typeof data.email === 'string' ? data.email.trim().toLowerCase() : undefined);
  const authUid = data.authUid || user.uid;
  let providers = data.providers as string[] | undefined;
  if (!providers) {
    providers = [];
    if (data.authProvider === 'google') providers.push('google.com');
    if (data.authProvider === 'email') providers.push('password');
  }

  // Keep legacy `role` in sync for any still-using callers (Firestore rules, etc.).
  const legacyRole = normalizeLegacyRole((data.role as string) ?? primaryRole);

  return {
    uid: user.uid,
    ...data,
    status,
    emailLowercase,
    authUid,
    providers,
    role: legacyRole,
    systemRoles,
    primaryRole,
  } as UserAccount;
}

GoogleSignin.configure({
  webClientId:
    "676505939287-eqsoa6bc8tkgkun3bmqtdmu2418hnu7m.apps.googleusercontent.com",
  iosClientId:
    "676505939287-r3lac99rq77b0cg1n8bk69lict7mp1j0.apps.googleusercontent.com",
});

async function findUserAccountByEmail(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  const usersRef = collection(db, "users");
  
  // 1. Try emailLowercase
  const q1 = query(usersRef, where("emailLowercase", "==", cleanEmail));
  const snap1 = await getDocs(q1);
  if (!snap1.empty) return snap1.docs[0];

  // 2. Try legacy email
  const q2 = query(usersRef, where("email", "==", cleanEmail));
  const snap2 = await getDocs(q2);
  if (!snap2.empty) return snap2.docs[0];

  // 3. Fallback manual search
  const all = await getDocs(usersRef);
  return all.docs.find(d => {
    const data = d.data();
    return typeof data.email === 'string' && data.email.trim().toLowerCase() === cleanEmail;
  }) || null;
}

export const authRepository = {
  async signup(payload: RegistrationPayload): Promise<AuthCredentialResult> {
    if (!payload.email && !payload.phoneNumber) {
      throw new Error("Email or phone number is required.");
    }
    if (!payload.password) {
      throw new Error("Password is required.");
    }

    const isTaken = await checkUsernameTaken(payload.username);
    if (isTaken) {
      throw new Error("Username is already taken.");
    }
    
    let cleanEmail = "";
    if (payload.email) {
      cleanEmail = payload.email.trim().toLowerCase();
      // Check if duplicate user account exists
      const existingUserDoc = await findUserAccountByEmail(cleanEmail);
      if (existingUserDoc) {
        const data = existingUserDoc.data();
        if (data.authUid) {
          throw new Error("An account with this email already exists. Please sign in instead.");
        }
        // If authUid is empty/null, we will link below.
      }
    }

    const matchedMember = await findMemberByEmailOrPhone(
      payload.email,
      payload.phoneNumber
    );

    if (matchedMember && matchedMember.accountId) {
      // If we are linking an unauthenticated existing account, it's fine.
      // But if it's explicitly linked to a different auth account:
      const existingUserDoc = await findUserAccountByEmail(cleanEmail);
      if (!existingUserDoc || existingUserDoc.data()?.authUid) {
         throw new Error("This email or phone number is already registered. Please log in instead.");
      }
    }

    // Create Firebase Auth User
    const authCredential = await createUserWithEmailAndPassword(
      auth,
      payload.email || "",
      payload.password
    );
    const user = authCredential.user;

    let status: "active" | "pending_church_link" = "pending_church_link";
    let churchId = null;

    if (matchedMember) {
      status = "active";
      churchId = matchedMember.churchId;

      // Update Member
      const memberRef = doc(db, "users", matchedMember.id);
      const updates: any = {
        accountId: user.uid,
        authUid: user.uid,
        updatedAt: serverTimestamp(),
      };
      if (!matchedMember.email && payload.email) updates.email = payload.email;
      if (!matchedMember.phoneNumber && payload.phoneNumber)
        updates.phoneNumber = payload.phoneNumber;
      if (!matchedMember.address && payload.address)
        updates.address = payload.address;
      if (!matchedMember.birthday && payload.birthday)
        updates.birthday = payload.birthday;
      if (!matchedMember.gender && payload.gender)
        updates.gender = payload.gender;

      await updateDoc(memberRef, updates);
    }

    // Check if we are linking an existing UserAccount document (e.g. from a previous partial creation)
    const existingDoc = cleanEmail ? await findUserAccountByEmail(cleanEmail) : null;
    if (existingDoc && !existingDoc.data().authUid) {
      // Link Firebase uid to existing userAccount
      const updates = {
        authUid: user.uid,
        emailLowercase: cleanEmail,
        providers: [...(existingDoc.data().providers || []), "password"],
        status: status,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(existingDoc.ref, updates);
      
      // If existing doc ID is not the user.uid, this is a schema drift. 
      // Ideally uid === authUid. We'll leave it as updating the existing doc for now.
    } else {
      // Create UserAccount
      const userAccount: Omit<UserAccount, "uid"> = {
        authUid: user.uid,
        firstName: payload.firstName,
        middleName: payload.middleName || "",
        lastName: payload.lastName,
        email: payload.email || "",
        emailLowercase: cleanEmail,
        phoneNumber: payload.phoneNumber || "",
        username: payload.username,
        authProvider: "email",
        providers: ["password"],
        status: status,
        churchId: churchId,
        memberId: matchedMember?.id || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        systemRoles: ["viewer"] as import("../domain/auth.types").SystemRole[],
        primaryRole: "viewer" as import("../domain/auth.types").SystemRole,
        role: "viewer", // legacy compat
      };

      await setDoc(doc(db, "users", user.uid), userAccount);
    }

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
      throw new Error("No ID token found from Google Sign-In");
    }

    const googleCredential = GoogleAuthProvider.credential(idToken);
    const authCredential = await signInWithCredential(auth, googleCredential);
    const user = authCredential.user;

    const email = user.email || undefined;
    const cleanEmail = email ? email.trim().toLowerCase() : undefined;
    
    // Check if user account already exists by email
    const existingUserDoc = cleanEmail ? await findUserAccountByEmail(cleanEmail) : null;
    const userDocRefByUid = doc(db, "users", user.uid);
    const userDocByUid = await getDoc(userDocRefByUid);

    if (existingUserDoc) {
      const data = existingUserDoc.data();
      
      if (data.authUid && data.authUid !== user.uid) {
        // Different authUid exists for this email
        throw new Error("An account with this email already exists. Please sign in using your original login method, then link Google Sign-In from Profile settings.");
      }

      // Link to existing userAccount or just update login stats
      const updates: any = {
        lastLoginAt: new Date().toISOString(),
      };
      
      if (!data.authUid) updates.authUid = user.uid;
      if (!data.emailLowercase && cleanEmail) updates.emailLowercase = cleanEmail;
      
      const providers = data.providers || [];
      if (!providers.includes("google.com")) {
        updates.providers = [...providers, "google.com"];
      }

      if (!data.photoUrl && user.photoURL) updates.photoUrl = user.photoURL;
      if (user.displayName) {
        const nameParts = user.displayName.split(" ");
        if (!data.firstName) updates.firstName = nameParts[0] || "";
        if (!data.lastName)
          updates.lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
      }

      // Retry linking if the user is still pending
      if (data.status === 'pending_church_link' || data.status === 'pendingChurchLink' || !data.churchId) {
        const phoneNumber = user.phoneNumber || data.phoneNumber;
        const matchedMember = await findMemberByEmailOrPhone(email, phoneNumber);

        if (matchedMember && (!matchedMember.accountId || matchedMember.accountId === user.uid)) {
          updates.status = 'active';
          updates.churchId = matchedMember.churchId ?? null;
          updates.memberId = matchedMember.id ?? null;

          const memberRef = doc(db, 'users', matchedMember.id);
          await updateDoc(memberRef, {
            accountId: user.uid,
            authUid: user.uid,
            updatedAt: serverTimestamp(),
          });
        }
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = serverTimestamp();
        await updateDoc(existingUserDoc.ref, updates);
      }
    } else if (userDocByUid.exists()) {
      // UID exists but email is different (should be rare)
      await updateDoc(userDocRefByUid, {
        lastLoginAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });
    } else {
      // New user from Google
      const phoneNumber = user.phoneNumber || undefined;
      const matchedMember = await findMemberByEmailOrPhone(email, phoneNumber);

      let status: "active" | "pending_church_link" = "pending_church_link";
      let churchId = null;

      if (matchedMember) {
        if (!matchedMember.accountId) {
          status = "active";
          churchId = matchedMember.churchId ?? null;

          const memberRef = doc(db, "users", matchedMember.id);
          await updateDoc(memberRef, {
            accountId: user.uid,
            authUid: user.uid,
            updatedAt: serverTimestamp(),
          });
        }
      }

      const nameParts = (user.displayName || "").split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

      const userAccount: Omit<UserAccount, "uid"> = {
        authUid: user.uid,
        firstName,
        lastName,
        email: email || "",
        emailLowercase: cleanEmail,
        phoneNumber: phoneNumber || "",
        photoUrl: user.photoURL || "",
        username: email ? email.split("@")[0] : `user${Date.now()}`,
        authProvider: "google",
        providers: ["google.com"],
        status,
        churchId,
        memberId: matchedMember && !matchedMember.accountId ? matchedMember.id : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        systemRoles: ["viewer"] as import("../domain/auth.types").SystemRole[],
        primaryRole: "viewer" as import("../domain/auth.types").SystemRole,
        role: "viewer", // legacy compat
      };

      await setDoc(userDocRefByUid, userAccount);
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
        } catch (error: any) {
          if (error?.message?.includes('offline') || error?.code === 'unavailable') {
            console.log('Client offline, cannot fetch user account from Firestore right now.');
          } else {
            onError(error as Error);
          }
          onData({ user, profile: null });
        }
      },
      onError
    );
  },
};
