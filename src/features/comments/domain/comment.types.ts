export type CommentTargetType = 
  | 'prayer_request'
  | 'sermon'
  | 'announcement'
  | 'event'
  | 'discipleship_lesson';

export type CommentStatus = 'active' | 'hidden' | 'deleted' | 'flagged';

export interface Comment {
  id: string;
  churchId: string;
  targetType: CommentTargetType;
  targetId: string;
  parentCommentId: string | null;
  
  authorUserId: string;
  authorMemberId: string;
  authorDisplayName: string;
  authorPhotoUrl?: string;
  
  content: string;
  status: CommentStatus;
  
  likeCount: number;
  replyCount: number;
  
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
