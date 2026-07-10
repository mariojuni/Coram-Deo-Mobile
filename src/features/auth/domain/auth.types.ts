import type { User, UserCredential } from 'firebase/auth';

export type AuthCredentialResult = UserCredential;

export type SystemRole =
  | "super_admin"
  | "church_admin"
  | "pastor"
  | "secretary"
  | "finance_admin"
  | "ministry_leader"
  | "viewer";

export interface UserAccount {
  uid: string; // The auth uid, also the document ID
  churchId?: string | null;
  memberId?: string | null;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  photoUrl?: string;
  username: string;
  authProvider: string;
  status: 'active' | 'pendingChurchLink' | 'disabled';
  role?: SystemRole | string; // Keep string to allow parsing legacy roles before transformation
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface AuthStateSnapshot {
  user: User | null;
  profile: UserAccount | null;
}
