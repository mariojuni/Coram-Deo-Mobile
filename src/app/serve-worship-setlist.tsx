import { useWorshipSetlist } from '@/features/worship/presentation/hooks/useWorshipSetlist';
import { useAuthStore } from '@/store/useAuthStore';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, FileText, Music, AlertCircle, ChevronRight, Hash, Clock } from 'lucide-react-native';
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
    userProfile?.churchId || undefined,
    eventId || undefined
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
        <TouchableOpacity style={[styles.fixedBackBtn, { top: Math.max(insets.top, 20) + 8 }]} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.notFound}>
          <View style={styles.notFoundIconContainer}>
            <AlertCircle size={40} color="#EF4444" strokeWidth={2.5} />
          </View>
          <Text style={styles.notFoundTitle}>Setlist Unavailable</Text>
          <Text style={styles.notFoundText}>
            This setlist may not be published yet, or it was removed by the leader.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: '#F7F8FC' }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Fixed Back Button */}
      <TouchableOpacity 
        style={[styles.fixedBackBtn, { top: Math.max(insets.top, 20) + 8 }]} 
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <ArrowLeft size={22} color="#1a1a1a" />
      </TouchableOpacity>

      {/* ─── Header ─── */}
      <LinearGradient
        colors={['#FFE8F1', '#F5F2FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 20) + 52 }]}
      >
        <View style={styles.headerTitleContainer}>
          <Text style={styles.screenTitle} numberOfLines={2}>{setlist.title}</Text>
          <View style={styles.subtitleBadge}>
            <Music size={14} color="#6B7280" />
            <Text style={styles.screenSubtitle}>
              {items.length} {items.length === 1 ? 'Song' : 'Songs'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIconContainer}>
              <Music size={40} color="#9CA3AF" strokeWidth={2} />
            </View>
            <Text style={styles.emptyStateTitle}>No songs added yet</Text>
            <Text style={styles.emptyStateText}>
              The worship leader hasn&apos;t added any songs to this setlist for the event.
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
                {item.song?.artist && (
                  <Text style={styles.artistText}>{item.song.artist}</Text>
                )}
                
                <View style={styles.cardMetaRow}>
                  {item.selectedKey ? (
                    <View style={styles.metaBadge}>
                      <Hash size={12} color="#FF6596" />
                      <Text style={styles.metaBadgeText}>{item.selectedKey}</Text>
                    </View>
                  ) : item.song?.defaultKey ? (
                    <View style={styles.metaBadge}>
                      <Hash size={12} color="#FF6596" />
                      <Text style={styles.metaBadgeText}>{item.song.defaultKey}</Text>
                    </View>
                  ) : null}
                  
                  {(item.tempoBpm || item.song?.tempoBpm) ? (
                    <View style={[styles.metaBadge, { backgroundColor: '#F0FDF4' }]}>
                      <Clock size={12} color="#16A34A" />
                      <Text style={[styles.metaBadgeText, { color: '#16A34A' }]}>{item.tempoBpm || item.song?.tempoBpm} BPM</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              
              <View style={styles.rightAction}>
                <FileText size={18} color="#9CA3AF" />
                <ChevronRight size={20} color="#D1D5DB" />
              </View>
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
    paddingBottom: 24,
    gap: 12,
  },
  fixedBackBtn: {
    position: 'absolute',
    left: 24,
    zIndex: 100,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitleContainer: {
    gap: 8,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '700',
  },
  content: {
    padding: 24,
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  orderBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  orderBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FF6596',
  },
  cardContent: {
    flex: 1,
    marginRight: 12,
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  artistText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  metaBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6596',
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  notFoundIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  notFoundTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  notFoundText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});
