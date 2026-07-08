import { useBibleVersionStore } from '@/store/useBibleVersionStore';
import { fetchVerseOfTheDay, getUserPreferences, saveUserPreferences } from '@/utils/bibleApi';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BookOpen, ChevronRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const decodeHtmlEntities = (text: string) => {
  return text
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
};

const stripHtml = (html: string) => {
  if (!html) return '';
  return decodeHtmlEntities(
    html
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
};

export function VerseOfTheDayCard() {
  const router = useRouter();
  const activeTranslation = useBibleVersionStore((s) => s.activeTranslation);
  const isVersionLoaded = useBibleVersionStore((s) => s.isLoaded);
  const [verseText, setVerseText] = useState('');
  const [reference, setReference] = useState('');
  const [passageId, setPassageId] = useState('');
  const [loading, setLoading] = useState(true);

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.get() }],
    };
  });

  const handlePressIn = () => {
    scale.set(withTiming(0.97, { duration: 150 }));
  };

  const handlePressOut = () => {
    scale.set(withTiming(1, { duration: 150 }));
  };

  const handlePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (passageId) {
      // passageId usually looks like "ROM.12.12"
      const parts = passageId.split('.');
      if (parts.length >= 2) {
        const bookId = parts[0];
        const chapterNum = parts[1];

        try {
          const currentPrefs: any = await getUserPreferences() || {};
          currentPrefs.activeBook = bookId;
          currentPrefs.activeChapter = chapterNum;
          await saveUserPreferences(currentPrefs);

          router.push('/(tabs)/bible');
        } catch (e) {
          console.error("Failed to navigate to verse", e);
        }
      }
    }
  };

  useEffect(() => {
    // Wait until the version store has loaded before fetching
    if (!isVersionLoaded) return;

    async function loadVerse() {
      setLoading(true);
      try {
        // Use the globally selected translation; fall back to default NIV (111)
        const translationId = activeTranslation ? String(activeTranslation) : '111';
        const votd = await fetchVerseOfTheDay(translationId);
        if (votd) {
          setVerseText(stripHtml(votd.html));
          setReference(votd.reference);
          setPassageId(votd.passageId);
        }
      } catch (error) {
        console.error('Failed to load Verse of the Day', error);
      } finally {
        setLoading(false);
      }
    }
    loadVerse();
  }, [activeTranslation, isVersionLoaded]);

  if (loading) {
    return (
      <View style={styles.outerContainer}>
        <LinearGradient
          colors={['#FF6596', '#B66DFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.loadingContainer}
        >
          <ActivityIndicator color="rgba(255,255,255,0.8)" />
        </LinearGradient>
      </View>
    );
  }

  if (!verseText) return null;

  return (
    <View style={styles.outerContainer}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
      >
        <Animated.View style={[styles.cardContainer, animatedStyle]}>
          <LinearGradient
            colors={['#FF6596', '#B66DFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Large decorative quote art */}
            <Text style={styles.decorativeQuote}>{'\u201C'}</Text>

            {/* Top label row */}
            <View style={styles.topRow}>
              <View style={styles.badge}>
                <BookOpen size={10} color="rgba(255,255,255,0.9)" strokeWidth={2.5} />
                <Text style={styles.badgeText}>VERSE OF THE DAY</Text>
              </View>
            </View>

            {/* Verse text */}
            <Text style={styles.verseText} numberOfLines={5}>
              {verseText}
            </Text>

            {/* Bottom row: reference + read prompt */}
            <View style={styles.bottomRow}>
              <View style={styles.referencePill}>
                <Text style={styles.reference}>{reference}</Text>
              </View>
              <View style={styles.readRow}>
                <Text style={styles.readLabel}>Read chapter</Text>
                <ChevronRight size={12} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    marginBottom: 16,
  },
  loadingContainer: {
    height: 148,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    borderRadius: 24,
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
  card: {
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  decorativeQuote: {
    position: 'absolute',
    top: -10,
    right: 16,
    fontSize: 140,
    lineHeight: 160,
    color: 'rgba(255,255,255,0.10)',
    fontFamily: 'ui-serif',
    fontWeight: '900',
  },
  topRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  badgeText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  verseText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '500',
    fontFamily: 'ui-serif',
    marginBottom: 18,
    letterSpacing: 0.1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  referencePill: {
    backgroundColor: 'rgba(255,255,255,0.20)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
  },
  reference: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  readRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  readLabel: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 12,
    fontWeight: '500',
  },
});
