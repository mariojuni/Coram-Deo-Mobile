import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Share, Image, Platform, ActionSheetIOS } from 'react-native';
import { useRouter } from 'expo-router';
import { Bookmark, BookOpen, Calendar, ChevronRight, Share as ShareIcon, Trash2, ChevronDown, User, MoreHorizontal, Heart, MessageCircle, MoreVertical } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SoftCard } from '@/components/ui/SoftCard';
import { BounceCard } from '@/components/ui/BounceCard';
import { useAuthStore } from '@/store/useAuthStore';
import { formatPrayerTimeAgo } from '@/features/prayer/domain/prayer.selectors';
import type { UserHighlightItem } from '../hooks/useProfileDashboardData';
import type { SermonNote } from '@/features/sermons/domain/sermon.types';
import type { DashboardNoteItem } from '../hooks/useProfileDashboardData';
import type { UserBiblePlan, BiblePlan } from '@/features/biblePlan/domain/biblePlan.types';
import { saveUserPreferences, getUserPreferences } from '@/features/bible/data/bible.repository';
import { getHumanReadableBookName } from '@/utils/scriptureReferenceParser';
import { bibleNoteRepository } from '@/features/bibleNotes/data/bibleNote.repository';
import { sermonRepository } from '@/features/sermons/data/sermon.repository';
import type { Prayer } from '@/features/prayer/domain/prayer.types';
import { ShareImageGenerator, ShareImageGeneratorRef } from '@/components/Share/ShareImageGenerator';

type ActivityTabKey = 'all' | 'highlights' | 'notes' | 'prayers' | 'plans';

interface ProfileActivityTabsProps {
  highlights: UserHighlightItem[];
  highlightsLoading: boolean;
  notes: DashboardNoteItem[];
  notesLoading: boolean;
  prayers?: Prayer[];
  prayersLoading?: boolean;
  activePlans: UserBiblePlan[];
  plansMeta: BiblePlan[];
  plansLoading: boolean;
  onRemoveHighlight?: (highlightId: string) => void;
  onRemoveNote?: (noteId: string) => void;
  onToggleNoteLike?: (id: string, uid: string) => void;
  onToggleHighlightLike?: (id: string, uid: string) => void;
}

const PAGE_SIZE = 15;

export function ProfileActivityTabs({
  highlights,
  highlightsLoading,
  notes,
  notesLoading,
  prayers = [],
  prayersLoading = false,
  activePlans,
  plansMeta,
  plansLoading,
  onRemoveHighlight,
  onRemoveNote,
  onToggleNoteLike,
  onToggleHighlightLike,
}: ProfileActivityTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActivityTabKey>('all');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const shareImageGeneratorRef = React.useRef<ShareImageGeneratorRef>(null);

  const userProfile = useAuthStore((s) => s.userProfile);
  const currentUser = useAuthStore((s) => s.currentUser);

  const tabs: { key: ActivityTabKey; label: string; count: number }[] = useMemo(
    () => [
      { key: 'all', label: 'All', count: highlights.length + notes.length + prayers.length + activePlans.length },
      { key: 'highlights', label: 'Highlights', count: highlights.length },
      { key: 'notes', label: 'Notes', count: notes.length },
      { key: 'prayers', label: 'Prayers', count: prayers.length },
      { key: 'plans', label: 'Plans', count: activePlans.length },
    ],
    [highlights.length, notes.length, prayers.length, activePlans.length]
  );

  const handleOpenBiblePassage = useCallback(
    async (passageId: string, verseNumber?: number) => {
      try {
        const prefs = await getUserPreferences();
        const [book, chapter] = passageId.split('.');
        await saveUserPreferences({
          ...prefs,
          activeBook: book || 'GEN',
          activeChapter: chapter || '1',
          activePassageId: passageId,
          scrollToVerse: verseNumber ? String(verseNumber) : undefined,
        } as any);
        router.navigate('/(tabs)/bible');
      } catch (e) {
        console.error('Failed to open passage:', e);
        router.navigate('/(tabs)/bible');
      }
    },
    [router]
  );

  const handleShareHighlight = useCallback(async (item: UserHighlightItem) => {
    try {
      if (shareImageGeneratorRef.current) {
        await shareImageGeneratorRef.current.captureAndShare(item, 'highlight');
      } else {
        const cleanText = item.text ? item.text.replace(/{{note:[0-9]+}}/g, '').trim() : '';
        const verseRefLabel = item.verseRangeLabel || `${item.verseNumber}`;
        const msg = cleanText
          ? `"${cleanText}" — ${getHumanReadableBookName(item.bookName)} ${item.chapter}:${verseRefLabel}`
          : `${getHumanReadableBookName(item.bookName)} ${item.chapter}:${verseRefLabel}`;
        await Share.share({ message: msg });
      }
    } catch (e) {
      console.error('Failed to share highlight:', e);
    }
  }, []);

  const handleConfirmRemove = useCallback(
    (item: UserHighlightItem) => {
      const verseRefLabel = item.verseRangeLabel || `${item.verseNumber}`;
      const targets = item.verseNumbers?.length ? item.verseNumbers : item.verseNumber;
      Alert.alert(
        'Remove Highlight',
        `Are you sure you want to remove the highlight for ${getHumanReadableBookName(item.bookName)} ${item.chapter}:${verseRefLabel}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => onRemoveHighlight?.(item.id),
          },
        ]
      );
    },
    [onRemoveHighlight]
  );

  const handleOptionsPress = useCallback(
    (item: UserHighlightItem) => {
      const verseRefLabel = item.verseRangeLabel || `${item.verseNumber}`;
      const ref = `${getHumanReadableBookName(item.bookName)} ${item.chapter}:${verseRefLabel}`;
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Cancel', 'Share Highlight', 'Delete Highlight'],
            destructiveButtonIndex: 2,
            cancelButtonIndex: 0,
          },
          (buttonIndex) => {
            if (buttonIndex === 1) {
              handleShareHighlight(item);
            } else if (buttonIndex === 2) {
              handleConfirmRemove(item);
            }
          }
        );
      } else {
        Alert.alert(`Highlight Options`, ref, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Share', onPress: () => handleShareHighlight(item) },
          { text: 'Delete', style: 'destructive', onPress: () => handleConfirmRemove(item) },
        ]);
      }
    },
    [handleShareHighlight, handleConfirmRemove]
  );

  const getColorHex = useCallback((colorName: string) => {
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
  }, []);

  // Memoized Highlight Items
  const displayedHighlights = useMemo(
    () => highlights.slice(0, visibleCount),
    [highlights, visibleCount]
  );

  const renderedHighlights = useMemo(() => {
    if (highlightsLoading) {
      return <Text style={styles.loadingText}>Loading highlights...</Text>;
    }
    if (highlights.length === 0) {
      if (activeTab !== 'highlights') return null;
      return (
        <SoftCard style={styles.emptyCard}>
          <View style={styles.emptyContainer}>
            <Bookmark size={32} color="#9CA3AF" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>No Highlights Yet</Text>
            <Text style={styles.emptySubtitle}>Verses you highlight while reading will appear here.</Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => router.navigate('/(tabs)/bible')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyActionBtnText}>Read the Bible</Text>
            </TouchableOpacity>
          </View>
        </SoftCard>
      );
    }

    const userName = userProfile?.firstName
      ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim()
      : currentUser?.displayName || 'You';
    const userPhoto = userProfile?.photoUrl || currentUser?.photoURL;

    return (
      <View>
        {displayedHighlights.map((item) => {
          const reference = `${getHumanReadableBookName(item.bookName)} ${item.chapter}:${item.verseRangeLabel || item.verseNumber}`;
          return (
            <BounceCard
              key={item.id}
              style={{ marginBottom: 12 }}
              onPress={() =>
                router.push({
                  pathname: '/comment-thread',
                  params: {
                    targetType: 'church_highlight',
                    targetId: item.id,
                    title: reference,
                  },
                })
              }
              activeOpacity={0.85}
            >
              <SoftCard innerStyle={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: '#E5E7EB',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                      overflow: 'hidden',
                    }}
                  >
                    {userPhoto ? (
                      <Image source={{ uri: userPhoto }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                    ) : (
                      <User size={20} color="#9CA3AF" />
                    )}
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 14, color: '#111827', lineHeight: 20 }}>
                        <Text style={{ fontWeight: '700', color: '#111827' }}>You</Text>
                        <Text style={{ color: '#4B5563', fontWeight: '400' }}> highlighted </Text>
                        <Text style={{ fontWeight: '800', color: '#111827' }}>
                          {reference}
                        </Text>
                      </Text>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: getColorHex(item.color),
                          marginLeft: 6,
                        }}
                      />
                    </View>
                    <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '500', marginTop: 2 }}>
                      {item.createdAt ? formatPrayerTimeAgo(item.createdAt as any) : 'Just now'}
                    </Text>
                  </View>
                </View>

                {!!item.text && (
                  <Text
                    style={{
                      fontSize: 14,
                      color: '#4B5563',
                      lineHeight: 20,
                      fontStyle: 'italic',
                      marginBottom: 12,
                    }}
                    numberOfLines={3}
                    ellipsizeMode="tail"
                  >
                    "{item.text.replace(/{{note:[0-9]+}}/g, '').trim()}"
                  </Text>
                )}

                {/* Social Action Footer: Like, Comment and Options Menu */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTopWidth: 1,
                    borderTopColor: '#F3F4F6',
                    paddingTop: 10,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => onToggleHighlightLike?.(item.id, currentUser?.uid || '')}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                      activeOpacity={0.7}
                    >
                      <Heart
                        size={18}
                        color={(item as any).likedBy?.includes(currentUser?.uid || '') ? '#FF759E' : '#6B7280'}
                        fill={(item as any).likedBy?.includes(currentUser?.uid || '') ? '#FF759E' : 'transparent'}
                      />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: (item as any).likedBy?.includes(currentUser?.uid || '') ? '#FF759E' : '#6B7280' }}>
                        {Math.max(0, (item as any).likes || 0)}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({
                          pathname: '/comment-thread',
                          params: {
                            targetType: 'church_highlight',
                            targetId: item.id,
                            title: reference,
                          },
                        })
                      }
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                      activeOpacity={0.7}
                    >
                      <MessageCircle size={18} color="#6B7280" />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B7280' }}>
                        {(item as any).commentCount || 0}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => handleOptionsPress(item)}
                    style={{ padding: 4 }}
                    activeOpacity={0.7}
                    hitSlop={8}
                  >
                    <MoreVertical size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </SoftCard>
            </BounceCard>
          );
        })}

        {highlights.length > visibleCount && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            activeOpacity={0.8}
          >
            <Text style={styles.loadMoreText}>Show More Highlights ({highlights.length - visibleCount} remaining)</Text>
            <ChevronDown size={14} color="#3B82F6" />
          </TouchableOpacity>
        )}
      </View>
    );
  }, [
    highlights,
    displayedHighlights,
    highlightsLoading,
    visibleCount,
    handleConfirmRemove,
    handleOpenBiblePassage,
    handleShareHighlight,
    handleOptionsPress,
    router,
    activeTab,
    userProfile,
    currentUser,
  ]);

  const handleToggleNoteLike = async (note: DashboardNoteItem) => {
    if (!currentUser) return;
    try {
      const isSermon = note._type === 'sermon';
      if (!isSermon) {
        onToggleNoteLike?.(note.id, currentUser.uid); // Optimistic UI update
        await bibleNoteRepository.toggleLike(note.id, currentUser.uid);
      }
    } catch (e) {
      console.error(e);
      onToggleNoteLike?.(note.id, currentUser.uid); // Revert on failure
    }
  };

  const handleNoteOptionsPress = (note: DashboardNoteItem) => {
    const isSermon = note._type === 'sermon';
    
    let reference = '';
    if (!isSermon && note.scriptures && note.scriptures.length > 0) {
      reference = note.scriptures.map((s: any) => {
        const fullBookName = getHumanReadableBookName(s.bookId);
        const verseStr = s.verseStart === s.verseEnd ? s.verseStart : `${s.verseStart}-${s.verseEnd}`;
        return `${fullBookName} ${s.chapter}:${verseStr}`;
      }).join('; ');
    } else if (isSermon) {
      reference = 'Sermon Note';
    }

    const options = ['Cancel', 'Share Note', 'Delete Note'];

    const handleAction = async (buttonIndex: number) => {
      if (buttonIndex === 1) {
        if (shareImageGeneratorRef.current) {
          await shareImageGeneratorRef.current.captureAndShare(note);
        } else {
          Share.share({ message: `${reference}\n\n${note.content || ''}` });
        }
      } else if (buttonIndex === 2) {
        Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive', 
            onPress: () => {
              if (onRemoveNote) onRemoveNote(note.id);
              if (isSermon) {
                sermonRepository.deleteNote(note.id).catch(console.error);
              } else {
                bibleNoteRepository.deleteNote(note.id).catch(console.error);
              }
            }
          },
        ]);
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        handleAction
      );
    } else {
      Alert.alert('Note Options', reference, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: () => handleAction(1) },
        { text: 'Delete', style: 'destructive', onPress: () => handleAction(2) },
      ]);
    }
  };

  // Memoized Notes Items
  const renderedNotes = useMemo(() => {
    if (notesLoading) {
      return <Text style={styles.loadingText}>Loading notes...</Text>;
    }
    if (notes.length === 0) {
      if (activeTab !== 'notes') return null;
      return (
        <SoftCard style={styles.emptyCard}>
          <View style={styles.emptyContainer}>
            <BookOpen size={32} color="#9CA3AF" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>No Notes Yet</Text>
            <Text style={styles.emptySubtitle}>Your personal notes will appear here.</Text>
          </View>
        </SoftCard>
      );
    }
    return notes.map((note) => {
      const isSermon = note._type === 'sermon';
      
      let reference = '';
      let firstReference = '';
      let textSnapshot = '';
      if (!isSermon && note.scriptures && note.scriptures.length > 0) {
        reference = note.scriptures.map((s: any) => {
          const fullBookName = getHumanReadableBookName(s.bookId);
          const verseStr = s.verseStart === s.verseEnd ? s.verseStart : `${s.verseStart}-${s.verseEnd}`;
          return `${fullBookName} ${s.chapter}:${verseStr}`;
        }).join(', ');
        
        const s0 = note.scriptures[0];
        const fullBookName0 = getHumanReadableBookName(s0.bookId);
        const verseStr0 = s0.verseStart === s0.verseEnd ? s0.verseStart : `${s0.verseStart}-${s0.verseEnd}`;
        firstReference = `${fullBookName0} ${s0.chapter}:${verseStr0}`;

        textSnapshot = note.scriptures[0].textSnapshot || '';
      }

      const timeAgoStr = note.createdAt ? formatPrayerTimeAgo(note.createdAt as any) : 'Just now';

      return (
        <BounceCard 
          key={note.id} 
          style={{ marginBottom: 12 }} 
          activeOpacity={0.85}
          onPress={() => router.push(`/comment-thread?targetType=${isSermon ? 'sermon_note' : 'bible_note'}&targetId=${note.id}` as any)}
        >
          <SoftCard innerStyle={{ padding: 16 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#E5E7EB',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                  overflow: 'hidden',
                }}
              >
                {userProfile?.photoUrl || currentUser?.photoURL ? (
                  <Image
                    source={{ uri: userProfile?.photoUrl || currentUser?.photoURL! }}
                    style={{ width: 36, height: 36, borderRadius: 18 }}
                  />
                ) : (
                  <User size={20} color="#9CA3AF" />
                )}
              </View>
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 14, color: '#111827', lineHeight: 20 }}>
                    <Text style={{ fontWeight: '700', color: '#111827' }}>You</Text>
                    <Text style={{ color: '#4B5563', fontWeight: '400' }}> added a note on </Text>
                    <Text style={{ fontWeight: '800', color: '#111827' }}>{reference || (isSermon ? 'a Sermon' : 'a Bible passage')}</Text>
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '500' }}>{timeAgoStr}</Text>
                  {('visibility' in note && note.visibility === 'private') && (
                    <>
                      <Text style={{ fontSize: 11, color: '#9CA3AF', marginHorizontal: 6 }}>•</Text>
                      <BookOpen size={10} color="#9CA3AF" style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Private</Text>
                    </>
                  )}
                </View>
              </View>
            </View>

            {/* Blockquote for Scripture */}
            {!isSermon && textSnapshot ? (
              <View style={{ borderLeftWidth: 3, borderLeftColor: '#FF6596', paddingLeft: 12, marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: '#4B5563',
                    lineHeight: 20,
                    fontStyle: 'italic',
                  }}
                  numberOfLines={3}
                  ellipsizeMode="tail"
                >
                  "{textSnapshot.replace(/{{note:[0-9]+}}/g, '').trim()}"
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 8 }}>
                  {firstReference}
                </Text>
              </View>
            ) : null}

            {/* Note Content */}
            {!!note.content && (
              <View style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <Text 
                  style={{ fontSize: 14, color: '#374151', lineHeight: 22 }}
                  numberOfLines={4}
                  ellipsizeMode="tail"
                >
                  {note.content}
                </Text>
              </View>
            )}

            {/* Action Footer */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTopWidth: 1,
                borderTopColor: '#F3F4F6',
                paddingTop: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <TouchableOpacity 
                  accessibilityRole="button" 
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  onPress={() => handleToggleNoteLike(note)}
                >
                  <Heart 
                    size={18} 
                    color={(note as any).likedBy?.includes(currentUser?.uid || '') ? '#FF759E' : '#6B7280'} 
                    fill={(note as any).likedBy?.includes(currentUser?.uid || '') ? '#FF759E' : 'transparent'}
                  />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: (note as any).likedBy?.includes(currentUser?.uid || '') ? '#FF759E' : '#6B7280' }}>
                    {Math.max(0, (note as any).likes || 0)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  accessibilityRole="button" 
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  onPress={() => router.push(`/comment-thread?targetType=${isSermon ? 'sermon_note' : 'bible_note'}&targetId=${note.id}` as any)}
                >
                  <MessageCircle size={18} color="#6B7280" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B7280' }}>
                    {(note as any).commentCount || 0}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity accessibilityRole="button" style={{ padding: 4 }} onPress={() => handleNoteOptionsPress(note)}>
                <MoreVertical size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </SoftCard>
        </BounceCard>
      );
    });
  }, [notes, notesLoading, activeTab]);

  // Memoized Prayers Items
  const renderedPrayers = useMemo(() => {
    if (prayersLoading) {
      return <Text style={styles.loadingText}>Loading prayers...</Text>;
    }
    if (prayers.length === 0) {
      if (activeTab !== 'prayers') return null;
      return (
        <SoftCard style={styles.emptyCard}>
          <View style={styles.emptyContainer}>
            <Heart size={32} color="#9CA3AF" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>No Prayers Yet</Text>
            <Text style={styles.emptySubtitle}>Your prayer requests will appear here.</Text>
          </View>
        </SoftCard>
      );
    }
    return prayers.map((prayer) => {
      const timeAgoStr = prayer.createdAt ? formatPrayerTimeAgo(prayer.createdAt as any) : 'Just now';

      return (
        <BounceCard
          key={prayer.id}
          style={{ marginBottom: 12 }}
          activeOpacity={0.85}
          onPress={() => router.push(`/comment-thread?targetType=prayer_request&targetId=${prayer.id}` as any)}
        >
          <SoftCard innerStyle={{ padding: 16 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#E5E7EB',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                  overflow: 'hidden',
                }}
              >
                {userProfile?.photoUrl || currentUser?.photoURL ? (
                  <Image
                    source={{ uri: userProfile?.photoUrl || currentUser?.photoURL! }}
                    style={{ width: 36, height: 36, borderRadius: 18 }}
                  />
                ) : (
                  <User size={20} color="#9CA3AF" />
                )}
              </View>
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 14, color: '#111827', lineHeight: 20 }}>
                    <Text style={{ fontWeight: '700', color: '#111827' }}>You</Text>
                    <Text style={{ color: '#4B5563', fontWeight: '400' }}> posted a prayer request </Text>
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '500' }}>{timeAgoStr}</Text>
                  {prayer.answered && (
                    <>
                      <Text style={{ fontSize: 11, color: '#9CA3AF', marginHorizontal: 6 }}>•</Text>
                      <Text style={{ fontSize: 11, color: '#4ADE80', fontWeight: '700' }}>Answered</Text>
                    </>
                  )}
                </View>
              </View>
            </View>

            {/* Prayer Content */}
            {!!prayer.title && (
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 }}>
                {prayer.title}
              </Text>
            )}
            {!!prayer.request && (
              <View style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <Text
                  style={{ fontSize: 14, color: '#374151', lineHeight: 22 }}
                  numberOfLines={4}
                  ellipsizeMode="tail"
                >
                  {prayer.request}
                </Text>
              </View>
            )}

            {/* Action Footer */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTopWidth: 1,
                borderTopColor: '#F3F4F6',
                paddingTop: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  activeOpacity={0.7}
                >
                  <Heart
                    size={18}
                    color={(prayer.likedBy || []).includes(currentUser?.uid || '') ? '#FF759E' : '#6B7280'}
                    fill={(prayer.likedBy || []).includes(currentUser?.uid || '') ? '#FF759E' : 'transparent'}
                  />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: (prayer.likedBy || []).includes(currentUser?.uid || '') ? '#FF759E' : '#6B7280' }}>
                    {Math.max(0, prayer.likes || 0)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  onPress={() => router.push(`/comment-thread?targetType=prayer_request&targetId=${prayer.id}` as any)}
                >
                  <MessageCircle size={18} color="#6B7280" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B7280' }}>
                    {prayer.commentCount || 0}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity accessibilityRole="button" style={{ padding: 4 }} onPress={() => {}}>
                <MoreVertical size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </SoftCard>
        </BounceCard>
      );
    });
  }, [prayers, prayersLoading, activeTab, currentUser, userProfile, router]);

  // Memoized Plans Items
  const renderedPlans = useMemo(() => {
    if (plansLoading) {
      return <Text style={styles.loadingText}>Loading plans...</Text>;
    }
    if (activePlans.length === 0) {
      if (activeTab !== 'plans') return null;
      return (
        <SoftCard style={styles.emptyCard}>
          <View style={styles.emptyContainer}>
            <Calendar size={32} color="#9CA3AF" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>No Active Plans Yet</Text>
            <Text style={styles.emptySubtitle}>Active reading plans will appear here.</Text>
          </View>
        </SoftCard>
      );
    }
    return activePlans.map((plan) => {
      const meta = plansMeta.find((p) => p.id === plan.planId);
      const title = meta?.title || 'Bible Reading Plan';
      const progressPercent = Math.min(
        100,
        plan.progressPercentage ??
          Math.round(((plan.completedDaysCount || 0) / (meta?.durationDays || plan.totalDays || 30)) * 100)
      );

      return (
        <BounceCard
          key={plan.id}
          style={{ marginBottom: 10 }}
          onPress={() => router.push(`/bible-plans/${plan.planId}` as any)}
          activeOpacity={0.8}
        >
          <SoftCard>
            <View style={styles.sideBarCardContainer}>
              <View style={[styles.sideAccentBar, { backgroundColor: '#3B82F6' }]} />
              <View style={styles.sideBarCardContent}>
                <View style={styles.planHeader}>
                  <View style={styles.planIconBox}>
                    <Calendar size={16} color="#3B82F6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planTitle}>{title}</Text>
                    <Text style={styles.planSubtitle}>{progressPercent}% completed</Text>
                  </View>
                  <ChevronRight size={18} color="#C1C7D0" />
                </View>

                <View style={styles.progressBarBg}>
                  <LinearGradient
                    colors={['#3B82F6', '#60A5FA']}
                    style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </View>
              </View>
            </View>
          </SoftCard>
        </BounceCard>
      );
    });
  }, [activePlans, plansLoading, plansMeta, router, activeTab]);

  const handleTabChange = useCallback((key: ActivityTabKey) => {
    setActiveTab(key);
  }, []);

  return (
    <View style={styles.container}>
      <ShareImageGenerator ref={shareImageGeneratorRef} />
      <Text style={styles.sectionTitle}>My Activity</Text>

      {/* Instant Tab Bar Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScroll}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabChip, isActive && styles.activeTabChip]}
              onPress={() => handleTabChange(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabChipText, isActive && styles.activeTabChipText]}>
                {tab.label}
              </Text>
              <View style={[styles.badge, isActive && styles.activeBadge]}>
                <Text style={[styles.badgeText, isActive && styles.activeBadgeText]}>
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Feed Area */}
      <View style={styles.feedBody}>
        {activeTab === 'all' && (
          <View>
            {highlights.length === 0 && notes.length === 0 && prayers.length === 0 && activePlans.length === 0 ? (
              <SoftCard style={styles.emptyCard}>
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No Activity Records</Text>
                  <Text style={styles.emptySubtitle}>Your recent activity will be displayed here.</Text>
                </View>
              </SoftCard>
            ) : (
              <>
                {renderedHighlights}
                {renderedNotes}
                {renderedPrayers}
                {renderedPlans}
              </>
            )}
          </View>
        )}

        {activeTab === 'highlights' && renderedHighlights}
        {activeTab === 'notes' && renderedNotes}
        {activeTab === 'prayers' && renderedPrayers}
        {activeTab === 'plans' && renderedPlans}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  tabsScroll: { gap: 8, paddingBottom: 12 },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeTabChip: { backgroundColor: '#111827', borderColor: '#111827' },
  tabChipText: { fontSize: 13, fontWeight: '700', color: '#4B5563' },
  activeTabChipText: { color: '#FFFFFF' },
  badge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeBadge: { backgroundColor: 'rgba(255,255,255,0.25)' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  activeBadgeText: { color: '#FFFFFF' },

  feedBody: { gap: 8 },
  loadingText: { fontSize: 13, color: '#6B7280', fontStyle: 'italic', paddingVertical: 16, textAlign: 'center' },

  sideBarCardContainer: {
    flexDirection: 'row',
    minHeight: 60,
  },
  sideAccentBar: {
    width: 4,
    height: '100%',
  },
  sideBarCardContent: {
    flex: 1,
    padding: 12,
  },

  emptyCard: { paddingVertical: 20 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 4 },
  emptySubtitle: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginBottom: 14 },
  emptyActionBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
  },
  emptyActionBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  highlightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  highlightReference: { fontSize: 14, fontWeight: '800', color: '#111827' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { padding: 2 },
  scriptureText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#374151',
    lineHeight: 18,
    marginVertical: 2,
  },
  scriptureTextFallback: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', marginVertical: 2 },

  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  noteIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteDate: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  noteBody: { fontSize: 13, color: '#111827', lineHeight: 18 },

  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  planIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  planSubtitle: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  progressBarBg: {
    height: 5,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 3 },

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
    padding: 12,
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
    lineHeight: 20,
    fontStyle: 'italic',
    marginTop: 2,
  },

  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 8,
    gap: 6,
  },
  loadMoreText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
});
