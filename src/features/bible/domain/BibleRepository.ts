export interface BibleLanguage {
  id: string;
  iso6391?: string | null;
  iso6393: string;
  name: string;
  localName: string;
  textDirection: 'ltr' | 'rtl';
  publishedVersionCount?: number;
}

export interface BibleVersionSummary {
  id: string;
  translationId: string;
  abbreviation: string;
  localAbbreviation?: string;
  title: string;
  localTitle?: string;
  languageTag: string;
  publisher?: {
    name?: string;
  };
  capabilities?: {
    text: boolean;
    audio: boolean;
  };
  sizeBytes?: number;
}

export interface BibleVersionDetails extends BibleVersionSummary {
  copyright?: {
    shortText?: string;
    longText?: string;
  };
  bookCount: number;
  chapterCount: number;
  verseCount: number;
  sourceFormat: string;
  status: string;
  contentVersion: number;
}

export interface BibleBook {
  id: string;
  usfm: string;
  name: string;
  longName?: string;
  abbreviation?: string;
  canon: 'ot' | 'nt' | 'dc' | 'other';
  order: number;
  chapterCount: number;
  chapters?: any[]; // Some endpoints may embed chapters
}

export interface BibleVerse {
  id: string;
  verseNumber: string;
  heading?: string;
  content: string;
  notes?: BibleNote[];
}

export interface BibleNote {
  index: number;
  type: 'cross_reference' | 'footnote' | 'translation_note' | 'study_note' | 'unknown';
  raw?: string;
  crossReferences?: BibleCrossReference[];
}

export interface BibleCrossReference {
  raw: string;
  references?: ScriptureReference[];
}

export interface ScriptureReference {
  bookId?: string;
  bookLabel: string;
  chapter?: number;
  verseStart?: number;
  verseEnd?: number;
  raw?: string;
}

export interface BibleChapter {
  versionId: string;
  bookId: string;
  chapterNumber: number;
  verses: BibleVerse[];
}

export interface BibleRepository {
  getLanguages(): Promise<BibleLanguage[]>;
  getVersions(languageTag?: string): Promise<BibleVersionSummary[]>;
  getVersionDetails(versionId: string): Promise<BibleVersionDetails>;
  getBooks(versionId: string): Promise<BibleBook[]>;
  getChapter(versionId: string, bookId: string, chapter: number): Promise<BibleChapter>;
}
