import { Fonts } from '@/constants/theme';
import { useBibleVersionStore } from '@/store/useBibleVersionStore';
import { fetchVerseOfTheDay, getUserPreferences, saveUserPreferences } from '@/utils/bibleApi';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BookOpen, ChevronRight, Sparkles, Star } from 'lucide-react-native';
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

// Scattered sparkle positions (static, purely decorative)
const SPARKLES = [
  { top: 12, left: 18, size: 7, opacity: 0.45 },
  { top: 28, right: 80, size: 5, opacity: 0.30 },
  { top: 58, left: 62, size: 4, opacity: 0.22 },
  { bottom: 32, right: 22, size: 6, opacity: 0.38 },
  { bottom: 16, left: 92, size: 4, opacity: 0.25 },
];

export function VerseOfTheDayCard() {
  const router = useRouter();

  const activeTranslation = useBibleVersionStore((s) => s.activeTranslation);
  const isVersionLoaded = useBibleVersionStore((s) => s.isLoaded);
  const [verseText, setVerseText] = useState('');
  const [reference, setReference] = useState('');
  const [passageId, setPassageId] = useState('');
  const [loading, setLoading] = useState(true);
  const [cachedPrefs, setCachedPrefs] = useState<any>(null);

  useEffect(() => {
    getUserPreferences().then(setCachedPrefs).catch(console.error);
  }, []);

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  const handlePressIn = () => scale.set(withTiming(0.975, { duration: 150 }));
  const handlePressOut = () => scale.set(withTiming(1, { duration: 200 }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (passageId) {
      const parts = passageId.split('.');
      if (parts.length >= 2) {
        try {
          const prefs = { ...(cachedPrefs || {}) };
          prefs.activeBook = parts[0];
          prefs.activeChapter = parts[1];
          // Fire and forget save to avoid delaying navigation
          saveUserPreferences(prefs).catch(e => console.error('Failed to save prefs', e));
          router.push('/(tabs)/bible');
        } catch (e) {
          console.error('Failed to navigate to verse', e);
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
          colors={['#FC709D', '#B069F5']}
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
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={handlePress}>
        <Animated.View style={[styles.cardContainer, animatedStyle]}>
          <LinearGradient
            colors={['#FC709D', '#BD6DF2', '#B069F5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientFill}
          >
            {/* ── Top shine accent bar ── */}
            <LinearGradient
              colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.topShineBar}
            />

            {/* ── Diagonal shimmer streak ── */}
            <View style={styles.shimmerStreak} />



            {/* ── Soft luminous orbs ── */}
            <View style={styles.orb1} />
            <View style={styles.orb2} />
            <View style={styles.orb3} />

            {/* ── Dot grid (top-right corner) ── */}
            {Array.from({ length: 3 }).map((_, row) =>
              Array.from({ length: 5 }).map((_, col) => (
                <View
                  key={`d-${row}-${col}`}
                  style={[styles.dot, { top: 20 + row * 20, right: 20 + col * 20 }]}
                />
              ))
            )}

            {/* ── Scattered star sparks ── */}
            {SPARKLES.map((sp, i) => (
              <View key={`sp-${i}`} style={[styles.sparkleWrap, sp as any]}>
                <Star
                  size={sp.size}
                  color={`rgba(255,255,255,${sp.opacity})`}
                  fill={`rgba(255,255,255,${sp.opacity})`}
                  strokeWidth={0}
                />
              </View>
            ))}

            {/* ── Large watermark open-quote ── */}
            <Text style={styles.decorativeQuote}>{'\u201C'}</Text>

            {/* ══════════════ CARD CONTENT ══════════════ */}
            <View style={styles.card}>

              {/* Top row: badge + day-streak dots */}
              <View style={styles.topRow}>
                <View style={styles.badge}>
                  <Sparkles size={9} color="rgba(255,255,255,0.95)" strokeWidth={2.5} />
                  <Text style={styles.badgeText}>VERSE OF THE DAY</Text>
                </View>
              </View>

              {/* Verse text */}
              <Text
                style={[styles.verseText, { fontFamily: Fonts?.serif ?? 'serif' }]}
                numberOfLines={5}
              >
                {verseText}
              </Text>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Bottom: reference pill + read CTA */}
              <View style={styles.bottomRow}>
                <View style={styles.referencePill}>
                  <BookOpen size={10} color="rgba(255,255,255,0.95)" strokeWidth={2.5} />
                  <Text style={styles.reference}>{reference}</Text>
                </View>
                <Pressable style={styles.readCta} onPress={handlePress}>
                  <Text style={styles.readCtaText}>Read chapter</Text>
                  <ChevronRight size={13} color="#fff" strokeWidth={2.5} />
                </Pressable>
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
    height: 160,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    borderRadius: 24,
    shadowColor: '#E040A0',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 8,
    overflow: 'hidden',
  },
  gradientFill: {
    borderRadius: 24,
    overflow: 'hidden',
  },

  // ── Top shine bar
  topShineBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  // ── Diagonal shimmer streak
  shimmerStreak: {
    position: 'absolute',
    top: -30,
    left: -40,
    width: 80,
    height: 240,
    backgroundColor: 'rgba(255,255,255,0.06)',
    transform: [{ rotate: '30deg' }],
  },



  // ── Orbs
  orb1: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    top: -95,
    right: -75,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  orb2: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    bottom: -55,
    left: -5,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  orb3: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    top: 35,
    left: '46%',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  // ── Dot grid
  dot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  // ── Sparkle stars
  sparkleWrap: {
    position: 'absolute',
  },

  // ── Large watermark quote
  decorativeQuote: {
    position: 'absolute',
    top: -24,
    right: 12,
    fontSize: 165,
    lineHeight: 185,
    color: 'rgba(255,255,255,0.08)',
    fontFamily: Fonts?.serif ?? 'serif',
    fontWeight: '900',
  },

  // ── Content area
  card: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 14,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    borderColor: 'rgba(255,255,255,0.30)',
  },
  badgeText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.3,
  },



  verseText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '500',
    marginBottom: 16,
    letterSpacing: 0.15,
  },

  // ── Mid divider
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginBottom: 14,
  },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  referencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  reference: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  readCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  readCtaText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 11.5,
    fontWeight: '600',
  },
});
