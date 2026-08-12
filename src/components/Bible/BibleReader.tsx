import { useBibleReader } from '@/features/bible/presentation/hooks/useBibleReader';
import { useUIStore } from '@/store/useUIStore';
import { ChevronLeft, ChevronRight, Copy, X, MessageSquareText, Info } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getSoftShadowStyle, getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import { ActivityIndicator, Animated, Dimensions, NativeScrollEvent, NativeSyntheticEvent, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppModal, { ModalDragArea } from '@/components/ui/AppModal';
import { BounceCard } from '@/components/ui/BounceCard';
import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';

interface BibleReaderProps {
  preferences: any;
  updatePreferences: (updates: any) => void;
  books: any[];
  hideChapterNav?: boolean;
  /** If set, after the chapter loads the reader will scroll to this verse number */
  scrollToVerse?: string;
  /** If true, hides/shows the tab bar based on scroll direction */
  controlsTabBar?: boolean;
  /** Optional animated value for scroll position */
  scrollY?: Animated.Value;
}

interface VerseCrossReference {
  text: string;
  refs?: {
    id: string;
    text: string;
  }[];
}

interface Verse {
  id: string;
  verseNumber: string;
  heading?: string;
  subheading?: string;
  content: string;
  crossReferences?: VerseCrossReference[];
  notes?: any[];
}

// Sanitize text to remove problematic Unicode characters and HTML entities
const sanitizeVerseText = (text: any): string => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    // Remove zero-width characters and other invisible Unicode
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Remove any remaining HTML tags
    .replace(/<[^>]*>/g, '')
    // Strip # section/paragraph markers from source data.
    // # never appears as legitimate Bible text, so remove ALL occurrences
    .replace(/#/g, '')
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

// Convert a verse number string to Unicode superscript characters
// e.g. "12" → "¹²" — these render above the baseline naturally in any font
const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
};
const toSuperscript = (num: string) =>
  num.split('').map(d => SUPERSCRIPT_MAP[d] ?? d).join('');

export default function BibleReader({ preferences, updatePreferences, books, hideChapterNav = false, scrollToVerse, controlsTabBar = false, scrollY }: BibleReaderProps) {
  const scrollRef = useRef<ScrollView>(null);
  const contentHeightRef = useRef<number>(0);
  const lastScrollY = useRef(0);
  const setTabBarVisible = useUIStore((s) => s.setTabBarVisible);
  const tabBarVisible = useUIStore((s) => s.tabBarVisible);
  const insets = useSafeAreaInsets();
  
  const [activeVerse, setActiveVerse] = useState<Verse | null>(null);
  const { activeBook, activeChapter } = preferences;
  const activeBookObj = books.find(b => b.id === activeBook);

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
    clearSelection,
    chapterHighlights,
  } = useBibleReader(preferences, books, updatePreferences);
  const selectedVerseSet = useMemo(() => new Set(selectedVerses), [selectedVerses]);

  const activeColors = useMemo(() => {
    const colors = new Set<string>();
    if (selectedVerses.length === 0) return colors;
    selectedVerses.forEach(v => {
      const color = chapterHighlights[v];
      if (color) {
        colors.add(color);
      }
    });
    return colors;
  }, [selectedVerses, chapterHighlights]);

  // Reset tab bar visibility on unmount
  useEffect(() => {
    if (!controlsTabBar) return;
    return () => {
      setTabBarVisible(true);
    };
  }, [controlsTabBar, setTabBarVisible]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY || new Animated.Value(0) } } }],
    {
      useNativeDriver: false,
      listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (!controlsTabBar) return;
        if (selectedVerses.length > 0) return; // Keep tab bar hidden if highlight modal is open
        const y = e.nativeEvent.contentOffset.y;
        const delta = y - lastScrollY.current;
        if (Math.abs(delta) > 6) {
          setTabBarVisible(delta < 0 || y < 60);
        }
        lastScrollY.current = y;
      },
    }
  );

  // Scroll to target verse after chapter finishes loading based on character ratio & container height
  useEffect(() => {
    if (loading || !scrollToVerse || chapterData.length === 0) return;
    const timer = setTimeout(() => {
      const targetVerseNum = parseInt(scrollToVerse, 10);
      if (isNaN(targetVerseNum)) return;

      let charCountBefore = 0;
      let totalCharCount = 0;

      chapterData.forEach((v: Verse) => {
        const vNum = parseInt(v.verseNumber, 10);
        const len = (v.content || '').length + (v.verseNumber || '').length + 2;
        if (!isNaN(vNum) && vNum < targetVerseNum) {
          charCountBefore += len;
        }
        totalCharCount += len;
      });

      if (totalCharCount > 0 && contentHeightRef.current > 0) {
        const ratio = charCountBefore / totalCharCount;
        const targetY = ratio * contentHeightRef.current;
        scrollRef.current?.scrollTo({ y: Math.max(0, targetY - 60), animated: true });
      }
    }, 150);
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

  // ── Highlight menu swipe-to-dismiss ──────────────────────────────────────
  const highlightTranslateY = useRef(new Animated.Value(200)).current;
  const lastSelectedVersesCount = useRef(0);
  const windowHeight = Dimensions.get('window').height;
  const highlightModalHeight = windowHeight * 0.15;

  useEffect(() => {
    if (selectedVerses.length > 0) {
      if (lastSelectedVersesCount.current === 0) {
        Animated.spring(highlightTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
        }).start();
      }
      setTabBarVisible(false);
    } else {
      highlightTranslateY.setValue(200);
      setTabBarVisible(true);
    }
    lastSelectedVersesCount.current = selectedVerses.length;
  }, [selectedVerses.length, highlightTranslateY, setTabBarVisible]);

  const highlightPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) {
          highlightTranslateY.setValue(g.dy);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 50 || g.vy > 0.5) {
          Animated.timing(highlightTranslateY, {
            toValue: 200,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            clearSelection();
          });
        } else {
          Animated.spring(highlightTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(highlightTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
        }).start();
      },
    })
  ).current;

  const renderVerseTextWithLetters = (text: string | undefined, crossReferences: VerseCrossReference[] | undefined) => {
    if (!text) return null;
    const parts = sanitizeVerseText(text).split(/(\{\{note:\d+\}\})/g);
    return parts.map((part, index) => {
      const match = part.match(/\{\{note:(\d+)\}\}/);
      if (match) {
        const noteIndex = parseInt(match[1], 10);
        const letter = String.fromCharCode(97 + (noteIndex % 26));
        return (
          <Text key={index} style={styles.inlineLetterDark}>
            {letter}
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingHorizontal: 24, paddingTop: 32 }]}>
        <ShimmerSkeleton width="40%" height={32} borderRadius={8} style={{ marginBottom: 24 }} />
        <ShimmerSkeleton width="100%" height={24} borderRadius={6} style={{ marginBottom: 12 }} />
        <ShimmerSkeleton width="90%" height={24} borderRadius={6} style={{ marginBottom: 12 }} />
        <ShimmerSkeleton width="95%" height={24} borderRadius={6} style={{ marginBottom: 12 }} />
        <ShimmerSkeleton width="80%" height={24} borderRadius={6} style={{ marginBottom: 32 }} />
        
        <ShimmerSkeleton width="100%" height={24} borderRadius={6} style={{ marginBottom: 12 }} />
        <ShimmerSkeleton width="85%" height={24} borderRadius={6} style={{ marginBottom: 12 }} />
        <ShimmerSkeleton width="90%" height={24} borderRadius={6} style={{ marginBottom: 12 }} />
      </View>
    );
  }

  console.log("BibleReader render, verses length:", chapterData.length);
  if (chapterData.length > 0) {
    console.log("First verse raw data:", JSON.stringify(chapterData[0], null, 2));
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.scrollView, { transform: [{ translateX: swipeX }] }]}
        {...panResponder.panHandlers}
      >
        <Animated.ScrollView
          ref={scrollRef as any}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* Strict 2-level nesting — verse number and content are DIRECT children of
              the paragraph <Text> (level-2 siblings). backgroundColor never goes deeper
              than level-2, so the iOS barcode bug cannot occur in any state (highlighted,
              selected, or both). The Word Joiner (U+2060) at the end of the verse number
              string signals the layout engine not to break the line between the number
              and the first word of the verse, preventing orphaned verse numbers. */}
          <Text
            style={styles.chapterContent}
            onLayout={(e) => {
              contentHeightRef.current = e.nativeEvent.layout.height;
            }}
          >
            {chapterData.flatMap((verse: Verse) => {
              const isSelected = selectedVerseSet.has(verse.verseNumber);
              const highlightColorValue = verseBackgroundColor(verse.verseNumber);
              const hasHighlight = highlightColorValue !== 'transparent';
              const sanitizedContent = sanitizeVerseText(verse.content);

              const renderVerseContent = (verse: Verse, text: string, hasHighlight: boolean, highlightColorValue: string, isSelected: boolean) => {
                const cleanText = text.replace(/\{\{note:\d+\}\}/g, '');
                const hasNotes = (verse.crossReferences && verse.crossReferences.length > 0) || (verse.notes && verse.notes.length > 0);
                
                return (
                  <Text
                    key={verse.id}
                    suppressHighlighting
                    style={[
                      isSelected && styles.verseSelected,
                    ]}
                  >
                    <Text 
                      suppressHighlighting 
                      onPress={() => toggleVerse(verse.verseNumber)}
                      style={hasHighlight ? { backgroundColor: highlightColorValue } : undefined}
                    >
                      {cleanText}
                    </Text>
                    {hasNotes && (
                      <Text
                        suppressHighlighting
                        onPress={() => setActiveVerse(verse)}
                        style={[{ fontSize: 12 }, hasHighlight ? { backgroundColor: highlightColorValue } : undefined]}
                      >
                        {' '}
                        <Image
                          source={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAABpklEQVR4nNSXMU/CQBTHX4+mg5ujibth1DgZP0ahYVNY9AvIyuSki4suaOJCCp39BMbJSOJC3E0cjavQw/8Rrjm0pa13pfpb+qB39+s9HndXRiXBqCTs71/0+/0tXPYty9rknFukAWNsCl4R3tfr9Rf13sLAvu+3ITwl85ngeIC253lnP8RBEGxjhk9UIMjAjuu6QxFHqQ7DcBezncV4Om80GgWdToeTBujPqtWqi3F96cBlJo5SipsbMjYhnYu5GCvOEYkxS6Z2IEOoY6kOO61jr9fbs23bSbo/mUw+G43GA+VkqRhVfoT0XOJJE9tUKhXR7hgVe0U5+DsLiIqYBVL9vPJUC34zqBFxWnHFkSUL2sUVR5aC+7/FFYd2qgWlFZcuYqOQMeqFr0Qsdyf5GUX6lkk8GAwO0fgc4ToZANX+mCrG36EJaZfMwJHmE3kISBTPZxpJ0ekCp5N3yol65qrVagtnrlgxGl8r0iY63ZBhlv3GU0gPIL2lAkgUQ9oqSipQl8wPGSDVrSLSqxLNeDwedx3HWYN0iKXyjgpG601Bh9J2py8AAAD//9JiXhkAAAAGSURBVAMAgwvIsxSQIioAAAAASUVORK5CYII=' }}
                          style={{ width: 14, height: 14, tintColor: '#aaa', marginTop: 2 }}
                        />
                      </Text>
                    )}
                    {' '}
                  </Text>
                );
              };

              const isFirstVerse = chapterData.indexOf(verse) === 0;

              const nodes = [
                // Level-2a — verse number. Word Joiner at the end locks it to the
                // first word of the content so the line cannot break between them.
                <Text
                  key={`${verse.id}-n`}
                  style={[
                    styles.verseLabel,
                    hasHighlight && { backgroundColor: highlightColorValue },
                    isSelected && styles.verseSelected,
                  ]}
                >
                  {toSuperscript(verse.verseNumber)}{'\u2060'}
                </Text>,
                // Level-2b — verse content. Leaf node, backgroundColor safe here.
                renderVerseContent(verse, sanitizedContent, hasHighlight, highlightColorValue, isSelected),
              ];

              if (verse.heading || verse.subheading) {
                console.log(`Rendering heading/subheading for verse ${verse.verseNumber}`);
                nodes.unshift(
                  <Text key={`${verse.id}-heading-container`}>
                    {isFirstVerse ? '' : '\n\n'}
                    {verse.heading && (
                      <Text style={styles.verseHeading}>
                        {verse.heading.replace(/#/g, '')}
                      </Text>
                    )}
                    {verse.heading && verse.subheading && <Text>{'\n'}</Text>}
                    {verse.subheading && (
                      <Text style={styles.verseSubheading}>
                        {verse.subheading.replace(/#/g, '')}
                      </Text>
                    )}
                    {'\n'}
                  </Text>
                );
              }

              return nodes;
            })}
          </Text>
        </Animated.ScrollView>
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

      {/* Highlighting Toolbar (Inline Modal) */}
      {selectedVerses.length > 0 && (
        <Animated.View 
          style={[
            styles.highlightModal, 
            { 
              height: highlightModalHeight,
              bottom: -5, 
              transform: [{ translateY: highlightTranslateY }] 
            }
          ]}
          {...highlightPanResponder.panHandlers}
        >
          <BlurView intensity={80} tint="light" style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)', borderTopLeftRadius: 24, borderTopRightRadius: 24 }]} pointerEvents="none" />
          
          <View style={styles.highlightDragHandle} />
          
          <View style={styles.highlightModalContent}>
            <View style={styles.actionsContainer}>
              {/* Copy Card */}
              <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
                <Copy size={20} color="#4B5563" />
                <Text style={styles.actionButtonText}>Copy</Text>
              </TouchableOpacity>

              {/* Note Card */}
              <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
                <MessageSquareText size={20} color="#4B5563" />
                <Text style={styles.actionButtonText}>Note</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.highlightColorDivider} />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.highlightColorPicker}>
              {Object.keys(highlightColors).map((colorKey) => {
                const isActive = activeColors.has(colorKey);
                return (
                  <TouchableOpacity 
                    key={colorKey}
                    style={[styles.colorDot, { backgroundColor: highlightColors[colorKey as keyof typeof highlightColors] }]} 
                    onPress={() => {
                      if (isActive) {
                        handleHighlight('clear');
                      } else {
                        handleHighlight(colorKey as keyof typeof highlightColors);
                      }
                    }}
                  >
                    {isActive && <X size={14} color="#1a1a1a" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Animated.View>
      )}
      {/* Cross-Reference / Notes Bottom Sheet */}
      <AppModal
        isOpen={activeVerse !== null}
        onClose={() => setActiveVerse(null)}
        title={`${activeBookObj?.localTitle || activeBookObj?.title || activeBook} ${activeChapter}:${activeVerse?.verseNumber}`}
        hideHeader={true}
        hideDragHandle={true}
        containerStyle={{ paddingHorizontal: 0, paddingBottom: 0, backgroundColor: '#FAFAFA' }}
        heightRatio={0.6}
        dynamicHeight={true}
      >
        <View style={styles.noteModalContainer}>
          {/* Blur Header */}
          <ModalDragArea style={[styles.noteModalHeader, { paddingTop: 12 }]}>
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
            <View style={styles.noteModalDragHandle} />
            <View style={styles.noteModalHeaderContent}>
              <View style={styles.noteModalHeaderSpacer} />
              <Text style={styles.noteModalHeaderTitle}>
                {activeBookObj?.longName || activeBookObj?.name || activeBookObj?.localTitle || activeBookObj?.title || activeBook} {activeChapter}:{activeVerse?.verseNumber}
              </Text>
              <BounceCard bounceScale={0.85} style={styles.noteModalCloseBtn} onPress={() => setActiveVerse(null)} hitSlop={8} activeOpacity={0.8}>
                <X size={20} color="#111827" strokeWidth={2} />
              </BounceCard>
            </View>
          </ModalDragArea>

          <ScrollView contentContainerStyle={[styles.noteModalScroll, { paddingTop: 82 }]} showsVerticalScrollIndicator={false}>
            {/* Verse preview card */}
            <View style={styles.noteVerseCard}>
              <Text style={styles.noteVerseText}>
                {renderVerseTextWithLetters(activeVerse?.content, activeVerse?.crossReferences)}
              </Text>
            </View>

            {/* Notes list card */}
            <View style={styles.noteListCard}>
              <Text style={styles.noteListSectionLabel}>Notes & Cross References</Text>
              {Array.isArray(activeVerse?.crossReferences || activeVerse?.notes) 
                ? (activeVerse?.crossReferences || activeVerse?.notes)?.map((n, index) => {
                    const letter = String.fromCharCode(97 + (index % 26));
                    const noteContent = typeof n === 'string' ? n : (n?.text || (typeof n?.raw === 'object' ? n.raw.text : n?.raw) || '');
                    return (
                      <View key={index} style={styles.noteRow}>
                        <View style={styles.noteLetterBadge}>
                          <Text style={styles.noteLetter}>{letter}</Text>
                        </View>
                        <Text style={styles.noteRaw}>{sanitizeVerseText(noteContent)}</Text>
                      </View>
                    );
                  })
                : null}
            </View>
          </ScrollView>
        </View>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({  container: { flex: 1, backgroundColor: '#fafafa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter',
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 130,
    paddingBottom: 120,
  },
  chapterContent: {
    fontSize: 18,
    lineHeight: 34,
    fontFamily: 'Inter',
    color: '#1a1a1a',
  },
  verseHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    fontFamily: 'Inter',
  },
  verseSubheading: {
    fontSize: 15,
    fontWeight: '500',
    color: '#555555',
    fontFamily: 'Inter',
    marginTop: 4,
  },
  verseSelected: {
    // No backgroundColor on tap — background only appears once a highlight color is chosen.
    // A subtle underline shows the verse is selected and the color toolbar is active.
    textDecorationLine: 'underline',
    textDecorationColor: '#FF6596',
  },
  verseLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6596',
    fontFamily: 'Inter',
  },
  noteSuperscript: {
    fontSize: 11,
    lineHeight: 18,
    color: '#FF6596',
    fontWeight: '600',
    fontStyle: 'italic',
    textAlignVertical: 'top',
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
  highlightModal: {
    ...getTopBarButtonShadowStyle(100),
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 10,
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: Platform.OS === 'android' ? '#FFFFFF' : 'transparent',
    borderColor: 'rgba(255,255,255,0.5)',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  highlightDragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#d1d5db',
    borderRadius: 10,
    alignSelf: 'center',
    marginTop: 12,
  },
  highlightModalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    paddingTop: 8,
    gap: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 4,
  },
  highlightColorDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e1e4e8',
    marginHorizontal: 4,
  },
  highlightColorPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorDot: { 
    width: 24, 
    height: 24, 
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
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
  },
  noteModalContainer: { backgroundColor: '#FAFAFA' },
  noteModalHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  noteModalDragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#d1d5db',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 4,
  },
  noteModalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  noteModalHeaderSpacer: { width: 40, height: 40 },
  noteModalHeaderTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  noteModalCloseBtn: {
    ...getTopBarButtonShadowStyle(20),
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteModalScroll: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
    gap: 12,
  },
  noteVerseCard: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6596',
  },
  noteVerseText: {
    fontSize: 16,
    lineHeight: 32,
    color: '#374151',
    fontFamily: 'Inter',
    fontStyle: 'italic',
  },
  inlineLetterDark: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '700',
  },
  noteListCard: {
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  noteListSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  noteLetterBadge: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 2,
    flexShrink: 0,
  },
  noteLetter: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6596',
  },
  noteRaw: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: '#4B5563',
    fontFamily: 'Inter',
  },
});
