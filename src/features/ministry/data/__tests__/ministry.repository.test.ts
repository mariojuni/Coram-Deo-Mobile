import { ministryRepository } from '../ministry.repository';
import * as firestore from 'firebase/firestore';

describe('ministryRepository (Data Layer)', () => {
  const mockGetDocs = firestore.getDocs as jest.Mock;
  const mockAddDoc = firestore.addDoc as jest.Mock;
  const mockUpdateDoc = firestore.updateDoc as jest.Mock;
  const mockDeleteDoc = firestore.deleteDoc as jest.Mock;
  const mockOnSnapshot = firestore.onSnapshot as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMinistries', () => {
    it('returns empty array when churchId is falsy', async () => {
      const result = await ministryRepository.getMinistries('');
      expect(result).toEqual([]);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    it('filters for active ministries and sorts by name alphabetically', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'm1',
            data: () => ({ name: 'Worship Team', status: 'Active' }),
          },
          {
            id: 'm2',
            data: () => ({ name: 'Archived Ministry', status: 'Archived' }),
          },
          {
            id: 'm3',
            data: () => ({ name: 'Children Ministry', status: 'Active' }),
          },
          {
            id: 'm4',
            data: () => ({ name: 'Audio/Visual' }), // No status -> defaults to active
          },
        ],
      });

      const ministries = await ministryRepository.getMinistries('church_123');

      expect(ministries).toHaveLength(3);
      expect(ministries.map((m) => m.name)).toEqual([
        'Audio/Visual',
        'Children Ministry',
        'Worship Team',
      ]);
    });
  });

  describe('subscribeToMemberAssignments', () => {
    it('returns empty array and immediately cleans up when memberIds is empty', () => {
      const onData = jest.fn();
      const unsub = ministryRepository.subscribeToMemberAssignments('church_123', [], onData);
      unsub();

      expect(onData).toHaveBeenCalledWith([]);
      expect(mockOnSnapshot).not.toHaveBeenCalled();
    });

    it('subscribes with in-query when memberIds are provided', () => {
      const onData = jest.fn();
      mockOnSnapshot.mockImplementationOnce((_query, onNext) => {
        onNext({
          docs: [
            {
              id: 'a1',
              data: () => ({ roleName: 'Vocalist', memberId: 'user_1' }),
            },
          ],
        });
        return () => {};
      });

      ministryRepository.subscribeToMemberAssignments('church_123', ['user_1'], onData);

      expect(onData).toHaveBeenCalledWith([
        { id: 'a1', roleName: 'Vocalist', memberId: 'user_1' },
      ]);
    });
  });

  describe('create, update, and delete assignment', () => {
    it('creates assignment and returns assigned id', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new_assign_1' });

      const id = await ministryRepository.createAssignment({
        churchId: 'church_1',
        eventId: 'event_1',
        memberId: 'user_1',
        roleName: 'Sound',
        status: 'Pending',
      } as any);

      expect(id).toBe('new_assign_1');
      expect(mockAddDoc).toHaveBeenCalled();
    });

    it('updates assignment with provided fields and updatedAt timestamp', async () => {
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      await ministryRepository.updateAssignment('assign_1', { status: 'Confirmed' });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'ministryAssignments/assign_1' }),
        expect.objectContaining({
          status: 'Confirmed',
          updatedAt: expect.any(String),
        })
      );
    });

    it('deletes assignment by id', async () => {
      mockDeleteDoc.mockResolvedValueOnce(undefined);

      await ministryRepository.deleteAssignment('assign_1');

      expect(mockDeleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'ministryAssignments/assign_1' })
      );
    });
  });

  describe('Ministry Applications', () => {
    it('submits application and returns new document id', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'app_1' });

      const id = await ministryRepository.submitApplication({
        churchId: 'church_1',
        memberId: 'user_1',
        ministryId: 'min_1',
        status: 'pending',
      } as any);

      expect(id).toBe('app_1');
      expect(mockAddDoc).toHaveBeenCalled();
    });

    it('withdraws application by updating status to withdrawn', async () => {
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      await ministryRepository.withdrawApplication('app_1');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'ministryApplications/app_1' }),
        expect.objectContaining({ status: 'withdrawn' })
      );
    });
  });
});
