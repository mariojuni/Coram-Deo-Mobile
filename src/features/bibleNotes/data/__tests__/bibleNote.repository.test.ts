import { bibleNoteRepository } from '../bibleNote.repository';
import * as firestore from 'firebase/firestore';
import { myJourneyMilestoneEvaluator } from '@/features/myJourney/data/MyJourneyMilestoneEvaluator';

jest.mock('@/features/myJourney/data/MyJourneyMilestoneEvaluator', () => ({
  myJourneyMilestoneEvaluator: {
    evaluateFirstBibleNote: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('bibleNoteRepository (Data Layer)', () => {
  const mockSetDoc = firestore.setDoc as jest.Mock;
  const mockUpdateDoc = firestore.updateDoc as jest.Mock;
  const mockGetDoc = firestore.getDoc as jest.Mock;
  const mockGetDocs = firestore.getDocs as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNote', () => {
    it('creates note with active status, sets published moderation for church visibility, and triggers milestone evaluation', async () => {
      mockSetDoc.mockResolvedValueOnce(undefined);

      const noteInput = {
        userId: 'user_1',
        churchId: 'church_1',
        passageId: 'JHN.1',
        verseNumbers: [1, 2],
        content: 'In the beginning was the Word',
        visibility: 'church' as const,
      };

      const result = await bibleNoteRepository.createNote(noteInput as any);

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'user_1',
          content: 'In the beginning was the Word',
          status: 'active',
          moderationStatus: 'published',
          likes: 0,
        })
      );

      expect(myJourneyMilestoneEvaluator.evaluateFirstBibleNote).toHaveBeenCalledWith('user_1');
      expect(result.userId).toBe('user_1');
    });
  });

  describe('updateNote', () => {
    it('updates note with provided fields and server timestamp', async () => {
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      await bibleNoteRepository.updateNote('note_1', { content: 'Updated reflection' });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'bibleNotes/note_1' }),
        expect.objectContaining({
          content: 'Updated reflection',
          updatedAt: '2026-10-21T00:00:00.000Z',
        })
      );
    });
  });

  describe('getNote & getUserNotes', () => {
    it('returns null if note is not found in getNote', async () => {
      mockGetDoc.mockResolvedValueOnce({ exists: () => false });
      expect(await bibleNoteRepository.getNote('nonexistent')).toBeNull();
    });

    it('returns note data when found in getNote', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ id: 'note_1', content: 'God is love' }),
      });

      const note = await bibleNoteRepository.getNote('note_1');
      expect(note).toEqual({ id: 'note_1', content: 'God is love' });
    });

    it('returns list of active user notes in getUserNotes', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            data: () => ({ id: 'note_1', userId: 'user_1', content: 'Note 1' }),
          },
          {
            data: () => ({ id: 'note_2', userId: 'user_1', content: 'Note 2' }),
          },
        ],
      });

      const notes = await bibleNoteRepository.getUserNotes('user_1');
      expect(notes).toHaveLength(2);
    });
  });
});
