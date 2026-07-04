import { MinistryDutyCard } from '@/features/home/presentation/components/MinistryDutyCard';
import { VerseOfTheDayCard } from '@/features/home/presentation/components/VerseOfTheDayCard';
import { useHomeScreenData } from '@/features/home/presentation/hooks/useHomeScreenData';
import { usePrayerFeed } from '@/features/prayer/presentation/hooks/usePrayerFeed';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Calendar, CalendarDays, CheckCircle2, ChevronRight, Clock, Crown, Grid, HandHeart, HeartHandshake, HelpCircle, MapPin, Users, XCircle } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const {
    currentUser,
    latestPrayer,
    myUpcomingDuties,
    upcomingEvents,
    getUserRsvpStatus,
    handleMinisterialDuty,
    handlePray,
    handleRsvp,
    formatPrayerTimeAgo,
    displayName,
    assignments,
  } = useHomeScreenData();
  const { prayers } = usePrayerFeed();
  const prayerCount = prayers.length;

  const [activeSlide, setActiveSlide] = useState(0);
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = screenWidth - 48;
  const currentUserId = currentUser?.uid ?? '';

  // US-01 / US-06 — flatten one card per duty, sort pending → accepted → declined
  const sortedDutyItems = useMemo(() => {
    const items = myUpcomingDuties.flatMap((schedule) =>
      assignments
        .filter((a) => a.eventId === schedule.id && a.memberId === currentUserId)
        .map((assignment) => ({ assignment, schedule }))
    );

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
      upcomingEvents.map((event) => ({
        event,
        rsvpStatus: currentUserId ? getUserRsvpStatus(event, currentUserId) : null,
      })),
    [currentUserId, getUserRsvpStatus, upcomingEvents]
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
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.6)' }]} pointerEvents="none" />

        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.title}>{displayName}!</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/my-qr')}>
            <Image source={{ uri: 'https://i.pravatar.cc/150?img=11' }} style={styles.avatar} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 24) + 104 }]} showsVerticalScrollIndicator={false}>
        {/* ─── Verse of the Day ───────────────────────────────────────── */}
        <VerseOfTheDayCard />

        {/* ─── Hero Carousel ──────────────────────────────────────────── */}
        {heroCards.length > 0 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => handleHeroScrollEnd(e.nativeEvent.contentOffset.x)}
              style={styles.heroScroll}
            >
              {heroCards.map(({ event, rsvpStatus }) => {
                return (
                  <View key={`hero-${event.id}`} style={{ width: cardWidth }}>
                    <TouchableOpacity activeOpacity={0.9}>
                      <LinearGradient
                        colors={['#FF6596', '#B66DFF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                      >
                        <View style={styles.liveBadge}>
                          <Text style={styles.liveText}>UPCOMING</Text>
                          <CalendarDays size={12} color="#fff" />
                        </View>
                        <Text style={styles.heroTitle}>
                          {new Date(`${event.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </Text>
                        <Text style={styles.heroEventName}>{event.title || 'Sunday Worship Service'}</Text>
                        <Text style={styles.heroEventDetails}>
                          {event.time || '9:00 AM'} • {event.location || 'Main Sanctuary'}
                        </Text>
                        <View style={styles.heroRsvpRow}>
                          <TouchableOpacity style={[styles.heroRsvpBtn, rsvpStatus === 'going' && styles.rsvpActiveBtn]} onPress={() => handleRsvp(event.id, 'going')}>
                            <CheckCircle2 size={16} color={rsvpStatus === 'going' ? '#FF6596' : '#fff'} />
                            <Text style={[styles.heroRsvpText, rsvpStatus === 'going' && styles.rsvpActiveText]}>Going</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.heroRsvpBtn, rsvpStatus === 'maybe' && styles.rsvpActiveBtn]} onPress={() => handleRsvp(event.id, 'maybe')}>
                            <HelpCircle size={16} color={rsvpStatus === 'maybe' ? '#F59E0B' : '#fff'} />
                            <Text style={[styles.heroRsvpText, rsvpStatus === 'maybe' && { color: '#F59E0B' }]}>Maybe</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.heroRsvpBtn, rsvpStatus === 'not_going' && styles.rsvpActiveBtn]} onPress={() => handleRsvp(event.id, 'not_going')}>
                            <XCircle size={16} color={rsvpStatus === 'not_going' ? '#EF4444' : '#fff'} />
                            <Text style={[styles.heroRsvpText, rsvpStatus === 'not_going' && { color: '#EF4444' }]}>Not Going</Text>
                          </TouchableOpacity>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
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
          </View>
        ) : (
          <TouchableOpacity activeOpacity={0.9}>
            <LinearGradient
              colors={['#FF6596', '#B66DFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.liveBadge}>
                <Text style={styles.liveText}>LIVE SERVICE</Text>
                <Crown size={12} color="#fff" />
              </View>
              <Text style={styles.heroTitle}>Sunday 9:00 AM{'\n'}Worship & Sermon</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ─── Action Grid ────────────────────────────────────────────── */}
        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem}>
            <View style={styles.iconWrapper}>
              <Users color="#4D8BFF" size={24} />
            </View>
            <Text style={styles.gridLabel}>Members</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem}>
            <View style={styles.iconWrapper}>
              <Calendar color="#8B6FE8" size={24} />
            </View>
            <Text style={styles.gridLabel}>Events</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/giving')}>
            <View style={styles.iconWrapper}>
              <HandHeart color="#4ADE80" size={24} />
            </View>
            <Text style={styles.gridLabel}>Giving</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/more')}>
            <View style={styles.iconWrapper}>
              <Grid color="#FF6596" size={24} />
            </View>
            <Text style={styles.gridLabel}>More</Text>
          </TouchableOpacity>
        </View>

        {/* ─── My Ministries (US-01/06/07/09) ───────────────────────── */}
        {sortedDutyItems.length > 0 && (
          <View style={styles.ministriesSection}>
            {/* Section header (US-07) */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Serving This Week</Text>
              {pendingCount > 0 ? (
                <View style={styles.pendingPill}>
                  <Text style={styles.pendingPillText}>{pendingCount} pending</Text>
                </View>
              ) : (
                <Text style={styles.allConfirmedText}>All confirmed ✓</Text>
              )}
            </View>

            {/* Duty cards (US-09: hidden when empty, handled by outer condition) */}
            {sortedDutyItems.map(({ assignment, schedule }) => (
              <MinistryDutyCard
                key={assignment.id}
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
            ))}
          </View>
        )}

        {/* ─── Prayers ─────────────────────────────────────────────────── */}
        {latestPrayer ? (
          <View style={styles.upcomingSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionOverline}>COMMUNITY SUPPORT</Text>
                <Text style={styles.sectionTitle}>Prayer Requests</Text>
              </View>
              <TouchableOpacity
                style={styles.upcomingCountPill}
                onPress={() => router.push('/(tabs)/prayer')}
              >
                <Text style={styles.upcomingCountText}>{prayerCount}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.prayerCardOuter}>
              <View style={styles.prayerCardInner}>
                <LinearGradient
                  colors={['#FF9EBC', '#D49DFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.prayerGradientBorder}
                />
                <View style={styles.prayerRow}>
                  <View style={styles.prayerContent}>
                    <View style={styles.prayerTop}>
                      <Text style={styles.prayerName}>{latestPrayer.name}</Text>
                      <Text style={styles.prayerTime}>{formatPrayerTimeAgo(latestPrayer.createdAt)}</Text>
                    </View>
                    <Text style={styles.prayerText}>{latestPrayer.request}</Text>
                    
                    <View style={styles.prayerBottomRow}>
                      <TouchableOpacity
                        style={styles.prayIconButton}
                        onPress={() => handlePray(latestPrayer.id)}
                        activeOpacity={0.7}
                      >
                        <HeartHandshake 
                          size={18} 
                          color={latestPrayer.likedBy?.includes(currentUserId) ? '#FF6596' : '#9CA3AF'} 
                        />
                        <Text style={[styles.prayIconCount, latestPrayer.likedBy?.includes(currentUserId) && { color: '#FF6596' }]}>
                          {latestPrayer.likes || 0}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.seeAllEventsBtn}
              onPress={() => router.push('/(tabs)/prayer')}
            >
              <Text style={styles.seeAllEventsBtnText}>See all prayers</Text>
              <ChevronRight size={14} color="#FF6596" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No prayer requests yet.</Text>
          </View>
        )}

        {/* ─── Upcoming Events ─────────────────────────────────────────── */}
        {upcomingEvents.length > 0 && (
          <View style={styles.upcomingSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionOverline}>WHAT'S NEXT</Text>
                <Text style={styles.sectionTitle}>Upcoming Events</Text>
              </View>
              <TouchableOpacity
                style={styles.upcomingCountPill}
                onPress={() => router.push('/(tabs)/community')}
              >
                <Text style={styles.upcomingCountText}>{upcomingEvents.length}</Text>
              </TouchableOpacity>
            </View>

            {upcomingEvents.slice(0, 3).map((event) => {
              const d = event.date ? new Date(`${event.date}T00:00:00`) : new Date();
              const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
              const day = d.getDate().toString();
              const weekday = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
              return (
                <View key={event.id} style={styles.eventListCard}>
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
                </View>
              );
            })}

            <TouchableOpacity
              style={styles.seeAllEventsBtn}
              onPress={() => router.push('/(tabs)/community')}
            >
              <Text style={styles.seeAllEventsBtnText}>See all events</Text>
              <ChevronRight size={14} color="#FF6596" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  greeting: { fontSize: 16, color: '#666' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a' },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  scrollContent: { padding: 24, paddingTop: 12, paddingBottom: 100 },
  // ─── My Ministries section ───────────────────────────────────────────────
  ministriesSection: { marginBottom: 32 },
  pendingPill: { backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pendingPillText: { fontSize: 12, fontWeight: '700', color: '#F59E0B' },
  allConfirmedText: { fontSize: 12, fontWeight: '700', color: '#22C55E' },
  // ────────────────────────────────────────────────────────────────────────
  rsvpActiveBtn: { backgroundColor: '#fff' },
  rsvpActiveText: { color: '#FF6596' },
  heroCard: { padding: 24, borderRadius: 24, marginBottom: 0, overflow: 'hidden' },
  heroScroll: { marginBottom: 16 },
  paginationRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 24 },
  paginationDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB' },
  paginationDotActive: { width: 20, backgroundColor: '#FF6596' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginBottom: 16, gap: 4 },
  liveText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  heroTitle: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginBottom: 4 },
  heroEventName: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 4 },
  heroEventDetails: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  heroRsvpRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  heroRsvpBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 4 },
  heroRsvpText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 32 },
  gridItem: { width: '22%', alignItems: 'center' },
  iconWrapper: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  gridLabel: { fontSize: 12, fontWeight: '500', color: '#1a1a1a' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  seeAll: { fontSize: 14, color: '#FF6596', fontWeight: '600' },
  prayerCardOuter: { marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  prayerCardInner: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  prayerGradientBorder: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  prayerRow: { flexDirection: 'row', padding: 12, paddingLeft: 16 },
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

  // ─── Upcoming Events section ─────────────────────────────────────────────
  upcomingSection: { marginTop: 8, marginBottom: 16 },
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
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
  seeAllEventsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12, marginTop: 4 },
  seeAllEventsBtnText: { fontSize: 13, fontWeight: '700', color: '#FF6596' },
});
