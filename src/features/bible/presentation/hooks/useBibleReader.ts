import { bibleDataService, BIBLE_DOWNLOAD_COMPLETED_EVENT } from '@/features/bible/data/BibleDataService';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { bibleHighlightRepository } from '@/features/bibleHighlights/data/bibleHighlight.repository';
import { bibleActivityRepository } from '@/features/myJourney/data/myJourney.repository';
import type { BibleHighlight } from '@/features/bibleHighlights/domain/bibleHighlight.types';
import { getHumanReadableBookName, extractChapterNumber } from '@/utils/scriptureReferenceParser';

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
  scrollToVerse?: string;
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

/**
 * Formats an array of verse numbers/strings into a compact sequence representation.
 * Consecutive numbers are grouped into ranges like "3-5".
 * Non-consecutive groups are joined by commas: "3-5, 10, 11-15".
 */
export const formatVerseSequence = (verses: (string | number)[]): string => {
  if (!verses || verses.length === 0) return '';

  const allNums: number[] = [];
  for (const v of verses) {
    const s = String(v).trim();
    if (s.includes('-') || s.includes('–')) {
      const parts = s.split(/[-–]/).map((p) => parseInt(p, 10)).filter((n) => !isNaN(n));
      if (parts.length === 2 && parts[0] <= parts[1]) {
        for (let i = parts[0]; i <= parts[1]; i++) {
          allNums.push(i);
        }
        continue;
      }
    }
    const parsed = parseInt(s, 10);
    if (!isNaN(parsed)) {
      allNums.push(parsed);
    }
  }

  if (allNums.length === 0) {
    return verses.join(', ');
  }

  const sorted = Array.from(new Set(allNums)).sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    if (current === prev + 1) {
      prev = current;
    } else {
      ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = current;
      prev = current;
    }
  }
  ranges.push(start === prev ? `${start}` : `${start}-${prev}`);

  return ranges.join(', ');
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

  // Meaningful Read Tracker
  const readTimerRef = useRef<NodeJS.Timeout | null>(null);
  const markAsRead = useCallback(() => {
    if (!currentUser?.uid || !passageId) return;
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    bibleActivityRepository.logChapterRead(currentUser.uid, passageId, dateStr);
  }, [currentUser?.uid, passageId]);

  useEffect(() => {
    if (readTimerRef.current) {
      clearTimeout(readTimerRef.current);
    }
    
    if (passageId && !loading) {
      readTimerRef.current = setTimeout(() => {
        markAsRead();
      }, 15000); // 15 seconds
    }

    return () => {
      if (readTimerRef.current) {
        clearTimeout(readTimerRef.current);
      }
    };
  }, [passageId, loading, markAsRead]);

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
    const bookTitle =
      getHumanReadableBookName(activeBook) ||
      (activeBookObj as any)?.localTitle ||
      (activeBookObj as any)?.title ||
      activeBook;

    const rangeStr = formatVerseSequence(selectedVerses);
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
    const bookTitle =
      getHumanReadableBookName(activeBook) ||
      (activeBookObj as any)?.localTitle ||
      (activeBookObj as any)?.title ||
      activeBook;

    const rangeStr = formatVerseSequence(selectedVerses);
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
    markAsRead(); // Creating a note counts as a meaningful read
    return scripture;
  }, [activeTranslation, activeBook, activeChapter, books, chapterDataByVerseNumber, selectedVerses]);

  const handleComparePress = useCallback(() => {
    if (selectedVerses.length === 0) return null;

    const sortedNums = [...selectedVerses]
      .map((v) => parseInt(v, 10))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);

    const activeBookObj = books.find(
      (b) => String(b.id) === String(activeBook) || String((b as any).usfm) === String(activeBook)
    );
    const bookTitle =
      getHumanReadableBookName(activeBook) ||
      (activeBookObj as any)?.name ||
      (activeBookObj as any)?.localTitle ||
      (activeBookObj as any)?.title ||
      activeBook;

    const rangeStr = formatVerseSequence(selectedVerses);
    const reference = `${bookTitle} ${activeChapter}:${rangeStr}`;

    const compareTarget = {
      bookId: activeBook,
      bookName: bookTitle,
      chapter: parseInt(activeChapter, 10),
      verseNumbers: sortedNums.length > 0 ? sortedNums.map(String) : selectedVerses,
      verseRangeLabel: rangeStr,
      reference,
    };

    setSelectedVerses([]);
    return compareTarget;
  }, [activeBook, activeChapter, books, selectedVerses]);


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
        
        markAsRead(); // Highlighting counts as a meaningful read
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

  const isSameBook = useCallback((book: Book, targetBookId: string) => {
    const norm = String(targetBookId).trim().toUpperCase();
    return (
      String(book.id).trim().toUpperCase() === norm ||
      String((book as any).usfm || '').trim().toUpperCase() === norm
    );
  }, []);

  const getEffectiveChapters = useCallback(
    (book: Book): { id: string }[] => {
      if (book.chapters && book.chapters.length > 0) {
        return book.chapters.map((c, i) => ({ id: extractChapterNumber(c, i) }));
      }
      const count = Number(book.chapterCount);
      if (!isNaN(count) && count > 0) {
        return Array.from({ length: count }, (_, i) => ({ id: String(i + 1) }));
      }
      return [];
    },
    []
  );

  const handlePrevChapter = useCallback(() => {
    const currentChapterNum = parseInt(String(activeChapter), 10) || 1;
    const bookIndex = books.findIndex((book) => isSameBook(book, activeBook));

    if (bookIndex === -1) {
      if (currentChapterNum > 1) {
        updatePreferences({ activeChapter: String(currentChapterNum - 1), scrollToVerse: undefined });
      }
      return;
    }

    const currentBook = books[bookIndex];
    const chapters = getEffectiveChapters(currentBook);
    const chapterIndex = chapters.findIndex(
      (ch) => String(ch.id) === String(activeChapter) || parseInt(String(ch.id), 10) === currentChapterNum
    );

    if (chapterIndex > 0) {
      updatePreferences({ activeChapter: String(chapters[chapterIndex - 1].id), scrollToVerse: undefined });
      return;
    }

    if (chapterIndex === -1 && currentChapterNum > 1) {
      updatePreferences({ activeChapter: String(currentChapterNum - 1), scrollToVerse: undefined });
      return;
    }

    // Go to previous book's last chapter
    if (bookIndex > 0) {
      const prevBook = books[bookIndex - 1];
      const prevChapters = getEffectiveChapters(prevBook);
      const targetBookId = (prevBook as any).usfm || prevBook.id;
      if (prevChapters.length > 0) {
        updatePreferences({
          activeBook: String(targetBookId),
          activeChapter: String(prevChapters[prevChapters.length - 1].id),
          scrollToVerse: undefined,
        });
      } else {
        const prevCount = Number((prevBook as any).chapterCount) || 1;
        updatePreferences({
          activeBook: String(targetBookId),
          activeChapter: String(prevCount),
          scrollToVerse: undefined,
        });
      }
    }
  }, [activeBook, activeChapter, books, getEffectiveChapters, isSameBook, updatePreferences]);

  const handleNextChapter = useCallback(() => {
    // If the user navigates to the next chapter manually, count the current one as read
    markAsRead();

    const currentChapterNum = parseInt(String(activeChapter), 10) || 1;
    const bookIndex = books.findIndex((book) => isSameBook(book, activeBook));

    if (bookIndex === -1) {
      updatePreferences({ activeChapter: String(currentChapterNum + 1), scrollToVerse: undefined });
      return;
    }

    const currentBook = books[bookIndex];
    const chapters = getEffectiveChapters(currentBook);
    const chapterIndex = chapters.findIndex(
      (ch) => String(ch.id) === String(activeChapter) || parseInt(String(ch.id), 10) === currentChapterNum
    );

    if (chapterIndex !== -1 && chapterIndex < chapters.length - 1) {
      updatePreferences({ activeChapter: String(chapters[chapterIndex + 1].id), scrollToVerse: undefined });
      return;
    }

    const rawCount = Number((currentBook as any).chapterCount) || chapters.length;
    if (chapterIndex === -1 && rawCount > 0 && currentChapterNum < rawCount) {
      updatePreferences({ activeChapter: String(currentChapterNum + 1), scrollToVerse: undefined });
      return;
    }

    // Go to next book's first chapter
    if (bookIndex < books.length - 1) {
      const nextBook = books[bookIndex + 1];
      const nextChapters = getEffectiveChapters(nextBook);
      const targetBookId = (nextBook as any).usfm || nextBook.id;
      const firstChapter = nextChapters.length > 0 ? String(nextChapters[0].id) : '1';
      updatePreferences({
        activeBook: String(targetBookId),
        activeChapter: firstChapter,
        scrollToVerse: undefined,
      });
    }
  }, [activeBook, activeChapter, books, getEffectiveChapters, isSameBook, updatePreferences, markAsRead]);

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
      handleComparePress,
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
      handleComparePress,
      handleHighlight,
      handleNextChapter,
      handlePrevChapter,
      toggleVerse,
      clearSelection,
      chapterHighlights,
    ]
  );
}
