import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, runTransaction, updateDoc } from 'firebase/firestore';
import { CalendarDays, CheckCircle, Clock, Heart, MapPin, Search, Users, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../firebase';
import { usePrayers } from '../../hooks/usePrayers';
import { useAuthStore } from '../../store/useAuthStore';
import { useMemberStore } from '../../store/useMemberStore';
import { getUpcomingSchedules, useScheduleStore } from '../../store/useScheduleStore';

type CommunitySection = 'prayer-wall' | 'events' | 'sermons' | 'member-directory';

const SECTION_TABS: { key: CommunitySection; label: string }[] = [
  { key: 'prayer-wall', label: 'Prayer Wall' },
  { key: 'events', label: 'Events' },
  { key: 'sermons', label: 'Sermons' },
  { key: 'member-directory', label: 'Member Directory' },
];

const isCommunitySection = (value: string): value is CommunitySection =>
  SECTION_TABS.some((tab) => tab.key === value);

const normalizeSectionParam = (value?: string | string[]): CommunitySection => {
  if (typeof value === 'string' && isCommunitySection(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    const found = value.find((entry) => isCommunitySection(entry));
    if (found) return found;
  }

  return 'prayer-wall';
};

export default function CommunityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ section?: string }>();
  const { currentUser } = useAuthStore();
  const { prayers } = usePrayers();
  const { schedules, initializeSchedulesListener } = useScheduleStore();
  const { members } = useMemberStore();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Recent');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const activeSection = normalizeSectionParam(params.section);

  useEffect(() => {
    const unsubscribe = initializeSchedulesListener();
    return () => unsubscribe();
  }, [initializeSchedulesListener]);

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handlePray = async (id: string) => {
    if (!currentUser) return;
    const docRef = doc(db, 'prayers', id);
    const userId = currentUser.uid;

    await runTransaction(db, async (transaction) => {
      const prayerDoc = await transaction.get(docRef);
      if (!prayerDoc.exists()) return;

      const currentLikedBy = prayerDoc.data().likedBy || [];
      const currentLikes = prayerDoc.data().likes || 0;
      const isLiked = currentLikedBy.includes(userId);
      const newLikedBy = isLiked
        ? currentLikedBy.filter((uid: string) => uid !== userId)
        : [...currentLikedBy, userId];
      const newLikes = isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;

      transaction.update(docRef, { likedBy: newLikedBy, likes: newLikes });
    });
  };

  const handleToggleAnswered = async (id: string, currentVal: boolean) => {
    const docRef = doc(db, 'prayers', id);
    await updateDoc(docRef, { answered: !currentVal });
  };

  const filteredRequests = useMemo(
    () =>
      prayers.filter((req: any) => {
        const matchesSearch =
          req.request?.toLowerCase().includes(search.toLowerCase()) ||
          req.name?.toLowerCase().includes(search.toLowerCase());

        if (filter === 'My Requests') {
          return matchesSearch && req.userId === currentUser?.uid;
        }
        if (filter === 'Answered') {
          return matchesSearch && req.answered === true;
        }
        return matchesSearch;
      }),
    [prayers, search, filter, currentUser?.uid]
  );

  const upcomingEvents = useMemo(() => getUpcomingSchedules(schedules, 10), [schedules]);

  const sermons = useMemo(() => {
    return upcomingEvents.map((event) => ({
      id: event.id,
      title: event.event || 'Sunday Worship & Sermon',
      date: event.date,
      time: event.time || '9:00 AM',
      speaker: 'Church Team',
    }));
  }, [upcomingEvents]);

  const insets = useSafeAreaInsets();

  const renderPrayerWall = () => (
    <View style={styles.sectionBody}>
      <View style={styles.sectionHeaderRow}>
        {isSearchOpen ? (
          <View style={styles.searchBar}>
            <Search size={18} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search prayer requests..."
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>
        ) : (
          <Text style={styles.sectionTitle}>Prayer Wall</Text>
        )}

        <TouchableOpacity style={styles.searchButton} onPress={() => setIsSearchOpen((v) => !v)}>
          {isSearchOpen ? <X size={20} color="#1a1a1a" /> : <Search size={20} color="#1a1a1a" />}
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {['Recent', 'My Requests', 'Answered'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.pill, filter === f && styles.pillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filteredRequests.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No prayer requests found.</Text>
        </View>
      ) : (
        filteredRequests.map((req: any) => {
          const isLiked = req.likedBy?.includes(currentUser?.uid);
          return (
            <View key={req.id} style={[styles.card, req.answered && styles.cardAnswered]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.cardName}>{req.name}</Text>
                  {req.answered && (
                    <View style={styles.answeredBadge}>
                      <CheckCircle size={10} color="#4ADE80" />
                      <Text style={styles.answeredText}>Answered</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardTime}>{formatTimeAgo(req.createdAt)}</Text>
              </View>

              <Text style={styles.cardRequest}>{req.request}</Text>

              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={[styles.prayButton, isLiked && styles.prayButtonActive]}
                  onPress={() => {
                    handlePray(req.id).catch((error) => {
                      console.error('Failed to update prayer reaction:', error);
                    });
                  }}
                >
                  <Heart size={14} color={isLiked ? '#fff' : '#FF6596'} fill={isLiked ? '#fff' : 'transparent'} />
                  <Text style={[styles.prayButtonText, isLiked && styles.prayButtonTextActive]}>
                    {isLiked ? 'Prayed' : 'Pray'} ({req.likes || 0})
                  </Text>
                </TouchableOpacity>

                {req.userId === currentUser?.uid && (
                  <TouchableOpacity
                    onPress={() => {
                      handleToggleAnswered(req.id, req.answered).catch((error) => {
                        console.error('Failed to update prayer status:', error);
                      });
                    }}
                  >
                    <Text style={[styles.toggleText, req.answered && styles.toggleTextActive]}>
                      {req.answered ? 'Mark Active' : 'Mark Answered'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  const renderEvents = () => (
    <View style={styles.sectionBody}>
      <Text style={styles.sectionTitle}>Events</Text>
      {upcomingEvents.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No upcoming events right now.</Text>
        </View>
      ) : (
        upcomingEvents.map((event) => (
          <View key={event.id} style={styles.card}>
            <View style={styles.eventBadge}>
              <CalendarDays size={14} color="#8B5CF6" />
              <Text style={styles.eventBadgeText}>Upcoming</Text>
            </View>
            <Text style={styles.eventTitle}>{event.event || 'Sunday Worship Service'}</Text>
            <View style={styles.eventMetaRow}>
              <Clock size={14} color="#666" />
              <Text style={styles.eventMetaText}>{event.date} • {event.time || '9:00 AM'}</Text>
            </View>
            <View style={styles.eventMetaRow}>
              <MapPin size={14} color="#666" />
              <Text style={styles.eventMetaText}>{event.location || 'Main Sanctuary'}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderSermons = () => (
    <View style={styles.sectionBody}>
      <Text style={styles.sectionTitle}>Sermons</Text>
      {sermons.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No sermon items yet.</Text>
        </View>
      ) : (
        sermons.map((sermon) => (
          <View key={sermon.id} style={styles.card}>
            <Text style={styles.eventTitle}>{sermon.title}</Text>
            <Text style={styles.eventMetaText}>Speaker: {sermon.speaker}</Text>
            <Text style={styles.eventMetaText}>{sermon.date} • {sermon.time}</Text>
          </View>
        ))
      )}
    </View>
  );

  const renderDirectory = () => (
    <View style={styles.sectionBody}>
      <Text style={styles.sectionTitle}>Member Directory</Text>
      {members.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No members found.</Text>
        </View>
      ) : (
        members.map((member: any) => (
          <View key={member.id} style={styles.directoryCard}>
            <View style={styles.directoryAvatar}>
              <Users size={16} color="#4D8BFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.directoryName}>{member.name || 'Unnamed Member'}</Text>
              <Text style={styles.directoryMeta}>{member.role || 'Member'}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.topTabs, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.topTabsRow}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/index')}>
            <Text style={styles.topTabInactive}>Today</Text>
          </TouchableOpacity>
          <View style={styles.communityTab}>
            <Text style={styles.topTabActive}>Community</Text>
            <View style={styles.communityUnderline} />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionTabs}>
          {SECTION_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.sectionTab, activeSection === tab.key && styles.sectionTabActive]}
              onPress={() => router.setParams({ section: tab.key })}
            >
              <Text style={[styles.sectionTabText, activeSection === tab.key && styles.sectionTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {activeSection === 'prayer-wall' && renderPrayerWall()}
        {activeSection === 'events' && renderEvents()}
        {activeSection === 'sermons' && renderSermons()}
        {activeSection === 'member-directory' && renderDirectory()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  topTabs: {
    backgroundColor: '#09090B',
    paddingBottom: 14,
    paddingHorizontal: 24,
  },
  topTabsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 28,
  },
  topTabInactive: {
    fontSize: 22,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.65)',
  },
  communityTab: {
    alignItems: 'flex-start',
    gap: 8,
  },
  topTabActive: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.8,
  },
  communityUnderline: {
    height: 4,
    width: '100%',
    borderRadius: 999,
    backgroundColor: '#FF4D7D',
  },
  content: {
    padding: 24,
    paddingBottom: 120,
    gap: 20,
  },
  sectionTabs: { gap: 12 },
  sectionTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTabActive: {
    backgroundColor: '#FF6596',
    borderColor: '#FF6596',
  },
  sectionTabText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTabTextActive: {
    color: '#fff',
  },
  sectionBody: { gap: 12 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 40,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  filterScroll: { gap: 10, paddingVertical: 4 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pillActive: {
    backgroundColor: '#FF6596',
    borderColor: '#FF6596',
  },
  pillText: { color: '#6B7280', fontSize: 12, fontWeight: '700' },
  pillTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 10,
  },
  cardAnswered: { borderLeftWidth: 4, borderLeftColor: '#4ADE80' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  answeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  answeredText: { fontSize: 10, fontWeight: '700', color: '#4ADE80' },
  cardTime: { fontSize: 12, color: '#6B7280' },
  cardRequest: { fontSize: 14, color: '#374151', lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  prayButtonActive: { backgroundColor: '#FF6596' },
  prayButtonText: { fontSize: 12, fontWeight: '700', color: '#FF6596' },
  prayButtonTextActive: { color: '#fff' },
  toggleText: { fontSize: 12, fontWeight: '700', color: '#4ADE80' },
  toggleTextActive: { color: '#6B7280' },
  eventBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  eventBadgeText: { color: '#7C3AED', fontWeight: '700', fontSize: 11 },
  eventTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventMetaText: { fontSize: 13, color: '#4B5563' },
  directoryCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  directoryAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E8F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directoryName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  directoryMeta: { fontSize: 12, color: '#6B7280' },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
  },
  emptyText: { color: '#6B7280', fontSize: 14 },
});
