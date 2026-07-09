export interface Song {
  id: string;
  churchId: string;
  title: string;
  artist?: string;
  composer?: string;
  language?: string;
  category?: string;
  tags?: string[];
  defaultKey?: string;
  tempoBpm?: number;
  timeSignature?: string;
  lyrics?: string;
  chordChart?: string;
  copyrightInfo?: string;
  licenseNotes?: string;
  allowPublicLyrics?: boolean;
  status: 'active' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

export interface WorshipSetlist {
  id: string;
  churchId: string;
  eventId: string;
  ministryId?: string;
  title: string;
  serviceDate?: string;
  worshipLeaderId?: string;
  teamMemberIds?: string[];
  status: 'draft' | 'published' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

export interface WorshipSetlistItem {
  id: string;
  churchId: string;
  setlistId: string;
  songId: string;
  songVersionId?: string;
  order: number;
  section?: string;
  selectedKey?: string;
  tempoBpm?: number;
  lyricsOverride?: string;
  chordOverride?: string;
  transitionNotes?: string;
  musicianNotes?: string;
  lyricsOperatorNotes?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Joined song data for UI convenience
  song?: Song;
}
