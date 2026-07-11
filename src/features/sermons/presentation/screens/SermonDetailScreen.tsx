import { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  ActivityIndicator,
  Share
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Play, Heart, Share2, Clock, Calendar, User as UserIcon, BookOpen, FileText } from 'lucide-react-native';
import { useSermonStore } from '@/store/useSermonStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { NotesSheet } from '../components/NotesSheet';
import { DownloadButton } from '../components/DownloadButton';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

export function SermonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useTheme();
  
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
  const [activeTab, setActiveTab] = useState<'overview' | 'notes'>('overview');

  useEffect(() => {
    if (id) {
      fetchSermonById(id);
    }
  }, [id]);

  useEffect(() => {
    if (currentUser && currentSermon) {
      fetchNotes(currentUser.uid, currentSermon.id);
    }
  }, [currentUser, currentSermon]);

  const handlePlay = () => {
    if (!currentSermon) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Navigate to player based on sermon type
    if (currentSermon.type === 'video') {
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
        message: `Check out this sermon: ${currentSermon.title} by ${currentSermon.speaker.name}`,
        title: currentSermon.title,
        url: `churchapp://sermon/${currentSermon.id}`, // Deep link
      });
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setSharing(false);
    }
  };

  const handleScripturePress = (book: string, chapter: number) => {
    // Navigate to Bible tab with scripture reference
    router.push({
      pathname: '/(tabs)/bible',
      params: { book, chapter }
    });
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins} min`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  };

  if (loading || !currentSermon) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#FF6596" />
      </View>
    );
  }

  const isFavorited = favorites.has(currentSermon.id);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Thumbnail with Gradient Fade */}
        <View style={styles.thumbnailContainer}>
          <Image 
            source={{ uri: currentSermon.thumbnailUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', colors.background]}
            style={styles.thumbnailGradient}
          />
        </View>

        {/* Play Button Overlay */}
        <TouchableOpacity 
          style={styles.playOverlay}
          onPress={handlePlay}
          activeOpacity={0.8}
        >
          <View style={styles.playButton}>
            <Play size={40} color="#FFF" fill="#FFF" />
          </View>
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          {/* Type Badge */}
          <View style={[styles.badge, currentSermon.type === 'video' ? styles.videoBadge : styles.audioBadge]}>
            <Text style={styles.badgeText}>{currentSermon.type.toUpperCase()}</Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {currentSermon.title}
          </Text>

          {/* Series Tag */}
          {currentSermon.series && (
            <View style={styles.seriesTag}>
              <Text style={styles.seriesText}>{currentSermon.series.title}</Text>
            </View>
          )}

          {/* Meta Information */}
          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <UserIcon size={18} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {currentSermon.speaker.name}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Calendar size={18} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {formatDate(currentSermon.date)}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Clock size={18} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {formatDuration(currentSermon.duration)}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Heart size={18} color={colors.textSecondary} fill="none" />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {currentSermon.favoriteCount} favorites
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.playActionButton]}
              onPress={handlePlay}
              activeOpacity={0.8}
            >
              <Play size={20} color="#FFF" fill="#FFF" />
              <Text style={styles.playButtonText}>Play</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.backgroundElement }]}
              onPress={handleFavorite}
              activeOpacity={0.8}
            >
              <Heart
                size={20}
                color={isFavorited ? '#FF6596' : colors.text}
                fill={isFavorited ? '#FF6596' : 'transparent'}
              />
            </TouchableOpacity>

            <DownloadButton sermon={currentSermon} variant="icon-only" />

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.backgroundElement }]}
              onPress={handleShare}
              activeOpacity={0.8}
              disabled={sharing}
            >
              <Share2 size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Description */}
          {currentSermon.description && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {currentSermon.description}
              </Text>
            </View>
          )}

          {/* Scripture References */}
          {currentSermon.scriptureReferences.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Scripture</Text>
              <View style={styles.scriptureList}>
                {currentSermon.scriptureReferences.map((ref, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.scriptureTag, { backgroundColor: colors.backgroundElement }]}
                    onPress={() => handleScripturePress(ref.book, ref.chapter)}
                    activeOpacity={0.7}
                  >
                    <BookOpen size={16} color="#6464FF" />
                    <Text style={styles.scriptureText}>
                      {ref.book} {ref.chapter}:{ref.verseStart}
                      {ref.verseEnd && ref.verseEnd !== ref.verseStart ? `-${ref.verseEnd}` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Tags */}
          {currentSermon.tags.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Topics</Text>
              <View style={styles.tagList}>
                {currentSermon.tags.map((tag, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: colors.backgroundElement }]}>
                    <Text style={[styles.tagText, { color: colors.text }]}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Speaker Bio */}
          {currentSermon.speaker.bio && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Speaker</Text>
              <View style={styles.speakerCard}>
                {currentSermon.speaker.photoUrl && (
                  <Image 
                    source={{ uri: currentSermon.speaker.photoUrl }}
                    style={styles.speakerPhoto}
                  />
                )}
                <View style={styles.speakerInfo}>
                  <Text style={[styles.speakerName, { color: colors.text }]}>
                    {currentSermon.speaker.name}
                  </Text>
                  <Text style={[styles.speakerBio, { color: colors.textSecondary }]}>
                    {currentSermon.speaker.bio}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Resources */}
          {currentSermon.resources.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Resources</Text>
              {currentSermon.resources.map((resource) => (
                <TouchableOpacity
                  key={resource.id}
                  style={[styles.resourceItem, { backgroundColor: colors.backgroundElement }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.resourceTitle, { color: colors.text }]}>
                    {resource.title}
                  </Text>
                  <Text style={[styles.resourceType, { color: colors.textSecondary }]}>
                    {resource.type.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'overview' && styles.activeTab,
              ]}
              onPress={() => setActiveTab('overview')}
            >
              <BookOpen size={20} color={activeTab === 'overview' ? '#FF6596' : colors.textSecondary} />
              <Text style={[
                styles.tabText,
                { color: activeTab === 'overview' ? '#FF6596' : colors.textSecondary },
              ]}>
                Overview
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'notes' && styles.activeTab,
              ]}
              onPress={() => setActiveTab('notes')}
            >
              <FileText size={20} color={activeTab === 'notes' ? '#FF6596' : colors.textSecondary} />
              <Text style={[
                styles.tabText,
                { color: activeTab === 'notes' ? '#FF6596' : colors.textSecondary },
              ]}>
                Notes ({notes.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Notes Section */}
          {activeTab === 'notes' && currentUser && (
            <View style={styles.notesContainer}>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: '100%',
    height: 340,
    position: 'relative',
    backgroundColor: '#E0E0E0',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 340,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 101, 150, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    padding: Spacing.four,
    paddingBottom: 100,
    marginTop: -40,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: Spacing.two,
  },
  videoBadge: {
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
  },
  audioBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: Spacing.two,
    lineHeight: 36,
  },
  seriesTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(100, 100, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: Spacing.three,
  },
  seriesText: {
    color: '#6464FF',
    fontSize: 13,
    fontWeight: '600',
  },
  metaContainer: {
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: 12,
    gap: 8,
  },
  playActionButton: {
    flex: 1,
    backgroundColor: '#FF6596',
  },
  playButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
  },
  scriptureList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  scriptureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  scriptureText: {
    color: '#6464FF',
    fontSize: 14,
    fontWeight: '600',
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  speakerCard: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  speakerPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0E0E0',
  },
  speakerInfo: {
    flex: 1,
  },
  speakerName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  speakerBio: {
    fontSize: 14,
    lineHeight: 20,
  },
  resourceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 12,
    marginBottom: Spacing.two,
  },
  resourceTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  resourceType: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
    marginBottom: Spacing.three,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two + 2,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeTab: {
    borderColor: '#FF6596',
    backgroundColor: 'rgba(255, 101, 150, 0.1)',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  notesContainer: {
    minHeight: 400,
    marginTop: Spacing.two,
  },
});
