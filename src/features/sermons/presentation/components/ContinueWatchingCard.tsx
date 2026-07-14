import { Image } from 'expo-image';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Play, Pause, Headphones, X } from 'lucide-react-native';
import type { SermonPlaybackProgress } from '../../domain/sermon.types';
import type { Sermon } from '../../domain/sermon.types';

interface ContinueWatchingCardProps {
  progress: SermonPlaybackProgress;
  sermon: Sermon | null;
  isPlaying?: boolean;
  onPress: () => void;
  onPlayPause?: () => void;
  onDismiss?: () => void;
}

const NAVY = '#1A1A1A';
const GOLD = '#FF6596';

export function ContinueWatchingCard({ progress, sermon, isPlaying, onPress, onPlayPause, onDismiss }: ContinueWatchingCardProps) {
  if (!sermon) return null;

  const isVideo = progress.mediaType === 'video';
  const Icon = isVideo ? Play : Headphones;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.touchable} onPress={onPress} activeOpacity={0.9}>
        <BlurView intensity={70} tint="light" style={styles.card}>

          <View style={styles.content}>
            <View style={styles.thumbWrap}>
              {sermon.thumbnailUrl ? (
                <Image source={{ uri: sermon.thumbnailUrl }} style={styles.thumb} resizeMode="cover" cachePolicy="memory-disk" transition={200} />
              ) : (
                <View style={[styles.thumb, { backgroundColor: '#DDE1E8' }]} />
              )}
              <View style={styles.iconOverlay}>
                <Icon size={14} color="#fff" fill={isVideo ? "#fff" : "transparent"} />
              </View>
            </View>

            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={1}>
                {sermon.title}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {sermon.preacherName}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {onPlayPause && (
                <TouchableOpacity onPress={onPlayPause} style={styles.actionBtn} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                  {isPlaying ? (
                    <Pause size={20} color={NAVY} fill={NAVY} />
                  ) : (
                    <Play size={20} color={NAVY} fill={NAVY} />
                  )}
                </TouchableOpacity>
              )}

              {onDismiss && (
                <TouchableOpacity onPress={onDismiss} style={styles.actionBtn} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                  <X size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Progress bar overlay (bottom) */}
          <View style={styles.progressBarWrap}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(progress.progressPercent, 100)}%` },
              ]}
            />
          </View>
        </BlurView>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    width: '100%',
  },
  touchable: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 20,
    gap: 12,
  },
  thumbWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#DDE1E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumb: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  iconOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.3)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  actionBtn: {
    padding: 8,
  },
  progressBarWrap: {
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.05)',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: GOLD,
  },
});
