import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Image } from 'react-native';
import { ExternalLink, Play } from 'lucide-react-native';

interface YouTubePlayerViewProps {
  videoId: string;
  youtubeUrl?: string;
  title?: string;
}

export function YouTubePlayerView({ videoId, youtubeUrl, title }: YouTubePlayerViewProps) {
  const targetUrl = youtubeUrl || `https://www.youtube.com/watch?v=${videoId}`;
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  const handleOpenYouTube = () => {
    Linking.openURL(targetUrl).catch((err) => console.error('Failed to open YouTube URL:', err));
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Play size={11} color="#EF4444" fill="#EF4444" />
          <Text style={styles.badgeText}>YOUTUBE REFERENCE</Text>
        </View>
        <Text style={styles.subtitle}>Watch or listen on YouTube</Text>
      </View>

      <TouchableOpacity 
        style={styles.card} 
        onPress={handleOpenYouTube} 
        activeOpacity={0.88}
      >
        <Image 
          source={{ uri: thumbnailUrl }} 
          style={styles.thumbnail} 
          resizeMode="cover"
        />
        <View style={styles.overlay}>
          <View style={styles.playButtonCircle}>
            <Play size={24} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 3 }} />
          </View>
        </View>

        <View style={styles.infoBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.videoTitle} numberOfLines={1}>
              {title ? `${title} (Reference Video)` : 'Watch Reference Video'}
            </Text>
            <Text style={styles.videoSubtext}>Tap to open in YouTube App or Web</Text>
          </View>
          <View style={styles.actionBtn}>
            <ExternalLink size={16} color="#FFFFFF" />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    marginBottom: 16,
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.03)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  card: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#18181B',
    position: 'relative',
  },
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 12px rgba(239, 68, 68, 0.4)',
  },
  infoBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  videoSubtext: {
    fontSize: 11,
    color: '#D1D5DB',
    marginTop: 1,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
});
