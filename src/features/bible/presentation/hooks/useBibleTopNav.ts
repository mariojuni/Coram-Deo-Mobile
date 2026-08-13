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
};

export function useBibleTopNav(
  books: BibleBook[],
  preferences: BiblePreferences,
  savedVersions: BibleVersion[]
) {
  return useMemo(() => {
    const currentBook = books.find((book) => book.id === preferences.activeBook);
    const activeVersion = savedVersions.find(
      (version) => String(version.id) === String(preferences.activeTranslation)
    );

    return {
      leftText: `${getHumanReadableBookName(preferences.activeBook)} ${preferences.activeChapter}`,
      rightText: activeVersion?.local_abbreviation || activeVersion?.abbreviation || 'BIBLE',
    };
  }, [books, preferences.activeBook, preferences.activeChapter, preferences.activeTranslation, savedVersions]);
}
