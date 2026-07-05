import { useFocusEffect, useRouter } from 'expo-router';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  type BibleBook,
  type BiblePreferences,
  useBibleTopNav,
  type BibleVersion,
} from '@/features/bible/presentation/hooks/useBibleTopNav';
import { db } from '../../firebase';
import { useAuthStore } from '../../store/useAuthStore';
import { useBibleVersionStore } from '../../store/useBibleVersionStore';
import { fetchBibleIndex, getSavedVersions, getUserPreferences, saveUserPreferences } from '../../utils/bibleApi';
import BibleReader from '../../components/Bible/BibleReader';
import BooksModal from '../../components/Bible/BooksModal';
import TopNavBar from '../../components/Navigation/TopNavBar';

type BiblePreferencesWithHighlights = BiblePreferences & {
  highlights?: Record<string, Record<string, string>>;
};

type BibleIndexResponse = {
  books?: BibleBook[];
};

const DEFAULT_PREFERENCES: BiblePreferencesWithHighlights = {
  activeBook: '',
  activeChapter: '',
  activeTranslation: '',
  highlights: {},
};

export default function BibleScreen() {
  const userProfile = useAuthStore((state) => state.userProfile);
  const setTranslation = useBibleVersionStore((state) => state.setTranslation);
  const [preferences, setPreferences] = useState<BiblePreferencesWithHighlights | null>(null);
  const [savedVersions, setSavedVersions] = useState<BibleVersion[]>([]);
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [isBooksModalOpen, setIsBooksModalOpen] = useState(false);
  const router = useRouter();

  // Load initial preferences and versions
  useFocusEffect(
    React.useCallback(() => {
      const init = async () => {
        const prefs = (await getUserPreferences()) as BiblePreferencesWithHighlights;
        setPreferences(prefs);
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
      } catch (error) {
        console.error('Error fetching Bible highlights from Firebase:', error);
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
