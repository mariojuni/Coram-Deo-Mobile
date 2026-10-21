import { myJourneyMilestoneRepository, MyJourneyMilestoneRepository } from '../milestone.repository';
import { myJourneyMilestoneEvaluator } from '../MyJourneyMilestoneEvaluator';
import * as firestore from 'firebase/firestore';

describe('MyJourney Milestone Data Layer', () => {
  let repository: MyJourneyMilestoneRepository;
  const mockSetDoc = firestore.setDoc as jest.Mock;
  const mockGetDocs = firestore.getDocs as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new MyJourneyMilestoneRepository();
  });

  describe('MyJourneyMilestoneRepository', () => {
    it('saves a milestone with merge: true and server timestamp', async () => {
      mockSetDoc.mockResolvedValueOnce(undefined);

      await repository.saveMilestone({
        id: 'first_bible_note',
        userId: 'user_123',
        type: 'first_bible_note',
        title: 'First Note',
      });

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'users/user_123/myJourneyMilestones/first_bible_note' }),
        expect.objectContaining({
          id: 'first_bible_note',
          userId: 'user_123',
          type: 'first_bible_note',
          title: 'First Note',
          achievedAt: '2026-10-21T00:00:00.000Z',
        }),
        { merge: true }
      );
    });

    it('returns empty array when userId is missing in getUserMilestones', async () => {
      const result = await repository.getUserMilestones('');
      expect(result).toEqual([]);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    it('fetches and maps user milestones correctly', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'milestone_1',
            data: () => ({
              userId: 'user_123',
              type: 'first_bible_note',
              title: 'Your First Bible Note',
              achievedAt: '2026-10-21T00:00:00.000Z',
            }),
          },
        ],
      });

      const milestones = await repository.getUserMilestones('user_123');

      expect(milestones).toHaveLength(1);
      expect(milestones[0]).toEqual({
        id: 'milestone_1',
        userId: 'user_123',
        type: 'first_bible_note',
        title: 'Your First Bible Note',
        achievedAt: '2026-10-21T00:00:00.000Z',
        metadata: undefined,
      });
    });

    it('logs warning and returns empty array when fetching fails', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockGetDocs.mockRejectedValueOnce(new Error('Firestore error'));

      const milestones = await repository.getUserMilestones('user_123');
      expect(milestones).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith('Failed to fetch milestones:', expect.any(Error));
      warnSpy.mockRestore();
    });
  });

  describe('MyJourneyMilestoneEvaluator', () => {
    it('evaluates first bible note milestone', async () => {
      const saveSpy = jest.spyOn(myJourneyMilestoneRepository, 'saveMilestone').mockResolvedValueOnce();

      await myJourneyMilestoneEvaluator.evaluateFirstBibleNote('user_456');

      expect(saveSpy).toHaveBeenCalledWith({
        id: 'first_bible_note',
        userId: 'user_456',
        type: 'first_bible_note',
        title: 'Your First Bible Note',
      });
      saveSpy.mockRestore();
    });

    it('evaluates first highlight milestone', async () => {
      const saveSpy = jest.spyOn(myJourneyMilestoneRepository, 'saveMilestone').mockResolvedValueOnce();

      await myJourneyMilestoneEvaluator.evaluateFirstHighlight('user_456');

      expect(saveSpy).toHaveBeenCalledWith({
        id: 'first_highlight',
        userId: 'user_456',
        type: 'first_highlight',
        title: 'Your First Highlight',
      });
      saveSpy.mockRestore();
    });

    it('evaluates reading plan completed milestone with plan metadata', async () => {
      const saveSpy = jest.spyOn(myJourneyMilestoneRepository, 'saveMilestone').mockResolvedValueOnce();

      await myJourneyMilestoneEvaluator.evaluateReadingPlanCompleted('user_456', 'plan_99', 'Gospel of John');

      expect(saveSpy).toHaveBeenCalledWith({
        id: 'completed_plan_plan_99',
        userId: 'user_456',
        type: 'reading_plan_completed',
        title: 'Reading Plan Completed',
        metadata: {
          planId: 'plan_99',
          planTitle: 'Gospel of John',
        },
      });
      saveSpy.mockRestore();
    });

    it('skips evaluation when required arguments are empty', async () => {
      const saveSpy = jest.spyOn(myJourneyMilestoneRepository, 'saveMilestone').mockResolvedValueOnce();

      await myJourneyMilestoneEvaluator.evaluateFirstBibleNote('');
      await myJourneyMilestoneEvaluator.evaluateFirstHighlight('');
      await myJourneyMilestoneEvaluator.evaluateReadingPlanCompleted('', 'plan_1', 'Plan');
      await myJourneyMilestoneEvaluator.evaluateReadingPlanCompleted('user_123', '', 'Plan');

      expect(saveSpy).not.toHaveBeenCalled();
      saveSpy.mockRestore();
    });
  });
});
