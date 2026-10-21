import { bibleActivityRepository, BibleActivityRepository } from '../myJourney.repository';
import * as firestore from 'firebase/firestore';

describe('BibleActivityRepository', () => {
  let repository: BibleActivityRepository;
  const mockSetDoc = firestore.setDoc as jest.Mock;
  const mockGetDocs = firestore.getDocs as jest.Mock;
  const mockGetDoc = firestore.getDoc as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new BibleActivityRepository();
  });

  describe('logChapterRead', () => {
    it('returns early without writing when parameters are missing', async () => {
      await repository.logChapterRead('', 'JHN.1', '2026-10-21');
      await repository.logChapterRead('user_123', '', '2026-10-21');
      await repository.logChapterRead('user_123', 'JHN.1', '');

      expect(mockSetDoc).not.toHaveBeenCalled();
    });

    it('sets doc with arrayUnion and serverTimestamp when inputs are valid', async () => {
      mockSetDoc.mockResolvedValueOnce(undefined);

      await repository.logChapterRead('user_123', 'GEN.1', '2026-10-21');

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'users/user_123/bibleActivity/2026-10-21' }),
        expect.objectContaining({
          dateKey: '2026-10-21',
          chapterIds: expect.objectContaining({
            _method: 'arrayUnion',
            elements: ['GEN.1'],
          }),
        }),
        { merge: true }
      );
    });

    it('gracefully handles and logs errors when setDoc throws', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockSetDoc.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        repository.logChapterRead('user_123', 'GEN.1', '2026-10-21')
      ).resolves.not.toThrow();

      expect(warnSpy).toHaveBeenCalledWith(
        'Failed to log chapter read:',
        expect.any(Error)
      );
      warnSpy.mockRestore();
    });
  });

  describe('getSummaries', () => {
    it('returns empty array when required arguments are empty', async () => {
      expect(await repository.getSummaries('', '2026-10-01', '2026-10-31')).toEqual([]);
      expect(await repository.getSummaries('user_123', '', '2026-10-31')).toEqual([]);
      expect(await repository.getSummaries('user_123', '2026-10-01', '')).toEqual([]);
    });

    it('processes standard daily activity documents within date range', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: '2026-10-15',
            data: () => ({
              chapterIds: ['GEN.1', 'GEN.2'],
              updatedAt: '2026-10-15T10:00:00Z',
            }),
          },
          {
            id: '2026-09-30', // Before start date
            data: () => ({
              chapterIds: ['PSA.1'],
            }),
          },
          {
            id: '2026-11-05', // After end date
            data: () => ({
              chapterIds: ['REV.1'],
            }),
          },
          {
            id: 'dates', // Legacy doc ID, should be skipped in docs loop
            data: () => ({}),
          },
        ],
      });

      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
        data: () => ({}),
      });

      const results = await repository.getSummaries('user_123', '2026-10-01', '2026-10-31');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        dateKey: '2026-10-15',
        chapterIds: ['GEN.1', 'GEN.2'],
        chapterCount: 2,
        updatedAt: '2026-10-15T10:00:00Z',
      });
    });

    it('merges legacy dates document when present', async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] });
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          '2026-10-10': {
            chapterIds: ['MAT.1', 'MAT.2'],
            chapterCount: 2,
          },
          '2026-10-11': ['MRK.1'], // array format
          '2026-09-01': { chapterCount: 5 }, // out of range
        }),
      });

      const results = await repository.getSummaries('user_123', '2026-10-01', '2026-10-31');

      expect(results).toHaveLength(2);
      const day10 = results.find((r) => r.dateKey === '2026-10-10');
      const day11 = results.find((r) => r.dateKey === '2026-10-11');

      expect(day10).toBeDefined();
      expect(day10?.chapterCount).toBe(2);
      expect(day11).toBeDefined();
      expect(day11?.chapterCount).toBe(1);
    });

    it('handles query failures gracefully by returning empty array', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockGetDocs.mockRejectedValueOnce(new Error('Permission denied'));

      const results = await repository.getSummaries('user_123', '2026-10-01', '2026-10-31');

      expect(results).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        'Failed to get bible activity summaries:',
        expect.any(Error)
      );
      warnSpy.mockRestore();
    });
  });
});
