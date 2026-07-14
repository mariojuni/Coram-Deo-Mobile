import type { Timestamp } from 'firebase/firestore';

export type PrayerFilter = 'Recent' | 'My Requests' | 'Answered';

export type PrayerCategory = 'healing' | 'family' | 'spiritual_growth' | 'provision' | 'thanksgiving' | 'other';
export type PrayerVisibility = 'church_members_only' | 'leaders_only';
export type PrayerStatus = 'pending' | 'approved' | 'answered' | 'archived';

export interface Prayer {
  id: string;
  // Legacy / existing fields
  name?: string;
  userPhotoUrl?: string;
  request?: string;
  likes?: number;
  likedBy?: string[];
  answered?: boolean;
  
  // New unified fields from web app
  churchId?: string;
  userId: string;
  memberId?: string;
  title?: string;
  content?: string;
  category?: PrayerCategory;
  visibility?: PrayerVisibility;
  isAnonymous?: boolean;
  status?: PrayerStatus;
  prayedCount?: number;
  createdBy?: string;
  createdAt?: Timestamp | Date | number | null;
  updatedAt?: Timestamp | Date | number | null;
}
