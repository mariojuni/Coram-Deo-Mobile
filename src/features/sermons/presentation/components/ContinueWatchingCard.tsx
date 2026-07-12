import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Play, Headphones, RotateCcw } from 'lucide-react-native';
import type { SermonPlaybackProgress } from '../../domain/sermon.types';
import type { Sermon } from '../../domain/sermon.types';

interface ContinueWatchingCardProps {
  progress: SermonPlaybackProgress;
  sermon: Sermon | null;
  onPress: () => void;
}

const NAVY = '#1A1A1A';
const GOLD = '#FF6596';

export function ContinueWatchingCard({ progress, sermon, onPress }: ContinueWatchingCardProps) {
  if (!sermon) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const isVideo = progress.mediaType === 'video';
  const Icon = isVideo ? Play : Headphones;
  const label = isVideo ? 'Continue Watching' : 'Continue Listening';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Thumbnail */}
      <View style={styles.thumbWrap}>
        {sermon.thumbnailUrl ? (
          <Image source={{ uri: sermon.thumbnailUrl }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, { backgroundColor: '#DDE1E8' }]} />
        )}
        {/* Progress bar overlay */}
        <View style={styles.progressBarWrap}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(progress.progressPercent, 100)}%` },
            ]}
          />
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.labelRow}>
          <Icon size={11} color={GOLD} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {sermon.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {sermon.preacherName}
        </Text>
        <Text style={styles.timeText}>
          from {formatTime(progress.positionSeconds)}
        </Text>
      </View>

      {/* Play / Resume icon */}
      <View style={styles.resumeIcon}>
        <RotateCcw size={18} color={NAVY} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,101,150,0.2)',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  thumbWrap: {
    width: 100,
    height: 72,
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  progressBarWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: GOLD,
  },
  info: {
    flex: 1,
    padding: 10,
    gap: 2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: GOLD,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
    lineHeight: 18,
  },
  meta: {
    fontSize: 11,
    color: '#6B7280',
  },
  timeText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  resumeIcon: {
    paddingRight: 14,
  },
});
