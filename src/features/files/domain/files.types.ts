export type FileVisibility =
  | 'public'
  | 'members_only'
  | 'leaders_only'
  | 'finance_only'
  | 'ministry_leaders_only'
  | 'admins_only'
  | 'private';

export interface CloudFile {
  id: string;
  churchId: string;
  storagePath: string;
  downloadUrl: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  sizeBytes: number;
  version: number;
  contentHash: string;
  updatedAt: string;
  visibility: FileVisibility;
  ownerUserId?: string;
  ownerMemberId?: string;
  ministryId?: string;
  relatedModule?: string;
}
