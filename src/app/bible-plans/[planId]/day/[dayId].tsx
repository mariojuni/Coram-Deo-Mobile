import BibleReader from '@/components/Bible/BibleReader';
import { BounceCard } from '@/components/ui/BounceCard';
import BooksModal from '@/components/Bible/BooksModal';
import TopNavBar from '@/components/Navigation/TopNavBar';
import type { BibleBook, BiblePreferences, BibleVersion } from '@/features/bible/presentation/hooks/useBibleTopNav';
import { useBibleTopNav } from '@/features/bible/presentation/hooks/useBibleTopNav';
import { useBiblePlanDetail } from '@/features/biblePlan/presentation/hooks/useBiblePlanDetail';
import { useAuthStore } from '@/store/useAuthStore';
import { useBiblePlanStore } from '@/store/useBiblePlanStore';
import { useBibleVersionStore } from '@/store/useBibleVersionStore';
import {
    fetchBibleIndex,
    fetchChapterData,
    getSavedVersions,
    getUserPreferences,
    saveUserPreferences,
} from '@/utils/bibleApi';
import { parseScriptureReference } from '@/utils/scriptureReferenceParser';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** A fully resolved passage ready for the BibleReader. */
export interface ExpandedPassage {
  ref: string;           // Display string e.g. "Genesis 14"
  bookId: string;        // YouVersion code e.g. "GEN"
  chapter: string;       // Chapter number e.g. "14"
  scrollToVerse?: string; // If set, reader scrolls to this verse after load
}

/**
 * Expands a raw day scripture string into individual chapters for the reader.
 *
 * Handles:
 *  "Matthew 1-3"          → [ch1, ch2, ch3]
 *  "Genesis 14:14-18:8"   → [ch14 @v14, ch15, ch16, ch17, ch18]
 *  "Genesis 1-2; Acts 1"  → [GEN1, GEN2, ACT1]
 *  "John 3:16"            → [JHN 3] (verse ref, single chapter)
 *  "Psalm 23"             → [PSA 23]
 */
function expandPassages(raw: string): ExpandedPassage[] {
  const segments = raw.split(';').map((s) => s.trim()).filter(Boolean);
  const result: ExpandedPassage[] = [];

  for (const seg of segments) {
    // ── Cross-chapter verse range: "Genesis 14:14-18:8"
    // Pattern: Book C1:V1-C2:V2
    const crossMatch = seg.match(/^(.+?)\s+(\d+):(\d+)-(\d+):(\d+)$/);
    if (crossMatch) {
      const bookPart = crossMatch[1];
      const startChapter = parseInt(crossMatch[2], 10);
      const startVerse = crossMatch[3];
      const endChapter = parseInt(crossMatch[4], 10);
      const parsed = parseScriptureReference(`${bookPart} ${startChapter}`);
      if (parsed && !isNaN(startChapter) && !isNaN(endChapter) && endChapter >= startChapter) {
        for (let c = startChapter; c <= endChapter; c++) {
          result.push({
            ref: `${bookPart} ${c}`,
            bookId: parsed.bookId,
            chapter: String(c),
            // Only the opening chapter gets scrollToVerse
            ...(c === startChapter ? { scrollToVerse: startVerse } : {}),
          });
        }
        continue;
      }
    }

    // ── Chapter range: "Matthew 1-3" (no colon = pure chapter range)
    const chapterRangeMatch = seg.match(/^(.+?)\s+(\d+)-(\d+)$/);
    if (chapterRangeMatch && !seg.includes(':')) {
      const bookPart = chapterRangeMatch[1];
      const startChapter = parseInt(chapterRangeMatch[2], 10);
      const endChapter = parseInt(chapterRangeMatch[3], 10);
      const parsed = parseScriptureReference(`${bookPart} ${startChapter}`);
      if (parsed && !isNaN(startChapter) && !isNaN(endChapter) && endChapter >= startChapter) {
        for (let c = startChapter; c <= endChapter; c++) {
          result.push({ ref: `${bookPart} ${c}`, bookId: parsed.bookId, chapter: String(c) });
        }
        continue;
      }
    }

    // ── Single reference: "John 3:16", "Psalm 23", "Acts 1" etc.
    const parsed = parseScriptureReference(seg);
    if (parsed) {
      result.push({
        ref: seg,
        bookId: parsed.bookId,
        chapter: parsed.chapter,
        ...(parsed.startVerse ? { scrollToVerse: parsed.startVerse } : {}),
      });
    }
  }

  return result;
}

type BiblePreferencesWithHighlights = BiblePreferences & {
  highlights?: Record<string, Record<string, string>>;
};

const DEFAULT_PREFS: BiblePreferencesWithHighlights = {
  activeBook: '',
  activeChapter: '',
  activeTranslation: '',
  highlights: {},
};

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function BiblePlanDayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { planId, dayId } = useLocalSearchParams<{ planId: string; dayId: string }>();

  const userProfile = useAuthStore((s) => s.userProfile);
  const currentUser = useAuthStore((s) => s.currentUser);
  const markDayCompleted = useBiblePlanStore((s) => s.markDayCompleted);
  const openPlanUpdate = useBiblePlanStore((s) => s.openPlanUpdate);
  const setPlanUpdateStep = useBiblePlanStore((s) => s.setPlanUpdateStep);
  const closePlanUpdate = useBiblePlanStore((s) => s.closePlanUpdate);

  const { plan, days, completedDayIds, userBiblePlan } = useBiblePlanDetail(planId ?? '');

  // ─── Resolve the day + next day
  const day = days.find((d) => d.id === dayId) ?? null;
  const nextDay = day
    ? (days.find((d) => d.dayNumber === day.dayNumber + 1) ?? null)
    : null;
  const isLastDay = !nextDay;
  const passages = day ? expandPassages(day.scriptureReference) : [];
  const totalPassages = passages.length;
  const isDayDone = day ? completedDayIds.has(day.id) : false;

  // ─── Passage index within the day
  const [passageIndex, setPassageIndex] = useState(0);
  const isLastPassage = passageIndex === totalPassages - 1;
  const isFirstPassage = passageIndex === 0;
  const currentPassage = passages[passageIndex] ?? null;
  const currentPassageLabel = currentPassage?.ref ?? '';

  // ─── Bible reader state (mirrors /(tabs)/bible.tsx)
  const [preferences, setPreferences] = useState<BiblePreferencesWithHighlights | null>(null);
  const [savedVersions, setSavedVersions] = useState<BibleVersion[]>([]);
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [isBooksModalOpen, setIsBooksModalOpen] = useState(false);

  // Global translation source of truth — always follows the Bible reader tab
  const globalTranslation = useBibleVersionStore((s) => s.activeTranslation);
  const setGlobalTranslation = useBibleVersionStore((s) => s.setTranslation);

  // Load preferences + versions on focus, but override translation from global store
  useFocusEffect(() => {
    const init = async () => {
      const prefs = (await getUserPreferences()) as BiblePreferencesWithHighlights;
      const versions = (await getSavedVersions()) as BibleVersion[];
      const currentGlobalTranslation = useBibleVersionStore.getState().activeTranslation;
      setSavedVersions(versions);
      // Use global store translation if available, otherwise fall back to stored pref
      const translation = currentGlobalTranslation || prefs?.activeTranslation;
      setPreferences({ ...prefs, activeTranslation: translation });
    };
    init();
  });

  // When global translation changes while screen is active, sync into local preferences
  useEffect(() => {
    if (!globalTranslation || !preferences) return;
    if (String(preferences.activeTranslation) === String(globalTranslation)) return;
    const frame = requestAnimationFrame(() => {
      setPreferences((prev) => prev ? { ...prev, activeTranslation: globalTranslation } : prev);
    });
    return () => cancelAnimationFrame(frame);
  }, [globalTranslation, preferences]);

  // Fetch books when translation changes
  useEffect(() => {
    if (!preferences?.activeTranslation) return;
    const load = async () => {
      const data = (await fetchBibleIndex(preferences.activeTranslation)) as { books?: BibleBook[] } | null;
      setBooks(data?.books ?? []);
    };
    load();
  }, [preferences?.activeTranslation]);

  // Pre-warm session cache for all passages in this day so next/previous are instant
  useEffect(() => {
    if (!preferences?.activeTranslation || passages.length === 0) return;
    const translation = String(preferences.activeTranslation);
    passages.forEach(({ bookId, chapter }) => {
      fetchChapterData(translation, `${bookId}.${chapter}`);
    });
   
  }, [preferences?.activeTranslation, passages.map((p) => p.ref).join(',')]);

  // Jump to the correct passage when passageIndex or passages list changes
  useEffect(() => {
    if (!currentPassage || !preferences) return;
    const updated = {
      ...preferences,
      activeBook: currentPassage.bookId,
      activeChapter: currentPassage.chapter,
    };
    const frame = requestAnimationFrame(() => {
      setPreferences(updated);
    });
    saveUserPreferences(updated);
    return () => cancelAnimationFrame(frame);
   
  }, [passageIndex, passages.map((p) => p.ref).join(','), preferences?.activeTranslation]);

  const handleUpdatePreferences = (updates: Partial<BiblePreferencesWithHighlights>) => {
    setPreferences((prev) => {
      const next = { ...(prev ?? DEFAULT_PREFS), ...updates };
      saveUserPreferences(next);
      // If user switched translation inside the day screen, broadcast to global store
      if (updates.activeTranslation !== undefined) {
        setGlobalTranslation(updates.activeTranslation);
      }
      return next;
    });
  };

  // ─── Mark day completed — navigate to plan immediately, API runs in background
  const handleCompleteAndAdvance = () => {
    const churchId = userProfile?.churchId;
    const userId = currentUser?.uid;
    if (!churchId || !userId || !plan || !day || !userBiblePlan?.id) return;

    // Open the modal state in the store, navigate back to plan screen
    openPlanUpdate(day.dayNumber, plan.durationDays || days.length);
    router.back();

    // Fire API calls — these run after navigation, updating store state the plan screen reads
    if (!isDayDone) {
      markDayCompleted(
        {
          churchId,
          userId,
          memberId: userProfile?.memberId ?? null,
          planId: plan.id,
          dayId: day.id,
          dayNumber: day.dayNumber,
          totalDays: plan.durationDays || days.length,
          userBiblePlanId: userBiblePlan.id,
          currentCompletedCount: userBiblePlan.completedDaysCount ?? 0,
        },
        (step, label) => setPlanUpdateStep(step, label)
      ).catch(() => {
        closePlanUpdate();
        Alert.alert('Error', 'Could not complete this day. Please try again.');
      });
    } else {
      // Day already done — jump straight to complete state
      setPlanUpdateStep(4, 'Updating your plan…');
    }
  };

  const { leftText, rightText } = useBibleTopNav(
    books,
    preferences ?? DEFAULT_PREFS,
    savedVersions
  );

  // Translated book name for the bottom bar — only use leftText once books are loaded,
  // otherwise fall back to the raw passage ref so we never show a YouVersion code
  const activeBook = preferences?.activeBook ?? '';
  const activeChapter = preferences?.activeChapter ?? '';
  const resolvedBookName = books.length > 0
    ? (books.find((b) => b.id === activeBook)?.title ??
       books.find((b) => b.id === activeBook)?.name ??
       currentPassageLabel)
    : currentPassageLabel;
  const bottomPassageLabel = activeChapter
    ? `${resolvedBookName} ${activeChapter}`
    : resolvedBookName;

  if (!preferences || !plan || !day) {
    return (
      <View style={[styles.loader, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#FF6596" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ─── Bible Reader (full screen, takes all space) */}
      <BibleReader
        preferences={preferences}
        updatePreferences={handleUpdatePreferences}
        books={books}
        hideChapterNav
        scrollToVerse={currentPassage?.scrollToVerse}
      />

      {/* ─── Top nav bar (existing — book/chapter + version pill) */}
      <TopNavBar
        leftText={leftText}
        onLeftPress={() => setIsBooksModalOpen(true)}
        rightText={rightText}
        onRightPress={() => router.push('/version-manager' as any)}
      />

      {/* ─── Back button overlaid top-left */}
      <View style={[styles.backBtn, { top: Math.max(insets.top, 24) }]} pointerEvents="box-none">
        <BounceCard bounceScale={0.85}
          style={styles.backCircle}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
        </BounceCard>
      </View>

      {/* ─── Bottom plan context bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.65)', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }]} pointerEvents="none" />
        
        {/* Prev passage */}
        <TouchableOpacity
          style={[styles.navArrow, isFirstPassage && styles.navArrowDisabled]}
          onPress={() => !isFirstPassage && setPassageIndex((i) => i - 1)}
          activeOpacity={isFirstPassage ? 1 : 0.7}
        >
          <ChevronLeft
            size={22}
            color={isFirstPassage ? '#D0D0D0' : '#1a1a1a'}
            strokeWidth={2.5}
          />
        </TouchableOpacity>

        {/* Center label */}
        <View style={styles.bottomCenter}>
          <Text style={styles.bottomPlanName} numberOfLines={1}>
            {plan.title}
          </Text>
          <Text style={styles.bottomDayLabel} numberOfLines={1}>
            Day {day.dayNumber}
            {totalPassages > 1
              ? ` • ${bottomPassageLabel} (${passageIndex + 1}/${totalPassages})`
              : bottomPassageLabel
                ? ` • ${bottomPassageLabel}`
                : ''}
            {rightText ? ` · ${rightText}` : ''}
          </Text>
        </View>

        {/* Right button: next passage | gradient arrow (last passage) | end-of-plan */}
        {!isLastPassage ? (
          // Not last passage — plain gray next arrow
          <TouchableOpacity
            style={styles.navArrow}
            onPress={() => setPassageIndex((i) => i + 1)}
            activeOpacity={0.7}
          >
            <ChevronRight size={22} color="#1a1a1a" strokeWidth={2.5} />
          </TouchableOpacity>
        ) : isLastDay && isDayDone ? (
          // Last passage of last day and already done — green end state
          <View style={[styles.navArrow, styles.navArrowEnd]}>
            <ChevronRight size={22} color="#86EFAC" strokeWidth={2.5} />
          </View>
        ) : (
          // Last passage — gradient arrow: marks day done + goes to next day
          <TouchableOpacity
            style={styles.gradientArrowBtn}
            onPress={handleCompleteAndAdvance}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF6596', '#C084FC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientArrowInner}
            >
              <ChevronRight size={22} color="#fff" strokeWidth={2.5} />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Books Modal */}
      <BooksModal
        isOpen={isBooksModalOpen}
        onClose={() => setIsBooksModalOpen(false)}
        books={books}
        onSelectChapter={(bookId, chapterNum) => {
          handleUpdatePreferences({
            activeBook: String(bookId),
            activeChapter: String(chapterNum),
          });
          setIsBooksModalOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },

  // ─── Back button (absolute, top-left)
  backBtn: {
    position: 'absolute',
    left: 20,
    zIndex: 200,
  },
  backCircle: {
    ...getTopBarButtonShadowStyle(20),
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Bottom plan context bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  navArrow: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowDisabled: {
    backgroundColor: '#F8F8F8',
  },
  bottomCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  bottomPlanName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  bottomDayLabel: {
    fontSize: 12,
    color: '#AAAAAA',
    fontWeight: '500',
    textAlign: 'center',
  },

  navArrowEnd: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  gradientArrowBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
  },
  gradientArrowInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
