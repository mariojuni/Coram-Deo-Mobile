import { Image } from 'expo-image';
import { BounceCard } from '@/components/ui/BounceCard';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share, Modal } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Play, Heart, Share2, Clock, Calendar, User as UserIcon, BookOpen, FileText, ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useSermonStore } from '@/store/useSermonStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { NotesSheet } from '../components/NotesSheet';
import { DownloadButton } from '../components/DownloadButton';
import { CommentButton } from '@/features/comments/presentation/components/CommentButton';

export function SermonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  
  const { 
    currentSermon, 
    loading, 
    fetchSermonById, 
    toggleFavorite, 
    favorites,
    notes,
    notesLoading,
    fetchNotes,
    addNote,
    updateNote,
    deleteNote,
  } = useSermonStore();
  
  const currentUser = useAuthStore((state) => state.currentUser);
  const [sharing, setSharing] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    if (id) fetchSermonById(id);
  }, [id]);

  useEffect(() => {
    if (currentUser && currentSermon) {
      fetchNotes(currentUser.uid, currentSermon.id);
    }
  }, [currentUser, currentSermon]);

  const handlePlay = () => {
    if (!currentSermon) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (currentSermon.mediaType === 'video' || currentSermon.mediaType === 'both') {
      router.push(`/video-player?id=${currentSermon.id}`);
    } else {
      router.push(`/audio-player?id=${currentSermon.id}`);
    }
  };

  const handleFavorite = async () => {
    if (!currentUser || !currentSermon) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await toggleFavorite(currentUser.uid, currentSermon.id);
  };

  const handleShare = async () => {
    if (!currentSermon) return;
    setSharing(true);
    try {
      await Share.share({
        message: `Check out this sermon: ${currentSermon.title} by ${currentSermon.preacherName}`,
        title: currentSermon.title,
        url: `churchapp://sermon/${currentSermon.id}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setSharing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading || !currentSermon) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#FF6596" />
      </View>
    );
  }

  const isFavorited = favorites.has(currentSermon.id);

  return (
    <View style={[styles.screen, { backgroundColor: '#F7F8FC' }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Fixed Back Button */}
      <BounceCard bounceScale={0.85} 
        style={[styles.fixedBackBtn, { top: Math.max(insets.top, 20) + 8 }]} 
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <ArrowLeft size={22} color="#1a1a1a" />
      </BounceCard>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <Image 
            source={{ uri: currentSermon.thumbnailUrl }}
            style={styles.heroImage}
            resizeMode="cover"
          cachePolicy="memory-disk" transition={200} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.95)']}
            style={styles.heroGradient}
          />
          
          {/* Content inside Hero */}
          <View style={styles.heroContent}>
            <View style={styles.badgeRow}>
              {currentSermon.seriesTitle && (
                <View style={styles.seriesTag}>
                  <Text style={styles.seriesText}>{currentSermon.seriesTitle}</Text>
                </View>
              )}
              <View style={[styles.typeBadge, currentSermon.mediaType === 'video' || currentSermon.mediaType === 'both' ? styles.videoBadge : styles.audioBadge]}>
                <Text style={styles.typeBadgeText}>{currentSermon.mediaType.toUpperCase()}</Text>
              </View>
            </View>
            
            <Text style={styles.heroTitle} numberOfLines={2}>{currentSermon.title}</Text>
          </View>
        </View>

        {/* Floating Action Bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.playActionButton}
            onPress={handlePlay}
            activeOpacity={0.8}
          >
            <Play size={20} color="#FFF" fill="#FFF" />
            <Text style={styles.playButtonText}>Listen</Text>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleFavorite} activeOpacity={0.8}>
              <Heart size={22} color={isFavorited ? '#FF6596' : '#4B5563'} fill={isFavorited ? '#FF6596' : 'transparent'} />
            </TouchableOpacity>
            
            <View style={styles.iconBtn}>
              <DownloadButton sermon={currentSermon} variant="icon-only" />
            </View>

            <View style={styles.iconBtn}>
              <CommentButton 
                count={currentSermon.commentCount || 0}
                variant="icon-only"
                color="#4B5563"
                size={22}
                onPress={() => router.push(`/comment-thread?targetType=sermon&targetId=${currentSermon.id}`)}
              />
            </View>

            <TouchableOpacity style={styles.iconBtn} onPress={handleShare} activeOpacity={0.8} disabled={sharing}>
              <Share2 size={22} color="#4B5563" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowNotes(true)} activeOpacity={0.8}>
              <FileText size={22} color="#4B5563" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content Body */}
        <View style={styles.bodyContent}>
          {/* Metadata Grid */}
          <View style={styles.metaGrid}>
            <View style={styles.metaCol}>
              <UserIcon size={16} color="#6B7280" />
              <Text style={styles.metaText} numberOfLines={1}>{currentSermon.preacherName}</Text>
            </View>
            <View style={styles.metaCol}>
              <Calendar size={16} color="#6B7280" />
              <Text style={styles.metaText}>{formatDate(currentSermon.sermonDate)}</Text>
            </View>
            <View style={styles.metaCol}>
              <Clock size={16} color="#6B7280" />
              <Text style={styles.metaText}>{formatDuration(currentSermon.durationSeconds || 0)}</Text>
            </View>
          </View>

          {/* Scripture Reference */}
          {currentSermon.scriptureReference && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Scripture</Text>
              <View style={styles.scriptureBox}>
                <BookOpen size={20} color="#FF6596" />
                <Text style={styles.scriptureText}>{currentSermon.scriptureReference}</Text>
              </View>
            </View>
          )}

          {/* Description */}
          {currentSermon.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{currentSermon.description}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Notes Modal/Sheet */}
      {showNotes && currentUser && (
        <View style={styles.notesOverlay}>
          <View style={[styles.notesHeader, { paddingTop: Math.max(insets.top, 20) }]}>
            <Text style={styles.notesTitle}>My Notes</Text>
            <TouchableOpacity onPress={() => setShowNotes(false)} style={styles.closeNotesBtn}>
              <Text style={styles.closeNotesText}>Done</Text>
            </TouchableOpacity>
          </View>
          <NotesSheet
            notes={notes}
            sermonId={currentSermon.id}
            userId={currentUser.uid}
            loading={notesLoading}
            onAddNote={addNote}
            onUpdateNote={updateNote}
            onDeleteNote={deleteNote}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fixedBackBtn: {
    position: 'absolute',
    left: 20,
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
  heroContainer: {
    width: '100%',
    height: 380,
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 240,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  seriesTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  seriesText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  videoBadge: { backgroundColor: 'rgba(255, 59, 48, 0.9)' },
  audioBadge: { backgroundColor: 'rgba(52, 199, 89, 0.9)' },
  typeBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: -28,
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    zIndex: 10,
  },
  playActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6596',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  playButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyContent: {
    padding: 24,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  metaCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '45%',
  },
  metaText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 16,
    lineHeight: 26,
    color: '#4B5563',
  },
  scriptureBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 101, 150, 0.08)',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  scriptureText: {
    color: '#FF6596',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  notesOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#F7F8FC',
    zIndex: 200,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  notesTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  closeNotesBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  closeNotesText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
});
