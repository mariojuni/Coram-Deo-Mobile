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
import { BounceCard } from '../../../../components/ui/BounceCard';
import { SoftCard, getSoftShadowStyle } from '../../../../components/ui/SoftCard';
import { churchHighlightRepository, type ChurchHighlightPost } from '../../../../features/bible/data/churchHighlight.repository';
import { CommentButton } from '../../../../features/comments/presentation/components/CommentButton';
import { formatPrayerTimeAgo, getFilteredPrayers } from '../../../../features/prayer/domain/prayer.selectors';
import type { Prayer, PrayerFilter } from '../../../../features/prayer/domain/prayer.types';
import { usePrayerFeed } from '../../../../features/prayer/presentation/hooks/usePrayerFeed';
import type { Schedule } from '../../../../features/schedule/domain/schedule.types';
import { sermonRepository } from '../../../../features/sermons/data/sermon.repository';
import type { SermonNote } from '../../../../features/sermons/domain/sermon.types';
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

let isLocalHighlightsSynced = false;







export function FeedsTab({ searchQuery }: SubScreenProps) {
    const members = useMemberStore((state) => state.members);
  const userProfile = useAuthStore((state) => state.userProfile);
  const currentUser = useAuthStore((s) => s.currentUser);
  const router = useRouter();
  const navDebounceRef = useRef(false);
  const openPrayerModal = useUIStore((state) => state.openPrayerModal);

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

  useEffect(() => {
    if (!userProfile?.churchId) {
      return;
    }

    if (!isLocalHighlightsSynced) {
      isLocalHighlightsSynced = true;
      InteractionManager.runAfterInteractions(async () => {
        try {
          const { getUserPreferences, fetchChapterData } = await import('@/features/bible/data/bible.repository');
          const prefs = await getUserPreferences();
          const rawHighlights = (prefs as any)?.highlights || {};
          const activeTranslation = (prefs as any)?.activeTranslation || '2692';

          for (const [passageId, verses] of Object.entries(rawHighlights)) {
            if (!verses || typeof verses !== 'object') continue;
            const [book, chapter] = passageId.split('.');
            const parsedChapter = parseInt(chapter, 10) || 1;

            let chapterData: any[] = [];
            try {
              chapterData = (await fetchChapterData(activeTranslation, passageId)) || [];
            } catch (_) { }

            const timeMap: Record<string, { vNum: number; color: string; createdAt?: string }[]> = {};
            for (const [verseStr, val] of Object.entries(verses as Record<string, any>)) {
              const vNum = parseInt(verseStr, 10);
              if (isNaN(vNum)) continue;
              let color = String(val);
              let createdAt = '';
              if (typeof val === 'object' && val !== null) {
                color = String(val.color || 'yellow');
                createdAt = val.createdAt || '';
              }
              const groupKey = `${color}_${createdAt || 'legacy'}`;
              if (!timeMap[groupKey]) timeMap[groupKey] = [];
              timeMap[groupKey].push({ vNum, color, createdAt });
            }

            for (const verseItems of Object.values(timeMap)) {
              if (verseItems.length === 0) continue;
              verseItems.sort((a, b) => a.vNum - b.vNum);
              const color = verseItems[0].color;

              const ranges: string[] = [];
              let rangeStart = verseItems[0].vNum;
              let prev = verseItems[0].vNum;

              for (let i = 1; i < verseItems.length; i++) {
                const curr = verseItems[i].vNum;
                if (curr === prev + 1) {
                  prev = curr;
                } else {
                  ranges.push(rangeStart === prev ? `${rangeStart}` : `${rangeStart}-${prev}`);
                  rangeStart = curr;
                  prev = curr;
                }
              }
              ranges.push(rangeStart === prev ? `${rangeStart}` : `${rangeStart}-${prev}`);
              const label = ranges.join(',');

              const combinedTexts: string[] = [];
              const vNumbers: number[] = [];
              for (const item of verseItems) {
                vNumbers.push(item.vNum);
                const textObj = chapterData.find((v: any) => parseInt(String(v.verseNumber), 10) === item.vNum);
                if (textObj?.content) {
                  const cleanContent = textObj.content.replace(/{{note:[0-9]+}}/g, '').trim();
                  combinedTexts.push(cleanContent);
                }
              }

              const userName = userProfile?.firstName
                ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim()
                : currentUser?.displayName || 'Member';

              await churchHighlightRepository.publishChurchHighlight({
                churchId: userProfile?.churchId || '',
                userId: currentUser?.uid || '',
                userName,
                userPhotoUrl: userProfile?.photoUrl || currentUser?.photoURL || undefined,
                passageId,
                bookName: book,
                chapter: parsedChapter,
                verseNumber: verseItems[0].vNum,
                verseRangeLabel: label,
                verseNumbers: vNumbers,
                color,
                text: combinedTexts.join(' '),
              });
            }
          }
        } catch (err) {
          console.warn('Failed to sync local highlights:', err);
        }
      });
    }
  }, [currentUser?.displayName, currentUser?.photoURL, currentUser?.uid, userProfile?.churchId, userProfile?.firstName, userProfile?.lastName, userProfile?.photoUrl]);

  const filteredHighlights = useMemo(() => {
    const nonKeys = churchHighlights.filter((h) => h.text && h.text.trim().length > 0);
    if (!searchQuery) return nonKeys;
    const query = searchQuery.toLowerCase();
    return nonKeys.filter(
      (h) =>
        h.userName.toLowerCase().includes(query) ||
        h.bookName.toLowerCase().includes(query) ||
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

  const handleToggleLike = (post: ChurchHighlightPost) => {
    if (!currentUser?.uid || !post.churchId) return;
    const isLiked = post.likedBy?.includes(currentUser.uid);
    churchHighlightRepository.toggleHighlightLike(post.churchId, post.id, currentUser.uid, !!isLiked);
  };

  const handleOptionsPress = (post: ChurchHighlightPost) => {
    const reference = `${post.bookName} ${post.chapter}:${post.verseRangeLabel}`;
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
        (buttonIndex) => {
          if (buttonIndex === 1) {
            Share.share({ message: `"${post.text}" - ${reference}` });
          } else if (buttonIndex === 2 && isOwner) {
            Alert.alert('Delete Highlight', 'Are you sure you want to delete this highlight post?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => churchHighlightRepository.deleteHighlight(post.churchId, post.id) },
            ]);
          }
        }
      );
    } else {
      const alertButtons: any[] = [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: () => Share.share({ message: `"${post.text}" - ${reference}` }) },
      ];
      if (isOwner) {
        alertButtons.push({
          text: 'Delete',
          style: 'destructive',
          onPress: () => churchHighlightRepository.deleteHighlight(post.churchId, post.id),
        });
      }
      Alert.alert('Highlight Options', reference, alertButtons);
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

  const renderHighlightPost = (post: ChurchHighlightPost) => {
    const reference = `${post.bookName} ${post.chapter}:${post.verseRangeLabel}`;
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
              "{post.text.replace(/{{note:[0-9]+}}/g, '').trim()}"
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

              <TouchableOpacity
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

            <TouchableOpacity
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

  const renderNoteItem = (note: SermonNote) => (
    <SoftCard key={`n-${note.id}`} style={{ marginBottom: 12 }}>
      <View style={membersStyles.noteCardInner}>
        <View style={[membersStyles.noteSideBar, { backgroundColor: '#8B5CF6' }]} />
        <View style={membersStyles.noteCardContent}>
          <View style={membersStyles.noteHeaderRow}>
            <View style={membersStyles.noteIconBox}>
              <BookOpen size={14} color="#8B5CF6" />
            </View>
            <Text style={membersStyles.noteDateText}>
              {note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'Note'}
            </Text>
          </View>
          <Text style={membersStyles.noteBodyText} numberOfLines={4}>
            {note.content}
          </Text>
        </View>
      </View>
    </SoftCard>
  );

  const filterTabs = [
    { key: 'all', label: 'All', count: allCount, icon: Layers },
    { key: 'prayers', label: 'Prayers', count: prayersCount, icon: HeartHandshake },
    { key: 'highlights', label: 'Highlights', count: highlightsCount, icon: Bookmark },
    { key: 'notes', label: 'Notes', count: notesCount, icon: BookOpen },
  ];

  return (
    <View style={membersStyles.wrap}>
      {(todayBirthdays.length > 0 || upcomingBirthdays.length > 0) && (
        <SoftCard style={membersStyles.birthdaySnapshotOuter} innerStyle={membersStyles.birthdaySnapshotCard}>
          <LinearGradient
            colors={['#FFD1DF', '#E8D4FF', '#D4E4FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Orbs */}
          <View style={membersStyles.snapshotOrb1} />
          <View style={membersStyles.snapshotOrb2} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#FF759E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}>
                <Cake size={20} color="#FF759E" />
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#1F2937' }}>
                Celebrations
              </Text>
            </View>
            <TouchableOpacity 
              style={{
                borderRadius: 20,
                shadowColor: '#FF759E',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
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
                <BlurView intensity={65} tint="light" style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#FF759E' }}>View All</Text>
                  <ChevronRight size={14} color="#FF759E" />
                </BlurView>
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
                  <BlurView intensity={65} tint="light" style={{
                    padding: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  }}>
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
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#1F2937' }} numberOfLines={1}>
                        {formatMemberName(m)}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#FF759E', fontWeight: '800', marginTop: 1 }}>
                        TODAY
                      </Text>
                    </View>
                  </BlurView>
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
                  <BlurView intensity={45} tint="light" style={{
                    padding: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  }}>
                    <ExpoImage
                      source={{ uri: m.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formatMemberName(m))}&background=f0f0f0&color=999` }}
                      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6' }}
                      cachePolicy="memory-disk"
                      transition={150}
                    />
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151' }} numberOfLines={1}>
                        {formatMemberName(m)}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '500', marginTop: 1 }} numberOfLines={1}>
                        {formatBirthday(m)}
                      </Text>
                    </View>
                  </BlurView>
                </View>
              </View>
            ))}
          </ScrollView>
        </SoftCard>
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
            <TouchableOpacity
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
          {highlightsLoading || prayersLoading || notesLoading ? (
            <View style={placeholder.wrap}>
              <Text style={placeholder.subtitle}>Loading community activity...</Text>
            </View>
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
          {highlightsLoading ? (
            <View style={placeholder.wrap}>
              <Text style={placeholder.subtitle}>Loading church highlights...</Text>
            </View>
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
                <TouchableOpacity
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
          {prayersLoading ? (
            <View style={placeholder.wrap}>
              <Text style={placeholder.subtitle}>Loading prayer requests...</Text>
            </View>
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
          {notesLoading ? (
            <View style={placeholder.wrap}>
              <Text style={placeholder.subtitle}>Loading notes...</Text>
            </View>
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

