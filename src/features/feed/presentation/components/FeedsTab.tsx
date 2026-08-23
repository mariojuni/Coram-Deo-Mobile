import { SubScreenProps, PrayerCardItem, membersStyles, placeholder } from '../../../../app/(tabs)/community';
import { canModeratePrayerRequests } from '@/permissions/mobilePermissions';
import { BlurView } from 'expo-blur';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useGlobalSearchParams, useLocalSearchParams, useRouter } from 'expo-router';
import {
  BookOpen,
  Bookmark,
  Cake,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Heart,
  HeartHandshake,
  HelpCircle,
  Layers,
  MapPin,
  MessageCircle,
  MoreVertical,
  Music,
  PlayCircle,
  Search,
  User,
  Users,
  X,
  XCircle
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Dimensions,
  InteractionManager,
  LayoutAnimation,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventDetailsModal } from '../../../../components/Events/EventDetailsModal';
import { CommunitySongDetailModal } from '../../../../components/Worship/CommunitySongDetailModal';
import { FeedListSkeleton } from '../../../../components/ui/FeedItemSkeleton';
import { ApiErrorState } from '../../../../components/ui/ApiErrorState';
import { BounceCard } from '../../../../components/ui/BounceCard';
import { SoftCard, getSoftShadowStyle } from '../../../../components/ui/SoftCard';
import { bibleHighlightRepository } from '../../../../features/bibleHighlights/data/bibleHighlight.repository';
import type { BibleHighlight } from '../../../../features/bibleHighlights/domain/bibleHighlight.types';
import { CommentButton } from '../../../../features/comments/presentation/components/CommentButton';
import { formatPrayerTimeAgo, getFilteredPrayers } from '../../../../features/prayer/domain/prayer.selectors';
import type { Prayer, PrayerFilter } from '../../../../features/prayer/domain/prayer.types';
import { usePrayerFeed } from '../../../../features/prayer/presentation/hooks/usePrayerFeed';
import type { Schedule } from '../../../../features/schedule/domain/schedule.types';
import { sermonRepository } from '../../../../features/sermons/data/sermon.repository';
import type { SermonNote } from '../../../../features/sermons/domain/sermon.types';
import type { FeedNoteItem } from '../../../../store/useFeedStore';
import { SermonsExperience } from '../../../../features/sermons/presentation/components/SermonsExperience';
import { worshipRepository } from '../../../../features/worship/data/worship.repository';
import { Song } from '../../../../features/worship/domain/worship.types';
import {
  canViewCommunitySongs,
  canViewLyricsInDirectory,
  canViewSongInDirectory,
} from '../../../../permissions/communitySongsPermissions';
import { useAuthStore } from '../../../../store/useAuthStore';
import { useMinistryStore } from '../../../../store/useMinistryStore';
import {
  getUpcomingSchedules,
  getUserRsvpStatus,
  parseTimeTo24h,
  updateRsvp,
  useScheduleStore,
} from '../../../../store/useScheduleStore';
import { useUIStore } from '../../../../store/useUIStore';
import { CommunityMemberTabFilter, CombinedFeedItem } from '../../domain/feed.types';
import { parseFeedTimestamp } from '../../domain/feed.utils';
import { formatBirthday, formatMemberName, parseMemberDate } from '../../../../features/member/domain/member.utils';
import type { Member } from '../../../../features/member/domain/member.types';
import { useMemberStore } from '../../../../store/useMemberStore';
import { useFeedStore } from '../../../../store/useFeedStore';
import { bibleNoteRepository } from '@/features/bibleNotes/data/bibleNote.repository';
import { getHumanReadableBookName } from '@/utils/scriptureReferenceParser';
import { ShareImageGenerator, ShareImageGeneratorRef } from '../../../../components/Share/ShareImageGenerator';









export function FeedsTab({ searchQuery }: SubScreenProps) {
    const members = useMemberStore((state) => state.members);
  const userProfile = useAuthStore((state) => state.userProfile);
  const currentUser = useAuthStore((s) => s.currentUser);
  const router = useRouter();
  const navDebounceRef = useRef(false);
  const openPrayerModal = useUIStore((state) => state.openPrayerModal);
  const shareImageGeneratorRef = useRef<ShareImageGeneratorRef>(null);

  const { filter } = useLocalSearchParams();
  const [activeTabFilter, setActiveTabFilter] = useState<CommunityMemberTabFilter>(
    (filter as CommunityMemberTabFilter) || 'all'
  );

  useEffect(() => {
    if (filter && ['all', 'prayers', 'highlights', 'notes'].includes(filter as string)) {
      setActiveTabFilter(filter as CommunityMemberTabFilter);
    }
  }, [filter]);

  const { todayBirthdays, upcomingBirthdays } = useMemo(() => {
    const today = new Date();
    const curMonth = today.getMonth() + 1;
    const curDay = today.getDate();

    const canSeeLeadersOnly = userProfile?.role === 'pastor' || userProfile?.role === 'church_admin' || userProfile?.role === 'super_admin';

    const validMembers = members.filter(m => {
      if (m.status === 'inactive') return false;

      const visibility = m.birthdayVisibility || 'members_only';
      if (visibility === 'hidden') return false;
      if (visibility === 'leaders_only' && !canSeeLeadersOnly) return false;

      return parseMemberDate(m) !== null;
    });

    const parsedMembers = validMembers.map(m => {
      const d = parseMemberDate(m)!;
      return { ...m, parsedMonth: d.m, parsedDay: d.d } as Member & { parsedMonth: number, parsedDay: number };
    });

    const todayBirthdays = parsedMembers.filter(m => m.parsedMonth === curMonth && m.parsedDay === curDay);

    const nextMonth = curMonth === 12 ? 1 : curMonth + 1;
    const allUpcoming = parsedMembers
      .filter(m =>
        (m.parsedMonth === curMonth && m.parsedDay > curDay) ||
        (m.parsedMonth === nextMonth)
      )
      .sort((a, b) => {
        if (a.parsedMonth !== b.parsedMonth) return a.parsedMonth - b.parsedMonth;
        return a.parsedDay - b.parsedDay;
      });

    return {
      todayBirthdays,
      upcomingBirthdays: allUpcoming.slice(0, 3)
    };
  }, [members, userProfile]);

  // 1. Highlights
  const churchHighlights = useFeedStore((s) => s.churchHighlights);
  const highlightsLoading = useFeedStore((s) => s.highlightsLoading);
  const pageLimit = useFeedStore((s) => s.pageLimit);
  const hasMore = useFeedStore((s) => s.hasMoreHighlights);
  const loadMoreHighlights = useFeedStore((s) => s.loadMoreHighlights);

  // 2. Prayers
  const prayerItems = useFeedStore((s) => s.prayers);
  const prayersLoading = useFeedStore((s) => s.prayersLoading);
  const { togglePrayerLike, togglePrayerAnswered, deletePrayer } = usePrayerFeed();

  // 3. Notes
  const notes = useFeedStore((s) => s.notes);
  const notesLoading = useFeedStore((s) => s.notesLoading);
  const toggleNoteLikeStore = useFeedStore((s) => s.toggleNoteLike);

  // 4. Global Error State
  const feedError = useFeedStore((s) => s.feedError);
  const retryFeeds = useFeedStore((s) => s.retryFeeds);



  const filteredHighlights = useMemo(() => {
    const nonKeys = churchHighlights.filter((h) => h.text && h.text.trim().length > 0);
    if (!searchQuery) return nonKeys;
    const query = searchQuery.toLowerCase();
    return nonKeys.filter(
      (h) =>
        (h.userName || '').toLowerCase().includes(query) ||
        getHumanReadableBookName(h.bookName).toLowerCase().includes(query) ||
        h.text.toLowerCase().includes(query)
    );
  }, [churchHighlights, searchQuery]);

  const filteredPrayers = useMemo(() => {
    if (!prayerItems) return [];
    if (!searchQuery) return prayerItems;
    const query = searchQuery.toLowerCase();
    return prayerItems.filter(
      (p) => p.name?.toLowerCase().includes(query) || p.request?.toLowerCase().includes(query)
    );
  }, [prayerItems, searchQuery]);

  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    if (!searchQuery) return notes;
    const query = searchQuery.toLowerCase();
    return notes.filter((n) => n.content?.toLowerCase().includes(query));
  }, [notes, searchQuery]);

  const highlightsCount = filteredHighlights.length;
  const prayersCount = filteredPrayers.length;
  const notesCount = filteredNotes.length;
  const allCount = highlightsCount + prayersCount + notesCount;

  const combinedFeed = useMemo(() => {
    const items: CombinedFeedItem[] = [];
    filteredHighlights.forEach((h) => items.push({ type: 'highlight', data: h, timestamp: parseFeedTimestamp(h.createdAt) }));
    filteredPrayers.forEach((p) => items.push({ type: 'prayer', data: p, timestamp: parseFeedTimestamp(p.createdAt) }));
    filteredNotes.forEach((n) => items.push({ type: 'note', data: n, timestamp: parseFeedTimestamp(n.createdAt) }));
    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredHighlights, filteredPrayers, filteredNotes]);

  const getHighlightColorHex = (colorName: string) => {
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

  const handleToggleLike = (post: BibleHighlight) => {
    if (!currentUser?.uid || !post.churchId) return;
    bibleHighlightRepository.toggleLike(post.id, currentUser.uid);
  };

  const handleOptionsPress = (post: BibleHighlight) => {
    const reference = `${getHumanReadableBookName(post.bookName)} ${post.chapter}:${post.verseRangeLabel}`;
    const isOwner = currentUser?.uid === post.userId;

    const options = ['Cancel', 'Share Highlight'];
    if (isOwner) options.push('Delete Highlight');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: isOwner ? 2 : undefined,
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            if (shareImageGeneratorRef.current) {
              await shareImageGeneratorRef.current.captureAndShare(post, 'highlight');
            } else {
              Share.share({ message: `"${post.text}" - ${reference}` });
            }
          } else if (buttonIndex === 2 && isOwner) {
            Alert.alert('Delete Highlight', 'Are you sure you want to delete this highlight post?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => bibleHighlightRepository.deleteHighlight(post.id) },
            ]);
          }
        }
      );
    } else {
      const alertButtons: any[] = [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: async () => {
          if (shareImageGeneratorRef.current) {
            await shareImageGeneratorRef.current.captureAndShare(post, 'highlight');
          } else {
            Share.share({ message: `"${post.text}" - ${reference}` });
          }
        }},
      ];
      if (isOwner) {
        alertButtons.push({
          text: 'Delete',
          style: 'destructive',
          onPress: () => bibleHighlightRepository.deleteHighlight(post.id),
        });
      }
      Alert.alert('Highlight Options', reference, alertButtons);
    }
  };

  const removeNote = useFeedStore((s) => s.removeNote);

  const handleNoteOptionsPress = (note: FeedNoteItem) => {
    const isOwner = currentUser?.uid === note.userId;
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

    const options = ['Cancel', 'Share Note'];
    if (isOwner) options.push('Delete Note');

    const handleAction = async (buttonIndex: number) => {
      if (buttonIndex === 1) {
        if (shareImageGeneratorRef.current) {
          await shareImageGeneratorRef.current.captureAndShare(note);
        } else {
          Share.share({ message: `${reference}\n\n${note.content || ''}` });
        }
      } else if (buttonIndex === 2 && isOwner) {
        Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive', 
            onPress: () => {
              removeNote(note.id);
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
          destructiveButtonIndex: isOwner ? 2 : undefined,
          cancelButtonIndex: 0,
        },
        handleAction
      );
    } else {
      const alertButtons: any[] = [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: () => handleAction(1) },
      ];
      if (isOwner) {
        alertButtons.push({
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleAction(2),
        });
      }
      Alert.alert('Note Options', reference, alertButtons);
    }
  };

  const handleToggleNoteLike = async (note: FeedNoteItem) => {
    if (!currentUser) return;
    try {
      const isSermon = note._type === 'sermon';
      if (!isSermon) {
        toggleNoteLikeStore(note.id, currentUser.uid); // Optimistic UI update
        await bibleNoteRepository.toggleLike(note.id, currentUser.uid);
      }
    } catch (e) {
      console.error(e);
      // Revert in case of failure could be added here
      toggleNoteLikeStore(note.id, currentUser.uid); 
    }
  };

  const handlePray = async (id: string) => {
    if (!currentUser) return;
    try {
      await togglePrayerLike(id, currentUser.uid);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAnswered = async (id: string, currentValue: boolean) => {
    try {
      await togglePrayerAnswered(id, currentValue);
    } catch (err) {
      console.error(err);
    }
  };

  const renderHighlightPost = (post: BibleHighlight) => {
    const reference = `${getHumanReadableBookName(post.bookName)} ${post.chapter}:${post.verseRangeLabel}`;
    const isLiked = currentUser?.uid ? post.likedBy?.includes(currentUser.uid) : false;
    const isOwner = currentUser?.uid === post.userId;

    return (
      <BounceCard
        key={`h-${post.id}`}
        style={{ marginBottom: 12 }}
        onPress={() =>
          router.push({
            pathname: '/comment-thread',
            params: {
              targetType: 'church_highlight',
              targetId: post.id,
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
              {post.userPhotoUrl ? (
                <ExpoImage
                  source={{ uri: post.userPhotoUrl }}
                  style={{ width: 36, height: 36, borderRadius: 18 }}
                  cachePolicy="memory-disk"
                  priority="high"
                  transition={150}
                />
              ) : (
                <User size={20} color="#9CA3AF" />
              )}
            </View>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 14, color: '#111827', lineHeight: 20 }}>
                  <Text style={{ fontWeight: '700', color: '#111827' }}>
                    {isOwner ? 'You' : post.userName}
                  </Text>
                  <Text style={{ color: '#4B5563', fontWeight: '400' }}> highlighted </Text>
                  <Text style={{ fontWeight: '800', color: '#111827' }}>{reference}</Text>
                </Text>
                {isOwner && (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: getHighlightColorHex(post.color),
                      marginLeft: 6,
                    }}
                  />
                )}
              </View>
              <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '500', marginTop: 2 }}>
                {formatPrayerTimeAgo(post.createdAt)}
              </Text>
            </View>
          </View>

          {!!post.text && (
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
              &quot;{post.text.replace(/{{note:[0-9]+}}/g, '').trim()}&quot;
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
              <TouchableOpacity accessibilityRole="button"
                onPress={() => handleToggleLike(post)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                activeOpacity={0.7}
              >
                <Heart
                  size={18}
                  color={isLiked ? '#FF759E' : '#6B7280'}
                  fill={isLiked ? '#FF759E' : 'transparent'}
                />
                <Text style={{ fontSize: 13, fontWeight: '600', color: isLiked ? '#FF759E' : '#6B7280' }}>
                  {Math.max(0, post.likes || 0)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/comment-thread',
                    params: {
                      targetType: 'church_highlight',
                      targetId: post.id,
                      title: reference,
                    },
                  })
                }
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                activeOpacity={0.7}
              >
                <MessageCircle size={18} color="#6B7280" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B7280' }}>
                  {post.commentCount || 0}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity accessibilityRole="button"
              onPress={() => handleOptionsPress(post)}
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
  };

  const renderPrayerItem = (req: Prayer) => (
    <PrayerCardItem
      key={`p-${req.id}`}
      req={req}
      currentUser={currentUser}
      handlePray={handlePray}
      handleAnswered={handleAnswered}
      openPrayerModal={openPrayerModal}
      deletePrayer={deletePrayer}
    />
  );

  const renderNoteItem = (note: FeedNoteItem) => {
    const isSermon = note._type === 'sermon';
    const isOwner = currentUser?.uid === note.userId;
    
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
        key={`n-${note.id}`}
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
              {note.userPhotoUrl ? (
                <ExpoImage
                  source={{ uri: note.userPhotoUrl }}
                  style={{ width: 36, height: 36, borderRadius: 18 }}
                  cachePolicy="memory-disk"
                  priority="high"
                />
              ) : (
                <User size={20} color="#9CA3AF" />
              )}
            </View>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 14, color: '#111827', lineHeight: 20 }}>
                  <Text style={{ fontWeight: '700', color: '#111827' }}>{isOwner ? 'You' : (note.userName || 'A member')}</Text>
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
                &quot;{textSnapshot.replace(/{{note:[0-9]+}}/g, '').trim()}&quot;
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
  };

  const filterTabs = [
    { key: 'all', label: 'All', count: allCount, icon: Layers },
    { key: 'prayers', label: 'Prayers', count: prayersCount, icon: HeartHandshake },
    { key: 'notes', label: 'Notes', count: notesCount, icon: BookOpen },
    { key: 'highlights', label: 'Highlights', count: highlightsCount, icon: Bookmark },
  ];

  return (
    <View style={membersStyles.wrap}>
      <ShareImageGenerator ref={shareImageGeneratorRef} />
      {(todayBirthdays.length > 0 || upcomingBirthdays.length > 0) && (
        <View style={[membersStyles.birthdaySnapshotOuter, { boxShadow: '0px 8px 24px rgba(182, 109, 255, 0.28)', marginBottom: 10, borderRadius: 24 }]}>
          <View style={{ borderRadius: 24, overflow: 'hidden' }}>
          <LinearGradient
            colors={['#FF6596', '#B66DFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Orbs */}
          <View style={[membersStyles.snapshotOrb1, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
          <View style={[membersStyles.snapshotOrb2, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20 }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.4)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }}>
              <Cake size={14} color="#FFFFFF" />
              <Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: '#FFFFFF', textTransform: 'uppercase' }}>
                Birthdays
              </Text>
            </View>
            <TouchableOpacity accessibilityRole="button" 
              style={{
                borderRadius: 20,
              }}
              onPress={() => {
                if (navDebounceRef.current) return;
                navDebounceRef.current = true;
                router.push('/birthdays');
                setTimeout(() => { navDebounceRef.current = false; }, 500);
              }}
            >
              <View style={{
                borderRadius: 20,
                overflow: 'hidden',
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>View All</Text>
                  <ChevronRight size={14} color="#FFFFFF" />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 16, gap: 10 }}>
            {todayBirthdays.map(m => (
              <View key={`today-${m.id}`} style={{
                borderRadius: 16,
                width: 175,
              }}>
                <View style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                }}>
                  <View style={{
                    padding: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 16 }]} />
                    <View style={{ position: 'relative' }}>
                      <ExpoImage
                        source={{ uri: m.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formatMemberName(m))}&background=f0f0f0&color=999` }}
                        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFE4E6' }}
                        cachePolicy="memory-disk"
                        transition={150}
                      />
                      <View style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 2, shadowColor: '#FF759E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 }}>
                        <Cake size={10} color="#FF759E" />
                      </View>
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }} numberOfLines={1}>
                        {formatMemberName(m)}
                      </Text>
                      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '800', marginTop: 1, letterSpacing: 0.5 }}>
                        TODAY
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
            {upcomingBirthdays.map(m => (
              <View key={`up-${m.id}`} style={{
                borderRadius: 16,
                width: 175,
              }}>
                <View style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                }}>
                  <View style={{
                    padding: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 16 }]} />
                    <ExpoImage
                      source={{ uri: m.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formatMemberName(m))}&background=f0f0f0&color=999` }}
                      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6' }}
                      cachePolicy="memory-disk"
                      transition={150}
                    />
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }} numberOfLines={1}>
                        {formatMemberName(m)}
                      </Text>
                      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 1 }} numberOfLines={1}>
                        {formatBirthday(m)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
          </View>
        </View>
      )}

      {/* ─── Frost Tab Filter Bar ───────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={membersStyles.frostTabFilterScroll}
        style={membersStyles.frostTabFilterContainer}
      >
        {filterTabs.map((tab) => {
          const isActive = activeTabFilter === tab.key;
          const IconComponent = tab.icon;
          return (
            <TouchableOpacity accessibilityRole="button"
              key={tab.key}
              style={membersStyles.frostTabChipWrapper}
              onPress={() => {
                if (Platform.OS === 'ios') {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                }
                setActiveTabFilter(tab.key as any);
              }}
              activeOpacity={0.75}
            >
              <View style={[membersStyles.frostTabChip, isActive && membersStyles.activeFrostTabChip]}>
                <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    isActive ? membersStyles.activeFrostOverlay : membersStyles.inactiveFrostOverlay,
                  ]}
                  pointerEvents="none"
                />
                <IconComponent
                  size={13}
                  color={isActive ? '#FFFFFF' : '#6B7280'}
                  style={{ zIndex: 1 }}
                />
                <Text style={[membersStyles.frostTabChipText, isActive && membersStyles.activeFrostTabChipText]}>
                  {tab.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ─── Feed Content ──────────────────────────────────────────────── */}
      {activeTabFilter === 'all' && (
        <>
          {feedError ? (
            <ApiErrorState
              title="Failed to Load Activity"
              message={feedError}
              onRetry={retryFeeds}
            />
          ) : highlightsLoading || prayersLoading || notesLoading ? (
            <FeedListSkeleton count={4} />
          ) : combinedFeed.length === 0 ? (
            <View style={placeholder.wrap}>
              <Text style={placeholder.title}>No Activity Yet</Text>
              <Text style={placeholder.subtitle}>
                Prayers, verse highlights, and notes will appear here.
              </Text>
            </View>
          ) : (
            combinedFeed.map((item) => {
              if (item.type === 'highlight') return renderHighlightPost(item.data);
              if (item.type === 'prayer') return renderPrayerItem(item.data);
              if (item.type === 'note') return renderNoteItem(item.data);
              return null;
            })
          )}
        </>
      )}

      {activeTabFilter === 'highlights' && (
        <>
          {feedError ? (
            <ApiErrorState
              title="Failed to Load Highlights"
              message={feedError}
              onRetry={retryFeeds}
            />
          ) : highlightsLoading ? (
            <FeedListSkeleton count={3} />
          ) : filteredHighlights.length === 0 ? (
            <View style={placeholder.wrap}>
              <Text style={placeholder.title}>No Church Highlights Yet</Text>
              <Text style={placeholder.subtitle}>
                Verses highlighted by members while reading the Bible will appear here.
              </Text>
            </View>
          ) : (
            <>
              {filteredHighlights.map(renderHighlightPost)}
              {hasMore && (
                <TouchableOpacity accessibilityRole="button"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    padding: 16,
                    alignItems: 'center',
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}
                  onPress={() => loadMoreHighlights()}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#4B5563' }}>Load More Highlights</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </>
      )}

      {activeTabFilter === 'prayers' && (
        <>
          {feedError ? (
            <ApiErrorState
              title="Failed to Load Prayers"
              message={feedError}
              onRetry={retryFeeds}
            />
          ) : prayersLoading ? (
            <FeedListSkeleton count={3} />
          ) : filteredPrayers.length === 0 ? (
            <View style={placeholder.wrap}>
              <Text style={placeholder.title}>No Prayer Requests Yet</Text>
              <Text style={placeholder.subtitle}>
                Prayer requests submitted by church members will appear here.
              </Text>
            </View>
          ) : (
            filteredPrayers.map(renderPrayerItem)
          )}
        </>
      )}

      {activeTabFilter === 'notes' && (
        <>
          {feedError ? (
            <ApiErrorState
              title="Failed to Load Notes"
              message={feedError}
              onRetry={retryFeeds}
            />
          ) : notesLoading ? (
            <FeedListSkeleton count={3} />
          ) : filteredNotes.length === 0 ? (
            <View style={placeholder.wrap}>
              <Text style={placeholder.title}>No Notes Yet</Text>
              <Text style={placeholder.subtitle}>
                Your notes will appear here.
              </Text>
            </View>
          ) : (
            filteredNotes.map(renderNoteItem)
          )}
        </>
      )}
    </View>
  );
}

