import { useBibleReader } from '@/features/bible/presentation/hooks/useBibleReader';
import { useUIStore } from '@/store/useUIStore';
import { ChevronLeft, ChevronRight, Copy, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef } from 'react';
import { getSoftShadowStyle, getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import { ActivityIndicator, Animated, NativeScrollEvent, NativeSyntheticEvent, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface BibleReaderProps {
  preferences: any;
  updatePreferences: (updates: any) => void;
  books: any[];
  hideChapterNav?: boolean;
  /** If set, after the chapter loads the reader will scroll to this verse number */
  scrollToVerse?: string;
  /** If true, hides/shows the tab bar based on scroll direction */
  controlsTabBar?: boolean;
}

interface Verse {
  id: string;
  verseNumber: string;
  content: string;
}

// Sanitize text to remove problematic Unicode characters and HTML entities
const sanitizeVerseText = (text: string): string => {
  if (!text) return '';
  
  return text
    // Remove zero-width characters and other invisible Unicode
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Remove any remaining HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
};

export default function BibleReader({ preferences, updatePreferences, books, hideChapterNav = false, scrollToVerse, controlsTabBar = false }: BibleReaderProps) {
  const scrollRef = useRef<ScrollView>(null);
  const verseYPositions = useRef<Record<string, number>>({});
  const lastScrollY = useRef(0);
  const setTabBarVisible = useUIStore((s) => s.setTabBarVisible);
  const tabBarVisible = useUIStore((s) => s.tabBarVisible);

  // Animate nav arrows bottom: 110 (tab bar visible) ↔ 20 (tab bar hidden)
  const NAV_BOTTOM_SHOWN = 110;
  const NAV_BOTTOM_HIDDEN = 20;
  const navBottom = useRef(new Animated.Value(NAV_BOTTOM_SHOWN)).current;

  useEffect(() => {
    if (!controlsTabBar) return;
    Animated.timing(navBottom, {
      toValue: tabBarVisible ? NAV_BOTTOM_SHOWN : NAV_BOTTOM_HIDDEN,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [tabBarVisible, controlsTabBar]);
  const {
    chapterData,
    highlightColors,
    loading,
    selectedVerses,
    verseBackgroundColor,
    handleCopy,
    handleHighlight,
    handleNextChapter,
    handlePrevChapter,
    toggleVerse,
  } = useBibleReader(preferences, books, updatePreferences);
  const selectedVerseSet = useMemo(() => new Set(selectedVerses), [selectedVerses]);

  // Reset captured positions when chapter changes
  useEffect(() => {
    verseYPositions.current = {};
  }, [preferences.activeBook, preferences.activeChapter]);

  // Reset tab bar visibility on unmount
  useEffect(() => {
    if (!controlsTabBar) return;
    return () => {
      setTabBarVisible(true);
    };
  }, [controlsTabBar, setTabBarVisible]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!controlsTabBar) return;
    const y = e.nativeEvent.contentOffset.y;
    const delta = y - lastScrollY.current;
    if (Math.abs(delta) > 6) {
      setTabBarVisible(delta < 0 || y < 60);
    }
    lastScrollY.current = y;
  };

  // Scroll to target verse after chapter finishes loading
  useEffect(() => {
    if (loading || !scrollToVerse || chapterData.length === 0) return;
    // Give layout a tick to settle before scrolling
    const timer = setTimeout(() => {
      const y = verseYPositions.current[scrollToVerse];
      if (y !== undefined) {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [loading, scrollToVerse, chapterData]);

  const onNextChapter = () => {
    handleNextChapter();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const onPrevChapter = () => {
    handlePrevChapter();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Always-current refs so the PanResponder (created once) calls the latest handlers
  const onNextChapterRef = useRef(onNextChapter);
  const onPrevChapterRef = useRef(onPrevChapter);
  onNextChapterRef.current = onNextChapter;
  onPrevChapterRef.current = onPrevChapter;

  // ── Swipe gesture ────────────────────────────────────────────────────────
  const SWIPE_THRESHOLD = 80;
  const swipeX = useRef(new Animated.Value(0)).current;
  const swipeLocked = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      // Only claim clearly horizontal swipes
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.8,
      onPanResponderMove: (_, g) => {
        swipeX.setValue(g.dx * 0.25); // rubber-band resistance
      },
      onPanResponderRelease: (_, g) => {
        if (swipeLocked.current) {
          Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
          return;
        }
        if (g.dx < -SWIPE_THRESHOLD) {
          swipeLocked.current = true;
          Animated.timing(swipeX, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
            onNextChapterRef.current();
            setTimeout(() => { swipeLocked.current = false; }, 400);
          });
        } else if (g.dx > SWIPE_THRESHOLD) {
          swipeLocked.current = true;
          Animated.timing(swipeX, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
            onPrevChapterRef.current();
            setTimeout(() => { swipeLocked.current = false; }, 400);
          });
        } else {
          Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6596" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.scrollView, { transform: [{ translateX: swipeX }] }]}
        {...panResponder.panHandlers}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
        {/* Original paragraph-style verse rendering — onLayout captures y per verse */}
        <Text style={styles.chapterContent}>
          {chapterData.map((verse: Verse) => {
            const isSelected = selectedVerseSet.has(verse.verseNumber);
            const highlightColorValue = verseBackgroundColor(verse.verseNumber);
            const sanitizedContent = sanitizeVerseText(verse.content);

            return (
              <Text
                key={verse.id}
                onPress={() => toggleVerse(verse.verseNumber)}
                onLayout={(e) => {
                  verseYPositions.current[verse.verseNumber] = e.nativeEvent.layout.y;
                }}
                style={[
                  styles.verseWrap,
                  { backgroundColor: highlightColorValue },
                  isSelected && styles.verseSelected,
                ]}
              >
                <Text style={styles.verseLabel}> {verse.verseNumber} </Text>
                <Text style={styles.verseText}>{sanitizedContent}</Text>
              </Text>
            );
          })}
        </Text>
        </ScrollView>
      </Animated.View>
      
      {/* Navigation Arrows overlay */}
      {selectedVerses.length === 0 && !hideChapterNav && (
        <Animated.View
          style={[styles.navOverlay, controlsTabBar ? { bottom: navBottom } : undefined]}
          pointerEvents="box-none"
        >
          <TouchableOpacity style={styles.navBtn} onPress={onPrevChapter}>
            <ChevronLeft size={20} color="#FF6596" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.navBtn} onPress={onNextChapter}>
            <ChevronRight size={20} color="#FF6596" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Highlighting Toolbar */}
      {selectedVerses.length > 0 && (
        <View style={styles.actionToolbar}>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
            <Copy size={20} color="#1a1a1a" />
            <Text style={styles.copyText}>Copy</Text>
          </TouchableOpacity>
          
          <View style={styles.colorPicker}>
            <TouchableOpacity style={[styles.colorDot, { backgroundColor: highlightColors.yellow }]} onPress={() => handleHighlight('yellow')} />
            <TouchableOpacity style={[styles.colorDot, { backgroundColor: highlightColors.pink }]} onPress={() => handleHighlight('pink')} />
            <TouchableOpacity style={[styles.colorDot, { backgroundColor: highlightColors.blue }]} onPress={() => handleHighlight('blue')} />
            <TouchableOpacity style={[styles.colorDot, { backgroundColor: highlightColors.green }]} onPress={() => handleHighlight('green')} />
            
            <TouchableOpacity style={styles.clearDot} onPress={() => handleHighlight('clear')}>
               <X size={14} color="#1a1a1a" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({  container: { flex: 1, backgroundColor: '#fafafa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 130,
    paddingBottom: 120,
  },
  chapterContent: {
    fontSize: 18,
    lineHeight: 29,
    fontFamily: 'Inter',
    color: '#1a1a1a',
  },
  verseWrap: {
    // borderRadius on nested Text components causes vertical stretching bugs on iOS
  },
  verseSelected: {
    backgroundColor: 'rgba(255,101,150,0.15)',
    textDecorationLine: 'underline',
    textDecorationStyle: 'dashed',
    textDecorationColor: '#FF6596',
  },
  verseLabel: {
    fontSize: 13,
    lineHeight: 29,
    fontWeight: '600',
    color: '#FF6596',
    fontFamily: 'Inter',
  },
  verseText: {
    fontSize: 18,
    lineHeight: 29,
    fontFamily: 'Inter',
    color: '#1a1a1a',
  },
  navOverlay: {
    position: 'absolute',
    bottom: 110,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  navBtn: {
    ...getSoftShadowStyle(20),
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionToolbar: {
    ...getTopBarButtonShadowStyle(100),
    position: 'absolute',
    bottom: 100, // Above the floating tab bar
    alignSelf: 'center',
    padding: 8,
    paddingHorizontal: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 16,
  },
  copyText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '600'
  },
  colorPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#e1e4e8',
    paddingLeft: 16,
  },
  colorDot: { 
    width: 24, 
    height: 24, 
    borderRadius: 12 
  },
  clearDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e1e4e8',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
