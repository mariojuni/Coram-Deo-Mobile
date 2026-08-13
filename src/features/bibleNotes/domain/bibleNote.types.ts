import { Timestamp } from 'firebase/firestore';

export type BibleNoteVisibility = 'private' | 'church';

export type BibleNoteScripture = {
  versionId: string;
  bookId: string;
  bookName: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  verseIds: string[];
  reference: string;
  textSnapshot: string;
};

export type BibleNote = {
  id: string;
  churchId: string;
  userId: string;
  userName?: string;
  userPhotoUrl?: string;
  content: string;
  visibility: BibleNoteVisibility;
  scriptures: BibleNoteScripture[];
  labelIds?: string[];
  colorKey?: string | null;
  moderationStatus?: 'published' | 'hidden' | 'removed';
  status: 'active' | 'deleted';
  likes: number;
  likedBy: string[];
  commentCount: number;
  createdAt: Timestamp | string | Date | null;
  updatedAt: Timestamp | string | Date | null;
};
