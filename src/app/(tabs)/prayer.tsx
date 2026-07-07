import { BlurView } from 'expo-blur';
import { HeartHandshake, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { formatPrayerTimeAgo, getFilteredPrayers } from '../../features/prayer/domain/prayer.selectors';
import type { Prayer, PrayerFilter } from '../../features/prayer/domain/prayer.types';
import { usePrayerFeed } from '../../features/prayer/presentation/hooks/usePrayerFeed';
import { useAuthStore } from '../../store/useAuthStore';

const PRAYER_FILTERS: PrayerFilter[] = ['Recent', 'My Requests'];

export default function PrayerScreen() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const { prayers, loading, togglePrayerLike } = usePrayerFeed();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PrayerFilter>('Recent');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handlePray = async (id: string) => {
    try {
      if (!currentUser) return;
      await togglePrayerLike(id, currentUser.uid);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredRequests = useMemo(
    () => getFilteredPrayers(prayers, search, filter, currentUser?.uid).filter(req => req),
    [prayers, search, filter, currentUser?.uid]
  );

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.frostedHeader, { paddingTop: Math.max(insets.top, 24) }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.6)' }]} pointerEvents="none" />

        <View style={styles.header}>
        {isSearchOpen ? (
          <View style={styles.searchBar}>
            <Search size={18} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search requests..."
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>
        ) : (
          <Text style={styles.title}>Prayers</Text>
        )}

        <TouchableOpacity 
          style={styles.searchButton}
          onPress={() => setIsSearchOpen(!isSearchOpen)}
        >
          {isSearchOpen ? <X size={20} color="#1a1a1a" /> : <Search size={20} color="#1a1a1a" />}
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {PRAYER_FILTERS.map((f) => (
            <TouchableOpacity 
              key={f} 
              style={[
                styles.pill, 
                filter === f && styles.pillActive,
                filter === f && styles.pillShadow
              ]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.listContent, { paddingTop: Math.max(insets.top, 24) + 146 }]}>
        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Loading prayer requests...</Text>
          </View>
        ) : filteredRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No prayer requests found.</Text>
          </View>
        ) : (
          filteredRequests.map((req: Prayer) => {
            const isLiked = currentUser ? req.likedBy.includes(currentUser.uid) : false;
            return (
              <View key={req.id} style={styles.prayerCardOuter}>
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
                        <Text style={styles.prayerName}>{req.name}</Text>
                        <Text style={styles.prayerTime}>{formatPrayerTimeAgo(req.createdAt)}</Text>
                      </View>
                      <Text style={styles.prayerText}>{req.request}</Text>
                      
                      <View style={styles.prayerBottomRow}>
                        <TouchableOpacity
                          style={styles.prayIconButton}
                          onPress={() => handlePray(req.id)}
                          activeOpacity={0.7}
                        >
                          <HeartHandshake 
                            size={18} 
                            color={isLiked ? '#FF6596' : '#9CA3AF'} 
                          />
                          <Text style={[styles.prayIconCount, isLiked && { color: '#FF6596' }]}>
                            {req.likes || 0}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  frostedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 },
  title: { fontSize: 34, fontWeight: '900', color: '#1a1a1a', letterSpacing: -0.5 },
  searchButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, height: 40, marginRight: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16 },
  filterContainer: { paddingBottom: 12 },
  filterScroll: { paddingHorizontal: 24, gap: 16 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e1e4e8' },
  pillActive: { backgroundColor: '#FF6596', borderColor: '#FF6596' },
  pillShadow: { shadowColor: '#FF6596', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 },
  pillText: { fontSize: 13, fontWeight: '600', color: '#666' },
  pillTextActive: { color: '#fff' },
  listContent: { padding: 24, paddingTop: 12, paddingBottom: 100, gap: 16 },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#888', fontSize: 14 },
  prayerCardOuter: { marginBottom: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
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
});
