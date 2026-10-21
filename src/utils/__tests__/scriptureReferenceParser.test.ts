import { parseScriptureReference, extractChapterNumber, resolveBookId, getHumanReadableBookName } from '../scriptureReferenceParser';

describe('scriptureReferenceParser', () => {
  describe('getHumanReadableBookName', () => {
    it('returns full capitalized book name for valid YouVersion code', () => {
      expect(getHumanReadableBookName('GEN')).toBe('Genesis');
      expect(getHumanReadableBookName('MAT')).toBe('Matthew');
      expect(getHumanReadableBookName('1CO')).toBe('1 Corinthians');
    });

    it('returns input code when code is unknown', () => {
      expect(getHumanReadableBookName('XYZ')).toBe('XYZ');
    });
  });

  describe('resolveBookId', () => {
    it('resolves standard book names to YouVersion 3-letter codes', () => {
      expect(resolveBookId('Genesis')).toBe('GEN');
      expect(resolveBookId('John')).toBe('JHN');
      expect(resolveBookId('Romans')).toBe('ROM');
      expect(resolveBookId('Psalms')).toBe('PSA');
      expect(resolveBookId('Psalm')).toBe('PSA');
    });

    it('resolves numbered books and common abbreviations', () => {
      expect(resolveBookId('1 Corinthians')).toBe('1CO');
      expect(resolveBookId('1cor')).toBe('1CO');
      expect(resolveBookId('2 Samuel')).toBe('2SA');
      expect(resolveBookId('1 Kings')).toBe('1KI');
    });

    it('returns null for unrecognized book strings', () => {
      expect(resolveBookId('NotABook')).toBeNull();
      expect(resolveBookId('')).toBeNull();
    });
  });

  describe('parseScriptureReference', () => {
    it('parses chapter only (e.g. Psalm 23)', () => {
      const result = parseScriptureReference('Psalm 23');
      expect(result).toEqual({
        bookId: 'PSA',
        chapter: '23',
        display: 'Psalm 23',
      });
    });

    it('parses chapter and single verse (e.g. John 3:16)', () => {
      const result = parseScriptureReference('John 3:16');
      expect(result).toEqual({
        bookId: 'JHN',
        chapter: '3',
        startVerse: '16',
        display: 'John 3:16',
      });
    });

    it('parses chapter and verse range (e.g. Romans 8:1-11)', () => {
      const result = parseScriptureReference('Romans 8:1-11');
      expect(result).toEqual({
        bookId: 'ROM',
        chapter: '8',
        startVerse: '1',
        endVerse: '11',
        display: 'Romans 8:1-11',
      });
    });

    it('parses numbered book with verse range (e.g. 1 Corinthians 13:4-8)', () => {
      const result = parseScriptureReference('1 Corinthians 13:4-8');
      expect(result).toEqual({
        bookId: '1CO',
        chapter: '13',
        startVerse: '4',
        endVerse: '8',
        display: '1 Corinthians 13:4-8',
      });
    });

    it('parses chapter range (e.g. Genesis 1-3)', () => {
      const result = parseScriptureReference('Genesis 1-3');
      expect(result).toEqual({
        bookId: 'GEN',
        chapter: '1',
        endChapter: '3',
        display: 'Genesis 1-3',
      });
    });

    it('returns null for empty or invalid reference string', () => {
      expect(parseScriptureReference('')).toBeNull();
      expect(parseScriptureReference('   ')).toBeNull();
      expect(parseScriptureReference('Random Text Without Verse')).toBeNull();
    });
  });

  describe('extractChapterNumber', () => {
    it('extracts number directly from numeric input', () => {
      expect(extractChapterNumber(5)).toBe('5');
    });

    it('extracts chapter number from dot-separated strings (e.g. GEN.1)', () => {
      expect(extractChapterNumber('GEN.1')).toBe('1');
      expect(extractChapterNumber('ROM.8')).toBe('8');
      expect(extractChapterNumber('12')).toBe('12');
    });

    it('extracts chapter from chapter entry object', () => {
      expect(extractChapterNumber({ chapter: '4' })).toBe('4');
      expect(extractChapterNumber({ number: 7 })).toBe('7');
      expect(extractChapterNumber({ id: 'JHN.3' })).toBe('3');
      expect(extractChapterNumber({ passage_id: 'MAT.5' })).toBe('5');
    });

    it('falls back to index + 1 when input is null or undefined', () => {
      expect(extractChapterNumber(null, 0)).toBe('1');
      expect(extractChapterNumber(undefined, 2)).toBe('3');
      expect(extractChapterNumber(null)).toBe('1');
    });
  });
});
