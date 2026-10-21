import { parseFeedTimestamp } from '../feed.utils';

describe('feed.utils', () => {
  describe('parseFeedTimestamp', () => {
    it('returns 0 for falsy or undefined values', () => {
      expect(parseFeedTimestamp(null)).toBe(0);
      expect(parseFeedTimestamp(undefined)).toBe(0);
      expect(parseFeedTimestamp('')).toBe(0);
      expect(parseFeedTimestamp(0)).toBe(0);
    });

    it('returns numerical timestamps directly', () => {
      const ts = 1729512000000;
      expect(parseFeedTimestamp(ts)).toBe(ts);
    });

    it('parses valid ISO string dates into milliseconds', () => {
      const isoStr = '2026-10-21T00:00:00.000Z';
      const expected = new Date(isoStr).getTime();
      expect(parseFeedTimestamp(isoStr)).toBe(expected);
    });

    it('returns milliseconds from Date instances', () => {
      const date = new Date('2026-10-21T12:00:00Z');
      expect(parseFeedTimestamp(date)).toBe(date.getTime());
    });

    it('handles Firestore Timestamp objects with toDate() method', () => {
      const mockFirestoreTimestamp = {
        toDate: () => new Date('2026-10-21T15:30:00Z'),
      };
      const expected = new Date('2026-10-21T15:30:00Z').getTime();
      expect(parseFeedTimestamp(mockFirestoreTimestamp)).toBe(expected);
    });

    it('handles seconds-based objects', () => {
      const secondsObj = { seconds: 1729512000 };
      expect(parseFeedTimestamp(secondsObj)).toBe(1729512000000);
    });

    it('returns 0 for invalid string dates or non-date objects', () => {
      expect(parseFeedTimestamp('invalid-date-string')).toBe(0);
      expect(parseFeedTimestamp({})).toBe(0);
    });
  });
});
