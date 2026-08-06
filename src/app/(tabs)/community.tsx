import { formatBirthday, formatMemberName, parseMemberDate } from '@/features/member/domain/member.utils';
import { canModeratePrayerRequests } from '@/permissions/mobilePermissions';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useGlobalSearchParams, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Cake,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Heart,
  HeartHandshake,
  HelpCircle,
  MapPin,
  MoreHorizontal,
  Music,
  PlayCircle,
  Search,
  User,
  Users,
  UsersRound,
  X,
  XCircle
} from 'lucide-react-native';
import { GroupsTab } from '../../features/discipleshipGroup/presentation/components/GroupsTab';
import { canAccessGroupsTab } from '../../permissions/discipleshipGroupPermissions';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventDetailsModal } from '../../components/Events/EventDetailsModal';
import { CommunitySongDetailModal } from '../../components/Worship/CommunitySongDetailModal';
import { BounceCard } from '../../components/ui/BounceCard';
import { SoftCard } from '../../components/ui/SoftCard';
import { CommentButton } from '../../features/comments/presentation/components/CommentButton';
import { Song } from '../../features/worship/domain/worship.types';
import { worshipRepository } from '../../features/worship/data/worship.repository';
import {
  canViewCommunitySongs,
  canViewSongInDirectory,
  canViewLyricsInDirectory,
} from '../../permissions/communitySongsPermissions';
import type { Member } from '../../features/member/domain/member.types';
import { formatPrayerTimeAgo, getFilteredPrayers } from '../../features/prayer/domain/prayer.selectors';
import type { Prayer, PrayerFilter } from '../../features/prayer/domain/prayer.types';
import { usePrayerFeed } from '../../features/prayer/presentation/hooks/usePrayerFeed';
import type { Schedule } from '../../features/schedule/domain/schedule.types';
import { SermonsExperience } from '../../features/sermons/presentation/components/SermonsExperience';
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
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const lastPress = useRef(0);

  const onPress = () => {
    const now = Date.now();
    if (now - lastPress.current < 500) return; // debounce
    lastPress.current = now;

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true })
    ]).start();

    router.push({ pathname: '/comment-thread', params: { targetType: 'prayer_request', targetId: req.id } });
  };

  return (
    <BounceCard onPress={onPress} style={{ marginBottom: 12 }}>
      <SoftCard innerStyle={[prayerStyles.prayerCardInner, { marginBottom: 0 }]}>
        <LinearGradient
          colors={['#FF6596', '#B66DFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={prayerStyles.prayerGradientBorder}
        />
        <View style={prayerStyles.prayerRow}>
          <View style={prayerStyles.prayerContent}>
            <View style={prayerStyles.prayerTop}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginRight: 10, overflow: 'hidden' }}>
                  {req.userPhotoUrl ? (
                    <Image source={{ uri: req.userPhotoUrl }} style={{ width: 36, height: 36 }} />
                  ) : (
                    <User size={20} color="#9CA3AF" />
                  )}
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={prayerStyles.prayerName} numberOfLines={1}>{req.name}</Text>
                    {(req.answered || req.status === 'answered') && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF3', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, gap: 4 }}>
                        <CheckCircle2 size={10} color="#10B981" />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#10B981', textTransform: 'uppercase' }}>Answered</Text>
                      </View>
                    )}
                  </View>
                  <Text style={prayerStyles.prayerTime}>{formatPrayerTimeAgo(req.createdAt)}</Text>
                </View>
                {(req.userId === currentUser?.uid || canModeratePrayerRequests(userProfile)) && (
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
                    style={{ padding: 4, alignSelf: 'flex-start' }}
                  >
                    <MoreHorizontal size={20} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <Text style={prayerStyles.prayerText}>
              {req.title ? <Text style={{ fontWeight: '700', color: '#111827' }}>{req.title} — </Text> : null}
              {req.request || req.content}
            </Text>

            <View style={[prayerStyles.prayerBottomRow, { justifyContent: 'flex-end', marginTop: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {(req.userId === currentUser?.uid || canModeratePrayerRequests(userProfile)) && (
                  <TouchableOpacity
                    style={[prayerStyles.prayIconButton, { marginRight: 10 }]}
                    onPress={() => handleAnswered(req.id, req.answered || req.status === 'answered')}
                    activeOpacity={0.7}
                  >
                    <CheckCircle2 size={18} color={(req.answered || req.status === 'answered') ? '#10B981' : '#9CA3AF'} />
                  </TouchableOpacity>
                )}

                <View style={{ marginRight: 10 }}>
                  <CommentButton
                    count={req.commentCount || 0}
                    variant="icon-only"
                    size={18}
                    color="#9CA3AF"
                    onPress={() => router.push({ pathname: '/comment-thread', params: { targetType: 'prayer_request', targetId: req.id } })}
                  />
                </View>

                <TouchableOpacity
                  style={prayerStyles.prayIconButton}
                  activeOpacity={0.7}
                  onPress={() => handlePray(req.id)}
                >
                  <HeartHandshake
                    size={18}
                    color={isLiked ? '#FF6596' : '#9CA3AF'}
                  />
                  <Text style={[prayerStyles.prayIconCount, isLiked && { color: '#FF6596' }]}>
                    {req.likes || 0}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
            <Heart size={12} color="#FF6596" />
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
    const query = searchQuery.trim().toLowerCase();
    if (!query) return schedules;

    return schedules.filter((event) => {
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

  useEffect(() => {
    const unsubscribe = initializeSchedulesListener();
    return () => unsubscribe();
  }, [initializeSchedulesListener]);

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

function MembersTab({ searchQuery }: SubScreenProps) {
  const members = useMemberStore((state) => state.members);
  const membersLoading = useMemberStore((state) => state.membersLoading);
  const userProfile = useAuthStore((state) => state.userProfile);
  const router = useRouter();
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

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    let filtered = members;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((m) => {
        const name = formatMemberName(m).toLowerCase();
        return name.includes(query);
      });
    }
    return filtered.sort((a, b) => formatMemberName(a).localeCompare(formatMemberName(b)));
  }, [members, searchQuery]);

  const sendGreeting = (member: any) => {
    Share.share({
      message: `Happy birthday ${formatMemberName(member)}! May the Lord bless you and strengthen you as you continue to walk with Him.`
    });
  };



  return (
    <View style={membersStyles.wrap}>
      {(todayBirthdays.length > 0 || upcomingBirthdays.length > 0) && (
        <SoftCard style={{ marginBottom: 16 }} innerStyle={membersStyles.birthdaySnapshotCard}>
          <LinearGradient
            colors={['#FFD1DF', '#E8D4FF', '#D4E4FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Orbs */}
          <View style={membersStyles.snapshotOrb1} />
          <View style={membersStyles.snapshotOrb2} />

          <View style={membersStyles.birthdaySnapshotHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={membersStyles.cakeIconWrap}>
                <Cake size={16} color="#FF6596" />
              </View>
              <Text style={membersStyles.birthdaySnapshotTitle}>Celebrations</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/birthdays')} style={membersStyles.seeAllBtn} activeOpacity={0.7}>
              <Text style={membersStyles.seeAllText}>View All</Text>
              <ChevronRight size={14} color="#FF6596" />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={membersStyles.birthdaySnapshotList}>
            {todayBirthdays.map(m => (
              <View key={`today-${m.id}`} style={membersStyles.birthdaySnapshotItem}>
                <View style={membersStyles.snapshotAvatarWrap}>
                  <Image source={{ uri: m.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formatMemberName(m))}&background=f0f0f0&color=999` }} style={membersStyles.snapshotAvatar} />
                  <View style={membersStyles.snapshotBadgeToday}>
                    <Text style={membersStyles.snapshotBadgeTodayText}>TODAY</Text>
                  </View>
                </View>
                <Text style={membersStyles.snapshotName} numberOfLines={1}>{formatMemberName(m)}</Text>
              </View>
            ))}
            {upcomingBirthdays.map(m => (
              <View key={`up-${m.id}`} style={membersStyles.birthdaySnapshotItem}>
                <Image source={{ uri: m.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formatMemberName(m))}&background=f0f0f0&color=999` }} style={membersStyles.snapshotAvatar} />
                <Text style={membersStyles.snapshotName} numberOfLines={1}>{formatMemberName(m)}</Text>
                <Text style={membersStyles.snapshotUpcomingDate}>{formatBirthday(m)}</Text>
              </View>
            ))}
          </ScrollView>
        </SoftCard>
      )}

      {membersLoading ? (
        <View style={placeholder.wrap}>
          <Text style={placeholder.subtitle}>Loading members...</Text>
        </View>
      ) : filteredMembers.length === 0 ? (
        <View style={placeholder.wrap}>
          <Text style={placeholder.title}>No members found</Text>
          <Text style={placeholder.subtitle}>Try another search term.</Text>
        </View>
      ) : (
        filteredMembers.map((member, index) => (
          <BounceCard key={`${member.id}-${index}`} style={{ marginBottom: 8 }}>
            <SoftCard innerStyle={membersStyles.card}>
              <View style={membersStyles.avatarWrap}>
                <Image
                  source={{ uri: member.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formatMemberName(member))}&background=f0f0f0&color=999` }}
                  style={membersStyles.avatar}
                />
              </View>
              <View style={membersStyles.details}>
                <Text style={membersStyles.name}>{formatMemberName(member)}</Text>
                {member.ministryIds && member.ministryIds.length > 0 && (
                  <LinearGradient
                    colors={['#F3E8FF', '#E0E7FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={membersStyles.ministryBadge}
                  >
                    <HeartHandshake size={10} color="#8B5CF6" />
                    <Text style={membersStyles.ministryBadgeText}>Ministry</Text>
                  </LinearGradient>
                )}
              </View>
              <View style={[membersStyles.statusPill, member.status === 'inactive' && membersStyles.statusPillInactive]}>
                <Text style={[membersStyles.statusText, member.status === 'inactive' && membersStyles.statusTextInactive]}>
                  {member.membershipStatus || (member.status === 'inactive' ? 'Inactive' : 'Active')}
                </Text>
              </View>
            </SoftCard>
          </BounceCard>
        ))
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
