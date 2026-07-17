export interface Member {
  id: string; // The member document ID
  churchId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  birthday?: string; // Kept for backward compatibility
  birthDate?: string;
  birthMonth?: number;
  birthDay?: number;
  birthMonthDay?: string;
  birthdayVisibility?: 'members_only' | 'leaders_only' | 'hidden';
  showBirthYear?: boolean;
  showAge?: boolean;
  gender?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  emergencyContact?: string;
  membershipStatus?: string;
  baptismStatus?: string;
  ministryIds?: string[];
  accountId?: string | null;
  authUid?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface Service {
  id: string;
  date?: string;
  [key: string]: any;
}
