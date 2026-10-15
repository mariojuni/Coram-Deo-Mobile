import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  getDocFromCache,
  collection,
  query,
  where,
  limit,
  getDocs,
  setDoc,
  updateDoc,
  deleteField,
  serverTimestamp,
} from "firebase/firestore";
import { currentActiveFirebaseEnv, getActiveAuth, getActiveDb } from "../../../firebase";
import { getFirebaseConfigForEnv } from "../../../config/environments";
import type { Member } from "@/features/member/domain/member.types";
import type { UserAccount, AuthCredentialResult } from "../domain/auth.types";
import { AppAuthError } from "../domain/auth-error.types";
import { mapAuthError } from "../utils/auth-error-mapper";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHED_USER_PROFILE_PREFIX = 'cached_user_profile_';

export async function saveCachedUserProfile(uid: string, profile: UserAccount): Promise<void> {
  try {
    await AsyncStorage.setItem(`${CACHED_USER_PROFILE_PREFIX}${uid}`, JSON.stringify(profile));
  } catch (e) {
    console.warn('[Auth] Failed to cache user profile in AsyncStorage:', e);
  }
}

export async function getCachedUserProfile(uid: string): Promise<UserAccount | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHED_USER_PROFILE_PREFIX}${uid}`);
    if (raw) {
      return JSON.parse(raw) as UserAccount;
    }
  } catch (e) {
    console.warn('[Auth] Failed to read cached user profile from AsyncStorage:', e);
  }
  return null;
}

export async function clearCachedUserProfile(uid?: string): Promise<void> {
  try {
    if (uid) {
      await AsyncStorage.removeItem(`${CACHED_USER_PROFILE_PREFIX}${uid}`);
    } else {
      const keys = await AsyncStorage.getAllKeys();
      const profileKeys = keys.filter(k => k.startsWith(CACHED_USER_PROFILE_PREFIX));
      if (profileKeys.length > 0) {
        await AsyncStorage.multiRemove(profileKeys);
      }
    }
  } catch (e) {
    console.warn('[Auth] Failed to clear cached user profile:', e);
  }
}

function configureGoogleSigninForCurrentEnv() {
  try {
    const config = getFirebaseConfigForEnv(currentActiveFirebaseEnv);
    const options: { webClientId?: string; iosClientId?: string } = {
      webClientId: config.googleWebClientId,
    };
    if (config.googleIosClientId) {
      options.iosClientId = config.googleIosClientId;
    }
    GoogleSignin.configure(options);
  } catch (e) {
    console.warn("Failed to configure GoogleSignin", e);
  }
}

configureGoogleSigninForCurrentEnv();

export interface RegistrationPayload {
  email?: string;
  phoneNumber?: string;
  password?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  birthDate?: string;
  birthday?: string;
  gender?: string;
  address?: string;
  emergencyContact?: string;
  username: string;
}

function extractCorePhoneDigits(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('63') && digits.length >= 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length >= 11) {
    digits = digits.slice(1);
  }
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

async function findMemberByEmailOrPhone(
  email?: string,
  phone?: string
): Promise<Member | null> {
  const usersRef = collection(getActiveDb(), "users");
  let matchedDoc: any = null;

  if (email) {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const qEmail = query(usersRef, where("email", "==", cleanEmail), limit(1));
      const snap = await getDocs(qEmail);
      if (!snap.empty) {
        matchedDoc = snap.docs[0];
      }
    } catch (e) {}

    if (!matchedDoc) {
      try {
        const qEmailLower = query(usersRef, where("emailLowercase", "==", cleanEmail), limit(1));
        const snapLower = await getDocs(qEmailLower);
        if (!snapLower.empty) {
          matchedDoc = snapLower.docs[0];
        }
      } catch (e) {}
    }
  }

  if (!matchedDoc && phone) {
    const rawPhone = phone.trim();
    const coreDigits = extractCorePhoneDigits(rawPhone);

    if (coreDigits.length >= 7) {
      const withZero = '0' + coreDigits;
      const withPlus63 = '+63' + coreDigits;
      const withPlus63Space = `+63 ${coreDigits.slice(0, 3)} ${coreDigits.slice(3, 6)} ${coreDigits.slice(6)}`.trim();

      const variants = Array.from(
        new Set([rawPhone, coreDigits, withZero, withPlus63, withPlus63Space])
      ).filter(Boolean);

      try {
        const qPhone = query(usersRef, where("phoneNumber", "in", variants.slice(0, 10)), limit(1));
        const snap = await getDocs(qPhone);
        if (!snap.empty) {
          matchedDoc = snap.docs[0];
        }
      } catch (e) {}

      if (!matchedDoc) {
        try {
          const qPhone2 = query(usersRef, where("phone", "in", variants.slice(0, 10)), limit(1));
          const snap2 = await getDocs(qPhone2);
          if (!snap2.empty) {
            matchedDoc = snap2.docs[0];
          }
        } catch (e) {}
      }
    }
  }

  if (matchedDoc) {
    return { id: matchedDoc.id, ...matchedDoc.data() } as Member;
  }
  return null;
}

async function checkUsernameTaken(username: string): Promise<boolean> {
  if (!username || !username.trim()) return false;
  const cleanUsername = username.trim().toLowerCase();
  const usersRef = collection(getActiveDb(), "users");

  try {
    const q1 = query(usersRef, where("username", "==", username.trim()));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) return true;

    if (cleanUsername !== username.trim()) {
      const q2 = query(usersRef, where("username", "==", cleanUsername));
      const snap2 = await getDocs(q2);
      if (!snap2.empty) return true;
    }
  } catch (e) {
    // If querying fails (e.g. index/permission rule restriction), allow account creation flow to proceed to Firebase Auth
    return false;
  }
  return false;
}

async function checkEmailTaken(_email: string): Promise<boolean> {
  // Let Firebase Auth (createUserWithEmailAndPassword) be the authoritative source of truth for email existence.
  // This prevents false positives when an unlinked imported member document exists in Firestore but has not been created in Firebase Auth yet.
  return false;
}

/** Normalise a raw Firestore role string to a valid SystemRole. */
function normalizeLegacyRole(
  raw: string
): import("../domain/auth.types").SystemRole {
  const map: Record<string, import("../domain/auth.types").SystemRole> = {
    viewer: "member",
    member: "member",
    admin: "church_admin",
    churchAdmin: "church_admin",
    superAdmin: "super_admin",
    ministryLeader: "ministry_leader",
    financeAdmin: "finance_admin",
  };
  return (map[raw] ?? raw) as import("../domain/auth.types").SystemRole;
}

export async function fetchUserAccount(user: User): Promise<UserAccount | null> {
  let profileDocRef = doc(getActiveDb(), 'users', user.uid);

  // On Android, Firestore may be briefly offline when the app resumes from
  // background or is killed and relaunched. In that case, getDoc() will throw
  // a network error rather than returning null. We fall back to the local
  // Firestore disk cache so the user session is preserved.
  let profileSnapshot: Awaited<ReturnType<typeof getDoc>>;
  try {
    profileSnapshot = await getDoc(profileDocRef);
  } catch (serverError: any) {
    console.warn('[Auth] getDoc failed (network/offline?), trying local cache...', serverError?.code ?? serverError);
    try {
      profileSnapshot = await getDocFromCache(profileDocRef);
      console.log('[Auth] Served user profile from Firestore local cache.');
    } catch (cacheError: any) {
      // Check our persistent AsyncStorage profile cache
      const cached = await getCachedUserProfile(user.uid);
      if (cached) {
        console.log('[Auth] Served user profile from AsyncStorage local cache.');
        return cached;
      }
      console.warn('[Auth] Cache miss too. Re-throwing original error.', cacheError?.code ?? cacheError);
      throw serverError;
    }
  }

  if (!profileSnapshot.exists()) {
    // Search users collection by authUid for linked imported members
    const usersRef = collection(getActiveDb(), "users");
    const qAuth = query(usersRef, where("authUid", "==", user.uid));
    const snapAuth = await getDocs(qAuth);

    if (!snapAuth.empty) {
      profileSnapshot = snapAuth.docs[0];
    } else {
      // Fallback 1: search by accountId
      const qAcc = query(usersRef, where("accountId", "==", user.uid));
      const snapAcc = await getDocs(qAcc);
      if (!snapAcc.empty) {
        profileSnapshot = snapAcc.docs[0];
      } else if (user.email || user.phoneNumber) {
        // Fallback 2: auto-link by email/phone match
        const matchedMember = await findMemberByEmailOrPhone(user.email || undefined, user.phoneNumber || undefined);
        if (matchedMember) {
          const churchId = matchedMember.churchId ?? null;
          const status = matchedMember.churchId ? "active" : "pending_church_link";
          const onboardingStatus = matchedMember.churchId ? (matchedMember.onboardingStatus || 'COMPLETED') : 'PENDING_PROFILE';
          const memberRef = doc(getActiveDb(), "users", matchedMember.id);

          await updateDoc(memberRef, {
            authUid: user.uid,
            accountId: user.uid,
            churchId: null, // Hide old doc from directories to prevent duplicates
            updatedAt: serverTimestamp(),
          }).catch(() => {});

          const userAccountData = {
            ...matchedMember,
            authUid: user.uid,
            accountId: user.uid,
            memberId: matchedMember.id,
            status,
            churchId,
            onboardingStatus,
            updatedAt: new Date().toISOString(),
          };
          await setDoc(doc(getActiveDb(), "users", user.uid), userAccountData, { merge: true }).catch(() => {});

          profileSnapshot = await getDoc(profileDocRef);
          if (!profileSnapshot.exists()) {
            profileSnapshot = await getDoc(memberRef);
          }
        }
      }
    }
  }

  if (!profileSnapshot || !profileSnapshot.exists()) {
    return null;
  }

  const docId = profileSnapshot.id;
  const data = profileSnapshot.data() as Record<string, unknown>;

  let status = data.status as import("../domain/auth.types").UserAccount['status'];
  if (status === 'pendingChurchLink') {
    status = 'pending_church_link';
  }

  // Build systemRoles: prefer the stored array; fall back to migrating the legacy single role string.
  let systemRoles: import("../domain/auth.types").SystemRole[];
  if (Array.isArray(data.systemRoles) && data.systemRoles.length > 0) {
    systemRoles = (data.systemRoles as string[]).map(normalizeLegacyRole);
  } else if (data.role && typeof data.role === "string") {
    systemRoles = [normalizeLegacyRole(data.role as string)];
  } else {
    systemRoles = ["member"];
  }

  // Determine primaryRole: stored value wins; otherwise use the first item in systemRoles.
  const primaryRole: import("../domain/auth.types").SystemRole =
    (data.primaryRole as import("../domain/auth.types").SystemRole) ??
    systemRoles[0];

  // Populate new fields if missing
  const emailLowercase = data.emailLowercase || (typeof data.email === 'string' ? data.email.trim().toLowerCase() : undefined);
  const authUid = (data.authUid as string) || user.uid;
  let providers = data.providers as string[] | undefined;
  if (!providers) {
    providers = [];
    if (data.authProvider === 'google') providers.push('google.com');
    if (data.authProvider === 'email') providers.push('password');
  }

  // Keep legacy `role` in sync for any still-using callers (Firestore rules, etc.).
  const legacyRole = normalizeLegacyRole((data.role as string) ?? primaryRole);

  const isOAuthUser = data.authProvider === 'google' || data.authProvider === 'apple' || providers?.includes('google.com') || providers?.includes('apple.com');
  const onboardingStatus = (data.onboardingStatus as any) || (isOAuthUser && (!data.churchId || status === 'pending_church_link') ? 'PENDING_PROFILE' : undefined);

  const userAccount = {
    uid: user.uid,
    id: docId,
    ...data,
    status,
    emailLowercase,
    authUid,
    providers,
    onboardingStatus,
    role: legacyRole,
    systemRoles,
    primaryRole,
    memberId: (data.memberId as string) || docId,
  } as unknown as UserAccount;

  // Persist to local cache for instant offline access
  saveCachedUserProfile(user.uid, userAccount).catch(() => {});

  return userAccount;
}

async function findUserAccountByEmail(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  const usersRef = collection(getActiveDb(), "users");
  
  // 1. Try emailLowercase
  try {
    const q1 = query(usersRef, where("emailLowercase", "==", cleanEmail), limit(1));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) return snap1.docs[0];
  } catch (e) {}

  // 2. Try legacy email with clean email
  try {
    const q2 = query(usersRef, where("email", "==", cleanEmail), limit(1));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) return snap2.docs[0];
  } catch (e) {}

  // 3. Try exact raw email if different
  if (email.trim() !== cleanEmail) {
    try {
      const q3 = query(usersRef, where("email", "==", email.trim()), limit(1));
      const snap3 = await getDocs(q3);
      if (!snap3.empty) return snap3.docs[0];
    } catch (e) {}
  }

  return null;
}

function cleanPhoneNumber(phone?: string): string {
  if (!phone) return "";
  const noSpace = phone.replace(/\s+/g, "").trim();
  const digits = noSpace.replace(/\D/g, "");
  if (digits === "63" || digits === "") return "";
  return noSpace;
}

function buildMemberUpdates(
  userUid: string,
  payload: RegistrationPayload,
  cleanEmail: string
): Record<string, any> {
  const updates: Record<string, any> = {
    accountId: userUid,
    authUid: userUid,
    updatedAt: serverTimestamp(),
  };

  if (payload.firstName?.trim()) updates.firstName = payload.firstName.trim();
  if (payload.middleName !== undefined) updates.middleName = payload.middleName.trim();
  if (payload.lastName?.trim()) updates.lastName = payload.lastName.trim();
  if (payload.email?.trim()) {
    updates.email = payload.email.trim();
    updates.emailLowercase = cleanEmail;
  }
  if (payload.phoneNumber) {
    const cleaned = cleanPhoneNumber(payload.phoneNumber);
    if (cleaned) {
      updates.phoneNumber = cleaned;
      updates.phone = deleteField();
    }
  }
  if (payload.address?.trim()) updates.address = payload.address.trim();
  const bdate = payload.birthDate?.trim() || payload.birthday?.trim();
  if (bdate) {
    updates.birthDate = bdate;
    updates.birthday = bdate;
  }
  if (payload.gender?.trim()) updates.gender = payload.gender.trim();
  if (payload.emergencyContact?.trim()) updates.emergencyContact = payload.emergencyContact.trim();
  if (payload.username?.trim()) updates.username = payload.username.trim();

  return updates;
}

let isRegistering = false;
let isOAuthProcessing = false;

export function setOAuthProcessing(value: boolean) {
  isOAuthProcessing = value;
}

export const authRepository = {
  checkUsernameTaken,
  checkEmailTaken,
  setOAuthProcessing,

  async sendPasswordReset(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error("Email address is required.");
    }
    
    // Simple regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error("Please enter a valid email address.");
    }

    try {
      await sendPasswordResetEmail(getActiveAuth(), cleanEmail);
    } catch (error: any) {
      console.warn("[Auth Repository] Error sending password reset email:", error);
      
      // We intentionally do not throw 'auth/user-not-found' to prevent email enumeration.
      // We only throw generic network or internal errors.
      if (
        error?.code === "auth/network-request-failed" ||
        error?.code === "auth/internal-error" ||
        error?.code === "auth/too-many-requests"
      ) {
        throw new Error("We could not send the reset link right now. Please try again later.");
      }
      
      // For any other error (including user-not-found), resolve silently.
      return;
    }
  },

  async signup(payload: RegistrationPayload): Promise<AuthCredentialResult> {
    isRegistering = true;
    try {
      if (!payload.email && !payload.phoneNumber) {
        throw new Error("Email or phone number is required.");
      }
      if (!payload.password) {
        throw new Error("Password is required.");
      }

      let cleanEmail = "";
      if (payload.email) {
        cleanEmail = payload.email.trim().toLowerCase();
      }

      // 1. Check if username is taken by an ALREADY LINKED account BEFORE creating Auth user
      if (payload.username) {
        const isTaken = await checkUsernameTaken(payload.username);
        if (isTaken) {
          throw new Error("Username is already taken by another account.");
        }
      }

      // 2. Create Firebase Auth User (Firebase Auth checks if email already exists)
      let authCredential;
      try {
        authCredential = await createUserWithEmailAndPassword(
          getActiveAuth(),
          payload.email || "",
          payload.password
        );
      } catch (authErr: any) {
        if (authErr?.code === "auth/email-already-in-use") {
          throw new Error("An account with this email already exists. Please log in instead.");
        }
        if (authErr?.code === "auth/weak-password") {
          throw new Error("Password should be at least 6 characters.");
        }
        if (authErr?.code === "auth/password-does-not-meet-requirements") {
          let msg = "Password does not meet requirements. Please include numbers and a special character (e.g. !@#$).";
          if (authErr?.message) {
            const match = authErr.message.match(/\[(.*?)\]/);
            if (match && match[1]) {
              msg = `Password requirement: ${match[1]}`;
            }
          }
          throw new Error(msg);
        }
        if (authErr?.code === "auth/invalid-email") {
          throw new Error("The email address provided is invalid.");
        }
        throw authErr;
      }

      const user = authCredential.user;

      try {
        // 4. Find if this user matches an existing member document (created by church admin)
        const matchedMember = await findMemberByEmailOrPhone(
          payload.email,
          payload.phoneNumber
        );

        const bdate = payload.birthDate?.trim() || payload.birthday?.trim() || "";
        const cleanedPhone = cleanPhoneNumber(payload.phoneNumber);

        if (matchedMember) {
          // Link and update the existing member document directly (single document, no duplicates)
          const churchId = matchedMember.churchId ?? null;
          const status: "active" | "pending_church_link" = matchedMember.churchId ? "active" : "pending_church_link";
          const memberRef = doc(getActiveDb(), "users", matchedMember.id);
          const updates = buildMemberUpdates(user.uid, payload, cleanEmail);

          updates.status = status;
          updates.churchId = churchId;
          updates.authUid = user.uid;
          updates.accountId = user.uid;
          updates.memberId = matchedMember.id;
          updates.authProvider = "email";
          updates.providers = Array.from(new Set([...(matchedMember.providers || []), "password"]));
          updates.lastLoginAt = new Date().toISOString();

          await updateDoc(memberRef, {
            ...updates,
            churchId: null, // Hide old doc from directories to prevent duplicates
          });
          const userAccountData = {
            ...matchedMember,
            ...updates,
            churchId: churchId, // Ensure the new doc HAS the churchId
            updatedAt: new Date().toISOString(),
          };
          await setDoc(doc(getActiveDb(), "users", user.uid), userAccountData, { merge: true }).catch(() => {});
        } else {
          // Create new UserAccount document at user.uid only if no existing member was matched
          const userAccount: Omit<UserAccount, "uid"> = {
            authUid: user.uid,
            accountId: user.uid,
            memberId: user.uid,
            firstName: payload.firstName.trim(),
            middleName: payload.middleName?.trim() || "",
            lastName: payload.lastName.trim(),
            email: payload.email?.trim() || "",
            emailLowercase: cleanEmail,
            phoneNumber: cleanedPhone,
            username: payload.username.trim(),
            gender: payload.gender?.trim() || "",
            birthDate: bdate,
            birthday: bdate,
            address: payload.address?.trim() || "",
            emergencyContact: payload.emergencyContact?.trim() || "",
            authProvider: "email",
            providers: ["password"],
            status: "pending_church_link",
            churchId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            systemRoles: ["member"] as import("../domain/auth.types").SystemRole[],
            primaryRole: "member" as import("../domain/auth.types").SystemRole,
            role: "member", // legacy compat
          };
          await setDoc(doc(getActiveDb(), "users", user.uid), userAccount);
        }

        // Sign out so user is redirected to Login screen instead of pending-church-link
        await signOut(getActiveAuth()).catch(() => {});

        return authCredential;
      } catch (error) {
        console.error("[Registration Error] Post-getActiveAuth() setup failed:", error);
        // Clean up newly created Auth user if post-registration setup fails
        await user.delete().catch(() => {});
        throw error;
      }
    } finally {
      isRegistering = false;
    }
  },

  async login(identifier: string, password: string): Promise<AuthCredentialResult> {
    let emailToUse = identifier.trim();

    if (!emailToUse.includes("@")) {
      const cleanUsername = emailToUse.toLowerCase();
      const usersRef = collection(getActiveDb(), "users");

      try {
        let foundEmail: string | null = null;

        // 1. Query exact match
        const q1 = query(usersRef, where("username", "==", emailToUse));
        const snap1 = await getDocs(q1);
        if (!snap1.empty && snap1.docs[0].data().email) {
          foundEmail = snap1.docs[0].data().email;
        }

        // 2. Query lowercase match
        if (!foundEmail && cleanUsername !== emailToUse) {
          const q2 = query(usersRef, where("username", "==", cleanUsername));
          const snap2 = await getDocs(q2);
          if (!snap2.empty && snap2.docs[0].data().email) {
            foundEmail = snap2.docs[0].data().email;
          }
        }

        // 3. Fallback scan across users collection if indexed query returned no match
        if (!foundEmail) {
          const allUsers = await getDocs(usersRef);
          const matched = allUsers.docs.find(d => {
            const u = d.data().username;
            return typeof u === 'string' && u.trim().toLowerCase() === cleanUsername;
          });
          if (matched && matched.data().email) {
            foundEmail = matched.data().email;
          }
        }

        if (foundEmail) {
          emailToUse = foundEmail;
        } else {
          throw new AppAuthError({
            code: 'AUTH-1003',
            userMessage: `No account found with username '${identifier.trim()}'.`,
          });
        }
      } catch (err: any) {
        console.error("[Login] Username lookup error:", err);
        throw mapAuthError(err);
      }
    }

    try {
      return await signInWithEmailAndPassword(getActiveAuth(), emailToUse, password);
    } catch (authErr: any) {
      throw mapAuthError(authErr);
    }
  },

  async loginWithGoogle(): Promise<AuthCredentialResult> {
    try {
      configureGoogleSigninForCurrentEnv();
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Clear any stale/cached native Google session before prompting.
      // This prevents DEVELOPER_ERROR (12500) when a previous email/password
      // session exists with no active Google token in the OS account manager.
      try { await GoogleSignin.signOut(); } catch (_) {}
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;

      if (!idToken) {
        throw new AppAuthError({
          code: 'AUTH-4004',
          userMessage: 'Unable to verify sign-in credentials from Google. Please try again.',
          technicalMessage: 'No ID token returned by Google Sign-In SDK',
        });
      }

      const googleCredential = GoogleAuthProvider.credential(idToken);
      const currentAuth = getActiveAuth();
      console.log("[Auth Repository] Calling signInWithCredential with app:", currentAuth.app.name, "projectId:", currentAuth.app.options.projectId, "senderId:", currentAuth.app.options.messagingSenderId);

      const authCredential = await signInWithCredential(currentAuth, googleCredential);
      (authCredential as any)._googleGivenName = response.data?.user?.givenName ?? null;
      (authCredential as any)._googleFamilyName = response.data?.user?.familyName ?? null;

      // Return immediately after Firebase auth succeeds.
      // All Firestore enrichment runs fire-and-forget via enrichGoogleUserInBackground (called from the store).
      return authCredential;
    } catch (err: any) {
      throw mapAuthError(err);
    }
  },


  /**
   * Fast, authoritative Firestore enrichment for Google sign-in.
   * Directly creates or updates users/{user.uid} and returns the resolved UserAccount.
   */
  async enrichGoogleUser(
    user: User,
    email: string | undefined,
    phoneNumber: string | undefined,
    googleGivenName?: string | null,
    googleFamilyName?: string | null,
  ): Promise<UserAccount> {
    const cleanEmail = email ? email.trim().toLowerCase() : (user.email ? user.email.trim().toLowerCase() : undefined);
    const userDocRefByUid = doc(getActiveDb(), "users", user.uid);

    const nameParts = (user.displayName || "").trim().split(/\s+/);
    const fallbackFirstName = (googleGivenName || nameParts[0] || "").trim();
    const fallbackLastName = (googleFamilyName || (nameParts.length > 1 ? nameParts.slice(1).join(" ") : "")).trim();

    try {
      // 1. Check if user document at users/{user.uid} already exists
      const existingDocSnap = await getDoc(userDocRefByUid).catch(() => null);

      if (existingDocSnap && existingDocSnap.exists()) {
        const data = existingDocSnap.data() as Record<string, any>;
        const isCompleted = data.onboardingStatus === 'COMPLETED';
        const onboardingStatus = isCompleted ? 'COMPLETED' : 'PENDING_PROFILE';
        const providers = Array.from(new Set([...(data.providers || []), 'google.com']));

        const updates: Record<string, any> = {
          authProvider: 'google',
          providers,
          lastLoginAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        };
        if (!data.onboardingStatus) {
          updates.onboardingStatus = onboardingStatus;
        }
        if (!data.email && (email || user.email)) updates.email = email || user.email;
        if (!data.emailLowercase && cleanEmail) updates.emailLowercase = cleanEmail;
        if (!data.photoUrl && user.photoURL) updates.photoUrl = user.photoURL;
        if (!data.firstName && fallbackFirstName) updates.firstName = fallbackFirstName;
        if (!data.lastName && fallbackLastName) updates.lastName = fallbackLastName;

        await updateDoc(userDocRefByUid, updates).catch((err) =>
          console.warn('[Auth] enrichGoogleUser updateDoc warning:', err)
        );

        const finalProfile: UserAccount = {
          uid: user.uid,
          id: user.uid,
          ...data,
          ...updates,
          onboardingStatus: data.onboardingStatus || onboardingStatus,
          authProvider: 'google',
          providers,
          status: data.status || 'pending_church_link',
          systemRoles: data.systemRoles || ['member'],
          primaryRole: data.primaryRole || 'member',
          role: data.role || 'member',
        } as unknown as UserAccount;

        await saveCachedUserProfile(user.uid, finalProfile).catch(() => {});
        return finalProfile;
      }

      // 2. Document does not exist at users/{user.uid}. Check if there's a pre-existing roster member
      const matchedMember = cleanEmail ? await findMemberByEmailOrPhone(cleanEmail, phoneNumber) : null;
      const churchId = matchedMember?.churchId ?? null;
      const status = churchId ? "active" : "pending_church_link";
      const onboardingStatus = matchedMember?.churchId && matchedMember?.onboardingStatus === 'COMPLETED'
        ? 'COMPLETED'
        : 'PENDING_PROFILE';

      const userAccount: UserAccount = {
        ...(matchedMember || {}),
        uid: user.uid,
        id: user.uid,
        authUid: user.uid,
        accountId: user.uid,
        memberId: matchedMember?.id || user.uid,
        firstName: matchedMember?.firstName || fallbackFirstName,
        lastName: matchedMember?.lastName || fallbackLastName,
        email: user.email || matchedMember?.email || email || "",
        emailLowercase: cleanEmail || matchedMember?.emailLowercase || "",
        phoneNumber: matchedMember?.phoneNumber || phoneNumber || user.phoneNumber || "",
        photoUrl: user.photoURL || matchedMember?.photoUrl || "",
        username: cleanEmail ? cleanEmail.split("@")[0] : `user${Date.now()}`,
        authProvider: "google",
        providers: Array.from(new Set([...(matchedMember?.providers || []), "google.com"])),
        status,
        churchId,
        onboardingStatus,
        createdAt: matchedMember?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        systemRoles: (matchedMember?.systemRoles as any) || ["member"],
        primaryRole: (matchedMember?.primaryRole as any) || "member",
        role: matchedMember?.role || "member",
      } as unknown as UserAccount;

      await setDoc(userDocRefByUid, userAccount, { merge: true }).catch((err) => {
        console.warn("[Auth] enrichGoogleUser: failed to setDoc user doc", err);
      });

      if (matchedMember && matchedMember.id !== user.uid) {
        updateDoc(doc(getActiveDb(), "users", matchedMember.id), {
          authUid: user.uid,
          accountId: user.uid,
          churchId: null,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }

      await saveCachedUserProfile(user.uid, userAccount).catch(() => {});
      return userAccount;
    } catch (err) {
      console.warn("[Auth] enrichGoogleUser unhandled error:", err);
      // Construct fallback profile so caller is never blocked
      const fallbackAccount: UserAccount = {
        uid: user.uid,
        id: user.uid,
        authUid: user.uid,
        accountId: user.uid,
        memberId: user.uid,
        firstName: fallbackFirstName,
        lastName: fallbackLastName,
        email: user.email || "",
        emailLowercase: cleanEmail || "",
        phoneNumber: phoneNumber || "",
        photoUrl: user.photoURL || "",
        username: cleanEmail ? cleanEmail.split("@")[0] : `user${Date.now()}`,
        authProvider: "google",
        providers: ["google.com"],
        status: "pending_church_link",
        churchId: null,
        onboardingStatus: "PENDING_PROFILE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        systemRoles: ["member"],
        primaryRole: "member",
        role: "member",
      } as unknown as UserAccount;
      return fallbackAccount;
    }
  },

  async enrichGoogleUserInBackground(
    user: User,
    email: string | undefined,
    phoneNumber: string | undefined,
    googleGivenName?: string | null,
    googleFamilyName?: string | null,
  ): Promise<void> {
    await this.enrichGoogleUser(user, email, phoneNumber, googleGivenName, googleFamilyName).catch(() => {});
  },

  async loginWithApple(): Promise<AuthCredentialResult> {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, fullName, email } = credential;

      if (!identityToken) {
        throw new AppAuthError({
          code: 'AUTH-4004',
          userMessage: 'Unable to verify sign-in credentials from Apple. Please try again.',
          technicalMessage: 'No identity token provided by Apple',
        });
      }

      const provider = new OAuthProvider('apple.com');
      const appleCredential = provider.credential({ idToken: identityToken });
      const currentAuth = getActiveAuth();
      console.log("[Auth Repository] Calling signInWithCredential for Apple with app:", currentAuth.app.name);

      const authCredential = await signInWithCredential(currentAuth, appleCredential);

      // Stash fullName and email on the credential result so the store can forward them
      // to enrichAppleUserInBackground without re-parsing.
      (authCredential as any)._appleFullName = fullName;
      (authCredential as any)._appleEmail = email;

      // Return immediately — navigation happens now. Firestore enrichment runs in
      // the background via enrichAppleUserInBackground (called from the store).
      return authCredential;
    } catch (err: any) {
      throw mapAuthError(err);
    }
  },


  /**
   * Exported so the store can run it fire-and-forget after navigation.
   * All Firestore reads/writes for Apple sign-in happen here.
   */
  /**
   * Fast, authoritative Firestore enrichment for Apple sign-in.
   * Directly creates or updates users/{user.uid} and returns the resolved UserAccount.
   */
  async enrichAppleUser(
    user: User,
    userEmail: string | undefined,
    fullName: import('expo-apple-authentication').AppleAuthenticationFullName | null,
  ): Promise<UserAccount> {
    const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : (user.email ? user.email.trim().toLowerCase() : undefined);
    const userDocRefByUid = doc(getActiveDb(), "users", user.uid);

    let firstName = "";
    let lastName = "";
    if (fullName) {
      firstName = (fullName.givenName || "").trim();
      lastName = (fullName.familyName || "").trim();
    } else {
      const nameParts = (user.displayName || "").trim().split(/\s+/);
      firstName = nameParts[0] || "";
      lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
    }

    try {
      // 1. Check if user document at users/{user.uid} already exists
      const existingDocSnap = await getDoc(userDocRefByUid).catch(() => null);

      if (existingDocSnap && existingDocSnap.exists()) {
        const data = existingDocSnap.data() as Record<string, any>;
        const isCompleted = data.onboardingStatus === 'COMPLETED';
        const onboardingStatus = isCompleted ? 'COMPLETED' : 'PENDING_PROFILE';
        const providers = Array.from(new Set([...(data.providers || []), 'apple.com']));

        const updates: Record<string, any> = {
          authProvider: 'apple',
          providers,
          lastLoginAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        };
        if (!data.onboardingStatus) {
          updates.onboardingStatus = onboardingStatus;
        }
        if (!data.email && (userEmail || user.email)) updates.email = userEmail || user.email;
        if (!data.emailLowercase && cleanEmail) updates.emailLowercase = cleanEmail;
        if (!data.photoUrl && user.photoURL) updates.photoUrl = user.photoURL;
        if (!data.firstName && firstName) updates.firstName = firstName;
        if (!data.lastName && lastName) updates.lastName = lastName;

        await updateDoc(userDocRefByUid, updates).catch((err) =>
          console.warn('[Auth] enrichAppleUser updateDoc warning:', err)
        );

        const finalProfile: UserAccount = {
          uid: user.uid,
          id: user.uid,
          ...data,
          ...updates,
          onboardingStatus: data.onboardingStatus || onboardingStatus,
          authProvider: 'apple',
          providers,
          status: data.status || 'pending_church_link',
          systemRoles: data.systemRoles || ['member'],
          primaryRole: data.primaryRole || 'member',
          role: data.role || 'member',
        } as unknown as UserAccount;

        await saveCachedUserProfile(user.uid, finalProfile).catch(() => {});
        return finalProfile;
      }

      // 2. Check matched member
      const matchedMember = cleanEmail ? await findMemberByEmailOrPhone(cleanEmail, user.phoneNumber || undefined) : null;
      const churchId = matchedMember?.churchId ?? null;
      const status = churchId ? "active" : "pending_church_link";
      const onboardingStatus = matchedMember?.churchId && matchedMember?.onboardingStatus === 'COMPLETED'
        ? 'COMPLETED'
        : 'PENDING_PROFILE';

      const userAccount: UserAccount = {
        ...(matchedMember || {}),
        uid: user.uid,
        id: user.uid,
        authUid: user.uid,
        accountId: user.uid,
        memberId: matchedMember?.id || user.uid,
        firstName: matchedMember?.firstName || firstName,
        lastName: matchedMember?.lastName || lastName,
        email: user.email || matchedMember?.email || userEmail || "",
        emailLowercase: cleanEmail || matchedMember?.emailLowercase || "",
        phoneNumber: matchedMember?.phoneNumber || user.phoneNumber || "",
        photoUrl: user.photoURL || matchedMember?.photoUrl || "",
        username: cleanEmail ? cleanEmail.split("@")[0] : `user${Date.now()}`,
        authProvider: "apple",
        providers: Array.from(new Set([...(matchedMember?.providers || []), "apple.com"])),
        status,
        churchId,
        onboardingStatus,
        createdAt: matchedMember?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        systemRoles: (matchedMember?.systemRoles as any) || ["member"],
        primaryRole: (matchedMember?.primaryRole as any) || "member",
        role: matchedMember?.role || "member",
      } as unknown as UserAccount;

      await setDoc(userDocRefByUid, userAccount, { merge: true }).catch((err) => {
        console.warn("[Auth] enrichAppleUser: failed to setDoc user doc", err);
      });

      if (matchedMember && matchedMember.id !== user.uid) {
        updateDoc(doc(getActiveDb(), "users", matchedMember.id), {
          authUid: user.uid,
          accountId: user.uid,
          churchId: null,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }

      await saveCachedUserProfile(user.uid, userAccount).catch(() => {});
      return userAccount;
    } catch (err) {
      console.warn("[Auth] enrichAppleUser unhandled error:", err);
      const fallbackAccount: UserAccount = {
        uid: user.uid,
        id: user.uid,
        authUid: user.uid,
        accountId: user.uid,
        memberId: user.uid,
        firstName,
        lastName,
        email: user.email || userEmail || "",
        emailLowercase: cleanEmail || "",
        phoneNumber: user.phoneNumber || "",
        photoUrl: user.photoURL || "",
        username: cleanEmail ? cleanEmail.split("@")[0] : `user${Date.now()}`,
        authProvider: "apple",
        providers: ["apple.com"],
        status: "pending_church_link",
        churchId: null,
        onboardingStatus: "PENDING_PROFILE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        systemRoles: ["member"],
        primaryRole: "member",
        role: "member",
      } as unknown as UserAccount;
      return fallbackAccount;
    }
  },

  async enrichAppleUserInBackground(
    user: User,
    userEmail: string | undefined,
    fullName: import('expo-apple-authentication').AppleAuthenticationFullName | null,
  ): Promise<void> {
    await this.enrichAppleUser(user, userEmail, fullName).catch(() => {});
  },

  async deleteAccount(): Promise<void> {
    const auth = getActiveAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No authenticated user.");

    // Delete the Firebase Auth account. The backend's `onUserDeleted`
    // (beforeUserDeleted) trigger will anonymise the Firestore document
    // using Admin SDK, so we don't need a client-side updateDoc here.
    // Doing updateDoc before deleteUser caused a race condition where
    // active Firestore listeners would fire a permission-denied error
    // the instant the auth token was invalidated.
    await deleteUser(currentUser);
  },

  async logout(): Promise<void> {
    const current = getActiveAuth().currentUser;
    if (current) {
      await clearCachedUserProfile(current.uid);
    }
    // Also sign out from Google's native session so the OS-level account
    // token is cleared. Without this, a subsequent Google sign-in can fail
    // with DEVELOPER_ERROR due to a stale/invalid cached token.
    GoogleSignin.signOut().catch(() => {});
    return signOut(getActiveAuth());
  },

  subscribeToAuthState(
    onData: (data: { user: User | null; profile: UserAccount | null }) => void,
    onError: (error: Error) => void
  ): () => void {
    return onAuthStateChanged(
      getActiveAuth(),
      async (user) => {
        if (!user || isRegistering) {
          onData({ user: null, profile: null });
          return;
        }

        if (isOAuthProcessing) {
          console.log('[Auth] subscribeToAuthState: OAuth flow active, skipping background profile fetch/dispatch.');
          return;
        }

        // 1. Instant offline boot: Check if we have a cached profile for this user
        let cachedProfile: UserAccount | null = null;
        try {
          cachedProfile = await getCachedUserProfile(user.uid);
          if (cachedProfile) {
            console.log('[Auth] Dispatched cached user profile immediately for fast offline boot.');
            onData({ user, profile: cachedProfile });
          }
        } catch (e) {
          console.warn('[Auth] Error reading initial cached profile:', e);
        }

        // 2. Fetch fresh user profile from Firestore
        let profile = null;
        let fetchError: any = null;

        try {
          profile = await fetchUserAccount(user);
        } catch (error: any) {
          fetchError = error;
        }

        if (isRegistering) {
          onData({ user: null, profile: null });
          return;
        }

        // If fresh profile fetched successfully, dispatch it
        if (profile) {
          onData({ user, profile });
          return;
        }

        // If fetch failed with an error, check if we already dispatched cachedProfile
        if (fetchError) {
          if (cachedProfile) {
            console.log('[Auth] Network fetch failed, retaining cached profile.');
            return;
          }

          // If no cached profile existed, retry with delays
          const retryDelays = [2000, 4000];
          let lastRetryError: any = fetchError;
          for (const delay of retryDelays) {
            console.warn(`[Auth] Transient error fetching user profile, retrying in ${delay / 1000}s...`, lastRetryError);
            await new Promise(resolve => setTimeout(resolve, delay));
            try {
              profile = await fetchUserAccount(user);
              lastRetryError = null;
              break;
            } catch (retryError: any) {
              lastRetryError = retryError;
            }
          }

          if (profile) {
            onData({ user, profile });
            return;
          }

          if (lastRetryError) {
            console.warn('[Auth] All retries failed. Checking local cache once more:', lastRetryError);
            const fallbackCached = await getCachedUserProfile(user.uid);
            if (fallbackCached) {
              onData({ user, profile: fallbackCached });
              return;
            }
            // Do NOT sign out on network/transient errors. Keep the user session
            return;
          }
        }

        if (!profile) {
          if (isOAuthProcessing) {
            console.warn('[Auth] User profile not found, but OAuth is processing. Skipping auto-signout.');
            onData({ user, profile: null });
            return;
          }
          // Profile is genuinely absent from the database (not a network error).
          // This is a real "user not found" case — sign them out.
          console.warn('[Auth] User profile not found in current environment database. Signing out...');
          await signOut(getActiveAuth()).catch(() => {});
          await clearCachedUserProfile(user.uid);
          onData({ user: null, profile: null });
          return;
        }

        onData({ user, profile });
      },
      onError
    );
  },
};
