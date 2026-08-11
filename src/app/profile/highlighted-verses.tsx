import React, { useState, useEffect, useRef } from 'react';
import { BounceCard } from '@/components/ui/BounceCard';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Share, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, BookOpen, Share as ShareIcon, Trash2 } from 'lucide-react-native';
import { getUserPreferences, saveUserPreferences, fetchChapterData } from '@/features/bible/data/bible.repository';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const BACKGROUND_GRADIENT = ['#F9FAFB', '#F3F4F6'] as const;

export default function HighlightedVersesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [highlights, setHighlights] = useState<any[]>([]);

  useEffect(() => {
    loadHighlights();
  }, []);

  const loadHighlights = async () => {
    setLoading(true);
    try {
      const prefs = await getUserPreferences();
      const rawHighlights = prefs.highlights || {};
      const activeTranslation = prefs.activeTranslation || '2692';

      const parsedHighlights: any[] = [];

      for (const [passageId, verses] of Object.entries(rawHighlights)) {
        const verseEntries = Object.entries(verses as Record<string, string>);
        if (verseEntries.length === 0) continue;

        let chapterData = [];
        try {
          chapterData = await fetchChapterData(activeTranslation, passageId) || [];
        } catch (e) {
          console.warn(`Could not fetch text for ${passageId}`);
        }

        for (const [verseNumber, color] of verseEntries) {
          const textObj = chapterData.find((v: any) => v.verseNumber === verseNumber);
          const [book, chapter] = passageId.split('.');
          
          parsedHighlights.push({
            passageId,
            book,
            chapter,
            verseNumber,
            color,
            text: textObj ? textObj.content : 'Text not available offline.',
          });
        }
      }

      setHighlights(parsedHighlights);
    } catch (error) {
      console.error('Failed to load highlights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (passageId: string, verseNumber: string) => {
    Alert.alert('Remove Highlight', 'Are you sure you want to remove this highlight?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Remove', 
        style: 'destructive', 
        onPress: async () => {
          try {
            const prefs = await getUserPreferences();
            const highlights = prefs.highlights as Record<string, Record<string, string>> | undefined;
            if (highlights?.[passageId]?.[verseNumber]) {
              delete highlights[passageId][verseNumber];
              
              if (Object.keys(highlights[passageId]).length === 0) {
                delete highlights[passageId];
              }

              await saveUserPreferences(prefs);
              
              setHighlights(prev => prev.filter(h => !(h.passageId === passageId && h.verseNumber === verseNumber)));
            }
          } catch (e) {
            console.error('Failed to remove highlight', e);
          }
        }
      }
    ]);
  };

  const handleOpenBible = async (passageId: string) => {
    try {
      const prefs = await getUserPreferences();
      const [book, chapter] = passageId.split('.');
      await saveUserPreferences({ ...prefs, activeBook: book, activeChapter: chapter, activePassageId: passageId });
      router.navigate('/(tabs)/bible');
    } catch (e) {
      console.error('Failed to open Bible', e);
    }
  };

  const handleShare = async (reference: string, text: string) => {
    try {
      await Share.share({
        message: `"${text}" - ${reference}`,
      });
    } catch (error) {
      console.error('Failed to share verse', error);
    }
  };

  const getColorHex = (colorName: string) => {
    const map: Record<string, string> = {
      yellow: 'rgba(250, 204, 21, 0.4)',
      pink: 'rgba(244, 114, 182, 0.3)',
      blue: 'rgba(96, 165, 250, 0.3)',
      green: 'rgba(74, 222, 128, 0.3)',
    };
    return map[colorName] || map.yellow;
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={BACKGROUND_GRADIENT} style={StyleSheet.absoluteFill} />
      
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 24) }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.7)' }]} pointerEvents="none" />
        <View style={styles.headerContent}>
          <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={() => router.back()} hitSlop={8} activeOpacity={0.8}>
            <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
          </BounceCard>
          <Text style={styles.headerTitle} numberOfLines={1}>Highlighted Verses</Text>
          <View style={[styles.headerCircle, { backgroundColor: 'transparent', borderWidth: 0, elevation: 0 }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 24) + 80 }]} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator color="#007AFF" size="large" />
            <Text style={{ marginTop: 16, color: '#6B7280', fontWeight: '500' }}>Loading your highlights...</Text>
          </View>
        ) : highlights.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <BookOpen size={48} color="#007AFF" />
            </View>
            <Text style={styles.emptyTitle}>No Highlights Yet</Text>
            <Text style={styles.emptySubtitle}>
              Verses you highlight while reading the Bible will appear here for easy access.
            </Text>
            <TouchableOpacity style={styles.readBibleBtn} onPress={() => router.navigate('/(tabs)/bible')} activeOpacity={0.8}>
              <LinearGradient colors={['#007AFF', '#0056b3']} style={styles.readBibleBtnGradient}>
                <Text style={styles.readBibleBtnText}>Read the Bible</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          highlights.map((h, i) => {
            const reference = `${h.book} ${h.chapter}:${h.verseNumber}`;
            return (
              <View key={`${h.passageId}-${h.verseNumber}-${i}`} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[styles.colorIndicator, { backgroundColor: getColorHex(h.color) }]} />
                    <Text style={styles.reference}>{reference}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => handleShare(reference, h.text)} style={styles.iconBtn} activeOpacity={0.7}>
                      <ShareIcon size={18} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleRemove(h.passageId, h.verseNumber)} style={styles.iconBtn} activeOpacity={0.7}>
                      <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.verseText}>"{h.text}"</Text>

                <TouchableOpacity style={styles.openBibleBtn} onPress={() => handleOpenBible(h.passageId)} activeOpacity={0.7}>
                  <BookOpen size={14} color="#007AFF" />
                  <Text style={styles.openBibleText}>Read Full Chapter</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginHorizontal: 12,
  },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  colorIndicator: { width: 14, height: 14, borderRadius: 7 },
  reference: { fontSize: 16, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  cardActions: { flexDirection: 'row', gap: 16 },
  iconBtn: { padding: 4 },
  
  verseText: { fontSize: 17, color: '#4B5563', lineHeight: 28, fontStyle: 'italic', marginBottom: 20 },
  
  openBibleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16,
    backgroundColor: '#F3F9FF', borderRadius: 100,
  },
  openBibleText: { fontSize: 13, fontWeight: '700', color: '#007AFF' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12, letterSpacing: -0.5 },
  emptySubtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32, lineHeight: 24, fontWeight: '500' },
  readBibleBtn: {
    marginTop: 32, borderRadius: 100, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  readBibleBtnGradient: {
    paddingVertical: 16, paddingHorizontal: 32, borderRadius: 100
  },
  readBibleBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }
});
