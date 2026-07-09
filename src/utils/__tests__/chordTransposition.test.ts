import { transposeChord, transposeText, CHROMA_SHARP } from '../chordTransposition';

describe('Chord Transposition Engine', () => {
  describe('transposeChord', () => {
    it('transposes major chords', () => {
      expect(transposeChord('D', 2)).toBe('E');
      expect(transposeChord('G', 2)).toBe('A');
      expect(transposeChord('Bb', 2)).toBe('C');
      expect(transposeChord('Eb', -2, true)).toBe('Db'); // Prefer flats
    });

    it('transposes minor chords', () => {
      expect(transposeChord('Bm', 2)).toBe('C#m');
      expect(transposeChord('C#m', -2)).toBe('Bm');
    });

    it('transposes complex suffixes', () => {
      expect(transposeChord('C#m7', -2)).toBe('Bm7');
      expect(transposeChord('Asus4', 2)).toBe('Bsus4');
      expect(transposeChord('Fmaj7', 1)).toBe('F#maj7');
      expect(transposeChord('Gadd9', -2)).toBe('Fadd9');
    });

    it('transposes slash chords', () => {
      expect(transposeChord('D/F#', 2)).toBe('E/G#');
      expect(transposeChord('G/B', -2)).toBe('F/A');
    });
  });

  describe('transposeText', () => {
    it('transposes ChordPro inline formatting', () => {
      const input = '[D]Amazing [G]grace';
      const expected = '[E]Amazing [A]grace';
      expect(transposeText(input, 2)).toBe(expected);
    });

    it('transposes block chord formats', () => {
      const input = 'D       G\nAmazing grace';
      const expected = 'E       A\nAmazing grace';
      expect(transposeText(input, 2)).toBe(expected);
    });

    it('does not transpose regular text that happens to have "A" or "I"', () => {
      const input = 'I am a child of God';
      expect(transposeText(input, 2)).toBe(input);
    });

    it('handles mixed ChordPro and text properly', () => {
      const input = '[Bm7]Lord I come [E]to you';
      const expected = '[C#m7]Lord I come [F#]to you';
      expect(transposeText(input, 2)).toBe(expected);
    });
  });
});
