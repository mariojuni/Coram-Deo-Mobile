import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, limit, onSnapshot, orderBy, query, runTransaction } from 'firebase/firestore';
import { Calendar, CalendarDays, Check, CheckCircle2, Clock, Crown, Grid, HandHeart, HeartHandshake, HelpCircle, MapPin, Users, XCircle } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AppModal from '../../components/ui/AppModal';
import { db } from '../../firebase';
import { useAuthStore } from '../../store/useAuthStore';
import { useMemberStore } from '../../store/useMemberStore';
import { getUpcomingSchedules, getUserMinisterialRoles, getUserRsvpStatus, Schedule, updateMinisterialDuty, updateRsvp, useScheduleStore } from '../../store/useScheduleStore';

import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { userProfile, currentUser } = useAuthStore();
  const { members } = useMemberStore();
  const { schedules, initializeSchedulesListener } = useScheduleStore();
  const router = useRouter();

  const [latestPrayer, setLatestPrayer] = useState<any>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeDutySlide, setActiveDutySlide] = useState(0);
  const [selectedDutyEvent, setSelectedDutyEvent] = useState<Schedule | null>(null);
  
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = screenWidth - 48;

  const displayName = userProfile?.name 
    ? userProfile.name.split(' ')[0] 
    : (currentUser?.displayName ? currentUser.displayName.split(' ')[0] : 'User');

  // ─── Initialize schedule listener ─────────────────────────────────────
  useEffect(() => {
    const unsubscribe = initializeSchedulesListener();
    return () => unsubscribe();
  }, []);

  // ─── Derive upcoming events from store ────────────────────────────────
  const upcomingEvents = useMemo(() => getUpcomingSchedules(schedules), [schedules]);

  // ─── Derive user's specific upcoming duties ────────────────────────────
  const myUpcomingDuties = useMemo(() => {
    if (!currentUser) return [];
    
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    return schedules
      .filter(s => {
        if (s.date < todayStr) return false;
        return getUserMinisterialRoles(s, currentUser.uid) !== null;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.time || '').localeCompare(b.time || '');
      });
  }, [schedules, currentUser]);

  // ─── Prayer listener ──────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'prayers'), orderBy('createdAt', 'desc'), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setLatestPrayer({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setLatestPrayer(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // ─── RSVP handler (writes to rsvps array, not duties) ─────────────────
  const handleRsvp = async (eventId: string, status: string) => {
    if (!currentUser) return;
    try {
      await updateRsvp(eventId, currentUser.uid, status);
    } catch (e) {
      console.error('RSVP error:', e);
    }
  };

  // ─── Prayer handler ───────────────────────────────────────────────────
  const handlePray = async (id: string) => {
    if (!currentUser) return;
    const docRef = doc(db, 'prayers', id);
    const userId = currentUser.uid;
    try {
      await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(docRef);
        if (!sfDoc.exists()) return;
        const currentLikedBy = sfDoc.data().likedBy || [];
        const currentLikes = sfDoc.data().likes || 0;
        let newLikedBy, newLikes;
        if (currentLikedBy.includes(userId)) {
          newLikedBy = currentLikedBy.filter((uid: string) => uid !== userId);
          newLikes = Math.max(0, currentLikes - 1);
        } else {
          newLikedBy = [...currentLikedBy, userId];
          newLikes = currentLikes + 1;
        }
        transaction.update(docRef, { likedBy: newLikedBy, likes: newLikes });
      });
    } catch (e) {
      console.error(e);
    }
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date().getTime() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

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
        {/* ─── Ministerial Duty Section ─────────────────────────────────── */}
        {myUpcomingDuties.length > 0 && (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
              contentContainerStyle={styles.dutyCarouselContent}
              scrollEventThrottle={16}
              onScroll={(e) => {
                const slide = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
                if (slide !== activeDutySlide && slide >= 0) {
                  setActiveDutySlide(slide);
                }
              }}
            >
              {myUpcomingDuties.map((event) => {
                if (!currentUser) return null;
                const dutyRole = getUserMinisterialRoles(event, currentUser.uid);
                if (!dutyRole) return null;
                const userDuty = event.duties?.find(
                  (d: any) => d.userId === currentUser.uid && d.role?.toLowerCase() !== 'attendee'
                );
                const accepted = userDuty?.status === 'accepted' || userDuty?.status === 'accepted_dismissed';
                const eventDate = new Date(`${event.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

                return (
                  <View key={`duty-${event.id}`} style={{ width: cardWidth }}>
                    <TouchableOpacity activeOpacity={0.8} onPress={() => setSelectedDutyEvent(event)}>
                      <View style={styles.mergedDutyCard}>
                        {/* Top Row: Badge + Date */}
                        <View style={styles.mergedDutyHeader}>
                          <View style={styles.mergedDutyTag}>
                            <Crown size={12} color="#FF6596" />
                            <Text style={styles.mergedDutyTagText}>MINISTERIAL UPDATE</Text>
                          </View>
                          <View style={styles.mergedDutyDateBadge}>
                            <Text style={styles.mergedDutyDateText}>{eventDate}</Text>
                          </View>
                        </View>

                        {/* Message Body */}
                        <Text style={styles.mergedDutyMessage} numberOfLines={3}>
                          Thank you for your dedicated ministry, {displayName.split(' ')[0]}. You are scheduled for <Text style={styles.mergedDutyRoleText}>{dutyRole}</Text> on {event.event || 'this Sunday'}.
                        </Text>

                        {/* Action Row */}
                        <View style={styles.mergedDutyActionRow}>
                          {accepted ? (
                            <View style={styles.mergedConfirmedPill}>
                              <Check size={10} color="#16A34A" />
                              <Text style={styles.mergedConfirmedText}>Accepted</Text>
                            </View>
                          ) : (
                            <Text style={styles.tapToRespondText}>Tap to respond ➔</Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
            
            {/* Duty Pagination Dots */}
            {myUpcomingDuties.length > 1 && (
              <View style={styles.paginationRow}>
                {myUpcomingDuties.map((_, i) => (
                  <View key={i} style={[styles.paginationDot, activeDutySlide === i && styles.paginationDotActive]} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* ─── Hero Carousel ──────────────────────────────────────────── */}
        {upcomingEvents.length > 0 ? (
          <View>
            <ScrollView 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const slide = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
                setActiveSlide(slide);
              }}
              style={styles.heroScroll}
            >
              {upcomingEvents.map((event) => {
                const rsvpStatus = currentUser ? getUserRsvpStatus(event, currentUser.uid) : null;

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
                        <Text style={styles.heroEventName}>{event.event || 'Sunday Worship Service'}</Text>
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
            
            {upcomingEvents.length > 1 && (
              <View style={styles.paginationRow}>
                {upcomingEvents.map((_, index) => (
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

        {/* ─── Prayer Wall ────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Prayer Wall</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/community?section=prayer-wall')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {latestPrayer ? (
          <View style={[styles.prayerCard, latestPrayer.answered && { borderLeftColor: '#4ADE80' }]}>
            <View style={styles.prayerTop}>
              <Text style={styles.prayerName}>{latestPrayer.name}</Text>
              <Text style={styles.prayerTime}>{formatTimeAgo(latestPrayer.createdAt)}</Text>
            </View>
            <Text style={styles.prayerText}>{latestPrayer.request}</Text>
            <TouchableOpacity 
              style={[styles.prayButton, latestPrayer.likedBy?.includes(currentUser?.uid) && styles.prayButtonActive]}
              onPress={() => handlePray(latestPrayer.id)}
            >
              <HeartHandshake size={14} color={latestPrayer.likedBy?.includes(currentUser?.uid) ? '#fff' : '#007AFF'} />
              <Text style={[styles.prayButtonText, latestPrayer.likedBy?.includes(currentUser?.uid) && styles.prayButtonTextActive]}>
                {latestPrayer.likedBy?.includes(currentUser?.uid) ? 'Prayed' : 'Pray'} ({latestPrayer.likes || 0})
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No prayer requests yet.</Text>
          </View>
        )}
      </ScrollView>

      {/* Ministerial Duty Details Modal */}
      {selectedDutyEvent && currentUser && (
        <AppModal
          isOpen={!!selectedDutyEvent}
          onClose={() => setSelectedDutyEvent(null)}
          title="Ministerial Duty"
          headerLeft={<Crown size={22} color="#FF6596" />}
          headerTitleAlign="center"
          containerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
        >
          <Text style={styles.dutyModalEventName}>{selectedDutyEvent.event || 'Sunday Worship Service'}</Text>
          
          <Text style={{ fontSize: 14, color: '#4B5563', textAlign: 'center', marginBottom: 20, paddingHorizontal: 10 }}>
            You have been scheduled for the role of <Text style={{ fontWeight: 'bold', color: '#FF6596' }}>{getUserMinisterialRoles(selectedDutyEvent, currentUser.uid)}</Text>. Please accept or decline the duty below so we can notify the staff.
          </Text>

          <View style={styles.dutyModalDetails}>
            <View style={styles.dutyModalRow}>
              <Calendar size={16} color="#666" />
              <Text style={styles.dutyModalRowText}>
                {new Date(`${selectedDutyEvent.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
            </View>
            <View style={styles.dutyModalRow}>
              <Clock size={16} color="#666" />
              <Text style={styles.dutyModalRowText}>{selectedDutyEvent.time || '9:00 AM'}</Text>
            </View>
            <View style={styles.dutyModalRow}>
              <MapPin size={16} color="#666" />
              <Text style={styles.dutyModalRowText}>{selectedDutyEvent.location || 'Main Sanctuary'}</Text>
            </View>
          </View>

          <View style={styles.dutyModalActions}>
            <TouchableOpacity
              style={styles.dutyModalDeclineBtn}
              activeOpacity={0.7}
              onPress={() => {
                updateMinisterialDuty(selectedDutyEvent.id, currentUser.uid, 'cancel');
                setSelectedDutyEvent(null);
              }}
            >
              <Text style={styles.dutyModalDeclineText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dutyModalAcceptBtnWrapper}
              activeOpacity={0.8}
              onPress={() => {
                updateMinisterialDuty(selectedDutyEvent.id, currentUser.uid, 'accept');
                setSelectedDutyEvent(null);
              }}
            >
              <LinearGradient
                colors={['#FF6596', '#FF8DA1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dutyModalAcceptGradient}
              >
                <Check size={18} color="#fff" strokeWidth={3} />
                <Text style={styles.dutyModalAcceptText}>Accept Duty</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </AppModal>
      )}
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
  dutyCarouselContent: { },
  mergedDutyCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6596',
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  mergedDutyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mergedDutyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  mergedDutyTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FF6596',
    letterSpacing: 0.5,
  },
  mergedDutyDateBadge: {
    backgroundColor: '#FFF0F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mergedDutyDateText: {
    color: '#FF6596',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mergedDutyMessage: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    marginBottom: 10,
  },
  mergedDutyRoleText: {
    color: '#FF6596',
    fontWeight: '800',
  },
  mergedDutyActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  mergedDeclineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    gap: 4,
  },
  mergedDeclineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  mergedAcceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#4ADE80',
    gap: 4,
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  mergedAcceptText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  mergedConfirmedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mergedConfirmedText: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: '#16A34A' 
  },
  tapToRespondText: {
    fontSize: 11,
    color: '#FF6596',
    fontWeight: '700',
    paddingVertical: 6,
  },
  dutyModalEventName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 20,
  },
  dutyModalDetails: {
    gap: 12,
    marginBottom: 24,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
  },
  dutyModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dutyModalRowText: {
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '500',
  },
  dutyModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  dutyModalDeclineBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#FFF0F5',
  },
  dutyModalDeclineText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6596',
  },
  dutyModalAcceptBtnWrapper: {
    flex: 1.5,
    borderRadius: 16,
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  dutyModalAcceptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  dutyModalAcceptText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
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
  prayerCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: '#FF6596', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  prayerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  prayerName: { fontSize: 14, fontWeight: 'bold', color: '#1a1a1a' },
  prayerTime: { fontSize: 12, color: '#888' },
  prayerText: { fontSize: 14, color: '#444', marginBottom: 12, lineHeight: 20 },
  prayButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#FFE8F0', gap: 6 },
  prayButtonActive: { backgroundColor: '#FF6596' },
  prayButtonText: { fontSize: 12, fontWeight: '600', color: '#FF6596' },
  prayButtonTextActive: { color: '#fff' },
  emptyCard: { backgroundColor: '#fff', padding: 24, borderRadius: 16, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 14 },
});
