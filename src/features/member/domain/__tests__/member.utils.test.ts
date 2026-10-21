import {
  toTitleCase,
  formatMemberName,
  parseMemberDate,
  formatBirthday,
  createMemberIdMap,
  isUserInMinistry,
  deduplicateMembers,
} from '../member.utils';

describe('member.utils (Domain)', () => {
  describe('toTitleCase', () => {
    it('capitalizes each word in a string and handles hyphens/whitespace', () => {
      expect(toTitleCase('john doe')).toBe('John Doe');
      expect(toTitleCase('mary-jane watson')).toBe('Mary Jane Watson');
      expect(toTitleCase('')).toBe('');
    });
  });

  describe('formatMemberName', () => {
    it('formats firstName, middleName, and lastName properly', () => {
      const member = { firstName: 'john', middleName: 'robert', lastName: 'doe' };
      expect(formatMemberName(member)).toBe('John R. Doe');
    });

    it('formats multi-part name string into First M. Last', () => {
      const member = { name: 'john robert doe' };
      expect(formatMemberName(member)).toBe('John R. Doe');
    });

    it('formats two-part name into Title Case', () => {
      const member = { name: 'john doe' };
      expect(formatMemberName(member)).toBe('John Doe');
    });

    it('falls back to Unnamed Member if no name data is present', () => {
      expect(formatMemberName({})).toBe('Unnamed Member');
    });
  });

  describe('parseMemberDate', () => {
    it('parses structured birthMonth and birthDay', () => {
      const member = { birthMonth: 5, birthDay: 14, birthDate: '1990-05-14' };
      expect(parseMemberDate(member)).toEqual({ m: 5, d: 14, y: 1990 });
    });

    it('parses hyphenated date string (YYYY-MM-DD)', () => {
      const member = { birthDate: '1995-12-25' };
      expect(parseMemberDate(member)).toEqual({ m: 12, d: 25, y: 1995 });
    });

    it('parses slash date string (MM/DD/YYYY and MM/DD)', () => {
      expect(parseMemberDate({ birthDate: '07/04/2000' })).toEqual({ m: 7, d: 4, y: 2000 });
      expect(parseMemberDate({ birthDate: '07/04' })).toEqual({ m: 7, d: 4, y: 0 });
    });

    it('returns null for missing or invalid dates', () => {
      expect(parseMemberDate({})).toBeNull();
      expect(parseMemberDate({ birthDate: 'not-a-date' })).toBeNull();
    });
  });

  describe('formatBirthday', () => {
    it('returns formatted birthday string for valid member date', () => {
      const member = { birthMonth: 12, birthDay: 25 };
      const formatted = formatBirthday(member);
      expect(formatted).toContain('Dec');
      expect(formatted).toContain('25');
    });

    it('returns empty string if member has no valid birth date', () => {
      expect(formatBirthday({})).toBe('');
    });
  });

  describe('createMemberIdMap', () => {
    it('maps members by both id and authUid', () => {
      const members = [
        { id: 'mem_1', authUid: 'auth_1', name: 'Alice' },
        { id: 'mem_2', name: 'Bob' },
      ];

      const map = createMemberIdMap(members);
      expect(map.get('mem_1')).toEqual(members[0]);
      expect(map.get('auth_1')).toEqual(members[0]);
      expect(map.get('mem_2')).toEqual(members[1]);
    });
  });

  describe('isUserInMinistry', () => {
    const ministryMembers = [
      { memberId: 'mem_1' },
      { memberId: 'mem_2' },
    ];

    it('returns true when user uid or userProfile memberId matches', () => {
      expect(isUserInMinistry(ministryMembers, { uid: 'mem_1' }, null)).toBe(true);
      expect(isUserInMinistry(ministryMembers, { uid: 'other' }, { memberId: 'mem_2' })).toBe(true);
    });

    it('returns false when neither user uid nor memberId matches', () => {
      expect(isUserInMinistry(ministryMembers, { uid: 'user_99' }, { memberId: 'mem_99' })).toBe(false);
      expect(isUserInMinistry(undefined, { uid: 'mem_1' }, null)).toBe(false);
    });
  });

  describe('deduplicateMembers', () => {
    it('deduplicates members matching on email, merging missing fields and alias IDs', () => {
      const members = [
        { id: '1', email: 'test@example.com', name: 'John Doe', phone: '123' },
        { id: '2', email: 'test@example.com', name: 'John Doe', role: 'Deacon' },
      ];

      const deduplicated = deduplicateMembers(members);
      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0].phone).toBe('123');
      expect(deduplicated[0].role).toBe('Deacon');
      expect(deduplicated[0].aliasIds).toContain('2');
    });

    it('deduplicates members matching on formatted name when email is absent', () => {
      const members = [
        { id: '1', name: 'Alice Smith' },
        { id: '2', firstName: 'Alice', lastName: 'Smith' },
      ];

      const deduplicated = deduplicateMembers(members);
      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0].aliasIds).toContain('2');
    });
  });
});
