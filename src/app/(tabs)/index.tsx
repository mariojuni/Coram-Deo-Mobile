import DebouncedTouchable from '@/components/DebouncedTouchable';
import { BiblePlanProgressCard } from '@/features/home/presentation/components/BiblePlanProgressCard';
import { MinistryDutyCard } from '@/features/home/presentation/components/MinistryDutyCard';
import { VerseOfTheDayCard } from '@/features/home/presentation/components/VerseOfTheDayCard';
import { useHomeScreenData } from '@/features/home/presentation/hooks/useHomeScreenData';
import { usePrayerFeed } from '@/features/prayer/presentation/hooks/usePrayerFeed';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { useGiving } from '@/features/giving/presentation/hooks/useGiving';
import { CampaignCard } from '@/features/giving/presentation/components/CampaignCard';
import { useSermonStore } from '@/store/useSermonStore';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { CalendarDays, CheckCircle2, ChevronRight, Clock, HeartHandshake, HelpCircle, MapPin, Play, XCircle, Pencil, Trash2, MoreHorizontal, User, MessageCircle } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert, ActionSheetIOS, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Schedule } from '@/features/schedule/domain/schedule.types';
import { EventDetailsModal } from '@/components/Events/EventDetailsModal';
import { canModeratePrayerRequests } from '@/permissions/mobilePermissions';

function isThisWeek(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  
  const currentDay = now.getDay() === 0 ? 7 : now.getDay();
  
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currentDay + 1);
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return date >= startOfWeek && date <= endOfWeek;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTodayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function BounceCard({ children, style, onPress }: { children: any; style?: any; onPress?: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const lastPress = useRef(0);
  const DEBOUNCE_MS = 400;

  const pressIn = () => {
    const now = Date.now();
    if (now - lastPress.current < DEBOUNCE_MS) return;
    lastPress.current = now;
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  };
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 15, bounciness: 12 }).start();

  if (onPress) {
    return (
      <DebouncedTouchable activeOpacity={1} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
        <Animated.View style={[style, { transform: [{ scale }] }]}>
          {children}
        </Animated.View>
      </DebouncedTouchable>
    );
  }

  return (
    <Animated.View
      style={[style, { transform: [{ scale }] }]}
      onTouchStart={pressIn}
      onTouchEnd={pressOut}
      onTouchCancel={pressOut}
    >
      {children}
    </Animated.View>
  );
}

const INNER_EXPANDED = 92;
const INNER_COLLAPSED = 48;
const COLLAPSE_RANGE = 70;

export default function HomeScreen() {
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] = useState<Schedule | null>(null);

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
  } = useHomeScreenData();
  const { prayers, loading: prayersLoading, togglePrayerLike, deletePrayer } = usePrayerFeed();
  const openPrayerModal = useUIStore((state) => state.openPrayerModal);
  const prayerCount = prayers.length;

  // Recent sermons
  const sermons = useSermonStore((s) => s.sermons);
  const sermonsLoading = useSermonStore((s) => s.loading);
  const subscribeSermons = useSermonStore((s) => s.subscribeSermons);
  useEffect(() => {
    if (sermons.length === 0 && !sermonsLoading) {
      subscribeSermons(userProfile?.churchId || undefined);
    }
  }, []);

  const { campaigns } = useGiving();

  const [activeSlide, setActiveSlide] = useState(0);
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = screenWidth - 48;
  const currentUserId = currentUser?.uid ?? '';

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
    outputRange: [1, 0.4],
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
        .filter((a) => a.eventId === schedule.id && a.memberId === currentUserId)
        .map((assignment) => ({ assignment, schedule }))
    ).filter(({ schedule }) => isThisWeek(schedule.date));

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

  return (
    <View style={styles.container}>
      {/* ─── Animated Header ──────────────────────────────────────── */}
      <Animated.View
        style={[styles.header, { paddingTop: Math.max(insets.top, 24) }]}
        pointerEvents="box-none"
      >
        <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
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

          {/* Avatar — always visible */}
          <Animated.View style={[styles.avatarBtn, { transform: [{ scale: avatarScale }] }]}>
            <DebouncedTouchable
              onPress={() => router.push('/profile')}
              activeOpacity={0.8}
            >
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatarImg} />
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
            <View style={styles.todayLabelRow}>
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
                        style={styles.todayCard}
                        onPress={() => router.push({ pathname: '/(tabs)/community', params: { tab: 'events' } })}
                      >
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
                          <Text style={styles.todayEventTitle} numberOfLines={2}>
                            {event.title || 'Church Event'}
                          </Text>

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
              onPress={() => router.push('/(tabs)/serve')}
            >
              <Text style={styles.seeAllEventsBtnText}>See all ministries</Text>
              <ChevronRight size={14} color="#FF6596" />
            </DebouncedTouchable>
          </View>
        )}

        {/* ─── Prayers ─────────────────────────────────────────────────── */}
        {prayers.length > 0 ? (
          <View style={styles.upcomingSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionOverline}>COMMUNITY SUPPORT</Text>
                <Text style={styles.sectionTitle}>Prayer Requests</Text>
              </View>
            </View>

            {prayers.slice(0, 3).map((prayer) => (
            <BounceCard 
              key={prayer.id}
              style={[styles.prayerCardOuter, { marginBottom: 12 }]}
              onPress={() => router.push({ pathname: '/comment-thread', params: { targetType: 'prayer_request', targetId: prayer.id } })}
            >
              <View style={styles.prayerCardInner}>
                <LinearGradient
                  colors={['#FF6596', '#B66DFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.prayerGradientBorder}
                />
                <View style={styles.prayerRow}>
                  <View style={styles.prayerContent}>
                    <View style={styles.prayerTop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginRight: 10, overflow: 'hidden' }}>
                          {prayer.userPhotoUrl ? (
                            <Image source={{ uri: prayer.userPhotoUrl }} style={{ width: 36, height: 36 }} />
                          ) : (
                            <User size={20} color="#9CA3AF" />
                          )}
                        </View>
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.prayerName} numberOfLines={1}>{prayer.name}</Text>
                            {(prayer.answered || prayer.status === 'answered') && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF3', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, gap: 4 }}>
                                <CheckCircle2 size={10} color="#10B981" />
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#10B981', textTransform: 'uppercase' }}>Answered</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.prayerTime}>{formatPrayerTimeAgo(prayer.createdAt)}</Text>
                        </View>
                        {(prayer.userId === currentUserId || canModeratePrayerRequests(userProfile)) && (
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
                            style={{ padding: 4, alignSelf: 'flex-start' }}
                          >
                            <MoreHorizontal size={20} color="#6B7280" />
                          </DebouncedTouchable>
                        )}
                      </View>
                    </View>
                    <Text style={styles.prayerText}>
                      {prayer.title ? <Text style={{ fontWeight: '700', color: '#111827' }}>{prayer.title} — </Text> : null}
                      {prayer.request || prayer.content}
                    </Text>
                    
                    <View style={[styles.prayerBottomRow, { justifyContent: 'flex-end', marginTop: 12 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {/* Mark as Answered button for the creator or admins */}
                        {(prayer.userId === currentUserId || canModeratePrayerRequests(userProfile)) && (
                            <DebouncedTouchable
                              style={[styles.prayIconButton, { marginRight: 10 }]}
                              onPress={() => handleAnswered(prayer.id, prayer.answered || prayer.status === 'answered')}
                              activeOpacity={0.7}
                            >
                              <CheckCircle2 size={18} color={(prayer.answered || prayer.status === 'answered') ? '#10B981' : '#9CA3AF'} />
                            </DebouncedTouchable>
                        )}
                        
                        <DebouncedTouchable
                          style={[styles.prayIconButton, { marginRight: 10 }]}
                          onPress={() => router.push({ pathname: '/comment-thread', params: { targetType: 'prayer_request', targetId: prayer.id } })}
                          activeOpacity={0.7}
                        >
                          <MessageCircle size={18} color="#9CA3AF" />
                          <Text style={styles.prayIconCount}>
                            {prayer.commentCount || 0}
                          </Text>
                        </DebouncedTouchable>

                        <DebouncedTouchable 
                          style={styles.prayIconButton}
                          onPress={() => handlePray(prayer.id)}
                          activeOpacity={0.7}
                        >
                          <HeartHandshake 
                            size={18} 
                            color={prayer.likedBy?.includes(currentUserId) ? '#FF6596' : '#9CA3AF'} 
                          />
                          <Text style={[styles.prayIconCount, prayer.likedBy?.includes(currentUserId) && { color: '#FF6596' }]}>
                            {prayer.likes || 0}
                          </Text>
                        </DebouncedTouchable>
                      </View>
                    </View>
                    </View>
                  </View>
                </View>
            </BounceCard>
            ))}

            <DebouncedTouchable
              style={[styles.seeAllEventsBtn, { marginTop: 0 }]}
              onPress={() => router.push({ pathname: '/(tabs)/community', params: { tab: 'prayers' } })}
            >
              <Text style={styles.seeAllEventsBtnText}>See all prayers</Text>
              <ChevronRight size={14} color="#FF6596" />
            </DebouncedTouchable>
          </View>
        ) : null}
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
                    onPress={() => router.navigate({ pathname: '/sermon-watch', params: { id: sermon.id } })}
                  >
                    <Image
                      source={{ uri: sermon.thumbnailUrl }}
                      style={styles.sermonThumb}
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.75)']}
                      style={styles.sermonThumbOverlay}
                    />
                    {/* Type badge */}
                    <View style={[styles.sermonTypeBadge, isVideo ? styles.sermonTypeBadgeVideo : styles.sermonTypeBadgeAudio]}>
                      <Play size={8} color="#fff" fill="#fff" />
                      <Text style={styles.sermonTypeBadgeText}>{isVideo ? 'VIDEO' : 'AUDIO'}</Text>
                    </View>
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
                  style={styles.eventListCard}
                  onPress={() => setSelectedEvent(event)}
                >
                  <View style={styles.eventDateBlock}>
                    <Text style={styles.eventDateMonth}>{month}</Text>
                    <Text style={styles.eventDateDay}>{day}</Text>
                    <Text style={styles.eventDateWeekday}>{weekday}</Text>
                  </View>

                  <View style={styles.eventDivider} />

                  <View style={styles.eventDetailsBlock}>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                      {event.title || 'Church Event'}
                    </Text>
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

                  <ChevronRight size={14} color="#9CA3AF" />
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
  // Avatar
  avatarBtn: { position: 'absolute', right: 20, top: 0, bottom: 0, justifyContent: 'center' },
  avatarImg: { width: 46, height: 46, borderRadius: 23 },
  avatarInitials: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: { fontSize: 18, fontWeight: '700', color: '#fff' },
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

  todayCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
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

  todayRsvpRow: { flexDirection: 'row', gap: 6 },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
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
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
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
  prayerCardOuter: { marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  prayerCardInner: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', flexDirection: 'row' },
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
  eventListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
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
