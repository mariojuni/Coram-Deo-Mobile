import { worshipRepository } from '@/features/worship/data/worship.repository';
import { Song, WorshipSetlistItem } from '@/features/worship/domain/worship.types';
import { transposeText, transposeChord, getStepsBetweenKeys } from '@/utils/chordTransposition';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Music, Minus, Plus } from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ServeSongLyricsScreen() {
  const { songId, setlistItemId, hideChords } = useLocalSearchParams<{ songId: string; setlistItemId?: string; hideChords?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userProfile = useAuthStore((s) => s.userProfile);
  const isStaff = ['super_admin', 'church_admin', 'pastor', 'ministry_leader'].includes(userProfile?.role?.toLowerCase() || '');

  const [song, setSong] = useState<Song | null>(null);
  const [setlistItem, setSetlistItem] = useState<WorshipSetlistItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'lyrics' | 'chords'>('lyrics');
  const [transposeSteps, setTransposeSteps] = useState(0);
  const [capo, setCapo] = useState(0);
  const [preferFlats, setPreferFlats] = useState(false);
  const [saving, setSaving] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!songId) return;
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        const s = await worshipRepository.getSong(songId);
        if (isMounted) setSong(s);

        if (setlistItemId && s?.defaultKey) {
          const item = await worshipRepository.getSetlistItem(setlistItemId);
          if (item && isMounted) {
            setSetlistItem(item);
            if (item.capo !== undefined) setCapo(item.capo);
            if (item.preferredAccidental === 'flat') setPreferFlats(true);
            if (item.selectedKey) {
              const diff = getStepsBetweenKeys(s.defaultKey, item.selectedKey);
              setTransposeSteps(diff);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchData();
    return () => { isMounted = false; };
  }, [songId, setlistItemId]);

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
        <TouchableOpacity style={[styles.fixedBackBtn, { top: Math.max(insets.top, 20), left: 24 }]} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>Song not found</Text>
        </View>
      </View>
    );
  }

  const showTabs = isStaff && (!!song.chordChart || !!song.lyricsWithChords) && hideChords !== 'true';

  const sourceText = song.lyricsWithChords || song.chordChart || '';

  const transposedChordChart = showTabs && sourceText 
    ? transposeText(sourceText, transposeSteps - capo, preferFlats) 
    : '';

  const currentTransposedKey = song.defaultKey 
    ? transposeChord(song.defaultKey, transposeSteps, preferFlats) 
    : 'Unknown';

  const displayKey = song.defaultKey
    ? transposeChord(song.defaultKey, transposeSteps - capo, preferFlats)
    : 'Unknown';

  const handleSaveArrangement = async () => {
    if (!setlistItemId) {
      alert('Cannot save arrangement without a setlist context.');
      return;
    }
    try {
      setSaving(true);
      await worshipRepository.updateSetlistItem(setlistItemId, {
        selectedKey: currentTransposedKey,
        capo: capo,
        preferredAccidental: preferFlats ? 'flat' : 'sharp'
      });
      alert('Arrangement saved to setlist!');
    } catch (err) {
      console.error(err);
      alert('Failed to save arrangement.');
    } finally {
      setSaving(false);
    }
  };

  // Parallax Header Animations
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [0, -150],
    extrapolate: 'clamp',
  });

  const headerScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.3, 1],
    extrapolateLeft: 'extend',
    extrapolateRight: 'clamp',
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const miniHeaderOpacity = scrollY.interpolate({
    inputRange: [80, 140],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const topInset = Math.max(insets.top, 20);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Parallax Background */}
      <Animated.View
        style={[
          styles.absoluteHeader,
          {
            transform: [
              { translateY: headerTranslateY },
              { scale: headerScale },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['#FFE8F1', '#F5F2FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Sticky Mini Header (Fades in on scroll) */}
      <Animated.View 
        style={[
          styles.stickyMiniHeader,
          { 
            height: topInset + 60, 
            opacity: miniHeaderOpacity 
          }
        ]}
      >
        <View style={[styles.miniHeaderContent, { paddingTop: topInset, paddingLeft: 80, paddingRight: 24 }]}>
          <Text style={styles.miniHeaderTitle} numberOfLines={1}>{song.title}</Text>
          {song.artist && <Text style={styles.miniHeaderArtist} numberOfLines={1}>{song.artist}</Text>}
        </View>
      </Animated.View>

      {/* Fixed Back Button */}
      <TouchableOpacity 
        style={[styles.fixedBackBtn, { top: topInset + 8 }]} 
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <ArrowLeft size={22} color="#1a1a1a" />
      </TouchableOpacity>

      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Transparent Header Content */}
        <View style={[styles.headerContent, { paddingTop: topInset + 70 }]}>
          <Animated.View style={{ opacity: titleOpacity }}>
            <Text style={styles.screenTitle}>{song.title}</Text>
            <View style={styles.metaRow}>
              {song.defaultKey && <Text style={styles.metaText}>Key: {currentTransposedKey}</Text>}
              {song.tempoBpm && <Text style={styles.metaText}>{song.tempoBpm} BPM</Text>}
              {song.artist && <Text style={styles.metaText}>{song.artist}</Text>}
            </View>
          </Animated.View>
          
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
        </View>

        {/* Solid Body Content */}
        <View style={styles.bodyContainer}>
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
              <View style={styles.transposeControls}>
                <View style={styles.controlGroup}>
                  <Text style={styles.transposeLabel}>Key: <Text style={styles.transposeKey}>{currentTransposedKey}</Text></Text>
                  <View style={styles.transposeButtons}>
                    <TouchableOpacity style={styles.tBtn} onPress={() => setTransposeSteps(s => s - 1)}>
                      <Minus size={16} color="#4B5563" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tBtnReset} onPress={() => setTransposeSteps(0)}>
                      <Text style={styles.tBtnResetText}>Orig</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tBtn} onPress={() => setTransposeSteps(s => s + 1)}>
                      <Plus size={16} color="#4B5563" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.controlGroup}>
                  <Text style={styles.transposeLabel}>Capo: <Text style={styles.transposeKey}>{capo === 0 ? 'None' : capo}</Text></Text>
                  <View style={styles.transposeButtons}>
                    <TouchableOpacity style={styles.tBtn} onPress={() => setCapo(c => Math.max(0, c - 1))}>
                      <Minus size={16} color="#4B5563" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tBtnReset} onPress={() => setCapo(0)}>
                      <Text style={styles.tBtnResetText}>Orig</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tBtn} onPress={() => setCapo(c => Math.min(12, c + 1))}>
                      <Plus size={16} color="#4B5563" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.controlGroup}>
                  <Text style={styles.transposeLabel}>Play Shapes In: <Text style={styles.transposeKey}>{displayKey}</Text></Text>
                  <View style={styles.transposeButtons}>
                    <TouchableOpacity style={styles.tBtnReset} onPress={() => setPreferFlats(!preferFlats)}>
                      <Text style={styles.tBtnResetText}>{preferFlats ? 'Show Sharps' : 'Show Flats'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {isStaff && setlistItemId && (
                  <View style={[styles.controlGroup, { marginTop: 12 }]}>
                    <TouchableOpacity 
                      style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
                      onPress={handleSaveArrangement}
                      disabled={saving}
                    >
                      <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Arrangement to Setlist'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <Text style={styles.chordText}>{transposedChordChart}</Text>
            </View>
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { 
    flex: 1,
    backgroundColor: '#F7F8FC',
  },
  absoluteHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 450,
  },
  stickyMiniHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 90,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  miniHeaderContent: {
    flex: 1,
    justifyContent: 'center',
  },
  miniHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  miniHeaderArtist: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  fixedBackBtn: {
    position: 'absolute',
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  screenTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -1,
    marginBottom: 8,
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
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTabButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#111827',
  },
  bodyContainer: {
    backgroundColor: '#F7F8FC',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    minHeight: SCREEN_HEIGHT,
    padding: 24,
    paddingTop: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 10,
  },
  lyricsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  lyricsText: {
    fontSize: 18,
    lineHeight: 34,
    color: '#374151',
    letterSpacing: 0.3,
  },
  chordCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 2,
  },
  chordText: {
    fontSize: 15,
    lineHeight: 28,
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  transposeControls: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  controlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transposeLabel: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  transposeKey: {
    color: '#0F172A',
    fontWeight: '800',
  },
  transposeButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  tBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  tBtnReset: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  tBtnResetText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyStateText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '500',
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
  saveBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  }
});
