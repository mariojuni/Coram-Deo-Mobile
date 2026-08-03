import {
    useBibleTopNav,
    type BibleBook,
    type BiblePreferences,
    type BibleVersion,
} from '@/features/bible/presentation/hooks/useBibleTopNav';
import { useFocusEffect, useRouter } from 'expo-router';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import BibleReader from '../../components/Bible/BibleReader';
import BooksModal from '../../components/Bible/BooksModal';
import TopNavBar from '../../components/Navigation/TopNavBar';
import { db } from '../../firebase';
import { useAuthStore } from '../../store/useAuthStore';
import { useBibleVersionStore } from '../../store/useBibleVersionStore';
import { useUIStore } from '../../store/useUIStore';
import { fetchBibleIndex, getSavedVersions, getUserPreferences, saveUserPreferences } from '../../utils/bibleApi';

type BiblePreferencesWithHighlights = BiblePreferences & {
  highlights?: Record<string, Record<string, string>>;
};

type BibleIndexResponse = {
  books?: BibleBook[];
};

const DEFAULT_PREFERENCES: BiblePreferencesWithHighlights = {
  activeBook: 'GEN',
  activeChapter: '1',
  activeTranslation: '2692',
  highlights: {},
};

export default function BibleScreen() {
  const userProfile = useAuthStore((state) => state.userProfile);
  const setTranslation = useBibleVersionStore((state) => state.setTranslation);
  const globalTranslation = useBibleVersionStore((state) => state.activeTranslation);
  const setSyncToastMessage = useUIStore((state) => state.setSyncToastMessage);
  const [preferences, setPreferences] = useState<BiblePreferencesWithHighlights | null>(null);
  const [savedVersions, setSavedVersions] = useState<BibleVersion[]>([]);
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [isBooksModalOpen, setIsBooksModalOpen] = useState(false);
  const router = useRouter();

  // Instantly sync active translation from global store
  useEffect(() => {
    if (globalTranslation && preferences && globalTranslation !== preferences.activeTranslation) {
      setPreferences((prev) => (prev ? { ...prev, activeTranslation: globalTranslation as string } : prev));
    }
  }, [globalTranslation]);

  // Load initial preferences and versions
  useFocusEffect(
    React.useCallback(() => {
      const init = async () => {
        const prefs = (await getUserPreferences()) as BiblePreferencesWithHighlights;
        setPreferences((prev) => {
          // If we already have a global translation (which updates instantly), don't let a slow storage read override it
          const currentGlobal = useBibleVersionStore.getState().activeTranslation;
          if (currentGlobal && currentGlobal !== prefs?.activeTranslation) {
            return { ...prefs, activeTranslation: currentGlobal as string };
          }
          return prefs;
        });
        const versions = (await getSavedVersions()) as BibleVersion[];
        setSavedVersions(versions);
      };
      init();
    }, [])
  );

  // Fetch books index when translation changes
  useEffect(() => {
    if (!preferences?.activeTranslation) return;
    const loadBooks = async () => {
      const data = (await fetchBibleIndex(preferences.activeTranslation)) as BibleIndexResponse | null;
      setBooks(data?.books ?? []);
    };
    loadBooks();
  }, [preferences?.activeTranslation]);

  // Sync highlights from Firebase
  useEffect(() => {
    if (!userProfile?.uid) return;
    const fetchUserHighlights = async () => {
      try {
        const docRef = doc(db, 'users', userProfile.uid, 'bible', 'preferences');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().highlights) {
          const remoteHighlights = docSnap.data().highlights as Record<string, Record<string, string>>;
          setPreferences((previous) => ({
            ...(previous || DEFAULT_PREFERENCES),
            highlights: {
              ...((previous && previous.highlights) || {}),
              ...remoteHighlights,
            },
          }));
        }
      } catch (error: any) {
        console.error('Error fetching Bible highlights from Firebase:', error);
        if (error?.message?.includes('offline') || error?.code === 'unavailable') {
          setSyncToastMessage('Device is offline. Cannot fetch latest highlights.', 'error');
          setTimeout(() => setSyncToastMessage('', 'success'), 3000);
        }
      }
    };
    fetchUserHighlights();
  }, [userProfile?.uid]);

  const handleUpdatePreferences = async (updates: Partial<BiblePreferencesWithHighlights>) => {
    setPreferences((previous) => {
      const newPrefs = { ...(previous || DEFAULT_PREFERENCES), ...updates };
      saveUserPreferences(newPrefs);

      // Broadcast translation change to global store so all features stay in sync
      if (updates.activeTranslation !== undefined) {
        setTranslation(updates.activeTranslation);
      }

      // Sync highlights to Firestore
      if (updates.highlights && userProfile?.uid) {
        const docRef = doc(db, 'users', userProfile.uid, 'bible', 'preferences');
        setDoc(docRef, { highlights: updates.highlights }, { merge: true })
          .catch(err => console.error('Error saving Bible highlights to Firebase:', err));
      }
      return newPrefs;
    });
  };

  const safePreferences = preferences || DEFAULT_PREFERENCES;
  const { leftText, rightText } = useBibleTopNav(books, safePreferences, savedVersions);

  if (!preferences) return null;

  return (
    <View style={styles.container}>
      <BibleReader
        preferences={preferences}
        updatePreferences={handleUpdatePreferences}
        books={books}
        controlsTabBar
      />

      <TopNavBar
        leftText={leftText}
        onLeftPress={() => setIsBooksModalOpen(true)}
        rightText={rightText}
        onRightPress={() => router.push('/version-manager')}
      />

      <BooksModal
        isOpen={isBooksModalOpen}
        onClose={() => setIsBooksModalOpen(false)}
        books={books}
        onSelectChapter={(bookId, chapterNum) => {
          handleUpdatePreferences({ activeBook: String(bookId), activeChapter: String(chapterNum) });
          setIsBooksModalOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
});
