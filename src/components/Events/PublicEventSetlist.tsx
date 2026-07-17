import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';

interface PublicEventSetlistProps {
  eventId: string;
  title?: string;
  onCloseModal?: () => void;
  preloadedSongList?: any[];
}

export function PublicEventSetlist({ eventId, title = "Event Songs", onCloseModal, preloadedSongList }: PublicEventSetlistProps) {
  const router = useRouter();
  const userProfile = useAuthStore((s) => s.userProfile);
  
  const displayItems = preloadedSongList || [];

  if (displayItems.length === 0) return null;

  const isStaff = Array.isArray(userProfile?.systemRoles)
    ? userProfile.systemRoles.some((r: string) => ['super_admin', 'church_admin', 'pastor', 'ministry_leader'].includes(r))
    : ['super_admin', 'church_admin', 'pastor', 'ministry_leader'].includes(userProfile?.role?.toLowerCase() || '');

  const publicItems = displayItems.filter(i => isStaff || i.song?.allowPublicLyrics);

  if (publicItems.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.modalRsvpTitle}>{title}</Text>
      <View style={styles.listContainer}>
        {publicItems.map((item, index) => (
          <TouchableOpacity 
            key={item.id}
            style={[
              styles.listItem,
              { borderBottomWidth: index < publicItems.length - 1 ? 1 : 0 }
            ]}
            onPress={() => {
              if (onCloseModal) onCloseModal();
              setTimeout(() => {
                router.push({ pathname: '/serve-song-lyrics', params: { songId: item.songId, hideChords: 'true' } } as any);
              }, 100);
            }}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.songTitle}>{item.song?.title}</Text>
              {item.song?.artist && <Text style={styles.songArtist}>{item.song.artist}</Text>}
            </View>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
    marginBottom: 10,
  },
  modalRsvpTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    minHeight: 120,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomColor: '#E5E7EB',
  },
  skeletonAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    marginRight: 12,
  },
  skeletonTextContainer: {
    flex: 1,
    paddingVertical: 2,
  },
  skeletonTitle: {
    height: 16,
    width: '60%',
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonSubtitle: {
    height: 14,
    width: '40%',
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  skeletonIcon: {
    width: 16,
    height: 16,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  songTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  songArtist: {
    fontSize: 12,
    color: '#6B7280',
  },
});
