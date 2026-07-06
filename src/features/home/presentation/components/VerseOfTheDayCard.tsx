import { useBibleVersionStore } from '@/store/useBibleVersionStore';
import { fetchVerseOfTheDay, getUserPreferences, saveUserPreferences } from '@/utils/bibleApi';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Quote } from 'lucide-react-native';
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
        <View style={[styles.loadingContainer]}>
          <ActivityIndicator color="#FF6596" />
        </View>
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
            colors={['#FFFFFF', '#FFF5F8']} // Very soft, clean white-to-light-pink gradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Subtle background decorative icon */}
            <View style={styles.bgIconContainer}>
              <Quote color="rgba(255,101,150,0.05)" size={120} />
            </View>

            <View style={styles.topRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>VERSE OF THE DAY</Text>
              </View>
            </View>

            <Text style={styles.verseText} numberOfLines={4}>
              &quot;{verseText}&quot;
            </Text>

            <View style={styles.bottomRow}>
              <Text style={styles.reference}>{reference}</Text>
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
    height: 120,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardContainer: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,101,150,0.1)',
  },
  bgIconContainer: {
    position: 'absolute',
    top: -20,
    right: -20,
    transform: [{ rotate: '15deg' }],
  },
  topRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#FFE8F0', // Soft pink tag
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#FF6596',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  verseText: {
    color: '#333333', // Soft dark gray for readability
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  reference: {
    color: '#FF6596', // Brand accent color
    fontSize: 12,
    fontWeight: '700',
  },
});
