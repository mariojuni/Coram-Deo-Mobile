import {
    useBibleTopNav,
    type BibleBook,
    type BiblePreferences,
    type BibleVersion,
} from '@/features/bible/presentation/hooks/useBibleTopNav';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Animated, ActivityIndicator, StyleSheet, View, Dimensions, DeviceEventEmitter } from 'react-native';
import BibleReader from '../../components/Bible/BibleReader';
import BooksModal from '../../components/Bible/BooksModal';
import TopNavBar from '../../components/Navigation/TopNavBar';
import { getActiveDb } from '../../firebase';
import { useAuthStore } from '../../store/useAuthStore';
import { useBibleVersionStore } from '../../store/useBibleVersionStore';
import { useUIStore } from '../../store/useUIStore';
import { getSavedVersions, getUserPreferences, saveUserPreferences } from '../../utils/bibleApi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { bibleDataService, BIBLE_DOWNLOAD_COMPLETED_EVENT } from '@/features/bible/data/BibleDataService';
import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';
import OfflineBanner from '@/components/Navigation/OfflineBanner';

type BiblePreferencesWithHighlights = BiblePreferences;

type BibleIndexResponse = {
  books?: BibleBook[];
};

const DEFAULT_PREFERENCES: BiblePreferencesWithHighlights = {
  activeBook: 'GEN',
  activeChapter: '1',
  activeTranslation: '2692',
  fontSize: 18,
};

let cachedPreferences: BiblePreferencesWithHighlights | null = null;
let cachedSavedVersions: BibleVersion[] = [];
let cachedBooks: BibleBook[] = [];

export default function BibleScreen() {
  const params = useLocalSearchParams<{
    book?: string;
    chapter?: string;
    verse?: string;
    scrollToVerse?: string;
    t?: string;
  }>();

  const userProfile = useAuthStore((state) => state.userProfile);
  const setTranslation = useBibleVersionStore((state) => state.setTranslation);
  const globalTranslation = useBibleVersionStore((state) => state.activeTranslation);
  const secondaryTranslation = useBibleVersionStore((state) => state.secondaryTranslation);
  const setSecondaryTranslation = useBibleVersionStore((state) => state.setSecondaryTranslation);
  const setSyncToastMessage = useUIStore((state) => state.setSyncToastMessage);
  const [preferences, setPreferences] = useState<BiblePreferencesWithHighlights | null>(cachedPreferences);
  const [savedVersions, setSavedVersions] = useState<BibleVersion[]>(cachedSavedVersions);
  const [books, setBooks] = useState<BibleBook[]>(cachedBooks);
  const [isBooksModalOpen, setIsBooksModalOpen] = useState(false);
  const [isFontModalOpen, setIsFontModalOpen] = useState(false);
  
  const { isLandscape, isTablet, width: screenWidth } = useResponsiveLayout();
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [activeScrollVerse, setActiveScrollVerse] = useState<string | undefined>(undefined);
  const lastProcessedNavRef = useRef<string | null>(null);

  const canSplit = isLandscape || (isTablet && screenWidth >= 720);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;

  // Handle incoming route params (e.g. from Verse of the Day or deep links)
  useEffect(() => {
    const navKey = params.t || (params.book && params.chapter ? `${params.book}.${params.chapter}.${params.verse || params.scrollToVerse || ''}` : null);
    if (!navKey || navKey === lastProcessedNavRef.current) return;
    lastProcessedNavRef.current = navKey;

    const requestedBook = params.book;
    const requestedChapter = params.chapter;
    const requestedVerse = params.verse || params.scrollToVerse;

    if (requestedBook && requestedChapter) {
      setPreferences((prev) => {
        const base = prev || cachedPreferences || DEFAULT_PREFERENCES;
        const updated = {
          ...base,
          activeBook: String(requestedBook),
          activeChapter: String(requestedChapter),
          fontSize: base.fontSize || 18,
        };
        cachedPreferences = updated;
        saveUserPreferences(updated);
        return updated;
      });
    }

    if (requestedVerse) {
      setActiveScrollVerse(String(requestedVerse));
    }
  }, [params.book, params.chapter, params.verse, params.scrollToVerse, params.t]);

  // Instantly sync active translation from global store
  useEffect(() => {
    if (globalTranslation && preferences && globalTranslation !== preferences.activeTranslation) {
      setPreferences((prev) => {
        if (!prev) return prev;
        const newPrefs = { ...prev, activeTranslation: globalTranslation as string };
        cachedPreferences = newPrefs;
        return newPrefs;
      });
    }
  }, [globalTranslation]);

  // Load initial preferences and versions
  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const prefs = (await getUserPreferences()) as BiblePreferencesWithHighlights;
        setPreferences((prev) => {
          // If we already have a global translation (which updates instantly), don't let a slow storage read override it
          const currentGlobal = useBibleVersionStore.getState().activeTranslation;
          let newPrefs = {
            ...(prev || DEFAULT_PREFERENCES),
            ...prefs,
            fontSize: prev?.fontSize || prefs?.fontSize || 18,
          };
          if (currentGlobal && currentGlobal !== newPrefs.activeTranslation) {
            newPrefs = { ...newPrefs, activeTranslation: currentGlobal as string };
          }
          cachedPreferences = newPrefs;
          return newPrefs;
        });
        const versions = (await getSavedVersions()) as BibleVersion[];
        cachedSavedVersions = versions;
        setSavedVersions(versions);
      };
      init();
    }, [])
  );

  // Fetch books index when translation changes or download completes
  useEffect(() => {
    if (!preferences?.activeTranslation) return;
    const loadBooks = async () => {
      const data = await bibleDataService.getBooks(String(preferences.activeTranslation));
      const newBooks = data || [];
      cachedBooks = newBooks;
      setBooks(newBooks);
    };
    loadBooks();

    const sub = DeviceEventEmitter.addListener(BIBLE_DOWNLOAD_COMPLETED_EVENT, (completedVersionId) => {
      if (String(completedVersionId) === String(preferences.activeTranslation)) {
        loadBooks();
      }
    });

    return () => {
      sub.remove();
    };
  }, [preferences?.activeTranslation]);

  const setTabBarVisible = useUIStore((state) => state.setTabBarVisible);

  useEffect(() => {
    if (isLandscape) {
      setTabBarVisible(false);
    } else {
      setTabBarVisible(true);
    }
  }, [isLandscape, setTabBarVisible]);

  // Sync highlights from Firebase is removed, now handled inside BibleReader using bibleVerseHighlights collection

  const handleUpdatePreferences = async (updates: Partial<BiblePreferencesWithHighlights>) => {
    setPreferences((previous) => {
      const newPrefs = { ...(previous || DEFAULT_PREFERENCES), ...updates };
      
      // Ensure transient navigation fields never stay in preferences
      if ('scrollToVerse' in newPrefs) {
        delete (newPrefs as any).scrollToVerse;
      }
      
      saveUserPreferences(newPrefs);
      cachedPreferences = newPrefs;

      // Broadcast translation change to global store so all features stay in sync
      if (updates.activeTranslation !== undefined) {
        setTranslation(updates.activeTranslation);
      }

      return newPrefs;
    });
  };

  const handleScrolledToVerse = useCallback(() => {
    setActiveScrollVerse(undefined);
    router.setParams({ verse: undefined, scrollToVerse: undefined, t: undefined });
  }, [router]);

  const safePreferences = preferences || DEFAULT_PREFERENCES;
  const { leftText, rightText } = useBibleTopNav(books, safePreferences, savedVersions);

  if (!preferences) {
    return (
      <View style={[styles.container, { paddingHorizontal: 24, paddingTop: 130 }]}>
        <ShimmerSkeleton width="55%" height={22} borderRadius={6} style={{ marginBottom: 16 }} />
        
        <ShimmerSkeleton width="100%" height={18} borderRadius={4} style={{ marginBottom: 12 }} />
        <ShimmerSkeleton width="96%" height={18} borderRadius={4} style={{ marginBottom: 12 }} />
        <ShimmerSkeleton width="90%" height={18} borderRadius={4} style={{ marginBottom: 12 }} />
        <ShimmerSkeleton width="98%" height={18} borderRadius={4} style={{ marginBottom: 12 }} />
        <ShimmerSkeleton width="85%" height={18} borderRadius={4} style={{ marginBottom: 24 }} />
        
        <ShimmerSkeleton width="45%" height={22} borderRadius={6} style={{ marginBottom: 16 }} />

        <ShimmerSkeleton width="100%" height={18} borderRadius={4} style={{ marginBottom: 12 }} />
        <ShimmerSkeleton width="92%" height={18} borderRadius={4} style={{ marginBottom: 12 }} />
        <ShimmerSkeleton width="97%" height={18} borderRadius={4} style={{ marginBottom: 12 }} />
        <ShimmerSkeleton width="75%" height={18} borderRadius={4} style={{ marginBottom: 12 }} />
      </View>
    );
  }

  // Find the label for the secondary version
  const effectiveSecondaryTranslation = secondaryTranslation || safePreferences.activeTranslation;
  const secondaryVersionObj = savedVersions.find((v) => String(v.id) === String(effectiveSecondaryTranslation));
  const secondaryRightText = secondaryVersionObj ? secondaryVersionObj.abbreviation : 'SELECT';

  return (
    <View style={styles.container}>
      <BibleReader
        preferences={preferences}
        updatePreferences={handleUpdatePreferences}
        books={books}
        scrollToVerse={activeScrollVerse}
        onScrolledToVerse={handleScrolledToVerse}
        controlsTabBar={!canSplit} // don't toggle tab bar in split mode or wide view
        scrollY={scrollY}
        isLandscape={isLandscape}
        isSplitMode={isSplitMode && canSplit}
        secondaryTranslation={effectiveSecondaryTranslation}
        isFontModalOpen={isFontModalOpen}
        onCloseFontModal={() => setIsFontModalOpen(false)}
      />

      <TopNavBar
        leftText={leftText}
        onLeftPress={() => setIsBooksModalOpen(true)}
        rightText={rightText}
        onRightPress={() => router.push('/version-manager')}
        scrollY={scrollY}
        showSplitIcon={canSplit}
        showFontIcon={true}
        onFontPress={() => setIsFontModalOpen(!isFontModalOpen)}
        isSplitMode={isSplitMode && canSplit}
        onSplitPress={() => setIsSplitMode(!isSplitMode)}
        secondaryRightText={secondaryRightText}
        onSecondaryRightPress={() => {
          // Open a modal to select secondary translation. For now we can reuse VersionManager but it only sets primary.
          // Wait, VersionManager is a screen that sets the global activeTranslation. We might need a way to set secondary.
          // I will just push to a new parameter for secondary.
          router.push({ pathname: '/version-manager', params: { isSecondary: 'true' } });
        }}
      />

      <OfflineBanner 
        style={[
          styles.offlineBanner, 
          { top: insets.top + (isLandscape ? 44 : 58) }
        ]} 
      />

      <BooksModal
        isOpen={isBooksModalOpen}
        onClose={() => setIsBooksModalOpen(false)}
        books={books}
        activeBookId={safePreferences.activeBook}
        onSelectChapter={(bookId, chapterNum) => {
          setActiveScrollVerse(undefined);
          handleUpdatePreferences({ activeBook: String(bookId), activeChapter: String(chapterNum) });
          setIsBooksModalOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  offlineBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 95,
  },
});
