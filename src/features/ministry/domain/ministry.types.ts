export interface MinistryMember {
  memberId: string;
  memberName: string;
  role?: string;
  avatar?: string;
}

export interface Ministry {
  id: string;
  name: string;
  roles: string[];
  roleDetails?: Record<string, { icon: string; color: string }>;
  members?: MinistryMember[];
  churchId: string;
  status: string;
}

export interface MinistryAssignment {
  id: string;
  churchId: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  ministryId: string;
  ministryName: string;
  roleName: string;
  memberId: string;
  memberName: string;
  callTime?: string;
  notes?: string;
  status: 'Pending' | 'Confirmed' | 'Declined' | 'Completed' | string;
  isAcknowledged?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
