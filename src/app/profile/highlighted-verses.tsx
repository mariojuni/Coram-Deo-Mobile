import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, BookOpen, Share as ShareIcon, Trash2 } from 'lucide-react-native';
import { getUserPreferences, saveUserPreferences, fetchChapterData } from '@/utils/bibleApi';
import { LinearGradient } from 'expo-linear-gradient';

export default function HighlightedVersesScreen() {
  const router = useRouter();
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
            if (prefs.highlights?.[passageId]?.[verseNumber]) {
              delete prefs.highlights[passageId][verseNumber];
              
              if (Object.keys(prefs.highlights[passageId]).length === 0) {
                delete prefs.highlights[passageId];
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
      router.push('/(tabs)/bible');
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
      <LinearGradient colors={['#FDF2F8', '#FFFFFF']} style={StyleSheet.absoluteFill} />
      
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Highlighted Verses</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator color="#EC4899" size="large" />
              <Text style={{ marginTop: 16, color: '#6B7280', fontWeight: '500' }}>Loading your highlights...</Text>
            </View>
          ) : highlights.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrapper}>
                <BookOpen size={48} color="#F472B6" />
              </View>
              <Text style={styles.emptyTitle}>No Highlights Yet</Text>
              <Text style={styles.emptySubtitle}>
                Verses you highlight while reading the Bible will appear here for easy access.
              </Text>
              <TouchableOpacity style={styles.readBibleBtn} onPress={() => router.push('/(tabs)/bible')} activeOpacity={0.8}>
                <LinearGradient colors={['#EC4899', '#DB2777']} style={styles.readBibleBtnGradient}>
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
                    <BookOpen size={14} color="#EC4899" />
                    <Text style={styles.openBibleText}>Read Full Chapter</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
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
    backgroundColor: '#FDF2F8', borderRadius: 100,
  },
  openBibleText: { fontSize: 13, fontWeight: '700', color: '#DB2777' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FDF2F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12, letterSpacing: -0.5 },
  emptySubtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32, lineHeight: 24, fontWeight: '500' },
  readBibleBtn: {
    marginTop: 32, borderRadius: 100, shadowColor: '#EC4899', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  readBibleBtnGradient: {
    paddingVertical: 16, paddingHorizontal: 32, borderRadius: 100
  },
  readBibleBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }
});
