import { useWorshipSetlist } from '@/features/worship/presentation/hooks/useWorshipSetlist';
import { useAuthStore } from '@/store/useAuthStore';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, FileText, Music, AlertCircle } from 'lucide-react-native';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ServeWorshipSetlistScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userProfile = useAuthStore((s) => s.userProfile);

  const { setlist, items, loading, error } = useWorshipSetlist(
    userProfile?.churchId,
    eventId
  );

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 20, alignItems: 'center', justifyContent: 'center' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#FF6596" />
      </View>
    );
  }

  if (error || !setlist) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 20 }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <TouchableOpacity style={[styles.backBtn, { marginLeft: 24 }]} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.notFound}>
          <AlertCircle size={48} color="#EF4444" />
          <Text style={styles.notFoundTitle}>Setlist not available</Text>
          <Text style={styles.notFoundText}>
            This setlist may not be published yet, or it was removed.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: '#F7F8FC' }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* ─── Header ─── */}
      <LinearGradient
        colors={['#FFE8F1', '#F5F2FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 20) }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>{setlist.title}</Text>
        <Text style={styles.screenSubtitle}>
          {items.length} {items.length === 1 ? 'Song' : 'Songs'}
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Music size={40} color="#CBD5E1" />
            <Text style={styles.emptyStateTitle}>No songs added yet</Text>
            <Text style={styles.emptyStateText}>
              The worship leader hasn't added any songs to this setlist.
            </Text>
          </View>
        ) : (
          items.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/serve-song-lyrics', params: { songId: item.songId } } as any)}
            >
              <View style={styles.orderBadge}>
                <Text style={styles.orderBadgeText}>{index + 1}</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.song?.title || 'Unknown Song'}</Text>
                
                <View style={styles.cardMetaRow}>
                  {item.selectedKey ? (
                    <View style={styles.metaBadge}>
                      <Text style={styles.metaBadgeText}>Key: {item.selectedKey}</Text>
                    </View>
                  ) : item.song?.defaultKey ? (
                    <View style={styles.metaBadge}>
                      <Text style={styles.metaBadgeText}>Key: {item.song.defaultKey}</Text>
                    </View>
                  ) : null}
                  
                  {(item.tempoBpm || item.song?.tempoBpm) ? (
                    <View style={styles.metaBadge}>
                      <Text style={styles.metaBadgeText}>{item.tempoBpm || item.song?.tempoBpm} BPM</Text>
                    </View>
                  ) : null}
                </View>
                
                {item.song?.artist && (
                  <Text style={styles.artistText}>{item.song.artist}</Text>
                )}
              </View>
              <FileText size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 6,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  content: {
    padding: 24,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  orderBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF6596',
  },
  cardContent: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  cardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  metaBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metaBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  artistText: {
    fontSize: 13,
    color: '#6B7280',
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  notFoundText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    maxWidth: 250,
  },
});
