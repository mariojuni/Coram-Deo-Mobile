export const CHROMA_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const CHROMA_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const normalizeNote = (note: string): number => {
  if (!note) return -1;
  const upperNote = note.charAt(0).toUpperCase() + note.slice(1).toLowerCase();
  let index = CHROMA_SHARP.indexOf(upperNote);
  if (index === -1) {
    index = CHROMA_FLAT.indexOf(upperNote);
  }
  return index;
};

export const getNote = (index: number, useFlats: boolean): string => {
  const normalizedIndex = ((index % 12) + 12) % 12;
  return useFlats ? CHROMA_FLAT[normalizedIndex] : CHROMA_SHARP[normalizedIndex];
};

export const getStepsBetweenKeys = (originalKey: string, targetKey: string): number => {
  const origIndex = normalizeNote(originalKey);
  const targetIndex = normalizeNote(targetKey);
  if (origIndex === -1 || targetIndex === -1) return 0;
  
  let diff = targetIndex - origIndex;
  // keep diff between -6 and +6 for shortest path
  if (diff > 6) diff -= 12;
  if (diff < -5) diff += 12;
  return diff;
};

/**
 * Transpose a single chord string (e.g., "D/F#", "Bm7", "C#m", "Eb").
 */
export const transposeChord = (chord: string, steps: number, preferFlats: boolean = false): string => {
  // Regex to match the root note and optional bass note.
  // Matches A-G with optional # or b, then any modifier string, then optionally / followed by A-G with optional # or b.
  const chordRegex = /^([CDEFGAB][#b]?)(.*?)(\/([CDEFGAB][#b]?))?$/i;
  
  const match = chord.match(chordRegex);
  if (!match) return chord; // Not a recognized chord format

  const root = match[1];
  const modifier = match[2] || '';
  const bass = match[4];

  const rootIndex = normalizeNote(root);
  if (rootIndex === -1) return chord;

  const newRoot = getNote(rootIndex + steps, preferFlats);
  
  let newBass = '';
  if (bass) {
    const bassIndex = normalizeNote(bass);
    if (bassIndex !== -1) {
      newBass = '/' + getNote(bassIndex + steps, preferFlats);
    } else {
      newBass = '/' + bass;
    }
  }

  return newRoot + modifier + newBass;
};

// Regex to identify if a word is likely a chord
const isLikelyChord = (word: string, isInline: boolean = false): boolean => {
  if (!isInline) {
    // If it's block text, lowercase 'a' and 'am' are almost certainly lyrics.
    if (word === 'a' || word === 'am') return false;
    
    const lower = word.toLowerCase();
    // Blacklist common small English words that might look like chords
    if (['i', 'do', 'go', 'me', 'be', 'he', 'we', 'as', 'at', 'by', 'in', 'is', 'it', 'of', 'on', 'to', 'up', 'us', 'an', 'are', 'and'].includes(lower)) {
      return false;
    }
  }
  
  // We need to allow it to be transposed if it's a valid chord.
  const regex = /^[CDEFGAB][#b]?(m|min|maj|M|dim|aug|sus|add|\d|b|#|\+|-|\(|\)|6\/9)*(\/[CDEFGAB][#b]?)?$/i;
  
  return regex.test(word);
};

/**
 * Transpose full lyrics text, supporting both block chords (chords on their own line)
 * and ChordPro inline chords (e.g., "[D]Amazing [G]grace").
 */
export const transposeText = (text: string, steps: number, preferFlats: boolean = false): string => {
  if (steps === 0) return text;
  
  const lines = text.split(/\r?\n/);
  
  const transposedLines = lines.map(line => {
    // 1. Process ChordPro inline chords (e.g., [D/F#])
    let hasChordPro = false;
    let newLine = line.replace(/\[([^\]]+)\]/g, (match, innerText) => {
      if (isLikelyChord(innerText.trim(), true)) {
        hasChordPro = true;
        return `[${transposeChord(innerText.trim(), steps, preferFlats)}]`;
      }
      return match;
    });

    if (hasChordPro) {
      return newLine;
    }

    // 2. Process block text chord lines
    if (!line.trim() || line.trim().startsWith('[')) return line;

    const words = line.split(/\s+/).filter(w => w.length > 0);
    const chordCount = words.filter(w => isLikelyChord(w)).length;
    
    // Treat as chord line if > 40% are valid chords
    if (words.length > 0 && (chordCount / words.length) > 0.4) {
      let result = '';
      let currentWord = '';
      let isSpace = true;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === ' ' || char === '\t') {
          if (!isSpace) {
            result += isLikelyChord(currentWord, false) ? transposeChord(currentWord, steps, preferFlats) : currentWord;
            currentWord = '';
          }
          result += char;
          isSpace = true;
        } else {
          currentWord += char;
          isSpace = false;
        }
      }
      
      if (currentWord) {
        result += isLikelyChord(currentWord, false) ? transposeChord(currentWord, steps, preferFlats) : currentWord;
      }
      
      return result;
    }

    // Lyrics line
    return line;
  });

  return transposedLines.join('\n');
};
