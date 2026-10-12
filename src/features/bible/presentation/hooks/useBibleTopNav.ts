import { useMemo } from 'react';
import { getHumanReadableBookName } from '@/utils/scriptureReferenceParser';

export type BibleBook = {
  id: string;
  name?: string;
  title?: string;
};

export type BibleVersion = {
  abbreviation?: string;
  id: string | number;
  local_abbreviation?: string;
};

export type BiblePreferences = {
  activeBook: string;
  activeChapter: string;
  activeTranslation: string | number;
  fontSize?: number;
};

export function useBibleTopNav(
  books: BibleBook[],
  preferences: BiblePreferences,
  savedVersions: BibleVersion[]
) {
  return useMemo(() => {
    const currentBook = books.find(
      (book) =>
        String(book.id).toUpperCase() === String(preferences.activeBook).toUpperCase() ||
        String((book as any).usfm || '').toUpperCase() === String(preferences.activeBook).toUpperCase()
    );
    const activeVersion = savedVersions.find(
      (version) => String(version.id) === String(preferences.activeTranslation)
    );

    const bookTitle = currentBook?.name || currentBook?.title || getHumanReadableBookName(preferences.activeBook);

    return {
      leftText: `${bookTitle} ${preferences.activeChapter}`,
      rightText: activeVersion?.local_abbreviation || activeVersion?.abbreviation || 'BIBLE',
    };
  }, [books, preferences.activeBook, preferences.activeChapter, preferences.activeTranslation, savedVersions]);
}
