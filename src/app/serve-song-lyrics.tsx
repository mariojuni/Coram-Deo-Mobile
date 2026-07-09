import { worshipRepository } from '@/features/worship/data/worship.repository';
import { Song } from '@/features/worship/domain/worship.types';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Music } from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ServeSongLyricsScreen() {
  const { songId, hideChords } = useLocalSearchParams<{ songId: string; hideChords?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userProfile = useAuthStore((s) => s.userProfile);
  const isStaff = ['super_admin', 'church_admin', 'pastor', 'ministry_leader'].includes(userProfile?.role?.toLowerCase() || '');

  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'lyrics' | 'chords'>('lyrics');

  useEffect(() => {
    if (!songId) return;
    let isMounted = true;
    
    const fetchSong = async () => {
      try {
        const s = await worshipRepository.getSong(songId);
        if (isMounted) setSong(s);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchSong();
    return () => { isMounted = false; };
  }, [songId]);

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 20, alignItems: 'center', justifyContent: 'center' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#FF6596" />
      </View>
    );
  }

  if (!song) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 20 }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <TouchableOpacity style={[styles.backBtn, { marginLeft: 24 }]} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>Song not found</Text>
        </View>
      </View>
    );
  }

  const showTabs = isStaff && !!song.chordChart && hideChords !== 'true';

  return (
    <View style={[styles.screen, { backgroundColor: '#F7F8FC' }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={['#FFE8F1', '#F5F2FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 20) }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>{song.title}</Text>
        <View style={styles.metaRow}>
          {song.defaultKey && <Text style={styles.metaText}>Key: {song.defaultKey}</Text>}
          {song.tempoBpm && <Text style={styles.metaText}>{song.tempoBpm} BPM</Text>}
          {song.artist && <Text style={styles.metaText}>{song.artist}</Text>}
        </View>
        
        {showTabs && (
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'lyrics' && styles.activeTabButton]}
              onPress={() => setActiveTab('lyrics')}
            >
              <Text style={[styles.tabText, activeTab === 'lyrics' && styles.activeTabText]}>Lyrics</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'chords' && styles.activeTabButton]}
              onPress={() => setActiveTab('chords')}
            >
              <Text style={[styles.tabText, activeTab === 'chords' && styles.activeTabText]}>Chords</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {(!showTabs || activeTab === 'lyrics') && (
          <View style={styles.lyricsCard}>
            {song.lyrics ? (
              <Text style={styles.lyricsText}>{song.lyrics}</Text>
            ) : (
              <View style={styles.emptyState}>
                <Music size={32} color="#CBD5E1" />
                <Text style={styles.emptyStateText}>No lyrics available for this song.</Text>
              </View>
            )}
          </View>
        )}

        {(showTabs && activeTab === 'chords') && (
          <View style={styles.chordCard}>
            <Text style={styles.chordText}>{song.chordChart}</Text>
          </View>
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
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTabButton: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#111827',
  },
  content: {
    padding: 24,
    gap: 16,
  },
  lyricsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  lyricsText: {
    fontSize: 16,
    lineHeight: 28,
    color: '#1F2937',
  },
  chordCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D97706',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  chordText: {
    fontSize: 14,
    lineHeight: 24,
    color: '#92400E',
    fontFamily: 'monospace',
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
    gap: 12,
  },
  emptyStateText: {
    color: '#6B7280',
    fontSize: 15,
  },
  notFound: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
});
