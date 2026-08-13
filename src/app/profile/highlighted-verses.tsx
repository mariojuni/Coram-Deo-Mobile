import React, { useState, useEffect, useRef } from 'react';
import { BounceCard } from '@/components/ui/BounceCard';
import { SoftCard } from '@/components/ui/SoftCard';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Share, Animated, Image, Platform, ActionSheetIOS } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, BookOpen, Share as ShareIcon, Trash2, User, MoreHorizontal } from 'lucide-react-native';
import { getUserPreferences, saveUserPreferences } from '@/features/bible/data/bible.repository';
import { bibleHighlightRepository } from '@/features/bibleHighlights/data/bibleHighlight.repository';
import type { BibleHighlight } from '@/features/bibleHighlights/domain/bibleHighlight.types';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '@/store/useAuthStore';
import { formatPrayerTimeAgo } from '@/features/prayer/domain/prayer.selectors';
import { getHumanReadableBookName } from '@/utils/scriptureReferenceParser';

const BACKGROUND_GRADIENT = ['#F9FAFB', '#F3F4F6'] as const;

export default function HighlightedVersesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userProfile = useAuthStore((s) => s.userProfile);
  const currentUser = useAuthStore((s) => s.currentUser);
  const [loading, setLoading] = useState(true);
  const [highlights, setHighlights] = useState<BibleHighlight[]>([]);

  useEffect(() => {
    loadHighlights();
  }, [currentUser?.uid]);

  const loadHighlights = async () => {
    if (!currentUser?.uid) return;
    setLoading(true);
    try {
      const data = await bibleHighlightRepository.getUserHighlights(currentUser.uid);
      setHighlights(data);
    } catch (error) {
      console.error('Failed to load highlights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (highlightId: string) => {
    Alert.alert('Remove Highlight', 'Are you sure you want to remove this highlight?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Remove', 
        style: 'destructive', 
        onPress: async () => {
          try {
            await bibleHighlightRepository.deleteHighlight(highlightId);
            setHighlights(prev => prev.filter(h => h.id !== highlightId));
          } catch (e) {
            console.error('Failed to remove highlight', e);
          }
        }
      }
    ]);
  };

  const handleOpenBible = async (passageId: string, verseNumber?: number) => {
    try {
      const prefs = await getUserPreferences();
      const [book, chapter] = passageId.split('.');
      await saveUserPreferences({
        ...prefs,
        activeBook: book,
        activeChapter: chapter,
        activePassageId: passageId,
        scrollToVerse: verseNumber ? String(verseNumber) : undefined,
      } as any);
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

  const handleOptionsPress = (highlightId: string, reference: string, text: string) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Share Highlight', 'Delete Highlight'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleShare(reference, text);
          } else if (buttonIndex === 2) {
            handleRemove(highlightId);
          }
        }
      );
    } else {
      Alert.alert('Highlight Options', reference, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: () => handleShare(reference, text) },
        { text: 'Delete', style: 'destructive', onPress: () => handleRemove(highlightId) },
      ]);
    }
  };

  const getColorHex = (colorName: string) => {
    const map: Record<string, string> = {
      yellow: '#FACC15',
      pink: '#F472B6',
      blue: '#60A5FA',
      green: '#4ADE80',
      orange: '#FB923C',
      purple: '#C084FC',
      red: '#F87171',
      teal: '#2DD4BF',
      indigo: '#818CF8',
      brown: '#A8A29E',
    };
    return map[colorName] || '#FACC15';
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
            const reference = `${getHumanReadableBookName(h.bookName)} ${h.chapter}:${h.verseRangeLabel}`;
            const userName = h.userName || userProfile?.firstName
              ? `${userProfile?.firstName} ${userProfile?.lastName || ''}`.trim()
              : currentUser?.displayName || 'You';
            const userPhoto = h.userPhotoUrl || userProfile?.photoUrl || currentUser?.photoURL;

            return (
              <BounceCard
                key={h.id}
                style={{ marginBottom: 12 }}
                onPress={() => handleOpenBible(h.passageId, h.verseNumbers?.[0] || h.verseNumber)}
                activeOpacity={0.85}
              >
                <SoftCard innerStyle={styles.prayerCardInner}>
                  <View style={styles.prayerRow}>
                    <View style={styles.prayerContent}>
                      <View style={styles.prayerTop}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View style={styles.prayerAvatar}>
                            {userPhoto ? (
                              <Image source={{ uri: userPhoto }} style={styles.prayerAvatarImage} />
                            ) : (
                              <User size={20} color="#9CA3AF" />
                            )}
                          </View>
                          <View style={{ flex: 1, justifyContent: 'center' }}>
                            <Text style={{ fontSize: 14, color: '#111827', lineHeight: 20 }}>
                              <Text style={styles.prayerName}>You</Text>
                              <Text style={styles.prayerActionText}> highlighted </Text>
                              <Text style={styles.prayerPassageHighlight}>{reference}</Text>
                              <Text>
                                {' '}
                                <View
                                  style={[
                                    styles.colorDotIndicator,
                                    { backgroundColor: getColorHex(h.color), transform: [{ translateY: -2 }] },
                                  ]}
                                />
                              </Text>
                            </Text>
                            <Text style={styles.prayerTime}>
                              {h.createdAt?.toDate ? formatPrayerTimeAgo(h.createdAt.toDate()) : formatPrayerTimeAgo(new Date(h.createdAt || Date.now()))}
                            </Text>
                          </View>

                          <TouchableOpacity
                            onPress={() => handleOptionsPress(h.id, reference, h.text)}
                            style={styles.iconBtn}
                            activeOpacity={0.7}
                            hitSlop={8}
                          >
                            <MoreHorizontal size={18} color="#9CA3AF" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <Text style={styles.prayerVerseText} numberOfLines={3} ellipsizeMode="tail">"{h.text}"</Text>
                    </View>
                  </View>
                </SoftCard>
              </BounceCard>
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
  cardActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  iconBtn: { padding: 4 },
  
  prayerCardInner: {
    flexDirection: 'row',
  },
  prayerGradientBorder: {
    width: 4,
    alignSelf: 'stretch',
  },
  prayerRow: {
    flex: 1,
    flexDirection: 'row',
    padding: 14,
  },
  prayerContent: {
    flex: 1,
    paddingTop: 1,
  },
  prayerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  prayerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  prayerAvatarImage: {
    width: 36,
    height: 36,
  },
  prayerHeaderTitle: {
    fontSize: 14,
    color: '#111827',
  },
  prayerTime: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 1,
  },
  prayerName: {
    fontWeight: '700',
    color: '#111827',
  },
  prayerActionText: {
    color: '#4B5563',
    fontWeight: '400',
  },
  prayerPassageHighlight: {
    fontWeight: '800',
    color: '#111827',
  },
  dotSeparator: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  translationText: {
    fontWeight: '700',
    color: '#374151',
  },
  colorDotIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 6,
  },
  prayerVerseText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    fontStyle: 'italic',
    marginTop: 2,
  },

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
