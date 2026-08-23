import { bibleDataService, BIBLE_DOWNLOAD_COMPLETED_EVENT } from '@/features/bible/data/BibleDataService';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { bibleHighlightRepository } from '@/features/bibleHighlights/data/bibleHighlight.repository';
import type { BibleHighlight } from '@/features/bibleHighlights/domain/bibleHighlight.types';

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
  updatePreferences: (updates: Partial<Preferences>) => void,
  options?: { skipFetch?: boolean }
) {
  const { activeTranslation, activeBook, activeChapter } = preferences;
  const [chapterData, setChapterData] = useState<ChapterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerses, setSelectedVerses] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<BibleHighlight[]>([]);

  const userProfile = useAuthStore((s) => s.userProfile);
  const currentUser = useAuthStore((s) => s.currentUser);
  
  const passageId = `${activeBook}.${activeChapter}`;

  const chapterHighlights = useMemo(() => {
    const map: Record<string, { color: string; id: string }> = {};
    for (const h of highlights) {
      for (const vNum of h.verseNumbers) {
        map[String(vNum)] = { color: h.color, id: h.id };
      }
    }
    return map;
  }, [highlights]);

  const chapterDataByVerseNumber = useMemo(
    () => new Map(chapterData.map((verse) => [verse.verseNumber, verse.content])),
    [chapterData]
  );

  useEffect(() => {
    let isMounted = true;
    
    const loadChapter = async (showLoadingSpinner = true) => {
      if (options?.skipFetch) {
        if (isMounted) setLoading(false);
        return;
      }

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
        loadChapter(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [activeTranslation, activeBook, activeChapter, options?.skipFetch]);

  // Subscribe to user highlights for the passage
  useEffect(() => {
    if (!currentUser?.uid || !passageId) return;
    
    const unsubscribe = bibleHighlightRepository.subscribeUserHighlightsForPassage(
      currentUser.uid,
      passageId,
      (newHighlights) => {
        setHighlights(newHighlights);
      }
    );
    return () => unsubscribe();
  }, [currentUser?.uid, passageId]);

  const toggleVerse = useCallback((verseNumber: string) => {
    setSelectedVerses((previous) =>
      previous.includes(verseNumber)
        ? previous.filter((value) => value !== verseNumber)
        : [...previous, verseNumber]
    );
  }, []);

  const handleCopy = useCallback(async () => {
    if (selectedVerses.length === 0) return;

    const cleanVerseText = (text: string) => {
      if (!text) return '';
      return text
        .replace(/\{\{note:\d+\}\}/g, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/<[^>]*>/g, '')
        .replace(/#/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
    };

    const sortedNums = [...selectedVerses]
      .map(Number)
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);

    const lines = sortedNums
      .map((vNum) => {
        const raw = chapterDataByVerseNumber.get(String(vNum)) || '';
        const clean = cleanVerseText(raw);
        return `${vNum} ${clean}`;
      })
      .filter((line) => line.trim().length > 0);

    const activeBookObj = books.find((b) => String(b.id) === String(activeBook));
    const bookTitle = (activeBookObj as any)?.localTitle || (activeBookObj as any)?.title || activeBook;

    let rangeStr = '';
    if (sortedNums.length === 1) {
      rangeStr = `${sortedNums[0]}`;
    } else if (sortedNums.length > 1) {
      let isConsecutive = true;
      for (let i = 1; i < sortedNums.length; i++) {
        if (sortedNums[i] !== sortedNums[i - 1] + 1) {
          isConsecutive = false;
          break;
        }
      }
      if (isConsecutive) {
        rangeStr = `${sortedNums[0]}-${sortedNums[sortedNums.length - 1]}`;
      } else {
        rangeStr = sortedNums.join(', ');
      }
    }

    const reference = `- ${bookTitle} ${activeChapter}:${rangeStr}`;
    const formattedCopyText = `${lines.join('\n')}\n\n${reference}`;

    setSelectedVerses([]);
    await Clipboard.setStringAsync(formattedCopyText);
  }, [activeBook, activeChapter, books, chapterDataByVerseNumber, selectedVerses]);

  const handleNotePress = useCallback(() => {
    if (selectedVerses.length === 0) return null;

    const cleanVerseText = (text: string) => {
      if (!text) return '';
      return text
        .replace(/\{\{note:\d+\}\}/g, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/<[^>]*>/g, '')
        .replace(/#/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
    };

    const sortedNums = [...selectedVerses]
      .map(Number)
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);

    const activeBookObj = books.find((b) => String(b.id) === String(activeBook));
    const bookTitle = (activeBookObj as any)?.localTitle || (activeBookObj as any)?.title || activeBook;

    let rangeStr = '';
    if (sortedNums.length === 1) {
      rangeStr = `${sortedNums[0]}`;
    } else if (sortedNums.length > 1) {
      let isConsecutive = true;
      for (let i = 1; i < sortedNums.length; i++) {
        if (sortedNums[i] !== sortedNums[i - 1] + 1) {
          isConsecutive = false;
          break;
        }
      }
      if (isConsecutive) {
        rangeStr = `${sortedNums[0]}–${sortedNums[sortedNums.length - 1]}`;
      } else {
        rangeStr = sortedNums.join(', ');
      }
    }

    const reference = `${bookTitle} ${activeChapter}:${rangeStr}`;
    
    const lines = sortedNums
      .map((vNum) => {
        const raw = chapterDataByVerseNumber.get(String(vNum)) || '';
        const clean = cleanVerseText(raw);
        return `${vNum} ${clean}`;
      })
      .filter((line) => line.trim().length > 0);

    const textSnapshot = lines.join('\n');

    const scripture = {
      versionId: String(activeTranslation),
      bookId: activeBook,
      bookName: bookTitle,
      chapter: parseInt(activeChapter, 10),
      verseStart: sortedNums[0],
      verseEnd: sortedNums[sortedNums.length - 1],
      verseIds: sortedNums.map(String),
      reference,
      textSnapshot,
    };

    setSelectedVerses([]);
    return scripture;
  }, [activeTranslation, activeBook, activeChapter, books, chapterDataByVerseNumber, selectedVerses]);

  const handleHighlight = useCallback(
    (color: keyof typeof highlightColors | 'clear') => {
      if (!currentUser?.uid) return;
      const effectiveChurchId = userProfile?.churchId || (userProfile as any)?.church_id || (currentUser as any)?.churchId || (currentUser as any)?.claims?.churchId;
      
      const sortedNums = [...selectedVerses]
        .map(Number)
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);
        
      if (sortedNums.length === 0) return;

      if (color === 'clear') {
        // Delete any highlights containing these verses
        const toDelete = highlights.filter(h => h.verseNumbers.some(v => sortedNums.includes(v)));
        toDelete.forEach(h => {
          bibleHighlightRepository.deleteHighlight(h.id).catch(e => console.warn('Failed to delete highlight:', e));
        });
      } else {
        const activeBookObj = books.find((b) => String(b.id) === String(activeBook));
        const bookTitle = (activeBookObj as any)?.localTitle || (activeBookObj as any)?.title || activeBook;
        const parsedChapter = parseInt(activeChapter, 10) || 1;
        const startNum = sortedNums[0];

        const ranges: string[] = [];
        let rangeStart = sortedNums[0];
        let prev = sortedNums[0];

        for (let i = 1; i < sortedNums.length; i++) {
          const curr = sortedNums[i];
          if (curr === prev + 1) {
            prev = curr;
          } else {
            ranges.push(rangeStart === prev ? `${rangeStart}` : `${rangeStart}-${prev}`);
            rangeStart = curr;
            prev = curr;
          }
        }
        ranges.push(rangeStart === prev ? `${rangeStart}` : `${rangeStart}-${prev}`);
        const rangeLabel = ranges.join(',');

        const combinedTexts: string[] = [];
        for (const vNum of sortedNums) {
          const raw = chapterDataByVerseNumber.get(String(vNum)) || '';
          if (raw) {
            const clean = raw.replace(/\{\{note:\d+\}\}/g, '').replace(/<[^>]*>/g, '').trim();
            combinedTexts.push(clean);
          }
        }

        const userName = userProfile?.firstName
          ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim()
          : currentUser?.displayName || 'Member';

        bibleHighlightRepository.createHighlight({
          userId: currentUser.uid,
          churchId: effectiveChurchId,
          userName,
          userPhotoUrl: userProfile?.photoUrl || currentUser.photoURL || undefined,
          passageId,
          bookName: bookTitle,
          chapter: parsedChapter,
          verseNumber: startNum,
          verseRangeLabel: rangeLabel,
          verseNumbers: sortedNums,
          color: String(color),
          text: combinedTexts.join(' '),
          visibility: effectiveChurchId ? 'church' : 'private',
          status: 'active'
        }).catch((err) => console.warn('[useBibleReader] Failed to publish highlight:', err));
      }

      setSelectedVerses([]);
    },
    [
      activeBook,
      activeChapter,
      books,
      chapterDataByVerseNumber,
      currentUser,
      passageId,
      selectedVerses,
      userProfile,
      highlights,
    ]
  );

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
      const highlight = chapterHighlights[verseNumber];
      return highlight && highlight.color && highlightColors[highlight.color as keyof typeof highlightColors]
        ? highlightColors[highlight.color as keyof typeof highlightColors]
        : 'transparent';
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
      handleNotePress,
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
      handleNotePress,
      handleHighlight,
      handleNextChapter,
      handlePrevChapter,
      toggleVerse,
      clearSelection,
      chapterHighlights,
    ]
  );
}
