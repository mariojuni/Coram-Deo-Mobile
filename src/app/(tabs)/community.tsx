import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useGlobalSearchParams, useLocalSearchParams, useRouter } from 'expo-router';
import {
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    Clock,
    Heart,
    HeartHandshake,
    HelpCircle,
    MapPin,
    PlayCircle,
    Search,
    Users,
    X,
    XCircle,
    Download
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {

    Animated,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppModal from '../../components/ui/AppModal';
import { EventDetailsModal } from '../../components/Events/EventDetailsModal';
import { formatPrayerTimeAgo, getFilteredPrayers } from '../../features/prayer/domain/prayer.selectors';
import type { Prayer, PrayerFilter } from '../../features/prayer/domain/prayer.types';
import { usePrayerFeed } from '../../features/prayer/presentation/hooks/usePrayerFeed';
import type { Schedule } from '../../features/schedule/domain/schedule.types';
import { SermonsExperience } from '../../features/sermons/presentation/components/SermonsExperience';
import { useAuthStore } from '../../store/useAuthStore';
import { useMemberStore } from '../../store/useMemberStore';
import {
    getUpcomingSchedules,
    getUserRsvpStatus,
    parseTimeTo24h,
    updateRsvp,
    useScheduleStore,
} from '../../store/useScheduleStore';


// ─── Sub-tab definitions ──────────────────────────────────────────────────────
const TABS = [
  { key: 'prayers', label: 'Prayers', icon: HeartHandshake },
  { key: 'events', label: 'Events', icon: CalendarDays },
  { key: 'sermons', label: 'Sermons', icon: PlayCircle },
  { key: 'members', label: 'Members', icon: Users },
] as const;

type TabIndex = 0 | 1 | 2 | 3;
type CommunityTabParam = (typeof TABS)[number]['key'];
type SubScreenProps = { searchQuery: string };
const PRAYER_FILTERS: PrayerFilter[] = ['Recent', 'My Requests'];
const TAB_INDEX_BY_KEY: Record<CommunityTabParam, TabIndex> = {
  prayers: 0,
  events: 1,
  sermons: 2,
  members: 3,
};

function getTabIndexFromParam(tabParam: string | string[] | undefined): TabIndex | null {
  const value = Array.isArray(tabParam) ? tabParam[0] : tabParam;
  if (!value) return null;

  const key = value.toLowerCase() as CommunityTabParam;
  return key in TAB_INDEX_BY_KEY ? TAB_INDEX_BY_KEY[key] : null;
}

// ─── Placeholder sub-screen components ───────────────────────────────────────

function PrayerCardItem({ req, currentUser, handlePray, handleAnswered }: { req: Prayer, currentUser: any, handlePray: (id: string) => void, handleAnswered: (id: string, currentValue: boolean) => void }) {
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

    handlePray(req.id);
  };

  return (
    <Animated.View style={[prayerStyles.prayerCardOuter, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <View style={prayerStyles.prayerCardInner}>
          <LinearGradient
            colors={['#FF6596', '#B66DFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={prayerStyles.prayerGradientBorder}
          />
          <View style={prayerStyles.prayerRow}>
            <View style={prayerStyles.prayerContent}>
              <View style={prayerStyles.prayerTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 8 }}>
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
              <Text style={prayerStyles.prayerText}>{req.request}</Text>
              
              <View style={prayerStyles.prayerBottomRow}>
                {req.userId === currentUser?.uid && (
                  <TouchableOpacity
                    style={prayerStyles.prayIconButton}
                    onPress={() => handleAnswered(req.id, req.answered || req.status === 'answered')}
                    activeOpacity={0.7}
                  >
                    <CheckCircle2 size={18} color={(req.answered || req.status === 'answered') ? '#10B981' : '#9CA3AF'} />
                  </TouchableOpacity>
                )}
                <View style={prayerStyles.prayIconButton}>
                  <HeartHandshake 
                    size={18} 
                    color={isLiked ? '#FF6596' : '#9CA3AF'} 
                  />
                  <Text style={[prayerStyles.prayIconCount, isLiked && { color: '#FF6596' }]}>
                    {req.likes || 0}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function PrayersTab({ searchQuery }: SubScreenProps) {
  const currentUser = useAuthStore((state) => state.currentUser);
  const { prayers: prayerItems, loading, togglePrayerLike, togglePrayerAnswered } = usePrayerFeed();
  const [filter, setFilter] = useState<PrayerFilter>('Recent');

  const handleAnswered = async (id: string, currentValue: boolean) => {
    try {
      await togglePrayerAnswered(id, currentValue);
    } catch(err) {
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
                <TouchableOpacity
                  key={todayEvent.id}
                  activeOpacity={0.92}
                  onPress={() => setSelectedEvent(todayEvent)}
                  style={[eventsStyles.heroSlide, { width: screenWidth }]}
                >
                  <LinearGradient
                    colors={['#FF6596', '#B66DFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[eventsStyles.heroCard, { marginHorizontal: heroCardHorizontalMargin }]}
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
                </TouchableOpacity>
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
      ) : (
        <View style={eventsStyles.emptyTodayCard}>
          <View style={eventsStyles.emptyTodayIconRing}>
            <CalendarDays size={26} color="#FF6596" />
          </View>
          <Text style={eventsStyles.emptyTodayTitle}>All clear for today</Text>
          <Text style={eventsStyles.emptyTodaySubtitle}>
            No events scheduled today.{'\n'}Check what&apos;s coming up below ↓
          </Text>
        </View>
      )}

      <View style={eventsStyles.sectionHeadRow}>
        <View>
          <Text style={eventsStyles.listHeadingOverline}>WHAT&apos;S NEXT</Text>
          <Text style={eventsStyles.listHeading}>Upcoming Events</Text>
        </View>
        <View style={eventsStyles.listCountBadge}>
          <Text style={eventsStyles.listCount}>{upcomingList.length}</Text>
        </View>
      </View>

      {upcomingList.length === 0 ? (
        <View style={eventsStyles.emptyTodayCard}>
          <View style={eventsStyles.emptyTodayIconRing}>
            <CalendarDays size={26} color="#FF6596" />
          </View>
          <Text style={eventsStyles.emptyTodayTitle}>Nothing found</Text>
          <Text style={eventsStyles.emptyTodaySubtitle}>Try a different search term.</Text>
        </View>
      ) : (
        upcomingList.map((event) => (
          <TouchableOpacity key={event.id} activeOpacity={0.82} onPress={() => setSelectedEvent(event)}>
            <View style={eventsStyles.listCard}>
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
                <ChevronRight size={14} color="#9CA3AF" />
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}

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
  return <SermonsExperience searchQuery={searchQuery} showSearchInput={false} />;
}

function MembersTab({ searchQuery }: SubScreenProps) {
  const members = useMemberStore((state) => state.members);
  const membersLoading = useMemberStore((state) => state.membersLoading);

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return members;

    return members.filter((member) => {
      const haystack = `${member.name || ''} ${member.firstName || ''} ${member.lastName || ''} ${member.role || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [members, searchQuery]);

  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.split(/[\s-]+/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const formatMemberName = (member: any) => {
    let displayName = member.name || '';
    if (member.firstName || member.lastName) {
        const f = toTitleCase(member.firstName);
        const l = toTitleCase(member.lastName);
        const m = member.middleName ? member.middleName.charAt(0).toUpperCase() + '.' : '';
        displayName = [f, m, l].filter(Boolean).join(' ');
    } else if (member.name) {
        const parts = member.name.split(' ').filter(Boolean);
        if (parts.length > 2) {
            const f = toTitleCase(parts[0]);
            const l = toTitleCase(parts[parts.length - 1]);
            const m = parts[1].charAt(0).toUpperCase() + '.';
            displayName = `${f} ${m} ${l}`;
        } else {
            displayName = toTitleCase(member.name);
        }
    }
    return displayName || 'Unnamed Member';
  };

  const formatBirthday = (dateStr?: string) => {
    if (!dateStr) return '';
    
    let date: Date | null = null;
    
    // Check if it matches YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
    const ymd = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymd) {
      const [, y, m, d] = ymd;
      date = new Date(Number(y), Number(m) - 1, Number(d));
    } else {
      // Check for MM/DD/YYYY
      const mdy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (mdy) {
        const [, m, d, y] = mdy;
        date = new Date(Number(y), Number(m) - 1, Number(d));
      } else {
        date = new Date(dateStr);
      }
    }
    
    if (date && !isNaN(date.getTime())) {
      const formatted = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      return formatted;
    }
    
    return dateStr;
  };

  return (
    <View style={membersStyles.wrap}>
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
        filteredMembers.map((member) => (
          <View key={member.id} style={membersStyles.card}>
            <Image
              source={{
                uri:
                  member.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(formatMemberName(member))}&background=f0f0f0&color=999`,
              }}
              style={membersStyles.avatar}
            />

            <View style={membersStyles.details}>
              <Text style={membersStyles.name}>{formatMemberName(member)}</Text>
              <Text style={membersStyles.meta}>{formatBirthday(member.birthday)}</Text>
            </View>

            <View style={[membersStyles.statusPill, member.status === 'inactive' && membersStyles.statusPillInactive]}>
              <Text style={[membersStyles.statusText, member.status === 'inactive' && membersStyles.statusTextInactive]}>
                {member.status === 'inactive' ? 'Inactive' : 'Active'}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const SUB_SCREENS = [
  PrayersTab,
  EventsTab,
  SermonsTab,
  MembersTab,
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
  });

  // Per-tab measured layout { x, width }
  const tabLayouts = useRef<({ x: number; width: number } | null)[]>(
    Array(TABS.length).fill(null),
  );
  const indicatorX = useMemo(() => new Animated.Value(0), []);
  const indicatorWidth = useMemo(() => new Animated.Value(0), []);
  const initialised = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const screenWidth = Dimensions.get('window').width;

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

      const centerOffsetX = layout.x + layout.width / 2 - screenWidth / 2;
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
    prayers: 'Search prayers',
    events: 'Search events',
    sermons: 'Search sermons',
    members: 'Search members',
  };
  const headerContentOffset = 112;
  const headerHeight = Math.max(insets.top, 24) + headerContentOffset;

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
        <View style={styles.accentLine}>
          <LinearGradient
            colors={['#FF6596', '#B66DFF', '#6DC8FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

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
                {activeTabKey === 'sermons' && (
                  <TouchableOpacity
                    style={styles.searchToggleButton}
                    onPress={() => router.push('/downloads' as any)}
                    activeOpacity={0.85}
                  >
                    <Download size={18} color="#6E7388" />
                  </TouchableOpacity>
                )}
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

            {TABS.map(({ key, label }, index) => (
              <TouchableOpacity
                key={key}
                onLayout={(e) => {
                  const { x, width } = e.nativeEvent.layout;
                  handleTabLayout(index, x, width);
                }}
                onPress={() => handleTabPress(index as TabIndex)}
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
            ))}
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
    paddingTop: 18,
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
  prayerCardInner: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', flexDirection: 'row' },
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
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9EBF4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E5E7EB',
  },
  details: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#ECFDF3',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  statusPillInactive: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusTextInactive: {
    color: '#6B7280',
  },
});

export const eventsStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 12,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  heroCard: {
    borderRadius: 24,
    padding: 20,
    gap: 14,
    overflow: 'hidden',
    shadowColor: '#B66DFF',
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  heroCarousel: {
    marginHorizontal: -20,
  },
  heroCarouselContent: {
    paddingHorizontal: 0,
    paddingVertical: 12,
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
  emptyTodayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEF0F7',
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
  // ── Event cards ──
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F5F6FA',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
