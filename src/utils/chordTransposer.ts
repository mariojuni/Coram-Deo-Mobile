const CHROMA_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHROMA_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const normalizeNote = (note: string): number => {
  const upperNote = note.charAt(0).toUpperCase() + note.slice(1);
  let index = CHROMA_SHARP.indexOf(upperNote);
  if (index === -1) {
    index = CHROMA_FLAT.indexOf(upperNote);
  }
  return index;
};

const getNote = (index: number, useFlats: boolean): string => {
  const normalizedIndex = (index % 12 + 12) % 12;
  return useFlats ? CHROMA_FLAT[normalizedIndex] : CHROMA_SHARP[normalizedIndex];
};

export const transposeChord = (chord: string, steps: number, preferFlats: boolean = false): string => {
  // Regex to match the root note and optional bass note.
  // E.g., C#m7/G# -> root: C#, modifier: m7, bass: G#
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
// Looks for standard chord patterns: C, C#m, Dsus4, G/B, etc.
const isLikelyChord = (word: string): boolean => {
  // Reject common words that might look like chords
  if (word === 'Do' || word === 'Go') return false;
  
  const regex = /^[CDEFGAB][#b]?(m|min|maj|M|dim|aug|sus|add|\d|b|#|\+|-)*(\/[CDEFGAB][#b]?)?$/;
  return regex.test(word);
};

export const transposeChart = (text: string, steps: number, preferFlats: boolean = false): string => {
  if (steps === 0) return text;
  
  const lines = text.split('\n');
  
  const transposedLines = lines.map(line => {
    // If a line is empty or starts with [ (like [Chorus]), skip it
    if (!line.trim() || line.trim().startsWith('[')) return line;

    // Check if the line is mostly chords (to avoid transposing lyrics that look like chords e.g., "A", "I", "am")
    // A heuristic: if more than 50% of the non-empty words are chords, we treat the whole line as a chord line.
    const words = line.split(/\s+/).filter(w => w.length > 0);
    const chordCount = words.filter(w => isLikelyChord(w)).length;
    
    if (words.length > 0 && (chordCount / words.length) > 0.4) {
      // It's a chord line, transpose the chords while keeping the spacing
      let result = '';
      let currentWord = '';
      let isSpace = true;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === ' ' || char === '\t') {
          if (!isSpace) {
            // End of word, process it
            result += isLikelyChord(currentWord) ? transposeChord(currentWord, steps, preferFlats) : currentWord;
            currentWord = '';
          }
          result += char;
          isSpace = true;
        } else {
          currentWord += char;
          isSpace = false;
        }
      }
      
      // Process last word
      if (currentWord) {
        result += isLikelyChord(currentWord) ? transposeChord(currentWord, steps, preferFlats) : currentWord;
      }
      
      return result;
    }

    // It's a lyrics line, return as is
    return line;
  });

  return transposedLines.join('\n');
};
