import { biblePlanProgressRepository } from '../biblePlanProgress.repository';
import { userBiblePlanRepository } from '../userBiblePlan.repository';
import * as firestore from 'firebase/firestore';

jest.mock('../userBiblePlan.repository', () => ({
  userBiblePlanRepository: {
    advanceToNextDay: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('biblePlanProgressRepository (Data Layer)', () => {
  const mockGetDocs = firestore.getDocs as jest.Mock;
  const mockAddDoc = firestore.addDoc as jest.Mock;
  const mockUpdateDoc = firestore.updateDoc as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('markDayCompleted', () => {
    const payload = {
      churchId: 'church_1',
      planId: 'plan_1',
      dayId: 'day_1',
      dayNumber: 1,
      userId: 'user_1',
      memberId: 'mem_1',
      totalDays: 30,
      userBiblePlanId: 'user_plan_1',
      currentCompletedCount: 0,
    };

    it('creates new progress document when no record exists, advances plan, and invokes progress callbacks', async () => {
      // Step 1: empty existing check
      mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });
      mockAddDoc.mockResolvedValueOnce({ id: 'new_progress_1' });
      // Step 3: recount completed days
      mockGetDocs.mockResolvedValueOnce({ size: 1, docs: [{ id: 'new_progress_1' }] });

      const onProgress = jest.fn();

      await biblePlanProgressRepository.markDayCompleted(payload, onProgress);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          churchId: 'church_1',
          planId: 'plan_1',
          dayId: 'day_1',
          userId: 'user_1',
          isCompleted: true,
        })
      );

      expect(userBiblePlanRepository.advanceToNextDay).toHaveBeenCalledWith(
        'user_plan_1',
        'church_1',
        2, // nextDayNumber (1 + 1)
        1, // newCompletedCount
        30 // totalDays
      );

      expect(onProgress).toHaveBeenCalledWith(1, expect.any(String));
      expect(onProgress).toHaveBeenCalledWith(4, expect.any(String));
    });

    it('updates existing uncompleted progress record', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'prog_1',
            data: () => ({ isCompleted: false }),
          },
        ],
      });
      // recount
      mockGetDocs.mockResolvedValueOnce({ size: 1 });

      await biblePlanProgressRepository.markDayCompleted(payload);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'churches/church_1/biblePlanProgress/prog_1' }),
        expect.objectContaining({ isCompleted: true })
      );
    });
  });

  describe('getDayProgress & getPlanProgress', () => {
    it('returns null if any required parameter is missing in getDayProgress', async () => {
      expect(await biblePlanProgressRepository.getDayProgress('', 'p1', 'd1', 'c1')).toBeNull();
      expect(await biblePlanProgressRepository.getDayProgress('u1', '', 'd1', 'c1')).toBeNull();
      expect(await biblePlanProgressRepository.getDayProgress('u1', 'p1', '', 'c1')).toBeNull();
      expect(await biblePlanProgressRepository.getDayProgress('u1', 'p1', 'd1', '')).toBeNull();
    });

    it('fetches and maps single day progress record', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'doc_1',
            data: () => ({
              churchId: 'church_1',
              planId: 'plan_1',
              dayId: 'day_1',
              userId: 'user_1',
              isCompleted: true,
              dayNumber: 1,
            }),
          },
        ],
      });

      const progress = await biblePlanProgressRepository.getDayProgress('user_1', 'plan_1', 'day_1', 'church_1');

      expect(progress).toEqual({
        id: 'doc_1',
        churchId: 'church_1',
        planId: 'plan_1',
        dayId: 'day_1',
        userId: 'user_1',
        memberId: null,
        dayNumber: 1,
        isCompleted: true,
        completedAt: null,
        createdAt: null,
        updatedAt: null,
      });
    });

    it('fetches all plan progress records for a user', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'doc_1',
            data: () => ({ dayNumber: 1, isCompleted: true }),
          },
          {
            id: 'doc_2',
            data: () => ({ dayNumber: 2, isCompleted: true }),
          },
        ],
      });

      const records = await biblePlanProgressRepository.getPlanProgress('user_1', 'plan_1', 'church_1');
      expect(records).toHaveLength(2);
    });
  });
});
