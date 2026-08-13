export type SermonMediaType = 'audio' | 'video' | 'both';
export type SermonStatus = 'draft' | 'published' | 'archived' | 'processing' | 'failed';

export interface Sermon {
  id: string;
  churchId: string;
  title: string;
  description: string;
  
  preacherName: string;
  preacherId?: string;
  sermonDate: Date;
  scriptureReference?: string;
  
  seriesId?: string;
  seriesTitle?: string;
  
  status: SermonStatus;
  mediaType: SermonMediaType;
  
  audioStoragePath?: string;
  videoStoragePath?: string;
  thumbnailStoragePath?: string;
  thumbnailUrl?: string;
  
  durationSeconds?: number;
  optimizedSizeBytes?: number;
  
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;

  // Keep these for backward compatibility with UI if needed during refactor,
  // but eventually we might remove them or adapt them.
  viewCount?: number;
  favoriteCount?: number;
  commentCount?: number;
}

export interface SermonNote {
  id: string;
  userId: string;
  userName?: string;
  userPhotoUrl?: string;
  sermonId: string;
  content: string;
  timestamp?: number; // playback position in seconds
  createdAt: Date;
  updatedAt: Date;
}

export interface SermonPlaybackProgress {
  id?: string;
  churchId: string;
  userId: string;
  sermonId: string;
  mediaType: 'audio' | 'video';
  positionSeconds: number;
  durationSeconds: number;
  progressPercent: number;
  completed: boolean;
  lastPlayedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SermonFavorite {
  userId: string;
  sermonId: string;
  createdAt: Date;
}

export interface SermonDownload {
  sermonId: string;
  userId: string;
  filePath: string;
  fileSize: number;
  quality: 'high' | 'medium' | 'low';
  downloadedAt: Date;
}

// Filter & Sort types
export type SermonFilter = 'all' | 'video' | 'audio' | 'recent' | 'series';
export type SermonSort = 'newest' | 'oldest' | 'popular' | 'alphabetical';

export interface SermonFilters {
  churchId?: string; // Add churchId for strict scoping
  filter: SermonFilter;
  sort: SermonSort;
  seriesId?: string;
  speakerId?: string;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  allowedVisibility?: string;
}
