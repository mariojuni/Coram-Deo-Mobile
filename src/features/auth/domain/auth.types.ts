import type { User, UserCredential } from 'firebase/auth';

export type AuthCredentialResult = UserCredential;

export type SystemRole =
  | "super_admin"
  | "church_admin"
  | "pastor"
  | "secretary"
  | "finance_admin"
  | "ministry_leader"
  | "member";

export interface UserAccount {
  uid: string; // The auth uid, also the document ID
  authUid?: string;
  churchId?: string | null;
  memberId?: string | null;
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  emailLowercase?: string;
  phoneNumber?: string;
  photoUrl?: string;
  username: string;
  authProvider: string;
  providers?: string[];
  status: 'active' | 'pending_church_link' | 'pendingChurchLink' | 'disabled';
  /** Multi-role support: a user can hold more than one SystemRole simultaneously. */
  systemRoles?: SystemRole[];
  /** The primary role used for UI display (e.g. badge, profile card). */
  primaryRole?: SystemRole;
  /** IDs of ministries this user is assigned to manage (for ministry_leader). */
  managedMinistryIds?: string[];
  /** @deprecated Use systemRoles instead. Kept for legacy Firestore docs that have not been migrated. */
  role?: SystemRole | string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  [key: string]: unknown;
}

export interface AuthStateSnapshot {
  user: User | null;
  profile: UserAccount | null;
}
