import { Timestamp } from 'firebase/firestore';

export interface BibleHighlight {
  id: string;
  userId: string;
  userName?: string;
  userPhotoUrl?: string;
  churchId?: string;
  passageId: string;
  bookName: string;
  chapter: number;
  verseNumber: number;
  verseRangeLabel: string;
  verseNumbers: number[];
  color: string;
  text: string;
  visibility: 'private' | 'church';
  status: 'active' | 'deleted';
  createdAt: Timestamp | Date | any;
  updatedAt: Timestamp | Date | any;
  likes: number;
  likedBy: string[];
  commentCount: number;
}
