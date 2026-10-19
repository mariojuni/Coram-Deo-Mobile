import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Share, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { doc, onSnapshot } from 'firebase/firestore';
import { getActiveDb } from '@/firebase';
import { BlurView } from 'expo-blur';
import { BounceCard } from '@/components/ui/BounceCard';
import { SoftCard, getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { Image as ExpoImage } from 'expo-image';
import {
  Megaphone,
  X,
  Calendar,
  User,
  Share2,
  Users,
  Clock,
  Sparkles
} from 'lucide-react-native';

export default function AnnouncementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scrollBottomInset } = useResponsiveLayout();

  const [announcement, setAnnouncement] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const db = getActiveDb();
    const unsub = onSnapshot(doc(db, 'announcements', id), (docSnap) => {
      if (docSnap.exists()) {
        setAnnouncement({ id: docSnap.id, ...docSnap.data() });
      } else {
        setAnnouncement(null);
      }
      setLoading(false);
    }, (err) => {
      console.error('Error loading announcement:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [id]);

  const handleShare = async () => {
    if (!announcement) return;
    try {
      await Share.share({
        title: announcement.title || 'Church Announcement',
        message: `${announcement.title}\n\n${announcement.message}`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const formattedDate = announcement?.publishDate
    ? new Date(announcement.publishDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    : announcement?.createdAt?.toDate
    ? announcement.createdAt.toDate().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : '';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ─── Frosted Top Header ────────────────────────────────────── */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 24) }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.75)' }]} pointerEvents="none" />
        <View style={styles.headerContent}>
          <BounceCard
            bounceScale={0.85}
            style={[styles.headerCircle, getTopBarButtonShadowStyle()]}
            onPress={() => router.back()}
            hitSlop={8}
            activeOpacity={0.8}
          >
            <X size={22} color="#1a1a1a" strokeWidth={2} />
          </BounceCard>

          <Text style={styles.headerTitle} numberOfLines={1}>Church Announcement</Text>

          {announcement ? (
            <BounceCard
              bounceScale={0.85}
              style={[styles.headerCircle, getTopBarButtonShadowStyle()]}
              onPress={handleShare}
              hitSlop={8}
              activeOpacity={0.8}
            >
              <Share2 size={18} color="#FF6596" strokeWidth={2} />
            </BounceCard>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 24) + 64,
            paddingBottom: scrollBottomInset + 40
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center' }}>
          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#FF6596" />
              <Text style={styles.loadingText}>Loading announcement...</Text>
            </View>
          ) : !announcement ? (
            <SoftCard innerStyle={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Megaphone size={32} color="#FF6596" />
              </View>
              <Text style={styles.emptyTitle}>Announcement Not Found</Text>
              <Text style={styles.emptySubtitle}>This announcement may have been removed or expired.</Text>
              <BounceCard style={styles.backBtn} onPress={() => router.back()}>
                <Text style={styles.backBtnText}>Return to App</Text>
              </BounceCard>
            </SoftCard>
          ) : (
            <View style={styles.mainContent}>
              {/* Optional Hero Banner Image */}
              {announcement.imageUrl ? (
                <View style={styles.imageContainer}>
                  <ExpoImage
                    source={{ uri: announcement.imageUrl }}
                    style={styles.heroImage}
                    contentFit="cover"
                    transition={200}
                  />
                </View>
              ) : null}

              {/* Main Card */}
              <SoftCard innerStyle={styles.cardInner}>
                {/* Header Tag / Category */}
                <View style={styles.tagRow}>
                  <View style={styles.categoryBadge}>
                    <Megaphone size={14} color="#FF6596" strokeWidth={2.2} />
                    <Text style={styles.categoryBadgeText}>ANNOUNCEMENT</Text>
                  </View>
                  {announcement.status === 'Published' && (
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveBadgeText}>Live</Text>
                    </View>
                  )}
                </View>

                {/* Title */}
                <Text style={styles.titleText}>{announcement.title}</Text>

                {/* Meta details */}
                <View style={styles.metaContainer}>
                  {formattedDate ? (
                    <View style={styles.metaItem}>
                      <Calendar size={14} color="#6B7280" />
                      <Text style={styles.metaText}>{formattedDate}</Text>
                    </View>
                  ) : null}

                  {announcement.author ? (
                    <View style={styles.metaItem}>
                      <User size={14} color="#6B7280" />
                      <Text style={styles.metaText}>{announcement.author}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Target Audience Pills */}
                {Array.isArray(announcement.targetAudience) && announcement.targetAudience.length > 0 && (
                  <View style={styles.audienceSection}>
                    <Text style={styles.audienceHeader}>Target Audience:</Text>
                    <View style={styles.audiencePillRow}>
                      {announcement.targetAudience.map((aud: string) => (
                        <View key={aud} style={styles.audiencePill}>
                          <Text style={styles.audiencePillText}>{aud}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.divider} />

                {/* Message Body */}
                <Text style={styles.bodyText}>{announcement.message}</Text>
              </SoftCard>
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
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  headerContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  headerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  centerLoading: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFE8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FF6596',
    borderRadius: 20,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  mainContent: {
    marginTop: 12,
  },
  imageContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#E2E8F0',
    aspectRatio: 16 / 9,
    maxHeight: 280,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  cardInner: {
    padding: 24,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6596',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  titleText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 28,
    marginBottom: 12,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  audienceSection: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  audienceHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  audiencePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  audiencePill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  audiencePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 20,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#334155',
    fontWeight: '400',
  },
});
