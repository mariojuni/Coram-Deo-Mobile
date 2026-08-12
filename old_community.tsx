import { formatBirthday, formatMemberName, parseMemberDate } from '@/features/member/domain/member.utils';
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
import { EventDetailsModal } from '../../components/Events/EventDetailsModal';
import { CommunitySongDetailModal } from '../../components/Worship/CommunitySongDetailModal';
import { BounceCard } from '../../components/ui/BounceCard';
import { SoftCard, getSoftShadowStyle } from '../../components/ui/SoftCard';
import { churchHighlightRepository, type ChurchHighlightPost } from '../../features/bible/data/churchHighlight.repository';
import { CommentButton } from '../../features/comments/presentation/components/CommentButton';
import type { Member } from '../../features/member/domain/member.types';
import { formatPrayerTimeAgo, getFilteredPrayers } from '../../features/prayer/domain/prayer.selectors';
import type { Prayer, PrayerFilter } from '../../features/prayer/domain/prayer.types';
import { usePrayerFeed } from '../../features/prayer/presentation/hooks/usePrayerFeed';
import type { Schedule } from '../../features/schedule/domain/schedule.types';
import { sermonRepository } from '../../features/sermons/data/sermon.repository';
import type { SermonNote } from '../../features/sermons/domain/sermon.types';
import { SermonsExperience } from '../../features/sermons/presentation/components/SermonsExperience';
import { worshipRepository } from '../../features/worship/data/worship.repository';
import { Song } from '../../features/worship/domain/worship.types';
import {
  canViewCommunitySongs,
  canViewLyricsInDirectory,
  canViewSongInDirectory,
} from '../../permissions/communitySongsPermissions';
import { useAuthStore } from '../../store/useAuthStore';
import { useMemberStore } from '../../store/useMemberStore';
import { useMinistryStore } from '../../store/useMinistryStore';
import {
  getUpcomingSchedules,
  getUserRsvpStatus,
  parseTimeTo24h,
  updateRsvp,
  useScheduleStore,
} from '../../store/useScheduleStore';
import { useUIStore } from '../../store/useUIStore';


// ─── Sub-tab definitions ──────────────────────────────────────────────────────
const TABS = [
  { key: 'prayers', label: 'Prayers', icon: HeartHandshake },
  { key: 'events', label: 'Events', icon: CalendarDays },
  { key: 'sermons', label: 'Sermons', icon: PlayCircle },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'songs', label: 'Songs', icon: Music },
] as const;

type TabIndex = 0 | 1 | 2 | 3 | 4;
type CommunityTabParam = (typeof TABS)[number]['key'];
type SubScreenProps = { searchQuery: string };
const PRAYER_FILTERS: PrayerFilter[] = ['Recent', 'My Requests'];
const TAB_INDEX_BY_KEY: Record<CommunityTabParam, TabIndex> = {
  prayers: 0,
  events: 1,
  sermons: 2,
  members: 3,
  songs: 4,
};

function getTabIndexFromParam(tabParam: string | string[] | undefined): TabIndex | null {
  const value = Array.isArray(tabParam) ? tabParam[0] : tabParam;
  if (!value) return null;

  const key = value.toLowerCase() as CommunityTabParam;
  return key in TAB_INDEX_BY_KEY ? TAB_INDEX_BY_KEY[key] : null;
}

// ─── Placeholder sub-screen components ───────────────────────────────────────

function PrayerCardItem({ req, currentUser, handlePray, handleAnswered, openPrayerModal, deletePrayer }: { req: Prayer, currentUser: any, handlePray: (id: string) => void, handleAnswered: (id: string, currentValue: boolean) => void, openPrayerModal: (prayer: Prayer) => void, deletePrayer: (id: string) => void }) {
  const router = useRouter();
  const userProfile = useAuthStore((state) => state.userProfile);
  const isLiked = currentUser ? (req.likedBy || []).includes(currentUser.uid) : false;
  const isOwner = req.userId === currentUser?.uid;

  return (
    <BounceCard
      onPress={() => router.push({ pathname: '/comment-thread', params: { targetType: 'prayer_request', targetId: req.id } })}
      style={{ marginBottom: 12 }}
      activeOpacity={0.85}
    >
      <SoftCard innerStyle={{ padding: 16 }}>
        {/* Header Row: Avatar, Name & Meta */}
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
            {req.userPhotoUrl ? (
              <ExpoImage
                source={{ uri: req.userPhotoUrl }}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }} numberOfLines={1}>
                {isOwner ? 'You' : req.name}
              </Text>
              {(req.answered || req.status === 'answered') && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#ECFDF3',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 10,
                    gap: 4,
                  }}
                >
                  <CheckCircle2 size={10} color="#10B981" />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#10B981', textTransform: 'uppercase' }}>
                    Answered
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '500', marginTop: 2 }}>
              {formatPrayerTimeAgo(req.createdAt)}
            </Text>
          </View>
        </View>

        {/* Content Body */}
        <Text
          style={{
            fontSize: 14,
            color: '#4B5563',
            lineHeight: 20,
            marginBottom: 12,
          }}
        >
          {req.title ? <Text style={{ fontWeight: '700', color: '#111827' }}>{req.title} — </Text> : null}
          {req.request || req.content}
        </Text>

        {/* Social Action Footer: Answered Toggle, Comment, Like & Options Menu */}
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
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              activeOpacity={0.7}
              onPress={() => handlePray(req.id)}
            >
              <Heart
                size={18}
                color={isLiked ? '#FF759E' : '#6B7280'}
                fill={isLiked ? '#FF759E' : 'transparent'}
              />
              <Text style={{ fontSize: 13, fontWeight: '600', color: isLiked ? '#FF759E' : '#6B7280' }}>
                {Math.max(0, req.likes || 0)}
              </Text>
            </TouchableOpacity>

            <CommentButton
              count={req.commentCount || 0}
              variant="icon-only"
              size={18}
              color="#9CA3AF"
              onPress={() =>
                router.push({
                  pathname: '/comment-thread',
                  params: { targetType: 'prayer_request', targetId: req.id },
                })
              }
            />

            {(isOwner || canModeratePrayerRequests(userProfile)) && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                onPress={() => handleAnswered(req.id, req.answered || req.status === 'answered')}
                activeOpacity={0.7}
              >
                <CheckCircle2
                  size={18}
                  color={(req.answered || req.status === 'answered') ? '#10B981' : '#9CA3AF'}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: (req.answered || req.status === 'answered') ? '#10B981' : '#6B7280',
                  }}
                >
                  {(req.answered || req.status === 'answered') ? 'Answered' : 'Mark Answered'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {(isOwner || canModeratePrayerRequests(userProfile)) && (
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS === 'ios') {
                  ActionSheetIOS.showActionSheetWithOptions(
                    {
                      options: ['Cancel', 'Edit', 'Delete'],
                      destructiveButtonIndex: 2,
                      cancelButtonIndex: 0,
                    },
                    (buttonIndex) => {
                      if (buttonIndex === 1) {
                        openPrayerModal(req);
                      } else if (buttonIndex === 2) {
                        deletePrayer(req.id);
                      }
                    }
                  );
                } else {
                  Alert.alert('Manage Prayer Request', 'Choose an action', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Edit', onPress: () => openPrayerModal(req) },
                    { text: 'Delete', style: 'destructive', onPress: () => deletePrayer(req.id) },
                  ]);
                }
              }}
              style={{ padding: 4 }}
              activeOpacity={0.7}
              hitSlop={8}
            >
              <MoreVertical size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </SoftCard>
    </BounceCard>
  );
}

function PrayersTab({ searchQuery }: SubScreenProps) {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const openPrayerModal = useUIStore((state) => state.openPrayerModal);
  const { prayers: prayerItems, loading, togglePrayerLike, togglePrayerAnswered, deletePrayer } = usePrayerFeed();
  const [filter, setFilter] = useState<PrayerFilter>('Recent');

  const handleAnswered = async (id: string, currentValue: boolean) => {
    try {
      await togglePrayerAnswered(id, currentValue);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredRequests = useMemo(
    () => getFilteredPrayers(prayerItems, searchQuery, filter, currentUser?.uid),
    [prayerItems, searchQuery, filter, currentUser?.uid]
  );

  const prayerStats = useMemo(
    () => ({
      total: prayerItems.length,
      answered: prayerItems.filter((item) => item.answered).length,
      mine: prayerItems.filter((item) => item.userId === currentUser?.uid).length,
    }),
    [prayerItems, currentUser?.uid]
  );

  const handlePray = async (id: string) => {
    if (!currentUser) return;
    try {
      await togglePrayerLike(id, currentUser.uid);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={prayerStyles.wrap}>
      <LinearGradient
        colors={['#FFE8F1', '#F5F2FF', '#EEF6FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={prayerStyles.heroCompact}
      >
        <View style={prayerStyles.heroTopRow}>
          <View style={prayerStyles.heroBadge}>
            <Heart size={12} color="#FF759E" fill="#FF759E" />
            <Text style={prayerStyles.heroBadgeText}>Care circle</Text>
          </View>
          <View style={prayerStyles.heroCountPill}>
            <Text style={prayerStyles.heroCountText}>{prayerStats.total}</Text>
          </View>
        </View>

        <Text style={prayerStyles.heroTitleCompact}>Prayers</Text>
        <Text style={prayerStyles.heroSubtitleCompact}>
          Support requests and testimonies together.
        </Text>

        <View style={prayerStyles.quickStatsRow}>
          <View style={prayerStyles.quickStatPill}>
            <Text style={prayerStyles.quickStatValue}>{prayerStats.answered}</Text>
            <Text style={prayerStyles.quickStatLabel}>Answered</Text>
          </View>
          <View style={prayerStyles.quickStatPill}>
            <Text style={prayerStyles.quickStatValue}>{prayerStats.mine}</Text>
            <Text style={prayerStyles.quickStatLabel}>Mine</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={prayerStyles.filterRow}>
        {PRAYER_FILTERS.map((item) => (
          <TouchableOpacity
            key={item}
            style={[prayerStyles.filterPill, filter === item && prayerStyles.filterPillActive]}
            onPress={() => setFilter(item)}
            activeOpacity={0.8}
          >
            <Text style={[prayerStyles.filterPillText, filter === item && prayerStyles.filterPillTextActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={placeholder.wrap}>
          <Text style={placeholder.subtitle}>Loading prayer requests...</Text>
        </View>
      ) : filteredRequests.length === 0 ? (
        <View style={placeholder.wrap}>
          <Text style={placeholder.title}>No requests yet</Text>
          <Text style={placeholder.subtitle}>Try another filter or check back soon.</Text>
        </View>
      ) : (
        filteredRequests.map((req: Prayer) => (
          <PrayerCardItem
            key={req.id}
            req={req}
            currentUser={currentUser}
            handlePray={handlePray}
            handleAnswered={handleAnswered}
            openPrayerModal={openPrayerModal}
            deletePrayer={deletePrayer}
          />
        ))
      )}
    </View>
  );
}

function EventsTab({ searchQuery }: SubScreenProps) {
  const currentUser = useAuthStore((state) => state.currentUser);
  const schedules = useScheduleStore((state) => state.schedules);
  const schedulesLoading = useScheduleStore((state) => state.schedulesLoading);
  const initializeSchedulesListener = useScheduleStore((state) => state.initializeSchedulesListener);
  const [selectedEvent, setSelectedEvent] = useState<Schedule | null>(null);
  const { eventId } = useLocalSearchParams();
  const [activeTodaySlide, setActiveTodaySlide] = useState(0);

  const searchableEvents = useMemo(() => {
    // Only show published events in the community tab
    const activeEvents = schedules.filter((e) => e.status?.toLowerCase() === 'published');

    const query = searchQuery.trim().toLowerCase();
    if (!query) return activeEvents;

    return activeEvents.filter((event) => {
      const haystack = `${event.title} ${event.location} ${event.time}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [searchQuery, schedules]);

  useEffect(() => {
    if (eventId && searchableEvents.length > 0) {
      const targetEvent = searchableEvents.find((e) => e.id === eventId);
      if (targetEvent && targetEvent.id !== selectedEvent?.id) {
        setSelectedEvent(targetEvent);
      }
    }
  }, [eventId, searchableEvents]);
  const screenWidth = Dimensions.get('window').width;
  const heroCardHorizontalMargin = 0;

  const userProfile = useAuthStore((state) => state.userProfile);

  useEffect(() => {
    if (!userProfile?.churchId) return;
    const unsubscribe = initializeSchedulesListener();
    return () => unsubscribe();
  }, [initializeSchedulesListener, userProfile?.churchId]);

  const normalizeDateToYmd = (value: string): string | null => {
    if (!value) return null;

    const ymd = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (ymd) {
      const [, y, m, d] = ymd;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    const mdy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdy) {
      const [, m, d, y] = mdy;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    return null;
  };



  const upcomingEvents = useMemo(() => getUpcomingSchedules(searchableEvents, 20), [searchableEvents]);

  const todayString = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const todaysEvents = useMemo(
    () =>
      searchableEvents
        .filter((event) => normalizeDateToYmd(event.date) === todayString)
        .sort((a, b) => parseTimeTo24h(a.time || '9:00 AM').localeCompare(parseTimeTo24h(b.time || '9:00 AM'))),
    [searchableEvents, todayString]
  );

  const todaysEventIds = useMemo(() => new Set(todaysEvents.map((event) => event.id)), [todaysEvents]);

  const upcomingList = useMemo(
    () => upcomingEvents.filter((event) => !todaysEventIds.has(event.id)),
    [upcomingEvents, todaysEventIds]
  );

  const formatEventDate = (event: Schedule): string => {
    const normalized = normalizeDateToYmd(event.date);
    const dateValue = normalized ? new Date(`${normalized}T00:00:00`) : new Date();

    return dateValue.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getEventDateParts = (event: Schedule) => {
    const normalized = normalizeDateToYmd(event.date);
    const dateValue = normalized ? new Date(`${normalized}T00:00:00`) : new Date();

    return {
      month: dateValue.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      day: dateValue.getDate(),
      weekday: dateValue.toLocaleDateString('en-US', { weekday: 'long' }),
    };
  };

  const handleRsvp = async (eventId: string, status: 'going' | 'maybe' | 'not_going') => {
    if (!currentUser?.uid) return;
    try {
      await updateRsvp(eventId, currentUser.uid, status);
    } catch (error) {
      console.error(error);
    }
  };

  if (!schedulesLoading && todaysEvents.length === 0 && upcomingList.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
        <CalendarDays size={56} color="#FF6596" strokeWidth={1.5} />
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#1F2937', textAlign: 'center', marginBottom: 4 }}>
          No Events Yet
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 }}>
          Check back soon to connect with your community!
        </Text>
      </View>
    );
  }

  return (
    <View style={eventsStyles.wrap}>
      {schedulesLoading ? (
        <View style={placeholder.wrap}>
          <Text style={placeholder.subtitle}>Loading events...</Text>
        </View>
      ) : todaysEvents.length > 0 ? (
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={eventsStyles.heroCarousel}
            contentContainerStyle={eventsStyles.heroCarouselContent}
            onMomentumScrollEnd={(event) => {
              const slide = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
              setActiveTodaySlide(slide);
            }}
          >
            {todaysEvents.map((todayEvent) => {
              const rsvpStatus = currentUser ? getUserRsvpStatus(todayEvent, currentUser.uid) : null;
              const dateParts = getEventDateParts(todayEvent);
              return (
                <BounceCard
                  key={todayEvent.id}
                  activeOpacity={0.92}
                  onPress={() => setSelectedEvent(todayEvent)}
                  style={[eventsStyles.heroSlide, { width: screenWidth }]}
                >
                  <View style={[eventsStyles.heroCardOuter, { marginHorizontal: heroCardHorizontalMargin }]}>
                    <LinearGradient
                      colors={['#FF6596', '#B66DFF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={eventsStyles.heroCardInner}
                    >
                      {/* Soft orb accents */}
                      <View style={eventsStyles.heroOrb1} pointerEvents="none" />
                      <View style={eventsStyles.heroOrb2} pointerEvents="none" />

                      {/* TODAY badge */}
                      <View>
                        <View style={eventsStyles.livePill}>
                          <CalendarDays size={10} color="#FFFFFF" />
                          <Text style={eventsStyles.livePillText}>TODAY</Text>
                        </View>
                      </View>

                      {/* Date stamp + event name */}
                      <View>
                        <Text style={eventsStyles.heroDateLabel}>
                          {dateParts.weekday}, {dateParts.month} {dateParts.day}
                        </Text>
                        <Text style={eventsStyles.heroTitle} numberOfLines={2}>
                          {todayEvent.title || 'Church Event'}
                        </Text>
                      </View>

                      {/* Time + location */}
                      <View style={eventsStyles.heroMetaStack}>
                        <View style={eventsStyles.heroMetaRow}>
                          <Clock size={12} color="rgba(255,255,255,0.75)" />
                          <Text style={eventsStyles.heroMeta}>
                            {todayEvent.time || '9:00 AM'}{todayEvent.endTime ? ` – ${todayEvent.endTime}` : ''}
                          </Text>
                        </View>
                        <View style={eventsStyles.heroMetaRow}>
                          <MapPin size={12} color="rgba(255,255,255,0.75)" />
                          <Text style={eventsStyles.heroMeta} numberOfLines={1}>
                            {todayEvent.location || 'Main Sanctuary'}
                          </Text>
                        </View>
                      </View>

                      {/* RSVP row */}
                      <View style={eventsStyles.heroActionRow}>
                        <TouchableOpacity
                          style={[eventsStyles.rsvpBtn, rsvpStatus === 'going' && eventsStyles.rsvpBtnActive]}
                          onPress={() => handleRsvp(todayEvent.id, 'going')}
                        >
                          <CheckCircle2 size={14} color={rsvpStatus === 'going' ? '#FF6596' : '#FFFFFF'} />
                          <Text style={[eventsStyles.rsvpText, rsvpStatus === 'going' && eventsStyles.rsvpTextActive]}>Going</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[eventsStyles.rsvpBtn, rsvpStatus === 'maybe' && eventsStyles.rsvpBtnActive]}
                          onPress={() => handleRsvp(todayEvent.id, 'maybe')}
                        >
                          <HelpCircle size={14} color={rsvpStatus === 'maybe' ? '#F59E0B' : '#FFFFFF'} />
                          <Text style={[eventsStyles.rsvpText, rsvpStatus === 'maybe' && { color: '#F59E0B' }]}>Maybe</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[eventsStyles.rsvpBtn, rsvpStatus === 'not_going' && eventsStyles.rsvpBtnActive]}
                          onPress={() => handleRsvp(todayEvent.id, 'not_going')}
                        >
                          <XCircle size={14} color={rsvpStatus === 'not_going' ? '#EF4444' : '#FFFFFF'} />
                          <Text style={[eventsStyles.rsvpText, rsvpStatus === 'not_going' && { color: '#EF4444' }]}>Not Going</Text>
                        </TouchableOpacity>
                      </View>

                    </LinearGradient>
                  </View>
                </BounceCard>
              );
            })}
          </ScrollView>

          {todaysEvents.length > 1 && (
            <View style={eventsStyles.carouselDotsRow}>
              {todaysEvents.map((_, index) => (
                <View
                  key={`today-dot-${index}`}
                  style={[eventsStyles.carouselDot, index === activeTodaySlide && eventsStyles.carouselDotActive]}
                />
              ))}
            </View>
          )}
        </View>
      ) : upcomingList.length > 0 ? (
        <BounceCard activeOpacity={0.95} style={{ marginBottom: 10 }}>
          <SoftCard innerStyle={eventsStyles.emptyTodayCardInner}>
            <View style={eventsStyles.emptyTodayIconRing}>
              <CalendarDays size={26} color="#FF6596" />
            </View>
            <Text style={eventsStyles.emptyTodayTitle}>All clear for today</Text>
            <Text style={eventsStyles.emptyTodaySubtitle}>
              No events scheduled today.{'\n'}Check what&apos;s coming up below ↓
            </Text>
          </SoftCard>
        </BounceCard>
      ) : null}

      <View style={eventsStyles.sectionHeadRow}>
        <View>
          <Text style={eventsStyles.listHeadingOverline}>WHAT&apos;S NEXT</Text>
          <Text style={eventsStyles.listHeading}>Upcoming Events</Text>
        </View>
        <View style={eventsStyles.listCountBadge}>
          <Text style={eventsStyles.listCount}>{upcomingList.length}</Text>
        </View>
      </View>

      <View style={{ marginTop: 4 }}>
        {upcomingList.length === 0 ? (
          <BounceCard activeOpacity={0.95} style={{ marginBottom: 10 }}>
            <SoftCard innerStyle={eventsStyles.emptyTodayCardInner}>
              <View style={eventsStyles.emptyTodayIconRing}>
                <CalendarDays size={26} color="#FF6596" />
              </View>
              <Text style={eventsStyles.emptyTodayTitle}>No upcoming events</Text>
              <Text style={eventsStyles.emptyTodaySubtitle}>
                Check back later for more events.
              </Text>
            </SoftCard>
          </BounceCard>
        ) : (
          upcomingList.map((event) => (
            <BounceCard key={event.id} activeOpacity={0.82} onPress={() => setSelectedEvent(event)} style={{ marginBottom: 10 }}>
              <SoftCard innerStyle={eventsStyles.listCardInner}>
                <View style={eventsStyles.listDateBlock}>
                  <Text style={eventsStyles.listDateMonth}>{getEventDateParts(event).month}</Text>
                  <Text style={eventsStyles.listDateDay}>
                    {getEventDateParts(event).day}
                  </Text>
                  <Text style={eventsStyles.listDateWeekday}>
                    {getEventDateParts(event).weekday.slice(0, 3).toUpperCase()}
                  </Text>
                </View>

                <View style={eventsStyles.listDivider} />

                <View style={eventsStyles.listDetailsBlock}>
                  <Text style={eventsStyles.listEventTitle} numberOfLines={2}>
                    {event.title || 'Church Event'}
                  </Text>

                  <View style={eventsStyles.listTimePill}>
                    <Clock size={11} color="#9CA3AF" />
                    <Text style={eventsStyles.listTimePillText}>
                      {event.time || '9:00 AM'}{event.endTime ? ` – ${event.endTime}` : ''}
                    </Text>
                  </View>

                  <View style={eventsStyles.locationRow}>
                    <MapPin size={11} color="#B0B6C8" />
                    <Text style={eventsStyles.listLocationText} numberOfLines={1}>
                      {event.location || 'Main Sanctuary'}
                    </Text>
                  </View>
                </View>

                <View style={eventsStyles.listChevronWrap}>
                  <ChevronRight size={18} color="#C0C8D8" strokeWidth={2.5} />
                </View>
              </SoftCard>
            </BounceCard>
          ))
        )}
      </View>

      <EventDetailsModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        currentUser={currentUser}
        getUserRsvpStatus={getUserRsvpStatus}
        handleRsvp={handleRsvp}
      />
    </View>
  );
}

function SermonsTab({ searchQuery }: SubScreenProps) {
  return <SermonsExperience searchQuery={searchQuery} showSearchInput={false} showDownloadEntryPoint={false} />;
}

let isLocalHighlightsSynced = false;

type CommunityMemberTabFilter = 'all' | 'prayers' | 'highlights' | 'notes';

interface CombinedFeedItem {
  type: 'highlight' | 'prayer' | 'note';
  data: any;
  timestamp: number;
}

function parseFeedTimestamp(dateVal: any): number {
  if (!dateVal) return 0;
  if (typeof dateVal === 'number') return dateVal;
  if (typeof dateVal === 'string') return new Date(dateVal).getTime() || 0;
  if (dateVal instanceof Date) return dateVal.getTime();
  if (typeof dateVal?.toDate === 'function') return dateVal.toDate().getTime();
  if (typeof dateVal?.seconds === 'number') return dateVal.seconds * 1000;
  return 0;
}

function MembersTab({ searchQuery }: SubScreenProps) {
  const members = useMemberStore((state) => state.members);
  const userProfile = useAuthStore((state) => state.userProfile);
  const currentUser = useAuthStore((s) => s.currentUser);
  const router = useRouter();
  const navDebounceRef = useRef(false);
  const openPrayerModal = useUIStore((state) => state.openPrayerModal);

  const [activeTabFilter, setActiveTabFilter] = useState<CommunityMemberTabFilter>('all');

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
  const [churchHighlights, setChurchHighlights] = useState<ChurchHighlightPost[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(true);
  const [pageLimit, setPageLimit] = useState(10);
  const [hasMore, setHasMore] = useState(true);

  // 2. Prayers
  const { prayers: prayerItems, loading: prayersLoading, togglePrayerLike, togglePrayerAnswered, deletePrayer } = usePrayerFeed();

  // 3. Notes
  const [notes, setNotes] = useState<SermonNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid || !userProfile?.churchId) {
      setNotes([]);
      setNotesLoading(false);
      return;
    }
    setNotesLoading(true);
    sermonRepository
      .fetchUserNotes(currentUser.uid, userProfile.churchId)
      .then((userNotes) => {
        setNotes(userNotes || []);
        setNotesLoading(false);
      })
      .catch((err) => {
        console.warn('Failed to fetch user notes:', err);
        setNotesLoading(false);
      });
  }, [currentUser?.uid, userProfile?.churchId]);

  useEffect(() => {
    if (!userProfile?.churchId) {
      setHighlightsLoading(false);
      return;
    }
    setHighlightsLoading(true);

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

    const unsubscribe = churchHighlightRepository.subscribeChurchHighlights(
      userProfile.churchId,
      (posts) => {
        setChurchHighlights(posts);
        setHighlightsLoading(false);
        setHasMore(posts.length >= pageLimit);
      },
      pageLimit,
      (err) => {
        setHighlightsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [currentUser?.displayName, currentUser?.photoURL, currentUser?.uid, pageLimit, userProfile?.churchId, userProfile?.firstName, userProfile?.lastName, userProfile?.photoUrl]);

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
              {note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'Sermon Note'}
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
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 12,
                    backgroundColor: '#F3F4F6',
                    borderRadius: 12,
                    marginTop: 4,
                    marginBottom: 16,
                  }}
                  onPress={() => setPageLimit((prev) => prev + 10)}
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
              <Text style={placeholder.subtitle}>Loading sermon notes...</Text>
            </View>
          ) : filteredNotes.length === 0 ? (
            <View style={placeholder.wrap}>
              <Text style={placeholder.title}>No Sermon Notes Yet</Text>
              <Text style={placeholder.subtitle}>
                Notes written while listening to sermons will appear here.
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

function SongsTab({ searchQuery }: SubScreenProps) {
  const userProfile = useAuthStore((state) => state.userProfile);
  const churchId = userProfile?.churchId || (userProfile as any)?.church_id;
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  // Filters
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (!canViewCommunitySongs(userProfile)) {
      setLoading(false);
      return;
    }
    if (!churchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const unsubscribe = worshipRepository.subscribeToCommunitySongs(
      churchId,
      (data) => {
        setSongs(data);
        setLoading(false);
      },
      (err) => {
        console.warn('Community songs error:', err);
        setError('We could not load the songs. Please try again.');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [churchId, userProfile]);

  const filteredSongs = useMemo(() => {
    let result = songs.filter(s => canViewSongInDirectory(userProfile, s));

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(s =>
        s.title?.toLowerCase().includes(q) ||
        s.artist?.toLowerCase().includes(q) ||
        s.composer?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.language?.toLowerCase().includes(q) ||
        s.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    if (selectedLanguage !== 'all') {
      result = result.filter(s => (s.language || 'english').toLowerCase() === selectedLanguage.toLowerCase());
    }

    if (selectedCategory !== 'all') {
      result = result.filter(s => (s.category || 'contemporary').toLowerCase() === selectedCategory.toLowerCase());
    }

    return result;
  }, [songs, searchQuery, selectedLanguage, selectedCategory, userProfile]);

  if (!canViewCommunitySongs(userProfile)) {
    return (
      <View style={placeholder.wrap}>
        <Text style={placeholder.title}>Access Denied</Text>
        <Text style={placeholder.subtitle}>You do not have permission to view songs.</Text>
      </View>
    );
  }

  return (
    <View style={songsStyles.wrap}>
      {/* Category & Language Filter Bar */}
      <View style={{ marginBottom: 12, gap: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {['all', 'english', 'tagalog', 'other'].map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[
                songsStyles.filterChip,
                selectedLanguage === lang && songsStyles.filterChipActive
              ]}
              onPress={() => setSelectedLanguage(lang)}
            >
              <Text style={[
                songsStyles.filterChipText,
                selectedLanguage === lang && songsStyles.filterChipTextActive
              ]}>
                {lang === 'all' ? 'All Languages' : lang.charAt(0).toUpperCase() + lang.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {['all', 'hymn', 'contemporary', 'psalm', 'praise', 'worship', 'response', 'offertory', 'communion', 'other'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                songsStyles.filterChip,
                selectedCategory === cat && songsStyles.filterChipActive
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[
                songsStyles.filterChipText,
                selectedCategory === cat && songsStyles.filterChipTextActive
              ]}>
                {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={placeholder.wrap}>
          <Text style={placeholder.subtitle}>Loading songs…</Text>
        </View>
      ) : error ? (
        <View style={placeholder.wrap}>
          <Text style={placeholder.title}>Error</Text>
          <Text style={placeholder.subtitle}>{error}</Text>
        </View>
      ) : filteredSongs.length === 0 ? (
        <View style={placeholder.wrap}>
          <Text style={placeholder.title}>No songs available yet.</Text>
          <Text style={placeholder.subtitle}>Songs published by your church leadership will appear here.</Text>
        </View>
      ) : (
        filteredSongs.map((song) => {
          const hasLyrics = canViewLyricsInDirectory(song);
          return (
            <BounceCard key={song.id} activeOpacity={0.82} onPress={() => setSelectedSong(song)} style={{ marginBottom: 10 }}>
              <SoftCard innerStyle={songsStyles.cardInner}>
                <View style={songsStyles.iconWrap}>
                  <Music size={20} color="#FF6596" />
                </View>

                <View style={songsStyles.details}>
                  <Text style={songsStyles.title} numberOfLines={1}>{song.title}</Text>
                  <Text style={songsStyles.artist} numberOfLines={1}>{song.artist || song.composer || 'Unknown Artist'}</Text>
                  <View style={songsStyles.tagsRow}>
                    {song.category && (
                      <View style={songsStyles.tagPill}>
                        <Text style={songsStyles.tagText}>{song.category}</Text>
                      </View>
                    )}
                    {song.language && (
                      <View style={[songsStyles.tagPill, { backgroundColor: '#F3E8FF' }]}>
                        <Text style={[songsStyles.tagText, { color: '#8B5CF6' }]}>{song.language}</Text>
                      </View>
                    )}
                    {hasLyrics && (
                      <View style={[songsStyles.tagPill, { backgroundColor: '#ECFDF3' }]}>
                        <Text style={[songsStyles.tagText, { color: '#10B981' }]}>Lyrics</Text>
                      </View>
                    )}
                  </View>
                </View>

                <ChevronRight size={18} color="#C0C8D8" />
              </SoftCard>
            </BounceCard>
          );
        })
      )}

      {/* Song Details Modal */}
      <CommunitySongDetailModal
        song={selectedSong}
        onClose={() => setSelectedSong(null)}
      />
    </View>
  );
}

function MinistriesTab({ searchQuery }: SubScreenProps) {
  const router = useRouter();
  const userProfile = useAuthStore((s) => s.userProfile);
  const { ministries, ministriesLoading, fetchMinistries } = useMinistryStore();
  const churchId = userProfile?.churchId;

  useEffect(() => {
    if (churchId) fetchMinistries(churchId);
  }, [churchId, fetchMinistries]);

  const filteredMinistries = useMemo(() => {
    return ministries.filter((m: any) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [ministries, searchQuery]);

  return (
    <ScrollView contentContainerStyle={membersStyles.scrollContent} showsVerticalScrollIndicator={false}>
      {ministriesLoading ? (
        <Text style={membersStyles.placeholderSubtitle}>Loading ministries...</Text>
      ) : filteredMinistries.length === 0 ? (
        <View style={membersStyles.placeholderContainer}>
          <Text style={membersStyles.placeholderTitle}>No ministries found</Text>
        </View>
      ) : (
        filteredMinistries.map((ministry: any) => (
          <SoftCard key={ministry.id} style={{ marginBottom: 12 }}>
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{ministry.name}</Text>
              {!!ministry.description && (
                <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>{ministry.description}</Text>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                <TouchableOpacity
                  style={{ backgroundColor: '#111827', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }}
                  onPress={() => router.push({ pathname: '/serve-ministry-detail', params: { id: ministry.id } })}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>View Ministry</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SoftCard>
        ))
      )}
    </ScrollView>
  );
}

function BirthdaysTab({ searchQuery }: SubScreenProps) {
  const members = useMemberStore((s) => s.members);
  const membersLoading = useMemberStore((s) => s.membersLoading);
  const userProfile = useAuthStore((s) => s.userProfile);

  const { todayBirthdays, thisMonthBirthdays, upcomingBirthdays } = useMemo(() => {
    const today = new Date();
    const curMonth = today.getMonth() + 1;
    const curDay = today.getDate();
    const canSeeLeadersOnly = ['pastor', 'church_admin', 'super_admin'].includes(userProfile?.role || '');

    const valid = members.filter((m) => {
      if (m.status === 'inactive') return false;
      const vis = m.birthdayVisibility || 'members_only';
      if (vis === 'hidden') return false;
      if (vis === 'leaders_only' && !canSeeLeadersOnly) return false;
      return parseMemberDate(m) !== null;
    });

    const parsed = valid.map((m) => {
      const d = parseMemberDate(m)!;
      return { ...m, parsedMonth: d.m, parsedDay: d.d };
    });

    const matchesQuery = (m: any) =>
      !searchQuery ||
      formatMemberName(m).toLowerCase().includes(searchQuery.toLowerCase());

    const todayBirthdays = parsed.filter(m => m.parsedMonth === curMonth && m.parsedDay === curDay && matchesQuery(m));
    const thisMonthBirthdays = parsed.filter(m => m.parsedMonth === curMonth && m.parsedDay !== curDay && matchesQuery(m)).sort((a, b) => a.parsedDay - b.parsedDay);
    const nextMonth = curMonth === 12 ? 1 : curMonth + 1;
    const upcomingBirthdays = parsed.filter(m => m.parsedMonth === nextMonth && matchesQuery(m)).sort((a, b) => a.parsedDay - b.parsedDay);

    return { todayBirthdays, thisMonthBirthdays, upcomingBirthdays };
  }, [members, userProfile, searchQuery]);

  const sendGreeting = (m: any) => {
    Share.share({
      message: `Happy Birthday, ${formatMemberName(m)}! 🎉 May God bless you richly on your special day!`,
    });
  };

  const renderSection = (title: string, list: any[], isToday = false) => {
    if (list.length === 0) return null;
    return (
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: isToday ? '#FF6596' : '#6B7280', textTransform: 'uppercase', marginBottom: 10, paddingHorizontal: 4 }}>
          {title}
        </Text>
        {list.map((m) => (
          <SoftCard key={m.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isToday ? '#FFE4E6' : '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                <Cake size={20} color={isToday ? '#E11D48' : '#6B7280'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{formatMemberName(m)}</Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{formatBirthday(m)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => sendGreeting(m)}
                style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#4F46E5' }}>Wish</Text>
              </TouchableOpacity>
            </View>
          </SoftCard>
        ))}
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={membersStyles.scrollContent} showsVerticalScrollIndicator={false}>
      {membersLoading ? (
        <Text style={membersStyles.placeholderSubtitle}>Loading birthdays...</Text>
      ) : todayBirthdays.length === 0 && thisMonthBirthdays.length === 0 && upcomingBirthdays.length === 0 ? (
        <View style={membersStyles.placeholderContainer}>
          <Text style={membersStyles.placeholderTitle}>No birthdays found</Text>
        </View>
      ) : (
        <>
          {renderSection("Today's Birthdays", todayBirthdays, true)}
          {renderSection("This Month", thisMonthBirthdays)}
          {renderSection("Upcoming Birthdays", upcomingBirthdays)}
        </>
      )}
    </ScrollView>
  );
}

const SUB_SCREENS = [
  PrayersTab,
  EventsTab,
  SermonsTab,
  MembersTab,
  SongsTab,
] as const;

// ─── Main Community screen ────────────────────────────────────────────────────

export default function CommunityScreen() {
  const params = useGlobalSearchParams<{ tab?: string | string[] }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabIndex>(() => getTabIndexFromParam(params.tab) ?? 0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchByTab, setSearchByTab] = useState<Record<CommunityTabParam, string>>({
    prayers: '',
    events: '',
    sermons: '',
    members: '',
    songs: '',
  });

  // Per-tab measured layout { x, width }
  const tabLayouts = useRef<({ x: number; width: number } | null)[]>(
    Array(TABS.length).fill(null),
  );
  const indicatorX = useMemo(() => new Animated.Value(0), []);
  const indicatorWidth = useMemo(() => new Animated.Value(0), []);
  const initialised = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const { width: SCREEN_WIDTH } = Dimensions.get('window');

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, -60],
    extrapolate: 'clamp',
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const accentLineOpacity = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const handleTabLayout = (index: number, x: number, width: number) => {
    tabLayouts.current[index] = { x, width };
    // Seed the indicator when the active tab's layout is first measured
    if (index === activeTab && !initialised.current) {
      indicatorX.setValue(x);
      indicatorWidth.setValue(width);
      initialised.current = true;
    }
  };

  const handleTabPress = (index: TabIndex) => {
    const layout = tabLayouts.current[index];
    if (layout) {
      Animated.parallel([
        Animated.spring(indicatorX, {
          toValue: layout.x,
          useNativeDriver: false,
          tension: 80,
          friction: 10,
        }),
        Animated.spring(indicatorWidth, {
          toValue: layout.width,
          useNativeDriver: false,
          tension: 80,
          friction: 10,
        }),
      ]).start();

      const centerOffsetX = layout.x + layout.width / 2 - SCREEN_WIDTH / 2;
      scrollViewRef.current?.scrollTo({ x: Math.max(0, centerOffsetX), animated: true });
    }
    setActiveTab(index);
  };

  useEffect(() => {
    const paramIndex = getTabIndexFromParam(params.tab);
    if (paramIndex !== null && paramIndex !== activeTab) {
      const frame = requestAnimationFrame(() => {
        handleTabPress(paramIndex);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [params.tab]);

  const ActiveScreen = SUB_SCREENS[activeTab];
  const activeTabKey = TABS[activeTab].key;
  const activeSearchQuery = searchByTab[activeTabKey];
  const searchPlaceholderByTab: Record<CommunityTabParam, string> = {
    prayers: 'Search prayer requests',
    events: 'Search events',
    sermons: 'Search sermons',
    members: 'Search members',
    songs: 'Search community songs',
  };
  const headerContentOffset = 112;
  const headerHeight = Math.max(insets.top, 24) + headerContentOffset;

  const visibleTabs = TABS;

  return (
    <View style={styles.container}>
      {/* ── Frosted sticky header ── */}
      <Animated.View
        style={[
          styles.frostedHeader,
          {
            paddingTop: Math.max(insets.top, 24),
            transform: [{ translateY: headerTranslateY }]
          }
        ]}
        pointerEvents="box-none"
      >
        <BlurView
          intensity={90}
          tint="light"
          style={[StyleSheet.absoluteFill, { top: -150 }]}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(255,255,255,0.75)', top: -150 },
          ]}
          pointerEvents="none"
        />

        {/* Gradient accent line */}
        <Animated.View style={[styles.accentLine, { opacity: accentLineOpacity }]}>
          <LinearGradient
            colors={['#FF6596', '#B66DFF', '#6DC8FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Title row */}
        <Animated.View style={[styles.headerContent, { opacity: titleOpacity }]}>
          {isSearchOpen ? (
            <View style={styles.topSearchBoxExpanded}>
              <Search size={14} color="#8A8C99" />
              <TextInput
                style={styles.topSearchInput}
                placeholder={searchPlaceholderByTab[activeTabKey]}
                placeholderTextColor="#9CA0B0"
                value={activeSearchQuery}
                onChangeText={(value) =>
                  setSearchByTab((prev) => ({ ...prev, [activeTabKey]: value }))
                }
                autoFocus
              />
              <TouchableOpacity
                onPress={() => {
                  setSearchByTab((prev) => ({ ...prev, [activeTabKey]: '' }));
                  setIsSearchOpen(false);
                }}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <X size={14} color="#A0A4B8" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconWrap}>
                  <LinearGradient
                    colors={['#FF6596', '#B66DFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerIconGradient}
                  >
                    <Users size={16} color="#fff" strokeWidth={2} />
                  </LinearGradient>
                </View>
                <View>
                  <Text style={styles.headerOverline}>NETWORK</Text>
                  <Text style={styles.headerTitle}>Community</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginRight: 4 }}>
                <TouchableOpacity
                  style={styles.searchToggleButton}
                  onPress={() => setIsSearchOpen(true)}
                  activeOpacity={0.85}
                >
                  <Search size={17} color="#6E7388" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>

        {/* Modern Pill Tab Bar */}
        <View style={styles.tabBarWrapper}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarContent}
          >
            {/* Sliding pill indicator */}
            <Animated.View
              style={[
                styles.indicator,
                { left: indicatorX, width: indicatorWidth },
              ]}
            />

            {visibleTabs.map(({ key, label }) => {
              const index = TAB_INDEX_BY_KEY[key];
              return (
                <TouchableOpacity
                  key={key}
                  onLayout={(e) => {
                    const { x, width } = e.nativeEvent.layout;
                    handleTabLayout(index, x, width);
                  }}
                  onPress={() => handleTabPress(index)}
                  style={styles.tab}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === index && styles.tabTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Animated.View>

      {/* ── Sub-screen content ── */}
      <Animated.ScrollView
        contentContainerStyle={[styles.content, { paddingTop: headerHeight }]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <ActiveScreen searchQuery={activeSearchQuery} />
      </Animated.ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  frostedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  accentLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 3,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconWrap: {},
  headerIconGradient: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6596',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
    marginTop: -1,
  },
  topSearchBoxExpanded: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E4E7F2',
    paddingHorizontal: 10,
    height: 34,
    width: '100%',
  },
  topSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#111827',
    paddingVertical: 0,
  },
  searchToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E4E7F2',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Tab bar ───
  tabBarWrapper: {
    paddingBottom: 12,
    paddingTop: 4,
  },
  tabBarContent: {
    paddingHorizontal: 20,
    gap: 4,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
    letterSpacing: 0.1,
  },
  tabTextActive: {
    color: '#1a1a1a',
    fontWeight: '700',
  },

  // Sliding indicator
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#FF6596',
  },

  content: {
    flexGrow: 1,
    paddingBottom: 120,
  },
});

// ─── Placeholder shared styles ────────────────────────────────────────────────

const placeholder = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 16,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});

const prayerStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 14,
  },
  heroCompact: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C0265A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroCountPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FFD6E5',
  },
  heroCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B42368',
  },
  heroTitleCompact: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: -0.4,
  },
  heroSubtitleCompact: {
    marginTop: 2,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  quickStatsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  quickStatPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#EEF0F7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickStatValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E2235',
  },
  quickStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#79809B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  filterRow: {
    gap: 8,
    paddingRight: 20,
  },
  filterPill: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DEE2F1',
    backgroundColor: '#FFFFFF',
  },
  filterPillActive: {
    borderColor: '#FF6596',
    backgroundColor: '#FF6596',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  prayerCardOuter: { marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  prayerCardInner: { flexDirection: 'row' },
  prayerGradientBorder: { width: 4, alignSelf: 'stretch' },
  prayerRow: { flex: 1, flexDirection: 'row', padding: 12, paddingLeft: 16 },
  prayerAvatar: { display: 'none' },
  prayerAvatarText: { display: 'none' },
  prayerContent: { flex: 1, paddingTop: 1 },
  prayerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  prayerName: { fontSize: 14, fontWeight: '700', color: '#111827', letterSpacing: -0.2 },
  prayerTime: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  prayerText: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  prayerBottomRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 },
  prayIconButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 6, marginRight: -6 },
  prayIconCount: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
});

const membersStyles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  placeholderContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  details: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E2235',
    letterSpacing: -0.2,
  },
  ministryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  ministryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6D28D9',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ECFDF5',
  },
  statusPillInactive: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTextInactive: {
    color: '#9CA3AF',
  },
  birthdaySnapshotOuter: {
    marginBottom: 0,
    borderWidth: 0,
    shadowColor: 'rgba(164, 164, 164, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  birthdaySnapshotCard: {
    overflow: 'hidden',
  },
  snapshotOrb1: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    opacity: 0.6,
  },
  snapshotOrb2: {
    position: 'absolute',
    bottom: -30,
    left: -20,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    opacity: 0.4,
  },
  birthdaySnapshotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  cakeIconWrap: {
    backgroundColor: '#FFFFFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  birthdaySnapshotTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E2235',
    letterSpacing: -0.3,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6596',
  },
  birthdaySnapshotList: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
    flexDirection: 'row',
  },
  birthdaySnapshotItem: {
    alignItems: 'center',
    width: 64,
  },
  snapshotAvatarWrap: {
    position: 'relative',
    marginBottom: 8,
  },
  snapshotAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 8,
  },
  snapshotBadgeToday: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  snapshotBadgeTodayText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FF6596',
  },
  snapshotName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E2235',
    textAlign: 'center',
  },
  snapshotUpcomingDate: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },
  frostTabFilterContainer: {
    marginHorizontal: -20,
    marginTop: 0,
    marginBottom: 0,
    overflow: 'visible',
  },
  frostTabFilterScroll: {
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 6,
    overflow: 'visible',
  },
  frostTabChipWrapper: {
    borderRadius: 100,
  },
  frostTabChip: {
    ...getSoftShadowStyle(100),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    gap: 6,
    borderWidth: 0,
    shadowColor: 'rgba(164, 164, 164, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  activeFrostTabChip: {
    borderWidth: 0,
    shadowColor: '#FF759E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
    boxShadow: '0px 4px 14px rgba(255, 117, 158, 0.25)',
  },
  inactiveFrostOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  activeFrostOverlay: {
    backgroundColor: '#FF759E',
  },
  frostTabChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    zIndex: 1,
  },
  activeFrostTabChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
    zIndex: 1,
  },
  frostBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 1,
  },
  activeFrostBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    zIndex: 1,
  },
  frostBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  activeFrostBadgeText: {
    color: '#FFFFFF',
  },
  noteCardInner: {
    flexDirection: 'row',
    minHeight: 60,
  },
  noteSideBar: {
    width: 4,
    borderRadius: 2,
  },
  noteCardContent: {
    flex: 1,
    padding: 12,
  },
  noteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  noteIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  noteBodyText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
});

export const eventsStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4D8BFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHint: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7B8094',
  },
  heroCardOuter: {
    borderRadius: 24,
    boxShadow: '0px 8px 24px rgba(182, 109, 255, 0.28)',
    marginBottom: 10,
  },
  heroCardInner: {
    borderRadius: 24,
    padding: 20,
    gap: 14,
    overflow: 'hidden',
  },
  heroCarousel: {
    marginHorizontal: -20,
  },
  heroCarouselContent: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 12,
  },
  heroSlide: {
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  heroOrb1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  heroOrb2: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroDateBlock: {
    width: 62,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  heroDateMonth: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroDateDay: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 32,
    includeFontPadding: false,
  },
  heroDateWeekday: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroMainBlock: {
    flex: 1,
    gap: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
    alignSelf: 'flex-start',
  },
  livePillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  heroDate: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  heroDateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  heroMetaStack: {
    gap: 6,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  heroMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  heroMetaPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  heroTimeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMeta: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },
  heroActionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  rsvpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  rsvpBtnActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  rsvpBtnGoing: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  rsvpBtnMaybe: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  rsvpBtnNo: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  rsvpText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rsvpTextActive: {
    color: '#FF6596',
  },
  rsvpTextGoing: { color: '#FFFFFF' },
  rsvpTextGoing2: { color: '#FFFFFF' },
  rsvpTextMaybe: { color: '#FFFFFF' },
  rsvpTextMaybe2: { color: '#FFFFFF' },
  rsvpTextNo: { color: '#FFFFFF' },
  rsvpTextNo2: { color: '#FFFFFF' },
  heroStampRow: { flexDirection: 'row' },
  heroStampBlock: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  heroStampDay: { fontSize: 72, fontWeight: '900', color: '#FFFFFF', lineHeight: 72, letterSpacing: -4, includeFontPadding: false },
  heroStampMeta: { paddingBottom: 8, gap: 2 },
  heroStampMonth: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 1.5 },
  heroStampWeekday: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.65)', letterSpacing: 0.2 },
  heroWatermark: { position: 'absolute', right: 12, top: -12, fontSize: 120, fontWeight: '900', color: 'rgba(255,255,255,0.06)', letterSpacing: -4 },
  // ── Empty today state ──
  emptyTodayCardInner: {
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'column',
    gap: 8,
  },
  emptyTodayIconRing: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FFE8F0',
    borderWidth: 1,
    borderColor: '#FFCEDD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTodayTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.2,
  },
  emptyTodaySubtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  // ── Section heading ──
  sectionHeadLeft: {
    gap: 1,
  },
  sectionOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6596',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  listHeadingOverline: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6596',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  listHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  listCountBadge: {
    backgroundColor: '#FFE8F0',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listCount: {
    color: '#FF6596',
    fontSize: 12,
    fontWeight: '800',
  },
  listCardInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  listCardStrip: {
    width: 4,
    backgroundColor: '#FF6596',
  },
  listCardContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 14,
  },
  listDateBlock: {
    width: 68,
    minHeight: 88,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 2,
  },
  listDivider: {
    width: 1,
    backgroundColor: '#F0F0F5',
    marginVertical: 14,
  },
  listDateMonth: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6596',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  listDateDay: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1a1a1a',
    lineHeight: 34,
    includeFontPadding: false,
  },
  listDateWeekday: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B0B6C8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  listDetailsBlock: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    gap: 6,
  },
  listEventTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a1a',
    lineHeight: 18,
  },
  listTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F5F6FA',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  listTimePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  listMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF4FF',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  listMetaText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  listLocationText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    flex: 1,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
  },
  listDot: {
    color: '#D1D5DB',
    fontSize: 12,
    marginHorizontal: 1,
  },
  listChevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#F5F6FA',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginRight: 14,
  },
  listCardChevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#FFE8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselDotsRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#C7D3EE',
  },
  carouselDotActive: {
    width: 18,
    backgroundColor: '#4D8BFF',
  },
  modalContainer: {
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  modalEventName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 14,
  },
  modalInfoCard: {
    backgroundColor: '#F8FAFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4EBFF',
    padding: 12,
    gap: 10,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalInfoText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },
  modalRsvpTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalRsvpRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalRsvpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#DCE7FF',
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  modalRsvpBtnActive: {
    borderColor: '#4D8BFF',
    backgroundColor: '#EEF4FF',
  },
  modalRsvpBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
});

const songsStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#FF6596',
    borderColor: '#FF6596',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFE8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  details: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  artist: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4B5563',
    textTransform: 'capitalize',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  modalBody: {
    padding: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  metaBadge: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  metaBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  metaBadgeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  lyricsBox: {
    backgroundColor: '#FAF5FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  lyricsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7E22CE',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lyricsText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  noLyricsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  noLyricsText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    fontWeight: '500',
  },
});
