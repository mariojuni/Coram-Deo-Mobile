import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
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
  deleteField,
  serverTimestamp,
} from "firebase/firestore";
import { currentActiveFirebaseEnv, getActiveAuth, getActiveDb } from "../../../firebase";
import { getFirebaseConfigForEnv } from "../../../config/environments";
import type { Member } from "@/features/member/domain/member.types";
import type { UserAccount, AuthCredentialResult } from "../domain/auth.types";

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
    const qEmail = query(usersRef, where("email", "==", cleanEmail));
    try {
      const snap = await getDocs(qEmail);
      if (!snap.empty) {
        matchedDoc = snap.docs.find(d => d.data().churchId) || snap.docs[0];
      } else {
        // Fallback: search all users for case-insensitive and space-insensitive match
        // In case the admin added the email with trailing spaces or uppercase
        const allUsersSnap = await getDocs(usersRef).catch(() => null);
        if (allUsersSnap) {
          const matches = allUsersSnap.docs.filter(d => {
            const data = d.data();
            return typeof data.email === 'string' && data.email.trim().toLowerCase() === cleanEmail;
          });
          if (matches.length > 0) {
            const match = matches.find(d => d.data().churchId) || matches[0];
            matchedDoc = match;
            // Auto-fix the dirty data in Firestore
            await updateDoc(doc(getActiveDb(), "users", match.id), { email: cleanEmail }).catch(() => {});
          }
        }
      }
    } catch (e) {
      // Proceed if query or collection scan fails
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

      // 1. Try querying Firestore for phoneNumber field
      try {
        const qPhone = query(usersRef, where("phoneNumber", "in", variants.slice(0, 10)));
        const snap = await getDocs(qPhone);
        if (!snap.empty) {
          matchedDoc = snap.docs.find(d => d.data().churchId) || snap.docs[0];
        }
      } catch (e) {
        // proceed
      }

      // Try querying Firestore for legacy 'phone' field if not matched
      if (!matchedDoc) {
        try {
          const qPhone2 = query(usersRef, where("phone", "in", variants.slice(0, 10)));
          const snap2 = await getDocs(qPhone2);
          if (!snap2.empty) {
            matchedDoc = snap2.docs.find(d => d.data().churchId) || snap2.docs[0];
          }
        } catch (e) {
          // proceed
        }
      }

      // 2. Fallback scan: normalize database phone numbers (checking both phoneNumber and phone)
      if (!matchedDoc) {
        try {
          const allUsersSnap = await getDocs(usersRef).catch(() => null);
          if (allUsersSnap) {
            const match = allUsersSnap.docs.find(d => {
              const data = d.data();
              const dbPhone = data.phoneNumber || data.phone;
              if (typeof dbPhone !== 'string' || !dbPhone.trim()) return false;
              return extractCorePhoneDigits(dbPhone) === coreDigits;
            });
            if (match) {
              matchedDoc = match;
            }
          }
        } catch (e) {
          // proceed
        }
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
  let profileSnapshot = await getDoc(profileDocRef);

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

  return {
    uid: user.uid,
    id: docId,
    ...data,
    status,
    emailLowercase,
    authUid,
    providers,
    role: legacyRole,
    systemRoles,
    primaryRole,
    memberId: (data.memberId as string) || docId,
  } as unknown as UserAccount;
}

async function findUserAccountByEmail(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  const usersRef = collection(getActiveDb(), "users");
  
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

export const authRepository = {
  checkUsernameTaken,
  checkEmailTaken,

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
          throw new Error(`No account found with username '${identifier.trim()}'.`);
        }
      } catch (err: any) {
        console.error("[Login] Username lookup error:", err);
        if (err?.message?.includes("No account found")) {
          throw err;
        }
        if (err?.code === "permission-denied" || err?.message?.includes("permission")) {
          throw new Error("Missing Firestore permissions for username lookup. Please sign in using your registered email address.");
        }
        throw new Error(err?.message || "Unable to sign in with username.");
      }
    }

    try {
      return await signInWithEmailAndPassword(getActiveAuth(), emailToUse, password);
    } catch (authErr: any) {
      if (
        authErr?.code === "auth/invalid-credential" ||
        authErr?.code === "auth/user-not-found" ||
        authErr?.code === "auth/wrong-password"
      ) {
        throw new Error("Invalid email/username or password.");
      }
      if (authErr?.code === "auth/invalid-email") {
        throw new Error("Please enter a valid email address or username.");
      }
      throw authErr;
    }
  },

  async loginWithGoogle(): Promise<AuthCredentialResult> {
    configureGoogleSigninForCurrentEnv();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    const idToken = response.data?.idToken;

    if (!idToken) {
      throw new Error("No ID token found from Google Sign-In");
    }

    const googleCredential = GoogleAuthProvider.credential(idToken);
    
    const currentAuth = getActiveAuth();
    console.log("[Auth Repository] Calling signInWithCredential with app:", currentAuth.app.name, "projectId:", currentAuth.app.options.projectId, "senderId:", currentAuth.app.options.messagingSenderId);
    
    const authCredential = await signInWithCredential(currentAuth, googleCredential);
    const user = authCredential.user;

    const email = user.email || undefined;
    const cleanEmail = email ? email.trim().toLowerCase() : undefined;
    
    // Check if user account already exists by email
    const existingUserDoc = cleanEmail ? await findUserAccountByEmail(cleanEmail) : null;
    const userDocRefByUid = doc(getActiveDb(), "users", user.uid);
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

          const memberRef = doc(getActiveDb(), 'users', matchedMember.id);
          await updateDoc(memberRef, {
            accountId: user.uid,
            authUid: user.uid,
            updatedAt: serverTimestamp(),
          });
        }
      }

      try {
        if (Object.keys(updates).length > 0) {
          updates.updatedAt = serverTimestamp();
          await updateDoc(existingUserDoc.ref, updates);
        }
      } catch (err) {
        console.warn("[Auth Repository] Failed to update existing user doc on Google sign-in:", err);
      }
    } else if (userDocByUid.exists()) {
      // UID exists but email is different (should be rare)
      try {
        await updateDoc(userDocRefByUid, {
          lastLoginAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn("[Auth Repository] Failed to update user doc by UID on Google sign-in:", err);
      }
    } else {
      // New user from Google
      const phoneNumber = user.phoneNumber || undefined;
      const matchedMember = await findMemberByEmailOrPhone(email, phoneNumber);

      const nameParts = (user.displayName || "").split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
      const churchId = matchedMember?.churchId ?? null;
      if (matchedMember) {
        // Link and update the existing member document directly (single document, no duplicates)
        const memberRef = doc(getActiveDb(), "users", matchedMember.id);
        const nameParts = (user.displayName || "").split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
        const churchId = matchedMember.churchId ?? null;
        const status = matchedMember.churchId ? "active" : "pending_church_link";

        try {
          await updateDoc(memberRef, {
            authUid: user.uid,
            accountId: user.uid,
            status,
            churchId,
            memberId: matchedMember.id,
            email: email || matchedMember.email || "",
            emailLowercase: cleanEmail || matchedMember.emailLowercase || "",
            photoUrl: user.photoURL || matchedMember.photoUrl || "",
            firstName: matchedMember.firstName || firstName,
            lastName: matchedMember.lastName || lastName,
            authProvider: "google",
            providers: Array.from(new Set([...(matchedMember.providers || []), "google.com"])),
            lastLoginAt: new Date().toISOString(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          console.warn("[Auth Repository] Failed to link existing member doc on Google sign-in:", err);
        }
      } else {
        // Create new user document at user.uid only if no existing member was matched
        const nameParts = (user.displayName || "").split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

        const userAccount: Omit<UserAccount, "uid"> = {
          authUid: user.uid,
          accountId: user.uid,
          memberId: user.uid,
          firstName,
          lastName,
          email: email || "",
          emailLowercase: cleanEmail,
          phoneNumber: phoneNumber || "",
          photoUrl: user.photoURL || "",
          username: email ? email.split("@")[0] : `user${Date.now()}`,
          authProvider: "google",
          providers: ["google.com"],
          status: "pending_church_link",
          churchId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          systemRoles: ["member"] as import("../domain/auth.types").SystemRole[],
          primaryRole: "member" as import("../domain/auth.types").SystemRole,
          role: "member", // legacy compat
        };

        try {
          await setDoc(userDocRefByUid, userAccount);
        } catch (err) {
          console.warn("[Auth Repository] Failed to create new user doc on Google sign-in:", err);
        }
      }
    }

    return authCredential;
  },

  logout(): Promise<void> {
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

        try {
          const profile = await fetchUserAccount(user);
          if (isRegistering) {
            onData({ user: null, profile: null });
            return;
          }
          if (!profile) {
            console.warn('[Auth] User profile not found in current environment database. Signing out...');
            await signOut(getActiveAuth()).catch(() => {});
            onData({ user: null, profile: null });
            return;
          }
          onData({ user, profile });
        } catch (error: any) {
          console.warn('[Auth] Error fetching user account in current environment:', error);
          await signOut(getActiveAuth()).catch(() => {});
          onData({ user: null, profile: null });
        }
      },
      onError
    );
  },
};
