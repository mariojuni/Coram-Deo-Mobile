import React, { useState, useEffect, useRef } from 'react';
import { BounceCard } from '@/components/ui/BounceCard';
import { SoftCard } from '@/components/ui/SoftCard';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Share, Animated, Image, Platform, ActionSheetIOS } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, BookOpen, Share as ShareIcon, Trash2, User, MoreHorizontal } from 'lucide-react-native';
import { getUserPreferences, saveUserPreferences, fetchChapterData } from '@/features/bible/data/bible.repository';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '@/store/useAuthStore';
import { formatPrayerTimeAgo } from '@/features/prayer/domain/prayer.selectors';

const BACKGROUND_GRADIENT = ['#F9FAFB', '#F3F4F6'] as const;

export default function HighlightedVersesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userProfile = useAuthStore((s) => s.userProfile);
  const currentUser = useAuthStore((s) => s.currentUser);
  const [loading, setLoading] = useState(true);
  const [highlights, setHighlights] = useState<any[]>([]);

  useEffect(() => {
    loadHighlights();
  }, []);

  const loadHighlights = async () => {
    setLoading(true);
    try {
      const prefs = await getUserPreferences();
      const rawHighlights = (prefs as any)?.highlights || {};
      const activeTranslation = (prefs as any)?.activeTranslation || '2692';

      const items: any[] = [];

      for (const [passageId, verses] of Object.entries(rawHighlights)) {
        if (!verses || typeof verses !== 'object') continue;
        const [book, chapter] = passageId.split('.');
        const parsedChapter = parseInt(chapter, 10) || 1;

        let chapterData: any[] = [];
        try {
          chapterData = (await fetchChapterData(activeTranslation, passageId)) || [];
        } catch (e) {
          console.warn(`Could not fetch text for ${passageId}`);
        }

        const colorMap: Record<string, { vNum: number; createdAt?: string }[]> = {};
        for (const [verseStr, val] of Object.entries(verses as Record<string, any>)) {
          const vNum = parseInt(verseStr, 10);
          if (isNaN(vNum)) continue;

          let color = String(val);
          let createdAt: string | undefined = undefined;
          if (typeof val === 'object' && val !== null) {
            color = String(val.color || 'yellow');
            createdAt = val.createdAt;
          }

          if (!colorMap[color]) colorMap[color] = [];
          colorMap[color].push({ vNum, createdAt });
        }

        for (const [color, verseItems] of Object.entries(colorMap)) {
          verseItems.sort((a, b) => a.vNum - b.vNum);
          let currentRange: { vNum: number; createdAt?: string }[] = [];

          const pushRange = (range: { vNum: number; createdAt?: string }[]) => {
            if (range.length === 0) return;
            const startNum = range[0].vNum;
            const endNum = range[range.length - 1].vNum;
            const label = range.length === 1 ? `${startNum}` : `${startNum}-${endNum}`;
            const rangeCreatedAt = range.map(r => r.createdAt).filter(Boolean).sort().pop();

            const combinedTexts: string[] = [];
            const vNumbers: number[] = [];
            for (const item of range) {
              vNumbers.push(item.vNum);
              const textObj = chapterData.find((v: any) => parseInt(String(v.verseNumber), 10) === item.vNum);
              if (textObj?.content) {
                const cleanContent = textObj.content.replace(/{{note:[0-9]+}}/g, '').trim();
                combinedTexts.push(cleanContent);
              }
            }

            items.push({
              passageId,
              book,
              chapter: parsedChapter,
              verseNumber: startNum,
              verseRangeLabel: label,
              verseNumbers: vNumbers,
              color,
              text: combinedTexts.join(' ') || 'Text not available offline.',
              createdAt: rangeCreatedAt,
            });
          };

          for (const item of verseItems) {
            if (currentRange.length === 0) {
              currentRange.push(item);
            } else if (item.vNum === currentRange[currentRange.length - 1].vNum + 1) {
              currentRange.push(item);
            } else {
              pushRange(currentRange);
              currentRange = [item];
            }
          }
          pushRange(currentRange);
        }
      }

      items.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      setHighlights(items);
    } catch (error) {
      console.error('Failed to load highlights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (passageId: string, verseNumbersOrNumber: string | number | number[]) => {
    Alert.alert('Remove Highlight', 'Are you sure you want to remove this highlight?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Remove', 
        style: 'destructive', 
        onPress: async () => {
          try {
            const prefs = await getUserPreferences();
            const highlights = prefs.highlights as Record<string, Record<string, string>> | undefined;
            const targets = Array.isArray(verseNumbersOrNumber) 
              ? verseNumbersOrNumber.map(String) 
              : [String(verseNumbersOrNumber)];

            if (highlights?.[passageId]) {
              for (const vKey of targets) {
                delete highlights[passageId][vKey];
              }
              
              if (Object.keys(highlights[passageId]).length === 0) {
                delete highlights[passageId];
              }

              await saveUserPreferences(prefs);
              
              setHighlights(prev => prev.filter(h => !(h.passageId === passageId && targets.includes(String(h.verseNumber)))));
            }
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

  const handleOptionsPress = (passageId: string, verseTargets: any, reference: string, text: string) => {
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
            handleRemove(passageId, verseTargets);
          }
        }
      );
    } else {
      Alert.alert('Highlight Options', reference, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: () => handleShare(reference, text) },
        { text: 'Delete', style: 'destructive', onPress: () => handleRemove(passageId, verseTargets) },
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
            const verseRefLabel = h.verseRangeLabel || `${h.verseNumber}`;
            const reference = `${h.book} ${h.chapter}:${verseRefLabel}`;
            const userName = userProfile?.firstName
              ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim()
              : currentUser?.displayName || 'You';
            const userPhoto = userProfile?.photoUrl || currentUser?.photoURL;
            const verseTargets = h.verseNumbers?.length ? h.verseNumbers : h.verseNumber;

            return (
              <BounceCard
                key={`${h.passageId}-${h.verseNumber}-${i}`}
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
                              <Text style={{ verticalAlign: 'middle' }}>
                                {' '}
                                <View
                                  style={[
                                    styles.colorDotIndicator,
                                    { backgroundColor: getColorHex(h.color), marginBottom: 1 },
                                  ]}
                                />
                              </Text>
                            </Text>
                            <Text style={styles.prayerTime}>{formatPrayerTimeAgo(h.createdAt)}</Text>
                          </View>

                          <TouchableOpacity
                            onPress={() => handleOptionsPress(h.passageId, verseTargets, reference, h.text)}
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
