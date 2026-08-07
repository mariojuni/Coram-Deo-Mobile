export interface Duty {
  roleId?: string;
  role: string;
  userId: string;
  status: string;
  assignedBy?: string;
  assignedAt?: unknown;
  updatedAt?: unknown;
}

export interface Rsvp {
  userId: string;
  status: 'going' | 'maybe' | 'not_going';
}

export interface Schedule {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  endTime?: string;
  location: string;
  duties: Duty[];
  rsvps: Rsvp[];
  songList?: any[];
  status?: string;
  createdAt?: unknown;
}
