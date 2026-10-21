import { commentRepository } from '../comment.repository';
import * as firestore from 'firebase/firestore';

describe('commentRepository (Data Layer)', () => {
  const mockGetDocs = firestore.getDocs as jest.Mock;
  const mockOnSnapshot = firestore.onSnapshot as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getComments', () => {
    it('fetches top-level comments and filters out deleted comments', async () => {
      const mockDate1 = new Date('2026-10-21T10:00:00Z');
      const mockDate2 = new Date('2026-10-21T09:00:00Z');

      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'c1',
            data: () => ({
              churchId: 'church_1',
              targetType: 'sermon',
              targetId: 'sermon_123',
              content: 'Powerful message!',
              status: 'active',
              createdAt: { toDate: () => mockDate1 },
              updatedAt: { toDate: () => mockDate1 },
            }),
          },
          {
            id: 'c2',
            data: () => ({
              churchId: 'church_1',
              targetType: 'sermon',
              targetId: 'sermon_123',
              content: 'Deleted comment',
              status: 'deleted',
              createdAt: { toDate: () => mockDate2 },
              updatedAt: { toDate: () => mockDate2 },
            }),
          },
        ],
      });

      const { comments } = await commentRepository.getComments('church_1', 'sermon', 'sermon_123');

      expect(comments).toHaveLength(1);
      expect(comments[0].id).toBe('c1');
      expect(comments[0].content).toBe('Powerful message!');
      expect(comments[0].createdAt).toEqual(mockDate1);
    });
  });

  describe('subscribeReplies', () => {
    it('listens for replies to parent comment and filters deleted ones', () => {
      const onUpdate = jest.fn();
      const mockDate = new Date('2026-10-21T10:30:00Z');

      mockOnSnapshot.mockImplementationOnce((_query, onNext) => {
        onNext({
          docs: [
            {
              id: 'reply_1',
              data: () => ({
                churchId: 'church_1',
                targetType: 'sermon',
                targetId: 'sermon_123',
                parentCommentId: 'c1',
                content: 'Amen!',
                status: 'active',
                createdAt: { toDate: () => mockDate },
              }),
            },
            {
              id: 'reply_2',
              data: () => ({
                churchId: 'church_1',
                parentCommentId: 'c1',
                status: 'deleted',
                createdAt: { toDate: () => mockDate },
              }),
            },
          ],
        });
        return () => {};
      });

      const unsubscribe = commentRepository.subscribeReplies(
        'church_1',
        'sermon',
        'sermon_123',
        'c1',
        onUpdate
      );
      unsubscribe();

      expect(onUpdate).toHaveBeenCalledTimes(1);
      const replies = onUpdate.mock.calls[0][0];
      expect(replies).toHaveLength(1);
      expect(replies[0].id).toBe('reply_1');
      expect(replies[0].content).toBe('Amen!');
    });
  });
});
