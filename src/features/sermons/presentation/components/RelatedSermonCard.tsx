import { Image } from 'expo-image';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Play, Headphones, Clock } from 'lucide-react-native';
import type { Sermon } from '../../domain/sermon.types';
import * as Haptics from 'expo-haptics';
import { SoftCard } from '@/components/ui/SoftCard';

interface RelatedSermonCardProps {
  sermon: Sermon;
  onPress: (originRect?: any) => void;
}

const NAVY = '#1A1A1A';
const GOLD = '#FF6596';

export function RelatedSermonCard({ sermon, onPress }: RelatedSermonCardProps) {
  const hasVideo = sermon.mediaType === 'video' || sermon.mediaType === 'both';

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const imageRef = React.useRef<View>(null);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (imageRef.current) {
      imageRef.current.measure((x, y, width, height, pageX, pageY) => {
        onPress({ x: pageX, y: pageY, width, height });
      });
    } else {
      onPress();
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.85} style={styles.cardWrapper}>
      <SoftCard style={styles.softCard} innerStyle={styles.cardInner}>
        {/* Thumbnail */}
      <View ref={imageRef} style={styles.thumbContainer}>
        {sermon.thumbnailUrl ? (
          <Image source={{ uri: sermon.thumbnailUrl }} style={styles.thumb} resizeMode="cover" cachePolicy="memory-disk" transition={200} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]} />
        )}
        {/* Duration badge */}
        {sermon.durationSeconds ? (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>
              {formatDuration(sermon.durationSeconds)}
            </Text>
          </View>
        ) : null}
        {/* Media type icon */}
        <View style={[styles.mediaIcon, hasVideo ? styles.videoIcon : styles.audioIcon]}>
          {hasVideo ? (
            <Play size={10} color="#fff" fill="#fff" />
          ) : (
            <Headphones size={10} color="#fff" />
          )}
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {sermon.title}
        </Text>
        {sermon.scriptureReference ? (
          <Text style={styles.scripture} numberOfLines={1}>
            {sermon.scriptureReference}
          </Text>
        ) : null}
        <Text style={styles.meta} numberOfLines={1}>
          {sermon.preacherName}
        </Text>
        <View style={styles.dateRow}>
          <Clock size={11} color="#9CA3AF" />
          <Text style={styles.dateText}>{formatDate(sermon.sermonDate)}</Text>
        </View>
      </View>
      </SoftCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 12,
  },
  softCard: {
    borderRadius: 16,
  },
  cardInner: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
  },
  thumbContainer: {
    width: 112,
    height: 80,
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
  },
  thumbPlaceholder: {
    backgroundColor: '#DDE1E8',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  durationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  mediaIcon: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoIcon: {
    backgroundColor: GOLD,
  },
  audioIcon: {
    backgroundColor: '#B66DFF',
  },
  info: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
    gap: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
    lineHeight: 18,
  },
  scripture: {
    fontSize: 11,
    fontWeight: '600',
    color: GOLD,
  },
  meta: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  dateText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
