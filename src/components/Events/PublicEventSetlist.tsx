import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Music } from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { useMinistryStore } from '@/store/useMinistryStore';
import { worshipSetlistService } from '@/features/worship/services/worshipSetlistService';
import { canViewMobileWorshipSetlist } from '@/permissions/mobileWorshipPermissions';
import type { WorshipSetlistItem, WorshipSetlist } from '@/features/worship/domain/worship.types';

interface PublicEventSetlistProps {
  eventId: string;
  title?: string;
  onCloseModal?: () => void;
  preloadedSongList?: any[];
}

export function PublicEventSetlist({
  eventId,
  title = 'Event Songs',
  onCloseModal,
  preloadedSongList,
}: PublicEventSetlistProps) {
  const router = useRouter();
  const userProfile = useAuthStore((s) => s.userProfile);
  const ministries = useMinistryStore((s) => s.ministries);

  const userMinistries = ministries.filter((m) =>
    m.members?.some((mem) => mem.memberId === userProfile?.memberId)
  );

  const [setlist, setSetlist] = useState<WorshipSetlist | null>(null);
  const [items, setItems] = useState<WorshipSetlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (Array.isArray(preloadedSongList) && preloadedSongList.length > 0) {
      setItems(preloadedSongList);
      setLoading(false);
      return;
    }

    if (!eventId || !userProfile?.churchId) return;

    let isMounted = true;
    setLoading(true);

    const loadSetlist = async () => {
      try {
        const sl = await worshipSetlistService.getWorshipSetlistByEventId(
          userProfile.churchId,
          eventId
        );
        if (!sl) {
          if (isMounted) setLoading(false);
          return;
        }

        const isAllowed = canViewMobileWorshipSetlist(userProfile, sl, userMinistries);
        if (!isAllowed) {
          if (isMounted) setLoading(false);
          return;
        }

        const setlistItems = await worshipSetlistService.getWorshipSetlistItems(
          userProfile.churchId,
          sl.id
        );

        if (isMounted) {
          setSetlist(sl);
          setItems(setlistItems);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setLoading(false);
      }
    };

    loadSetlist();
    return () => {
      isMounted = false;
    };
  }, [eventId, userProfile, preloadedSongList]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.modalRsvpTitle}>{title}</Text>
        <View style={[styles.listContainer, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="small" color="#FF6596" />
        </View>
      </View>
    );
  }

  const isStaff =
    userProfile &&
    canViewMobileWorshipSetlist(userProfile, setlist, userMinistries);

  const hasPreloaded = Array.isArray(preloadedSongList) && preloadedSongList.length > 0;

  const publicItems = hasPreloaded
    ? items
    : items.filter((i) => isStaff || i.song?.allowPublicLyrics !== false);

  if (publicItems.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.modalRsvpTitle}>{title}</Text>
        {setlist && (
          <TouchableOpacity
            onPress={() => {
              if (onCloseModal) onCloseModal();
              setTimeout(() => {
                router.push({
                  pathname: '/worship-setlist-detail',
                  params: { setlistId: setlist.id },
                } as any);
              }, 100);
            }}
          >
            <Text style={styles.viewFullText}>View Full Setlist</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.listContainer}>
        {publicItems.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.listItem,
              { borderBottomWidth: index < publicItems.length - 1 ? 1 : 0 },
            ]}
            onPress={() => {
              if (onCloseModal) onCloseModal();
              setTimeout(() => {
                router.push({
                  pathname: '/serve-song-lyrics',
                  params: { songId: item.songId, hideChords: 'true' },
                } as any);
              }, 100);
            }}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.songTitle}>{item.song?.title || 'Unknown Song'}</Text>
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
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalRsvpTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewFullText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6596',
  },
  listContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    minHeight: 60,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFE8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF6596',
  },
  songTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  songArtist: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
});
