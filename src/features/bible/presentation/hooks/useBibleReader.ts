import { bibleDataService, BIBLE_DOWNLOAD_COMPLETED_EVENT } from '@/features/bible/data/BibleDataService';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, DeviceEventEmitter } from 'react-native';

const highlightColors = {
  yellow: 'rgba(254, 240, 138, 0.55)',
  pink: 'rgba(251, 207, 232, 0.60)',
  blue: 'rgba(191, 219, 254, 0.60)',
  green: 'rgba(187, 247, 208, 0.60)',
  orange: 'rgba(254, 215, 170, 0.60)',
  purple: 'rgba(233, 213, 255, 0.60)',
  red: 'rgba(254, 202, 202, 0.60)',
  teal: 'rgba(153, 246, 228, 0.60)',
  indigo: 'rgba(199, 210, 254, 0.60)',
  brown: 'rgba(231, 220, 210, 0.65)',
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
  heading?: string;
  subheading?: string;
  crossReferences?: Array<{
    text: string;
    refs?: { id: string; text: string }[];
  }>;
};

type Book = {
  chapters?: { id: string | number }[];
  chapterCount?: number;
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
    let isMounted = true;
    
    const loadChapter = async (showLoadingSpinner = true) => {
      // Delay showing the loading spinner for 150ms.
      // If the data is already downloaded (SQLite cache), it will load in <20ms
      // and we won't see a flashing loading screen.
      const timer = showLoadingSpinner ? setTimeout(() => {
        if (isMounted) setLoading(true);
      }, 150) : null;

      if (showLoadingSpinner) {
        setSelectedVerses([]);
      }
      try {
        const chapter = await bibleDataService.getChapter(String(activeTranslation), activeBook, parseInt(activeChapter, 10));
        if (isMounted) {
          if (timer) clearTimeout(timer);
          setLoading(false);
          console.log('Chapter loaded, first verse:', JSON.stringify(chapter.verses?.[0]));
          setChapterData(chapter.verses as ChapterData[] || []);
        }
      } catch (e) {
        if (isMounted) {
          if (timer) clearTimeout(timer);
          setLoading(false);
          console.warn('Failed to load chapter', e);
          setChapterData([]);
        }
      }
    };
    
    loadChapter(true);
    
    const subscription = DeviceEventEmitter.addListener(BIBLE_DOWNLOAD_COMPLETED_EVENT, (versionId) => {
      if (String(versionId) === String(activeTranslation)) {
        console.log(`[useBibleReader] Download completed for ${versionId}, seamlessly reloading chapter data...`);
        // reload silently without showing the loading spinner so it's a seamless transition
        loadChapter(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
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

  // Derive an effective chapter list for a book — Firestore books expose only
  // `chapterCount` (no `chapters` array), so we generate it on the fly.
  // This mirrors the same pattern used in BooksModal.
  const getEffectiveChapters = useCallback(
    (book: Book): { id: string }[] => {
      if (book.chapters && book.chapters.length > 0) {
        return book.chapters as { id: string }[];
      }
      const count = book.chapterCount;
      if (count && count > 0) {
        return Array.from({ length: count }, (_, i) => ({ id: String(i + 1) }));
      }
      return [];
    },
    []
  );

  const handlePrevChapter = useCallback(() => {
    const bookIndex = books.findIndex((book) => book.id === activeBook);
    if (bookIndex === -1) return;
    const currentBook = books[bookIndex];
    const chapters = getEffectiveChapters(currentBook);
    const chapterIndex = chapters.findIndex((ch) => String(ch.id) === String(activeChapter));

    if (chapterIndex > 0) {
      updatePreferences({ activeChapter: String(chapters[chapterIndex - 1].id) });
      return;
    }

    // Already at first chapter — go to last chapter of previous book
    if (bookIndex > 0) {
      const prevBook = books[bookIndex - 1];
      const prevChapters = getEffectiveChapters(prevBook);
      if (prevChapters.length > 0) {
        updatePreferences({
          activeBook: prevBook.id,
          activeChapter: String(prevChapters[prevChapters.length - 1].id),
        });
      }
    }
  }, [activeBook, activeChapter, books, getEffectiveChapters, updatePreferences]);

  const handleNextChapter = useCallback(() => {
    const bookIndex = books.findIndex((book) => book.id === activeBook);
    if (bookIndex === -1) return;
    const currentBook = books[bookIndex];
    const chapters = getEffectiveChapters(currentBook);
    const chapterIndex = chapters.findIndex((ch) => String(ch.id) === String(activeChapter));

    if (chapterIndex !== -1 && chapterIndex < chapters.length - 1) {
      updatePreferences({ activeChapter: String(chapters[chapterIndex + 1].id) });
      return;
    }

    // Already at last chapter — go to first chapter of next book
    if (bookIndex < books.length - 1) {
      const nextBook = books[bookIndex + 1];
      const nextChapters = getEffectiveChapters(nextBook);
      if (nextChapters.length > 0) {
        updatePreferences({
          activeBook: nextBook.id,
          activeChapter: String(nextChapters[0].id),
        });
      }
    }
  }, [activeBook, activeChapter, books, getEffectiveChapters, updatePreferences]);

  const verseBackgroundColor = useCallback(
    (verseNumber: string) => {
      const colorName = chapterHighlights[verseNumber];
      return colorName ? highlightColors[colorName] : 'transparent';
    },
    [chapterHighlights]
  );

  const clearSelection = useCallback(() => {
    setSelectedVerses([]);
  }, []);

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
      clearSelection,
      chapterHighlights,
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
      clearSelection,
      chapterHighlights,
    ]
  );
}
