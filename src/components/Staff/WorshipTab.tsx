import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Music, ChevronRight, ListMusic, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useMinistryStore } from '../../store/useMinistryStore';
import { worshipSetlistService } from '../../features/worship/services/worshipSetlistService';
import { canViewMobileWorshipSetlists } from '../../permissions/mobileWorshipPermissions';
import { SoftCard } from '@/components/ui/SoftCard';
import type { WorshipSetlist } from '../../features/worship/domain/worship.types';

export default function WorshipTab() {
  const router = useRouter();
  const userProfile = useAuthStore((s) => s.userProfile);
  const userMinistries = useMinistryStore((state) => state.ministries).filter((m) =>
    m.members?.some((mem) => mem.memberId === userProfile?.memberId)
  );

  const [setlists, setSetlists] = useState<WorshipSetlist[]>([]);
  const [loading, setLoading] = useState(true);

  const hasAccess = canViewMobileWorshipSetlists(userProfile, userMinistries);

  useEffect(() => {
    if (!userProfile?.churchId || !hasAccess) {
      setLoading(false);
      return;
    }
    let isMounted = true;
    worshipSetlistService
      .getUpcomingWorshipSetlistsForUser(userProfile, userMinistries)
      .then((data) => {
        if (isMounted) {
          setSetlists(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error loading worship setlists:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userProfile, hasAccess]);

  if (!hasAccess) {
    return (
      <SoftCard style={{ borderRadius: 20 }} innerStyle={{ borderRadius: 19 }}>
        <View style={styles.cardPadding}>
          <View style={styles.iconCircle}>
            <Music size={28} color="#FF6596" />
          </View>
          <Text style={styles.cardTitle}>Worship Setlists</Text>
          <Text style={styles.cardSubtitle}>
            You do not have permission to view worship setlists.
          </Text>
        </View>
      </SoftCard>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#FF6596" />
        <Text style={styles.loadingText}>Loading worship setlists...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SoftCard style={{ borderRadius: 24 }} innerStyle={{ borderRadius: 23 }}>
        <View style={styles.cardPadding}>
          <View style={styles.headerRow}>
            <View style={styles.iconBadge}>
              <ListMusic size={24} color="#FF6596" />
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{setlists.length} Upcoming</Text>
            </View>
          </View>

          <Text style={styles.cardTitle}>Worship Setlists</Text>
          <Text style={styles.cardSubtitle}>
            View upcoming songs, keys, lyrics, chords, and notes.
          </Text>

          <TouchableOpacity
            style={styles.openBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/worship-setlists' as any)}
          >
            <Text style={styles.openBtnText}>Open Setlists</Text>
            <ArrowRight size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </SoftCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  center: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  cardPadding: {
    backgroundColor: '#FFF',
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFE8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  countBadge: {
    backgroundColor: '#FFF0F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFD0E0',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6596',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  openBtn: {
    backgroundColor: '#FF6596',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  openBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
