import { attendanceRepository } from '../attendance.repository';
import * as firestore from 'firebase/firestore';

describe('attendanceRepository (Data Layer)', () => {
  const mockSetDoc = firestore.setDoc as jest.Mock;
  const mockGetDoc = firestore.getDoc as jest.Mock;
  const mockDeleteDoc = firestore.deleteDoc as jest.Mock;
  const mockOnSnapshot = firestore.onSnapshot as jest.Mock;
  const mockWriteBatch = firestore.writeBatch as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('subscribeByEventId', () => {
    it('sets up a snapshot listener and transforms docs sorted by checkedInAt descending', () => {
      const onData = jest.fn();
      const onError = jest.fn();

      mockOnSnapshot.mockImplementationOnce((_query, onNext) => {
        onNext({
          docs: [
            {
              id: 'm1',
              data: () => ({
                churchId: 'church_1',
                eventId: 'event_1',
                memberId: 'm1',
                checkedInAt: '2026-10-21T09:00:00Z',
                status: 'Present',
              }),
            },
            {
              id: 'm2',
              data: () => ({
                churchId: 'church_1',
                eventId: 'event_1',
                memberId: 'm2',
                checkedInAt: '2026-10-21T10:00:00Z', // Later time
                status: 'Present',
              }),
            },
          ],
        });
        return () => {};
      });

      attendanceRepository.subscribeByEventId('event_1', 'church_1', onData, onError);

      expect(onData).toHaveBeenCalledTimes(1);
      const records = onData.mock.calls[0][0];
      expect(records).toHaveLength(2);
      expect(records[0].memberId).toBe('m2'); // 10:00:00 comes before 09:00:00
      expect(records[1].memberId).toBe('m1');
    });

    it('passes error to onError callback when snapshot listener fails', () => {
      const onData = jest.fn();
      const onError = jest.fn();

      mockOnSnapshot.mockImplementationOnce((_query, _onNext, onErr) => {
        onErr(new Error('Permission denied'));
        return () => {};
      });

      attendanceRepository.subscribeByEventId('event_1', 'church_1', onData, onError);

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('createAttendanceRecord', () => {
    const sampleInput = {
      churchId: 'church_1',
      eventId: 'event_1',
      eventTitle: 'Sunday Service',
      eventDate: '2026-10-25',
      memberId: 'member_123',
      memberName: 'John Doe',
      status: 'Present' as const,
      checkInMethod: 'manual_mobile' as const,
      checkedInAt: '2026-10-25T10:00:00Z',
      checkedInBy: 'admin_1',
      source: 'mobile' as const,
      type: 'Member' as const,
    };

    it('creates attendance record when not already checked in', async () => {
      mockGetDoc.mockResolvedValueOnce({ exists: () => false });

      await attendanceRepository.createAttendanceRecord(sampleInput);

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'attendance_sessions/event_1' }),
        expect.objectContaining({
          id: 'event_1',
          churchId: 'church_1',
          eventTitle: 'Sunday Service',
        }),
        { merge: true }
      );

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'attendance_sessions/event_1/records/member_123' }),
        expect.objectContaining({
          memberId: 'member_123',
          memberName: 'John Doe',
          status: 'Present',
        }),
        { merge: false }
      );
    });

    it('throws error if already checked in', async () => {
      mockGetDoc.mockResolvedValueOnce({ exists: () => true });

      await expect(attendanceRepository.createAttendanceRecord(sampleInput)).rejects.toThrow(
        'Already checked in for this event'
      );
    });
  });

  describe('bulkCreateAttendanceRecords', () => {
    it('returns early when inputs array is empty', async () => {
      await attendanceRepository.bulkCreateAttendanceRecords([]);
      expect(mockWriteBatch).not.toHaveBeenCalled();
    });

    it('batches writes for multiple attendance records and commits', async () => {
      const mockBatchSet = jest.fn();
      const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
      mockWriteBatch.mockReturnValue({
        set: mockBatchSet,
        commit: mockBatchCommit,
      });

      const inputs = [
        {
          churchId: 'c1',
          eventId: 'e1',
          eventTitle: 'Service',
          eventDate: '2026-10-25',
          memberId: 'm1',
          memberName: 'Alice',
          status: 'Present' as const,
          checkInMethod: 'manual_mobile' as const,
          checkedInAt: '2026-10-25T10:00:00Z',
          checkedInBy: 'admin',
          source: 'mobile' as const,
        },
      ];

      await attendanceRepository.bulkCreateAttendanceRecords(inputs);

      expect(mockWriteBatch).toHaveBeenCalled();
      expect(mockBatchSet).toHaveBeenCalledTimes(2); // session + record
      expect(mockBatchCommit).toHaveBeenCalled();
    });
  });

  describe('deleteAttendanceRecord', () => {
    it('ignores invalid record IDs without underscore', async () => {
      await attendanceRepository.deleteAttendanceRecord('invalidId');
      expect(mockGetDoc).not.toHaveBeenCalled();
      expect(mockDeleteDoc).not.toHaveBeenCalled();
    });

    it('deletes existing record and decrements session metrics', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ status: 'Present' }),
      });

      await attendanceRepository.deleteAttendanceRecord('event1_member123');

      expect(mockDeleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'attendance_sessions/event1/records/member123' })
      );

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'attendance_sessions/event1' }),
        {
          metrics: {
            present: expect.objectContaining({
              _method: 'increment',
              value: -1,
            }),
          },
        },
        { merge: true }
      );
    });
  });
});
