// Maps human-readable Bible book names (and common abbreviations) to YouVersion 3-letter codes.
// This supports the scripture references created by church admins in the web portal.

const BOOK_NAME_MAP: Record<string, string> = {
  // ── Old Testament ────────────────────────────────────────────────────────────
  genesis: 'GEN', gen: 'GEN',
  exodus: 'EXO', exo: 'EXO', ex: 'EXO', exod: 'EXO',
  leviticus: 'LEV', lev: 'LEV',
  numbers: 'NUM', num: 'NUM', nums: 'NUM',
  deuteronomy: 'DEU', deu: 'DEU', deut: 'DEU', dt: 'DEU',
  joshua: 'JOS', jos: 'JOS', josh: 'JOS',
  judges: 'JDG', jdg: 'JDG', judg: 'JDG',
  ruth: 'RUT', rut: 'RUT',
  '1 samuel': '1SA', '1samuel': '1SA', '1sa': '1SA', '1sam': '1SA',
  '2 samuel': '2SA', '2samuel': '2SA', '2sa': '2SA', '2sam': '2SA',
  '1 kings': '1KI', '1kings': '1KI', '1ki': '1KI', '1kgs': '1KI',
  '2 kings': '2KI', '2kings': '2KI', '2ki': '2KI', '2kgs': '2KI',
  '1 chronicles': '1CH', '1chronicles': '1CH', '1ch': '1CH', '1chr': '1CH', '1chron': '1CH',
  '2 chronicles': '2CH', '2chronicles': '2CH', '2ch': '2CH', '2chr': '2CH', '2chron': '2CH',
  ezra: 'EZR', ezr: 'EZR',
  nehemiah: 'NEH', neh: 'NEH',
  esther: 'EST', est: 'EST', esth: 'EST',
  job: 'JOB',
  psalms: 'PSA', psalm: 'PSA', psa: 'PSA', ps: 'PSA',
  proverbs: 'PRO', pro: 'PRO', prov: 'PRO', prv: 'PRO',
  ecclesiastes: 'ECC', ecc: 'ECC', eccl: 'ECC', eccles: 'ECC', qoh: 'ECC',
  'song of solomon': 'SNG', 'song of songs': 'SNG', 'song': 'SNG', sng: 'SNG', sos: 'SNG', ss: 'SNG',
  isaiah: 'ISA', isa: 'ISA',
  jeremiah: 'JER', jer: 'JER',
  lamentations: 'LAM', lam: 'LAM',
  ezekiel: 'EZK', ezk: 'EZK', eze: 'EZK', ezek: 'EZK',
  daniel: 'DAN', dan: 'DAN',
  hosea: 'HOS', hos: 'HOS',
  joel: 'JOL', jol: 'JOL',
  amos: 'AMO', amo: 'AMO',
  obadiah: 'OBA', oba: 'OBA', obad: 'OBA',
  jonah: 'JON', jon: 'JON',
  micah: 'MIC', mic: 'MIC',
  nahum: 'NAM', nam: 'NAM', nah: 'NAM',
  habakkuk: 'HAB', hab: 'HAB',
  zephaniah: 'ZEP', zep: 'ZEP', zeph: 'ZEP',
  haggai: 'HAG', hag: 'HAG',
  zechariah: 'ZEC', zec: 'ZEC', zech: 'ZEC',
  malachi: 'MAL', mal: 'MAL',

  // ── New Testament ────────────────────────────────────────────────────────────
  matthew: 'MAT', mat: 'MAT', matt: 'MAT', mt: 'MAT',
  mark: 'MRK', mrk: 'MRK', mk: 'MRK', mar: 'MRK',
  luke: 'LUK', luk: 'LUK', lk: 'LUK',
  john: 'JHN', jhn: 'JHN', jn: 'JHN',
  acts: 'ACT', act: 'ACT',
  romans: 'ROM', rom: 'ROM',
  '1 corinthians': '1CO', '1corinthians': '1CO', '1co': '1CO', '1cor': '1CO',
  '2 corinthians': '2CO', '2corinthians': '2CO', '2co': '2CO', '2cor': '2CO',
  galatians: 'GAL', gal: 'GAL',
  ephesians: 'EPH', eph: 'EPH',
  philippians: 'PHP', php: 'PHP', phil: 'PHP', philipp: 'PHP',
  colossians: 'COL', col: 'COL',
  '1 thessalonians': '1TH', '1thessalonians': '1TH', '1th': '1TH', '1thess': '1TH',
  '2 thessalonians': '2TH', '2thessalonians': '2TH', '2th': '2TH', '2thess': '2TH',
  '1 timothy': '1TI', '1timothy': '1TI', '1ti': '1TI', '1tim': '1TI',
  '2 timothy': '2TI', '2timothy': '2TI', '2ti': '2TI', '2tim': '2TI',
  titus: 'TIT', tit: 'TIT',
  philemon: 'PHM', phm: 'PHM', phlm: 'PHM',
  hebrews: 'HEB', heb: 'HEB',
  james: 'JAS', jas: 'JAS', jam: 'JAS',
  '1 peter': '1PE', '1peter': '1PE', '1pe': '1PE', '1pet': '1PE',
  '2 peter': '2PE', '2peter': '2PE', '2pe': '2PE', '2pet': '2PE',
  '1 john': '1JN', '1john': '1JN', '1jn': '1JN', '1jo': '1JN',
  '2 john': '2JN', '2john': '2JN', '2jn': '2JN', '2jo': '2JN',
  '3 john': '3JN', '3john': '3JN', '3jn': '3JN', '3jo': '3JN',
  jude: 'JUD', jud: 'JUD',
  revelation: 'REV', rev: 'REV', revelations: 'REV',
};

export interface ParsedScriptureReference {
  bookId: string;       // YouVersion code e.g. "JHN"
  chapter: string;      // Primary chapter e.g. "3"
  endChapter?: string;  // For "Genesis 1-3" → endChapter "3"
  startVerse?: string;  // e.g. "16"
  endVerse?: string;    // e.g. "18"
  display: string;      // Original trimmed reference string
}

/**
 * Resolves a human-readable book name or abbreviation to a YouVersion book code.
 * Returns null if unrecognised.
 */
function resolveBookId(rawBook: string): string | null {
  const normalized = rawBook.trim().toLowerCase().replace(/\s+/g, ' ');
  return BOOK_NAME_MAP[normalized] ?? null;
}

/**
 * Returns the human-readable capitalized full book name for a given YouVersion book code.
 * E.g., 'MAT' -> 'Matthew'
 */
export function getHumanReadableBookName(bookId: string): string {
  // Find the first key in BOOK_NAME_MAP that matches the bookId and is the full name 
  // (usually the longest or the first one defined).
  // The map is structured such that the full name is the first entry for each book.
  const entry = Object.entries(BOOK_NAME_MAP).find(([name, id]) => id === bookId.toUpperCase());
  if (entry) {
    const rawName = entry[0];
    // Capitalize first letters
    return rawName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
  return bookId;
}

/**
 * Parses a human-readable scripture reference into structured parts usable
 * with the existing Bible reader (activeBook + activeChapter).
 *
 * Supported formats:
 *   "Genesis 1"           → chapter only
 *   "Genesis 1-3"         → chapter range (opens first chapter)
 *   "John 3:16"           → chapter + single verse
 *   "John 3:16-18"        → chapter + verse range
 *   "Psalm 23"            → single chapter
 *   "Romans 8:1-11"       → chapter + verse range
 *   "1 Samuel 1"          → numbered book + chapter
 *
 * Returns null if the reference cannot be parsed.
 */
export function parseScriptureReference(reference: string): ParsedScriptureReference | null {
  if (!reference || typeof reference !== 'string') return null;

  const display = reference.trim();

  // Match: optional leading number + book name + chapter + optional verse part
  // Group 1: optional book number prefix e.g. "1 " or "2 " or "3 "
  // Group 2: book name (letters + spaces)
  // Group 3: chapter number
  // Group 4: optional "-endChapter" (chapter range) OR ":startVerse(-endVerse)?" (verse range)
  const pattern =
    /^(\d\s+)?([A-Za-z][A-Za-z\s]*?)\s+(\d+)(?:(?:-(\d+))|(?::(\d+)(?:-(\d+))?))?$/;

  const match = display.match(pattern);
  if (!match) return null;

  const bookPrefix = match[1]?.trim() ?? '';           // "1", "2", "3", or ""
  const bookName = (bookPrefix ? `${bookPrefix} ${match[2].trim()}` : match[2].trim());
  const chapter = match[3];                            // "3"
  const chapterEnd = match[4];                        // "3" for "Genesis 1-3" (chapter range)
  const startVerse = match[5];                        // "16" for "John 3:16"
  const endVerse = match[6];                          // "18" for "John 3:16-18"

  const bookId = resolveBookId(bookName);
  if (!bookId) {
    console.warn(`[scriptureReferenceParser] Unrecognised book: "${bookName}" in "${display}"`);
    return null;
  }

  return {
    bookId,
    chapter,
    ...(chapterEnd !== undefined && { endChapter: chapterEnd }),
    ...(startVerse !== undefined && { startVerse }),
    ...(endVerse !== undefined && { endVerse }),
    display,
  };
}
