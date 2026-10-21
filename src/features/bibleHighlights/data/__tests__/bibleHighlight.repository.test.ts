import { bibleHighlightRepository } from '../bibleHighlight.repository';
import * as firestore from 'firebase/firestore';
import { myJourneyMilestoneEvaluator } from '@/features/myJourney/data/MyJourneyMilestoneEvaluator';

jest.mock('@/features/myJourney/data/MyJourneyMilestoneEvaluator', () => ({
  myJourneyMilestoneEvaluator: {
    evaluateFirstHighlight: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('bibleHighlightRepository (Data Layer)', () => {
  const mockSetDoc = firestore.setDoc as jest.Mock;
  const mockUpdateDoc = firestore.updateDoc as jest.Mock;
  const mockGetDoc = firestore.getDoc as jest.Mock;
  const mockGetDocs = firestore.getDocs as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createHighlight', () => {
    it('creates highlight with deterministic ID and evaluates first highlight milestone', async () => {
      mockSetDoc.mockResolvedValueOnce(undefined);

      const highlightInput = {
        userId: 'user_1',
        churchId: 'church_1',
        passageId: 'ROM.8',
        verseNumbers: [28],
        color: '#FFEB3B',
        visibility: 'private' as const,
      };

      const result = await bibleHighlightRepository.createHighlight(highlightInput as any);

      const expectedId = 'priv_ROM.8_28_user_1';
      expect(result.id).toBe(expectedId);

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `bibleVerseHighlights/${expectedId}` }),
        expect.objectContaining({
          id: expectedId,
          userId: 'user_1',
          status: 'active',
          color: '#FFEB3B',
        })
      );

      expect(myJourneyMilestoneEvaluator.evaluateFirstHighlight).toHaveBeenCalledWith('user_1');
    });

    it('generates public prefix when visibility is church', async () => {
      mockSetDoc.mockResolvedValueOnce(undefined);

      const result = await bibleHighlightRepository.createHighlight({
        userId: 'user_1',
        churchId: 'church_1',
        passageId: 'PSA.23',
        verseNumbers: [1, 2],
        visibility: 'church',
      } as any);

      expect(result.id).toBe('pub_PSA.23_1-2_user_1');
    });
  });

  describe('updateHighlight', () => {
    it('updates highlight with provided fields and server timestamp', async () => {
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      await bibleHighlightRepository.updateHighlight('highlight_1', { color: '#4CAF50' });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'bibleVerseHighlights/highlight_1' }),
        expect.objectContaining({
          color: '#4CAF50',
          updatedAt: '2026-10-21T00:00:00.000Z',
        })
      );
    });
  });

  describe('getHighlight & getUserHighlights', () => {
    it('returns null if highlight does not exist', async () => {
      mockGetDoc.mockResolvedValueOnce({ exists: () => false });
      expect(await bibleHighlightRepository.getHighlight('nonexistent')).toBeNull();
    });

    it('returns highlight when document exists', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ id: 'h1', passageId: 'GEN.1' }),
      });

      const highlight = await bibleHighlightRepository.getHighlight('h1');
      expect(highlight).toEqual({ id: 'h1', passageId: 'GEN.1' });
    });

    it('fetches all active user highlights', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          { data: () => ({ id: 'h1', userId: 'user_1' }) },
          { data: () => ({ id: 'h2', userId: 'user_1' }) },
        ],
      });

      const highlights = await bibleHighlightRepository.getUserHighlights('user_1');
      expect(highlights).toHaveLength(2);
    });
  });
});
