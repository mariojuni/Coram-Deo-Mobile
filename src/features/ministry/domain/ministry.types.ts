export interface MinistryMember {
  memberId: string;
  memberName: string;
  role?: string;
  avatar?: string;
}

export interface Ministry {
  id: string;
  name: string;
  description?: string;
  leaderId?: string;
  leaderName?: string;
  memberCount?: number;
  roles: string[];
  roleDetails?: Record<string, { icon: string; color: string }>;
  members?: MinistryMember[];
  churchId: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ApplicationStatus = 'pending' | 'approved' | 'declined' | 'withdrawn';

export interface MinistryApplication {
  id: string;
  churchId: string;
  ministryId: string;
  ministryName: string;
  memberId: string;
  userId: string;
  preferredRoleIds: string[];
  preferredRoleNames: string[];
  reasonForJoining: string;
  experience: string;
  availability: string;
  note?: string;
  status: ApplicationStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  submittedAt: string;
  withdrawnAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MinistryAssignment {
  id: string;
  churchId: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventLocation?: string;
  ministryId: string;
  ministryName: string;
  roleId?: string;
  roleName: string;
  memberId: string;
  memberName: string;
  userId?: string;
  callTime?: string;
  notes?: string;
  status: 'Pending' | 'Confirmed' | 'Declined' | 'Completed' | 'Cancelled' | string;
  confirmedAt?: string;
  confirmedBy?: string;
  declinedAt?: string;
  declineReason?: string;
  isAcknowledged?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
