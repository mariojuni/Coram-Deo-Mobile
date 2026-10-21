import { memberRepository } from '../member.repository';
import * as firestore from 'firebase/firestore';

describe('memberRepository (Data Layer)', () => {
  const mockOnSnapshot = firestore.onSnapshot as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('subscribeToMembers', () => {
    it('returns an empty unsubscribe function when churchId is falsy', () => {
      const onData = jest.fn();
      const onError = jest.fn();

      const unsubscribe = memberRepository.subscribeToMembers('', onData, onError);
      unsubscribe();

      expect(mockOnSnapshot).not.toHaveBeenCalled();
      expect(onData).not.toHaveBeenCalled();
    });

    it('listens to users and returns deduplicated members', () => {
      const onData = jest.fn();
      const onError = jest.fn();

      mockOnSnapshot.mockImplementationOnce((_query, onNext) => {
        onNext({
          docs: [
            {
              id: 'u1',
              data: () => ({ name: 'John Doe', email: 'john@example.com', churchId: 'church_1' }),
            },
            {
              id: 'u2',
              data: () => ({ name: 'John Doe', email: 'john@example.com', churchId: 'church_1', phone: '555-1234' }),
            },
            {
              id: 'u3',
              data: () => ({ name: 'Alice Smith', email: 'alice@example.com', churchId: 'church_1' }),
            },
          ],
        });
        return () => {};
      });

      memberRepository.subscribeToMembers('church_1', onData, onError);

      expect(onData).toHaveBeenCalledTimes(1);
      const members = onData.mock.calls[0][0];
      expect(members).toHaveLength(2); // John Doe deduplicated + Alice Smith
    });
  });

  describe('subscribeToServices', () => {
    it('returns noop if churchId is missing', () => {
      const onData = jest.fn();
      const onError = jest.fn();

      const unsubscribe = memberRepository.subscribeToServices(null, onData, onError);
      unsubscribe();

      expect(mockOnSnapshot).not.toHaveBeenCalled();
    });

    it('subscribes to services collection for churchId', () => {
      const onData = jest.fn();
      const onError = jest.fn();

      mockOnSnapshot.mockImplementationOnce((_query, onNext) => {
        onNext({
          docs: [
            {
              id: 'svc_1',
              data: () => ({ name: 'Sunday Morning Worship', time: '10:00 AM' }),
            },
          ],
        });
        return () => {};
      });

      memberRepository.subscribeToServices('church_1', onData, onError);

      expect(onData).toHaveBeenCalledWith([
        { id: 'svc_1', name: 'Sunday Morning Worship', time: '10:00 AM' },
      ]);
    });
  });

  describe('subscribeToHouseholds', () => {
    it('subscribes to households collection for churchId', () => {
      const onData = jest.fn();
      const onError = jest.fn();

      mockOnSnapshot.mockImplementationOnce((_query, onNext) => {
        onNext({
          docs: [
            {
              id: 'hh_1',
              data: () => ({ name: 'The Doe Family' }),
            },
          ],
        });
        return () => {};
      });

      memberRepository.subscribeToHouseholds('church_1', onData, onError);

      expect(onData).toHaveBeenCalledWith([
        { id: 'hh_1', name: 'The Doe Family' },
      ]);
    });
  });
});
