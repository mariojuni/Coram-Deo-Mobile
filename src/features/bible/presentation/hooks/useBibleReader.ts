import { bibleDataService } from '@/features/bible/data/BibleDataService';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

const highlightColors = {
  yellow: 'rgba(255, 235, 59, 0.4)',
  pink: 'rgba(255, 101, 150, 0.3)',
  blue: 'rgba(77, 139, 255, 0.3)',
  green: 'rgba(74, 222, 128, 0.3)',
} as const;

type Preferences = {
  activeBook: string;
  activeChapter: string;
  activeTranslation: string | number;
  highlights?: Record<string, Record<string, keyof typeof highlightColors>>;
};

type ChapterData = {
  content: string;
  id: string;
  verseNumber: string;
  notes?: Array<{
    index: number;
    type: string;
    raw: string;
  }>;
};

type Book = {
  chapters?: { id: string | number }[];
  id: string;
};

export function useBibleReader(
  preferences: Preferences,
  books: Book[],
  updatePreferences: (updates: Partial<Preferences>) => void
) {
  const { activeTranslation, activeBook, activeChapter } = preferences;
  const [chapterData, setChapterData] = useState<ChapterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerses, setSelectedVerses] = useState<string[]>([]);

  const passageId = `${activeBook}.${activeChapter}`;
  const chapterHighlights = useMemo(
    () => (preferences.highlights && preferences.highlights[passageId]) || {},
    [passageId, preferences.highlights]
  );
  const chapterDataByVerseNumber = useMemo(
    () => new Map(chapterData.map((verse) => [verse.verseNumber, verse.content])),
    [chapterData]
  );

  useEffect(() => {
    const loadChapter = async () => {
      setLoading(true);
      setSelectedVerses([]);
      try {
        const chapter = await bibleDataService.getChapter(String(activeTranslation), activeBook, parseInt(activeChapter, 10));
        setChapterData(chapter.verses as ChapterData[] || []);
      } catch (e) {
        console.warn('Failed to load chapter', e);
        setChapterData([]);
      }
      setLoading(false);
    };
    loadChapter();
  }, [activeTranslation, activeBook, activeChapter]);

  const toggleVerse = useCallback((verseNumber: string) => {
    setSelectedVerses((previous) =>
      previous.includes(verseNumber)
        ? previous.filter((value) => value !== verseNumber)
        : [...previous, verseNumber]
    );
  }, []);

  const handleCopy = useCallback(async () => {
    if (selectedVerses.length === 0) return;

    const versesText = [...selectedVerses]
      .sort((a, b) => Number(a) - Number(b))
      .map((verseNumber) => chapterDataByVerseNumber.get(verseNumber) || '')
      .join(' ');

    await Clipboard.setStringAsync(versesText);
    setSelectedVerses([]);
    Alert.alert('Copied', 'Verses copied to clipboard!');
  }, [chapterDataByVerseNumber, selectedVerses]);

  const handleHighlight = useCallback(
    (color: keyof typeof highlightColors | 'clear') => {
      const newHighlights = { ...(preferences.highlights || {}) };
      if (!newHighlights[passageId]) {
        newHighlights[passageId] = {};
      }

      selectedVerses.forEach((verseNumber) => {
        if (color === 'clear') {
          delete newHighlights[passageId][verseNumber];
          return;
        }
        newHighlights[passageId][verseNumber] = color;
      });

      updatePreferences({ highlights: newHighlights });
      setSelectedVerses([]);
    },
    [passageId, preferences.highlights, selectedVerses, updatePreferences]
  );

  const handlePrevChapter = useCallback(() => {
    const bookIndex = books.findIndex((book) => book.id === activeBook);
    if (bookIndex === -1) return;
    const currentBook = books[bookIndex];
    const chapterIndex = currentBook.chapters?.findIndex((chapter) => String(chapter.id) === String(activeChapter));

    if (typeof chapterIndex === 'number' && chapterIndex > 0) {
      const prevChapter = currentBook.chapters?.[chapterIndex - 1];
      if (prevChapter) {
        updatePreferences({ activeChapter: String(prevChapter.id) });
      }
      return;
    }

    if (bookIndex > 0) {
      const prevBook = books[bookIndex - 1];
      const lastChapter = prevBook.chapters?.[prevBook.chapters.length - 1];
      if (lastChapter) {
        updatePreferences({ activeBook: prevBook.id, activeChapter: String(lastChapter.id) });
      }
    }
  }, [activeBook, activeChapter, books, updatePreferences]);

  const handleNextChapter = useCallback(() => {
    const bookIndex = books.findIndex((book) => book.id === activeBook);
    if (bookIndex === -1) return;
    const currentBook = books[bookIndex];
    const chapterIndex = currentBook.chapters?.findIndex((chapter) => String(chapter.id) === String(activeChapter));

    if (
      typeof chapterIndex === 'number' &&
      chapterIndex !== -1 &&
      chapterIndex < (currentBook.chapters?.length || 0) - 1
    ) {
      const nextChapter = currentBook.chapters?.[chapterIndex + 1];
      if (nextChapter) {
        updatePreferences({ activeChapter: String(nextChapter.id) });
      }
      return;
    }

    if (bookIndex < books.length - 1) {
      const nextBook = books[bookIndex + 1];
      const firstChapter = nextBook.chapters?.[0];
      if (firstChapter) {
        updatePreferences({ activeBook: nextBook.id, activeChapter: String(firstChapter.id) });
      }
    }
  }, [activeBook, activeChapter, books, updatePreferences]);

  const verseBackgroundColor = useCallback(
    (verseNumber: string) => {
      const colorName = chapterHighlights[verseNumber];
      return colorName ? highlightColors[colorName] : 'transparent';
    },
    [chapterHighlights]
  );

  return useMemo(
    () => ({
      chapterData,
      highlightColors,
      loading,
      passageId,
      selectedVerses,
      verseBackgroundColor,
      handleCopy,
      handleHighlight,
      handleNextChapter,
      handlePrevChapter,
      toggleVerse,
    }),
    [
      chapterData,
      loading,
      passageId,
      selectedVerses,
      verseBackgroundColor,
      handleCopy,
      handleHighlight,
      handleNextChapter,
      handlePrevChapter,
      toggleVerse,
    ]
  );
}
