import type { FieldValue, Timestamp } from 'firebase/firestore';

export interface AttendanceRecord {
  id: string; // Document ID: eventId_memberId
  churchId: string;
  eventId: string;
  eventTitle: string;
  memberId: string;
  status: 'Present' | 'Late' | 'Absent' | 'Excused';
  checkInMethod: 'self_qr' | 'staff_scan' | 'manual_web' | 'manual_mobile';
  checkedInAt: string; // ISO string format usually preferred, or Timestamp
  checkedInBy: string; // Name or ID of staff who checked them in, or 'self'
  source: 'mobile' | 'web';
  note?: string;
  createdAt: string;
  updatedAt: string;
  timestamp?: Timestamp | Date | number | null;
}

export interface CreateAttendanceRecordInput {
  churchId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  memberId: string;
  status: 'Present' | 'Late' | 'Absent' | 'Excused';
  checkInMethod: 'self_qr' | 'staff_scan' | 'manual_web' | 'manual_mobile';
  checkedInAt: string;
  checkedInBy: string;
  source: 'mobile' | 'web';
  note?: string;
  memberName?: string;
  type?: string;
}

export interface AttendanceSession {
  id: string;
  churchId: string;
  eventId: string;
  qrToken: string;
  status: 'active' | 'inactive';
  validFrom: string;
  validUntil: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventModel {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  endTime?: string;
  location: string;
  attendanceEnabled: boolean;
  attendanceMode: 'self_check_in' | 'staff_scan' | 'manual' | 'hybrid';
  checkInWindowStart?: string; // ISO string or time string
  checkInWindowEnd?: string;   // ISO string or time string
  ministryId?: string;
  churchId: string;
  status: 'draft' | 'published' | 'cancelled';
  createdAt?: unknown;
}
