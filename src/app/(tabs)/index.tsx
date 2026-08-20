import DebouncedTouchable from '@/components/DebouncedTouchable';
import { EventDetailsModal } from '@/components/Events/EventDetailsModal';
import { BounceCard } from '@/components/ui/BounceCard';
import HomeScreenSkeleton from '@/components/ui/HomeScreenSkeleton';
import NetworkErrorScreen from '@/components/ui/NetworkErrorScreen';
import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';
import { SoftCard } from '@/components/ui/SoftCard';
import { CommentButton } from '@/features/comments/presentation/components/CommentButton';
import { CampaignCard } from '@/features/giving/presentation/components/CampaignCard';
import { useGiving } from '@/features/giving/presentation/hooks/useGiving';
import { BiblePlanProgressCard } from '@/features/home/presentation/components/BiblePlanProgressCard';
import { MinistryDutyCard } from '@/features/home/presentation/components/MinistryDutyCard';
import { VerseOfTheDayCard } from '@/features/home/presentation/components/VerseOfTheDayCard';
import { useHomeScreenData } from '@/features/home/presentation/hooks/useHomeScreenData';
import { usePrayerFeed } from '@/features/prayer/presentation/hooks/usePrayerFeed';
import type { Schedule } from '@/features/schedule/domain/schedule.types';
import { canModeratePrayerRequests } from '@/permissions/mobilePermissions';
import { useAuthStore } from '@/store/useAuthStore';
import { useSermonStore } from '@/store/useSermonStore';
import { useUIStore } from '@/store/useUIStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Bell, CalendarDays, CheckCircle2, ChevronRight, Clock, Heart, HeartHandshake, HelpCircle, MapPin, MoreVertical, User, XCircle } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, Animated, Dimensions, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function isThisWeek(dateString: string) {
  let date = new Date(dateString);

  // Safely parse YYYY-MM-DD or MM/DD/YYYY to avoid timezone shift
  const ymd = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    date = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  } else {
    const mdy = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdy) {
      date = new Date(Number(mdy[3]), Number(mdy[1]) - 1, Number(mdy[2]));
    }
  }

  const now = new Date();

  const currentDay = now.getDay() === 0 ? 7 : now.getDay();

  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currentDay + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return date >= startOfWeek && date <= endOfWeek;
}

function getTodayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
const COLLAPSE_RANGE = 70;
const INNER_EXPANDED = 120;
const INNER_COLLAPSED = 52;
export default function HomeScreen() {
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] = useState<Schedule | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  const userProfile = useAuthStore((s) => s.userProfile);
  const {
    currentUser,
    latestPrayer,
    myUpcomingDuties,
    upcomingEvents,
    todaysEvents,
    upcomingList,
    getUserRsvpStatus,
    handleMinisterialDuty,
    handlePray,
    handleRsvp,
    handleAnswered,
    formatPrayerTimeAgo,
    displayName,
    assignments,
    hasError,
    clearError,
    retry,
  } = useHomeScreenData();
  const { prayers, loading: prayersLoading, togglePrayerLike, deletePrayer } = usePrayerFeed();
  const openPrayerModal = useUIStore((state) => state.openPrayerModal);
  const prayerCount = prayers.length;

  // Recent sermons
  const sermons = useSermonStore((s) => s.sermons);
  const sermonsLoading = useSermonStore((s) => s.loading);
  const subscribeSermons = useSermonStore((s) => s.subscribeSermons);
  useEffect(() => {
    if (sermons.length === 0 && !sermonsLoading && userProfile?.churchId) {
      const unsubscribe = subscribeSermons(userProfile.churchId);
      return () => {
        unsubscribe?.();
      };
    }
  }, [userProfile?.churchId]);

  const { campaigns } = useGiving();

  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const [activeSlide, setActiveSlide] = useState(0);
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = screenWidth - 48;
  const currentUserId = currentUser?.uid ?? '';

  const currentMemberIds = useMemo(() => {
    const ids = new Set<string>();
    if (currentUser?.uid) ids.add(currentUser.uid);
    if (userProfile?.memberId) ids.add(userProfile.memberId);
    return Array.from(ids);
  }, [currentUser?.uid, userProfile?.memberId]);

  // ── Scroll animation ──────────────────────────────────────────────────────
  const scrollY = useRef(new Animated.Value(0)).current;

  const innerHeight = scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE],
    outputRange: [INNER_EXPANDED, INNER_COLLAPSED],
    extrapolate: 'clamp',
  });
  const largeOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE * 0.6],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const largeTranslateY = scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE * 0.6],
    outputRange: [0, -10],
    extrapolate: 'clamp',
  });
  const compactOpacity = scrollY.interpolate({
    inputRange: [COLLAPSE_RANGE * 0.5, COLLAPSE_RANGE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const accentLineOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const avatarScale = scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE],
    outputRange: [1, 0.75],
    extrapolate: 'clamp',
  });

  const greeting = getGreeting();
  const todayLabel = getTodayLabel();

  // Name: local DB name first, falling back to Firebase Auth displayName
  const dbName = [userProfile?.firstName, userProfile?.middleName, userProfile?.lastName].filter(Boolean).join(' ');
  const fullName = dbName || currentUser?.displayName || displayName;
  const firstName = userProfile?.firstName || fullName.split(' ')[0] || 'U';
  const initials = (userProfile?.firstName?.charAt(0) ?? firstName.charAt(0)).toUpperCase();

  // Avatar: Firestore photoUrl → Firebase Auth photoURL → initials fallback
  const photoUrl = userProfile?.photoUrl ?? (currentUser as any)?.photoURL ?? null;

  // US-01 / US-06 — flatten one card per duty, sort pending → accepted → declined
  const sortedDutyItems = useMemo(() => {
    const items = myUpcomingDuties.flatMap((schedule) =>
      assignments
        .filter((a) => a.eventId === schedule.id && currentMemberIds.includes(a.memberId))
        .map((assignment) => ({ assignment, schedule }))
    ).filter(({ schedule }) => isThisWeek(schedule.date));

    // DIAGNOSTIC LOGS
    console.log('[DEBUG] currentUserId:', currentUserId);
    console.log('[DEBUG] currentMemberIds:', currentMemberIds);
    console.log('[DEBUG] assignments loaded:', assignments.length);
    console.log('[DEBUG] myUpcomingDuties count:', myUpcomingDuties.length);
    console.log('[DEBUG] sortedDutyItems count:', items.length);

    const order = (status: string) => {
      if (status === 'Pending') return 0;
      if (status === 'Confirmed') return 1;
      return 2; // Declined
    };

    return items.sort((a, b) => {
      const statusDiff = order(a.assignment.status) - order(b.assignment.status);
      if (statusDiff !== 0) return statusDiff;
      return a.schedule.date.localeCompare(b.schedule.date);
    });
  }, [currentUserId, myUpcomingDuties, assignments]);

  // US-07 — pending count for section header pill
  const pendingCount = useMemo(
    () => sortedDutyItems.filter((i) => i.assignment.status === 'Pending').length,
    [sortedDutyItems]
  );
  const heroCards = useMemo(
    () =>
      todaysEvents.map((event) => ({
        event,
        rsvpStatus: currentUserId ? getUserRsvpStatus(event, currentUserId) : null,
      })),
    [currentUserId, getUserRsvpStatus, todaysEvents]
  );
  const handleHeroScrollEnd = useCallback(
    (offsetX: number) => {
      const slide = Math.round(offsetX / cardWidth);
      setActiveSlide(slide);
    },
    [cardWidth]
  );

  const insets = useSafeAreaInsets();

  // Error state handling
  if (hasError) {
    return <NetworkErrorScreen onRetry={retry} />;
  }

  // Loading state handling
  const authLoading = useAuthStore((s) => s.loading);
  const homeLoading = authLoading || prayersLoading || sermonsLoading;
  if (homeLoading) {
    return (
      <HomeScreenSkeleton />
    );
  }

  return (
    <View style={styles.container}>
      {/* ─── Animated Header ──────────────────────────────────────── */}
      <Animated.View
        style={[styles.header, { paddingTop: Math.max(insets.top, 24) }]}
        pointerEvents="box-none"
      >
        <BlurView
          intensity={90}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.75)' }]} pointerEvents="none" />

        {/* Gradient accent line at top */}
        <Animated.View style={[styles.accentLine, { opacity: accentLineOpacity }]}>
          <LinearGradient
            colors={['#FF6596', '#B66DFF', '#6DC8FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View style={[styles.headerInner, { height: innerHeight }]}>
          {/* Compact row (visible when scrolled) */}
          <Animated.View
            style={[styles.compactRow, { opacity: compactOpacity }]}
            pointerEvents="none"
          >
            <Text style={styles.compactGreeting} numberOfLines={1}>
              {greeting}, <Text style={styles.compactName}>{firstName}!</Text>
            </Text>
          </Animated.View>

          {/* Expanded content (visible at top) */}
          <Animated.View
            style={[
              styles.expandedContent,
              { opacity: largeOpacity, transform: [{ translateY: largeTranslateY }] },
            ]}
          >
            <View style={styles.expandedTop}>
              <View style={styles.datePill}>
                <View style={styles.dateDot} />
                <Text style={styles.datePillText}>{todayLabel}</Text>
              </View>
            </View>
            <Text style={styles.expandedGreeting}>{greeting},</Text>
            <Text style={styles.expandedName}>{firstName}!</Text>
          </Animated.View>

          {/* Header Actions — always visible */}
          <Animated.View style={[styles.actionsContainer, { transform: [{ scale: avatarScale }] }]}>
            <DebouncedTouchable
              onPress={() => router.push('/notifications')}
              style={styles.notificationBtn}
              accessibilityRole="button"
              accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'No unread notifications'}
            >
              <Bell size={18} color="#1a1a1a" />
              {unreadCount > 0 && (
                <View style={[styles.notificationBadge, unreadCount >= 10 && { width: 20, borderRadius: 10 }]}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount >= 10 ? '10+' : unreadCount}
                  </Text>
                </View>
              )}
            </DebouncedTouchable>

            <DebouncedTouchable
              onPress={() => router.push('/profile')}
              activeOpacity={0.8}
              style={styles.avatarContainer}
            >
              {photoUrl ? (
                <View style={{ width: 33, height: 33 }}>
                  {imageLoading && (
                    <View style={[StyleSheet.absoluteFill, { borderRadius: 16.5, overflow: 'hidden' }]}>
                      <ShimmerSkeleton width={33} height={33} borderRadius={16.5} />
                    </View>
                  )}
                  <Image
                    source={{ uri: photoUrl }}
                    style={styles.avatarImg}
                    onLoadStart={() => setImageLoading(true)}
                    onLoad={() => setImageLoading(false)}
                    onError={() => setImageLoading(false)}
                  />
                </View>
              ) : (
                <LinearGradient
                  colors={['#FF6596', '#B66DFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarInitials}
                >
                  <Text style={styles.avatarInitialsText}>{initials}</Text>
                </LinearGradient>
              )}
            </DebouncedTouchable>
          </Animated.View>
        </Animated.View>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 24) + INNER_EXPANDED + 8 },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* ─── Verse of the Day ───────────────────────────────────────── */}
        <BounceCard>
          <VerseOfTheDayCard />
        </BounceCard>

        {/* ─── Bible Plan Progress ───────────────────────────────────────────── */}
        <BiblePlanProgressCard />

        {/* ─── Active Giving Campaigns ─────────────────────────── */}
        {campaigns.length > 0 && (
          <View style={styles.campaignsSection}>
            <View style={[styles.todayLabelRow, { paddingTop: 12, paddingBottom: 12 }]}>
              <View style={styles.todayDot} />
              <Text style={styles.todayLabelText}>SUPPORT A CAUSE</Text>
            </View>
            {campaigns.map(campaign => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onPress={() => router.push({ pathname: '/giving-campaign-detail', params: { id: campaign.id } })}
              />
            ))}
          </View>
        )}

        {/* ─── Today Cards Carousel ───────────────────────────────────── */}
        {heroCards.length > 0 && (
          <View style={styles.todayCarouselWrap}>
            {/* Section label */}
            <View style={styles.todayLabelRow}>
              <View style={styles.todayDot} />
              <Text style={styles.todayLabelText}>TODAY</Text>
            </View>

            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => handleHeroScrollEnd(e.nativeEvent.contentOffset.x)}
              >
                {heroCards.map(({ event, rsvpStatus }) => {
                  const d = new Date(`${event.date}T00:00:00`);
                  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                  const day = d.getDate();

                  return (
                    <View key={`hero-${event.id}`} style={{ width: cardWidth }}>
                      <BounceCard
                        style={{ marginBottom: 0 }}
                        onPress={() => router.push({ pathname: '/(tabs)/community', params: { tab: 'events' } })}
                        disabled={event.status?.toLowerCase() === 'cancelled'}
                      >
                        <SoftCard innerStyle={styles.todayCardInner}>
                          {/* Left — gradient calendar tile */}
                          <LinearGradient
                            colors={['#FF6596', '#B66DFF']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.todayDateTile}
                          >
                            <Text style={styles.todayTileMonth}>{month}</Text>
                            <Text style={styles.todayTileDay}>{day}</Text>
                            <CalendarDays size={12} color="rgba(255,255,255,0.7)" />
                          </LinearGradient>

                          {/* Right — event info */}
                          <View style={styles.todayCardContent}>
                            <View style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                              {event.status?.toLowerCase() === 'cancelled' && (
                                <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#DC2626' }}>CANCELLED</Text>
                                </View>
                              )}
                              <Text style={styles.todayEventTitle} numberOfLines={2}>
                                {event.title || 'Church Event'}
                              </Text>
                            </View>

                            <View style={styles.todayMetaRow}>
                              <Clock size={11} color="#9CA3AF" />
                              <Text style={styles.todayMetaText}>
                                {event.time || '9:00 AM'}{event.endTime ? ` – ${event.endTime}` : ''}
                              </Text>
                              {event.location ? (
                                <>
                                  <Text style={styles.todayMetaDot}>·</Text>
                                  <MapPin size={11} color="#9CA3AF" />
                                  <Text style={styles.todayMetaText} numberOfLines={1}>{event.location}</Text>
                                </>
                              ) : null}
                            </View>

                            {/* Compact RSVP pills */}
                            <View style={styles.todayRsvpRow}>
                              <DebouncedTouchable
                                style={[styles.todayRsvpPill, rsvpStatus === 'going' && styles.todayRsvpPillActive]}
                                onPress={() => handleRsvp(event.id, 'going')}
                              >
                                <CheckCircle2 size={12} color={rsvpStatus === 'going' ? '#FF6596' : '#9CA3AF'} />
                                <Text style={[styles.todayRsvpPillText, rsvpStatus === 'going' && styles.todayRsvpPillTextActive]}>Going</Text>
                              </DebouncedTouchable>
                              <DebouncedTouchable
                                style={[styles.todayRsvpPill, rsvpStatus === 'maybe' && styles.todayRsvpPillMaybe]}
                                onPress={() => handleRsvp(event.id, 'maybe')}
                              >
                                <HelpCircle size={12} color={rsvpStatus === 'maybe' ? '#F59E0B' : '#9CA3AF'} />
                                <Text style={[styles.todayRsvpPillText, rsvpStatus === 'maybe' && { color: '#F59E0B' }]}>Maybe</Text>
                              </DebouncedTouchable>
                              <DebouncedTouchable
                                style={[styles.todayRsvpPill, rsvpStatus === 'not_going' && styles.todayRsvpPillDecline]}
                                onPress={() => handleRsvp(event.id, 'not_going')}
                              >
                                <XCircle size={12} color={rsvpStatus === 'not_going' ? '#EF4444' : '#9CA3AF'} />
                                <Text style={[styles.todayRsvpPillText, rsvpStatus === 'not_going' && { color: '#EF4444' }]}>No</Text>
                              </DebouncedTouchable>
                            </View>
                          </View>
                        </SoftCard>
                      </BounceCard>
                    </View>
                  );
                })}
              </ScrollView>

              {heroCards.length > 1 && (
                <View style={styles.paginationRow}>
                  {heroCards.map((_, index) => (
                    <View
                      key={`dot-${index}`}
                      style={[styles.paginationDot, activeSlide === index && styles.paginationDotActive]}
                    />
                  ))}
                </View>
              )}
            </>
          </View>
        )}

        {/* ─── My Ministries (US-01/06/07/09) ───────────────────────── */}
        {sortedDutyItems.length > 0 && (
          <View style={styles.ministriesSection}>
            {/* Section header (US-07) */}
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionOverline}>MY SCHEDULE</Text>
                <Text style={styles.sectionTitle}>Serving This Week</Text>
              </View>
              {pendingCount > 0 ? (
                <View style={styles.pendingPill}>
                  <Text style={styles.pendingPillText}>{pendingCount} pending</Text>
                </View>
              ) : (
                <Text style={styles.allConfirmedText}>All confirmed ✓</Text>
              )}
            </View>

            {sortedDutyItems.map(({ assignment, schedule }) => (
              <BounceCard
                key={assignment.id}
                onPress={() => router.push({ pathname: '/serve-assignment-detail', params: { id: assignment.id } })}
              >
                <MinistryDutyCard
                  assignment={assignment}
                  schedule={schedule}
                  saving={savingEventId === assignment.id}
                  onConfirm={async () => {
                    setSavingEventId(assignment.id);
                    try {
                      await handleMinisterialDuty(assignment.id, 'accept');
                    } finally {
                      setSavingEventId(null);
                    }
                  }}
                  onDecline={async () => {
                    setSavingEventId(assignment.id);
                    try {
                      await handleMinisterialDuty(assignment.id, 'cancel');
                    } finally {
                      setSavingEventId(null);
                    }
                  }}
                />
              </BounceCard>
            ))}

            <DebouncedTouchable
              style={[styles.seeAllEventsBtn, { marginTop: 0 }]}
              onPress={() => router.navigate('/(tabs)/serve')}
            >
              <Text style={styles.seeAllEventsBtnText}>See all ministries</Text>
              <ChevronRight size={14} color="#FF6596" />
            </DebouncedTouchable>
          </View>
        )}

        {/* ─── Prayers ─────────────────────────────────────────────────── */}
        <View style={styles.upcomingSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionOverline}>COMMUNITY SUPPORT</Text>
              <Text style={styles.sectionTitle}>Prayer Requests</Text>
            </View>
          </View>

          {prayers.length > 0 ? (
            <>
              {prayers.slice(0, 3).map((prayer) => {
                const isLiked = prayer.likedBy?.includes(currentUserId);
                const isOwner = prayer.userId === currentUserId;

                return (
                  <BounceCard
                    key={prayer.id}
                    style={{ marginBottom: 12 }}
                    onPress={() =>
                      router.push({
                        pathname: '/comment-thread',
                        params: { targetType: 'prayer_request', targetId: prayer.id },
                      })
                    }
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
                          {prayer.userPhotoUrl ? (
                            <Image source={{ uri: prayer.userPhotoUrl }} style={{ width: 36, height: 36 }} />
                          ) : (
                            <User size={20} color="#9CA3AF" />
                          )}
                        </View>
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }} numberOfLines={1}>
                              {isOwner ? 'You' : prayer.name}
                            </Text>
                            {(prayer.answered || prayer.status === 'answered') && (
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
                            {formatPrayerTimeAgo(prayer.createdAt)}
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
                        {prayer.title ? <Text style={{ fontWeight: '700', color: '#111827' }}>{prayer.title} — </Text> : null}
                        {prayer.request || prayer.content}
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
                          <DebouncedTouchable
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                            activeOpacity={0.7}
                            onPress={() => handlePray(prayer.id)}
                          >
                            <Heart
                              size={18}
                              color={isLiked ? '#FF759E' : '#6B7280'}
                              fill={isLiked ? '#FF759E' : 'transparent'}
                            />
                            <Text style={{ fontSize: 13, fontWeight: '600', color: isLiked ? '#FF759E' : '#6B7280' }}>
                              {Math.max(0, prayer.likes || 0)}
                            </Text>
                          </DebouncedTouchable>

                          <CommentButton
                            count={prayer.commentCount || 0}
                            variant="icon-only"
                            size={18}
                            color="#9CA3AF"
                            onPress={() =>
                              router.push({
                                pathname: '/comment-thread',
                                params: { targetType: 'prayer_request', targetId: prayer.id },
                              })
                            }
                          />

                          {(isOwner || canModeratePrayerRequests(userProfile)) && (
                            <DebouncedTouchable
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                              onPress={() => handleAnswered(prayer.id, prayer.answered || prayer.status === 'answered')}
                              activeOpacity={0.7}
                            >
                              <CheckCircle2
                                size={18}
                                color={(prayer.answered || prayer.status === 'answered') ? '#10B981' : '#9CA3AF'}
                              />
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: '600',
                                  color: (prayer.answered || prayer.status === 'answered') ? '#10B981' : '#6B7280',
                                }}
                              >
                                {(prayer.answered || prayer.status === 'answered') ? 'Answered' : 'Mark Answered'}
                              </Text>
                            </DebouncedTouchable>
                          )}
                        </View>

                        {(isOwner || canModeratePrayerRequests(userProfile)) && (
                          <DebouncedTouchable
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
                                      openPrayerModal(prayer);
                                    } else if (buttonIndex === 2) {
                                      deletePrayer(prayer.id);
                                    }
                                  }
                                );
                              } else {
                                Alert.alert('Manage Prayer Request', 'Choose an action', [
                                  { text: 'Cancel', style: 'cancel' },
                                  { text: 'Edit', onPress: () => openPrayerModal(prayer) },
                                  { text: 'Delete', style: 'destructive', onPress: () => deletePrayer(prayer.id) },
                                ]);
                              }
                            }}
                            style={{ padding: 4 }}
                            activeOpacity={0.7}
                            hitSlop={8}
                          >
                            <MoreVertical size={18} color="#9CA3AF" />
                          </DebouncedTouchable>
                        )}
                      </View>
                    </SoftCard>
                  </BounceCard>
                );
              })}

              <DebouncedTouchable
                style={[styles.seeAllEventsBtn, { marginTop: 0 }]}
                onPress={() => router.push({ pathname: '/(tabs)/community', params: { tab: 'feeds', filter: 'prayers' } })}
              >
                <Text style={styles.seeAllEventsBtnText}>See all prayers</Text>
                <ChevronRight size={14} color="#FF6596" />
              </DebouncedTouchable>
            </>
          ) : (
            <BounceCard onPress={() => openPrayerModal()}>
              <SoftCard innerStyle={{ padding: 20, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF0F5', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <HeartHandshake size={22} color="#FF6596" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4, textAlign: 'center' }}>
                  No prayer requests yet
                </Text>
                <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 14, paddingHorizontal: 12 }}>
                  Share your request with your church family or pray for one another.
                </Text>
                <View style={{ backgroundColor: '#FF6596', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }}>
                  <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>Submit Prayer Request</Text>
                </View>
              </SoftCard>
            </BounceCard>
          )}
        </View>
        {/* ─── Recent Sermons ──────────────────────────────────────────── */}
        {sermons.length > 0 && (
          <View style={styles.upcomingSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionOverline}>WATCH &amp; LISTEN</Text>
                <Text style={styles.sectionTitle}>Recent Sermons</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sermonRowContent}
            >
              {sermons.slice(0, 5).map((sermon) => {
                const duration = sermon.durationSeconds
                  ? `${Math.floor(sermon.durationSeconds / 60)} min`
                  : null;
                const isVideo = sermon.mediaType === 'video';
                return (
                  <BounceCard
                    key={sermon.id}
                    style={styles.sermonCard}
                    onPress={() => {
                      import('@/store/useGlobalVideoStore').then((m) => {
                        m.useGlobalVideoStore.getState().openVideo(sermon.id);
                      });
                    }}
                  >
                    <Image
                      source={{ uri: sermon.thumbnailUrl }}
                      style={styles.sermonThumb}
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.75)']}
                      style={styles.sermonThumbOverlay}
                    />
                    <View style={styles.sermonCardInfo}>
                      <Text style={styles.sermonCardTitle} numberOfLines={2}>{sermon.title}</Text>
                      <Text style={styles.sermonCardSpeaker} numberOfLines={1}>
                        {sermon.preacherName || ''}
                      </Text>
                      {duration ? (
                        <View style={styles.sermonDurationRow}>
                          <Clock size={9} color="rgba(255,255,255,0.7)" />
                          <Text style={styles.sermonDurationText}>{duration}</Text>
                        </View>
                      ) : null}
                    </View>
                  </BounceCard>
                );
              })}
            </ScrollView>

            <DebouncedTouchable
              style={styles.seeAllEventsBtn}
              onPress={() => router.push({ pathname: '/(tabs)/community', params: { tab: 'sermons' } })}
            >
              <Text style={styles.seeAllEventsBtnText}>See all sermons</Text>
              <ChevronRight size={14} color="#FF6596" />
            </DebouncedTouchable>
          </View>
        )}
        {/* ─── Upcoming Events ─────────────────────────────────────────── */}
        {upcomingList.length > 0 && (
          <View style={styles.upcomingSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionOverline}>WHAT&apos;S NEXT</Text>
                <Text style={styles.sectionTitle}>Upcoming Events</Text>
              </View>
            </View>

            {upcomingList.slice(0, 3).map((event) => {
              const d = event.date ? new Date(`${event.date}T00:00:00`) : new Date();
              const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
              const day = d.getDate().toString();
              const weekday = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
              return (
                <BounceCard
                  key={event.id}
                  style={{ marginBottom: 10 }}
                  onPress={() => setSelectedEvent(event)}
                  disabled={event.status?.toLowerCase() === 'cancelled'}
                >
                  <SoftCard innerStyle={styles.eventListCardInner}>
                    <View style={styles.eventDateBlock}>
                      <Text style={styles.eventDateMonth}>{month}</Text>
                      <Text style={styles.eventDateDay}>{day}</Text>
                      <Text style={styles.eventDateWeekday}>{weekday}</Text>
                    </View>
                    <View style={styles.eventDivider} />

                    <View style={styles.eventDetailsBlock}>
                      <View style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                        {event.status?.toLowerCase() === 'cancelled' && (
                          <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#DC2626' }}>CANCELLED</Text>
                          </View>
                        )}
                        <Text style={styles.eventTitle} numberOfLines={2}>
                          {event.title || 'Church Event'}
                        </Text>
                      </View>
                      <View style={styles.eventTimePill}>
                        <Clock size={11} color="#9CA3AF" />
                        <Text style={styles.eventTimePillText}>
                          {event.time || '9:00 AM'}{event.endTime ? ` – ${event.endTime}` : ''}
                        </Text>
                      </View>
                      {event.location ? (
                        <View style={styles.eventLocationRow}>
                          <MapPin size={11} color="#B0B6C8" />
                          <Text style={styles.eventLocationText} numberOfLines={1}>
                            {event.location}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {event.status?.toLowerCase() !== 'cancelled' && (
                      <ChevronRight size={14} color="#9CA3AF" />
                    )}
                  </SoftCard>
                </BounceCard>
              );
            })}

            <DebouncedTouchable
              style={styles.seeAllEventsBtn}
              onPress={() => router.push({ pathname: '/(tabs)/community', params: { tab: 'events' } })}
            >
              <Text style={styles.seeAllEventsBtnText}>See all events</Text>
              <ChevronRight size={14} color="#FF6596" />
            </DebouncedTouchable>
          </View>
        )}
      </Animated.ScrollView>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  // Additional styles for shimmer placeholders (reuse existing ones where possible)
  shimmerHeader: { width: '100%', height: 80, marginBottom: 12 },
  shimmerCarousel: { width: '100%', height: 150, marginBottom: 12 },
  shimmerMinistry: { width: '100%', height: 100, marginBottom: 12 },
  shimmerPrayer: { width: '100%', height: 120, marginBottom: 12 },
  shimmerSermon: { width: '100%', height: 120, marginBottom: 12 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: 'hidden',
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 10,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  // Compact (collapsed) state
  compactRow: {
    position: 'absolute',
    left: 20,
    right: 80,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  compactGreeting: { fontSize: 15, color: '#666', fontWeight: '400' },
  compactName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  // Expanded state
  expandedContent: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  expandedTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,101,150,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  dateDot: {
    width: 5,
    height: 5,
    borderRadius: 99,
    backgroundColor: '#FF6596',
  },
  datePillText: { fontSize: 11, fontWeight: '600', color: '#FF6596', letterSpacing: 0.2 },
  expandedGreeting: { fontSize: 14, color: '#9CA3AF', fontWeight: '400', marginTop: 2 },
  expandedName: { fontSize: 26, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.5 },
  // Header Actions
  actionsContainer: { 
    position: 'absolute', 
    right: 20, 
    top: 0, 
    bottom: 0, 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  notificationBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 12px rgba(164, 164, 164, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    elevation: 1,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  // Avatar
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 12px rgba(164, 164, 164, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    elevation: 1,
  },
  avatarBtn: { position: 'absolute', right: 20, top: 0, bottom: 0, justifyContent: 'center' },
  avatarImg: { width: 33, height: 33, borderRadius: 16.5 },
  avatarInitials: {
    width: 33,
    height: 33,
    borderRadius: 16.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#fff',
  },
  scrollContent: { padding: 24, paddingTop: 12, paddingBottom: 100 },
  // ─── Campaigns section ───────────────────────────────────────────────
  campaignsSection: { marginBottom: 8 },
  // ─── My Ministries section ───────────────────────────────────────────────
  ministriesSection: { marginBottom: 8 },
  pendingPill: { backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pendingPillText: { fontSize: 12, fontWeight: '700', color: '#F59E0B' },
  allConfirmedText: { fontSize: 12, fontWeight: '700', color: '#22C55E' },
  // ────────────────────────────────────────────────────────────────────────
  rsvpActiveBtn: { backgroundColor: '#fff' },
  rsvpActiveText: { color: '#FF6596' },

  // ─── Today Cards Carousel ────────────────────────────────────────────────
  todayCarouselWrap: { marginTop: 0, marginBottom: 24 },
  todayLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  todayDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: '#FF6596' },
  todayLabelText: { fontSize: 11, fontWeight: '800', color: '#FF6596', letterSpacing: 1.2, textTransform: 'uppercase' },

  todayCardOuter: {
    borderRadius: 20,
    boxShadow: '0px 4px 12px rgba(255, 101, 150, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  todayCardInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  todayDateTile: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 2,
  },
  todayTileMonth: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.85)', letterSpacing: 1 },
  todayTileDay: { fontSize: 28, fontWeight: '900', color: '#fff', lineHeight: 32, includeFontPadding: false },

  todayCardContent: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 6 },
  todayEventTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', lineHeight: 20 },

  todayMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  todayMetaText: { fontSize: 11, color: '#9CA3AF', fontWeight: '500', flexShrink: 1 },
  todayMetaDot: { fontSize: 11, color: '#D1D5DB', fontWeight: '700' },

  todayRsvpRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  todayRsvpPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F5F6FA', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  todayRsvpPillActive: { backgroundColor: '#FFF0F5', borderWidth: 1, borderColor: '#FECDD3' },
  todayRsvpPillMaybe: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' },
  todayRsvpPillDecline: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  todayRsvpPillText: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  todayRsvpPillTextActive: { color: '#FF6596' },

  // ─── Today empty state ───────────────────────────────────────────────────
  todayEmptyCard: {
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0px 2px 10px rgba(255, 101, 150, 0.04)',
  },
  todayEmptyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  todayEmptyIconRing: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,101,150,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayEmptyText: { flex: 1 },
  todayEmptyTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  todayEmptySubtitle: { fontSize: 12, color: '#9CA3AF', lineHeight: 16 },
  todayEmptyAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  todayEmptyActionText: { fontSize: 12, fontWeight: '700', color: '#FF6596' },

  heroScroll: { marginBottom: 16 },
  paginationRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 4 },
  paginationDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB' },
  paginationDotActive: { width: 20, backgroundColor: '#FF6596' },
  // ─── Quick Actions ────────────────────────────────────────────────────────
  quickActionsSection: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 10 },
  quickActionsRow: { flexDirection: 'row', gap: 10 },
  qaCard: { flex: 1, alignItems: 'center', gap: 8 },
  qaIconBox: {
    width: 58, height: 58, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.07)',
  },
  qaLabel: { fontSize: 12, fontWeight: '700', color: '#374151', letterSpacing: 0.1 },
  qaSubLabel: { fontSize: 11, fontWeight: '500', color: '#9CA3AF' },
  qaOrb: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(77,139,255,0.1)', bottom: -24, right: -16 },
  qaIconRing: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  qaTextWrap: { flex: 1 },

  // legacy — kept for any residual refs
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  gridItem: { alignItems: 'center', gap: 7 },
  iconWrapper: {
    width: 60, height: 60, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  gridLabel: { fontSize: 11, fontWeight: '700', color: '#4B5563', letterSpacing: 0.1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  seeAll: { fontSize: 14, color: '#FF6596', fontWeight: '600' },
  prayerCardInner: { flexDirection: 'row' },
  prayerGradientBorder: { width: 4, alignSelf: 'stretch' },
  prayerRow: { flex: 1, flexDirection: 'row', padding: 12, paddingLeft: 12 },
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
  emptyCard: { backgroundColor: '#fff', padding: 24, borderRadius: 16, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 14 },

  // ─── Recent Sermons ─────────────────────────────────────────────────────
  sermonRowContent: { paddingRight: 24, gap: 12 },
  sermonCard: {
    width: 148,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#111',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  sermonThumb: { width: '100%', height: 190, resizeMode: 'cover' },
  sermonThumbOverlay: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: 110,
  },
  sermonTypeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sermonTypeBadgeVideo: { backgroundColor: 'rgba(255,101,150,0.85)' },
  sermonTypeBadgeAudio: { backgroundColor: 'rgba(107,70,193,0.85)' },
  sermonTypeBadgeText: { fontSize: 8, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  sermonCardInfo: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 10,
  },
  sermonCardTitle: { fontSize: 12, fontWeight: '700', color: '#fff', lineHeight: 16, marginBottom: 3 },
  sermonCardSpeaker: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  sermonDurationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sermonDurationText: { fontSize: 9, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },

  // ─── Upcoming Events section ─────────────────────────────────────────────
  upcomingSection: { marginTop: 0, marginBottom: 8 },
  sectionOverline: { fontSize: 11, fontWeight: '800', color: '#FF6596', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 },
  upcomingCountPill: { backgroundColor: '#FFF0F5', borderRadius: 999, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  upcomingCountText: { fontSize: 13, fontWeight: '800', color: '#FF6596' },
  eventListCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  eventDateBlock: { alignItems: 'center', width: 44, gap: 1 },
  eventDateMonth: { fontSize: 10, fontWeight: '800', color: '#FF6596', textTransform: 'uppercase', letterSpacing: 0.5 },
  eventDateDay: { fontSize: 26, fontWeight: '900', color: '#1a1a1a', lineHeight: 30, includeFontPadding: false },
  eventDateWeekday: { fontSize: 9, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5 },
  eventDivider: { width: 1, height: 44, backgroundColor: '#F0F0F5', marginHorizontal: 14 },
  eventDetailsBlock: { flex: 1, gap: 4 },
  eventTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', lineHeight: 20 },
  eventTimePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F5F6FA', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  eventTimePillText: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  eventLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eventLocationText: { fontSize: 12, fontWeight: '400', color: '#B0B6C8', flex: 1 },
  seeAllEventsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, marginTop: 8 },
  seeAllEventsBtnText: { fontSize: 12, fontWeight: '700', color: '#FF6596' },

});
