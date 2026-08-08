import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';
import { getSoftShadowStyle } from '@/components/ui/SoftCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Thin divider line used between skeleton groups */
const Divider = () => <View style={styles.divider} />;

/**
 * A card-shaped shimmer block that mirrors the SoftCard style used throughout
 * the home screen — white background, 20px border radius, subtle shadow.
 */
function SkeletonCard({ children, style }: { children?: React.ReactNode; style?: object }) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

/**
 * Skeleton placeholder that faithfully mirrors the HomeScreen layout:
 *   1. Animated header (greeting + avatar)
 *   2. Verse of the Day card
 *   3. Today events carousel + pagination dots
 *   4. Ministry duty rows (serving this week)
 *   5. Prayer request cards (with gradient accent bar + avatar)
 *   6. Horizontal sermon scroll
 *   7. Upcoming events list
 */
const HomeScreenSkeleton = () => {
  const insets = useSafeAreaInsets();
  const cardWidth = SCREEN_WIDTH - 48;

  return (
    <View style={styles.root}>
      {/* ─── Header placeholder ─────────────────────────────────── */}
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, 24) },
        ]}
      >
        {/* Gradient accent line */}
        <View style={styles.accentLine}>
          <View style={styles.accentLineFill} />
        </View>

        <View style={styles.headerInner}>
          {/* Left: date pill + greeting */}
          <View style={styles.headerLeft}>
            <ShimmerSkeleton height={20} width={120} borderRadius={20} style={{ marginBottom: 6 }} />
            <ShimmerSkeleton height={14} width={90} borderRadius={8} style={{ marginBottom: 4 }} />
            <ShimmerSkeleton height={28} width={160} borderRadius={10} />
          </View>

          {/* Avatar */}
          <ShimmerSkeleton
            width={46}
            height={46}
            borderRadius={23}
            style={styles.headerAvatar}
          />
        </View>
      </View>

      {/* ─── Scrollable body ────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 24) + 128 + 8,
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        {/* ── Verse of the Day ─────────────────────────────────── */}
        <SkeletonCard style={{ marginBottom: 16 }}>
          <View style={styles.votdRow}>
            <ShimmerSkeleton width={36} height={36} borderRadius={10} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <ShimmerSkeleton height={13} width="85%" style={{ marginBottom: 6 }} />
              <ShimmerSkeleton height={13} width="70%" style={{ marginBottom: 6 }} />
              <ShimmerSkeleton height={11} width={100} />
            </View>
          </View>
        </SkeletonCard>

        {/* ── TODAY event carousel ──────────────────────────────── */}
        <View style={{ marginBottom: 24 }}>
          {/* Section label */}
          <View style={styles.labelRow}>
            <ShimmerSkeleton width={7} height={7} borderRadius={99} style={{ marginRight: 6 }} />
            <ShimmerSkeleton width={50} height={11} borderRadius={6} />
          </View>

          {/* Event card */}
          <SkeletonCard>
            <View style={styles.eventCardRow}>
              {/* Gradient date tile */}
              <ShimmerSkeleton width={64} height={88} borderRadius={12} style={{ marginRight: 14 }} />
              {/* Event details */}
              <View style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
                <ShimmerSkeleton height={15} width="80%" />
                <ShimmerSkeleton height={11} width="60%" />
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  <ShimmerSkeleton width={60} height={26} borderRadius={999} />
                  <ShimmerSkeleton width={60} height={26} borderRadius={999} />
                  <ShimmerSkeleton width={44} height={26} borderRadius={999} />
                </View>
              </View>
            </View>
          </SkeletonCard>

          {/* Pagination dots */}
          <View style={styles.paginationRow}>
            <ShimmerSkeleton width={20} height={6} borderRadius={3} style={{ marginRight: 6 }} />
            <ShimmerSkeleton width={6} height={6} borderRadius={3} style={{ marginRight: 6 }} />
            <ShimmerSkeleton width={6} height={6} borderRadius={3} />
          </View>
        </View>

        <Divider />

        {/* ── My Ministry / Serving This Week ──────────────────── */}
        <View style={{ marginBottom: 24 }}>
          {/* Section header */}
          <View style={styles.sectionHeader}>
            <View>
              <ShimmerSkeleton height={11} width={80} borderRadius={6} style={{ marginBottom: 5 }} />
              <ShimmerSkeleton height={18} width={160} borderRadius={8} />
            </View>
            <ShimmerSkeleton width={72} height={26} borderRadius={999} />
          </View>

          {/* Duty cards */}
          {[...Array(2)].map((_, i) => (
            <SkeletonCard key={i} style={{ marginBottom: 10 }}>
              <View style={styles.dutyRow}>
                <ShimmerSkeleton width={52} height={52} borderRadius={14} style={{ marginRight: 14 }} />
                <View style={{ flex: 1, gap: 7 }}>
                  <ShimmerSkeleton height={14} width="70%" />
                  <ShimmerSkeleton height={11} width="50%" />
                </View>
                <ShimmerSkeleton width={70} height={30} borderRadius={999} />
              </View>
            </SkeletonCard>
          ))}
        </View>

        <Divider />

        {/* ── Prayer Requests ──────────────────────────────────── */}
        <View style={{ marginBottom: 24 }}>
          <View style={styles.sectionHeader}>
            <View>
              <ShimmerSkeleton height={11} width={120} borderRadius={6} style={{ marginBottom: 5 }} />
              <ShimmerSkeleton height={18} width={140} borderRadius={8} />
            </View>
          </View>

          {[...Array(3)].map((_, i) => (
            <SkeletonCard key={i} style={{ marginBottom: 10, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row' }}>
                {/* Gradient accent bar */}
                <View style={styles.prayerAccentBar} />
                <View style={{ flex: 1, padding: 12 }}>
                  {/* Author row */}
                  <View style={styles.prayerAuthorRow}>
                    <ShimmerSkeleton width={36} height={36} borderRadius={18} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <ShimmerSkeleton height={13} width="55%" style={{ marginBottom: 5 }} />
                      <ShimmerSkeleton height={10} width={70} />
                    </View>
                  </View>
                  {/* Content lines */}
                  <ShimmerSkeleton height={13} width="100%" style={{ marginBottom: 6 }} />
                  <ShimmerSkeleton height={13} width="80%" style={{ marginBottom: 12 }} />
                  {/* Action icons */}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16 }}>
                    <ShimmerSkeleton width={36} height={20} borderRadius={6} />
                    <ShimmerSkeleton width={36} height={20} borderRadius={6} />
                    <ShimmerSkeleton width={36} height={20} borderRadius={6} />
                  </View>
                </View>
              </View>
            </SkeletonCard>
          ))}
        </View>

        <Divider />

        {/* ── Recent Sermons (horizontal scroll) ───────────────── */}
        <View style={{ marginBottom: 24 }}>
          <View style={styles.sectionHeader}>
            <View>
              <ShimmerSkeleton height={11} width={100} borderRadius={6} style={{ marginBottom: 5 }} />
              <ShimmerSkeleton height={18} width={140} borderRadius={8} />
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {[...Array(4)].map((_, i) => (
              <View key={i} style={styles.sermonCard}>
                {/* Thumbnail */}
                <ShimmerSkeleton
                  width={148}
                  height={190}
                  borderRadius={0}
                />
                {/* Overlay info area */}
                <View style={styles.sermonOverlay}>
                  <ShimmerSkeleton height={11} width="85%" style={{ marginBottom: 5 }} baseColor="rgba(255,255,255,0.12)" />
                  <ShimmerSkeleton height={10} width="60%" baseColor="rgba(255,255,255,0.10)" />
                </View>
                {/* Type badge */}
                <View style={styles.sermonBadge}>
                  <ShimmerSkeleton width={40} height={16} borderRadius={6} baseColor="rgba(255,101,150,0.3)" />
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <Divider />

        {/* ── Upcoming Events ──────────────────────────────────── */}
        <View style={{ marginBottom: 40 }}>
          <View style={styles.sectionHeader}>
            <View>
              <ShimmerSkeleton height={11} width={90} borderRadius={6} style={{ marginBottom: 5 }} />
              <ShimmerSkeleton height={18} width={150} borderRadius={8} />
            </View>
          </View>

          {[...Array(3)].map((_, i) => (
            <SkeletonCard key={i} style={{ marginBottom: 10 }}>
              <View style={styles.eventListRow}>
                {/* Date block */}
                <View style={styles.eventDateBlock}>
                  <ShimmerSkeleton height={10} width={26} borderRadius={4} style={{ marginBottom: 4 }} />
                  <ShimmerSkeleton height={28} width={30} borderRadius={6} style={{ marginBottom: 4 }} />
                  <ShimmerSkeleton height={9} width={22} borderRadius={4} />
                </View>

                {/* Divider */}
                <View style={styles.eventVerticalDivider} />

                {/* Details */}
                <View style={{ flex: 1, gap: 6 }}>
                  <ShimmerSkeleton height={15} width="75%" />
                  <ShimmerSkeleton height={24} width={110} borderRadius={999} />
                </View>

                <ShimmerSkeleton width={14} height={14} borderRadius={7} />
              </View>
            </SkeletonCard>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  // ── Header ─────────────────────────────────────────────────────────────
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(255,255,255,0.90)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 10,
    backgroundColor: '#EDF0F7',
    overflow: 'hidden',
  },
  accentLineFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#EDF0F7',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 120,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  headerAvatar: {
    alignSelf: 'center',
  },

  // ── Scroll ─────────────────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },

  // ── Card ───────────────────────────────────────────────────────────────
  card: {
    padding: 16,
    ...getSoftShadowStyle(20),
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.04)',
    marginBottom: 24,
    marginHorizontal: -8,
  },

  // ── Verse of the Day ───────────────────────────────────────────────────
  votdRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  // ── Section headers ────────────────────────────────────────────────────
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  // ── Event carousel card ────────────────────────────────────────────────
  eventCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ── Pagination ─────────────────────────────────────────────────────────
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  // ── Ministry duty ──────────────────────────────────────────────────────
  dutyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ── Prayer ─────────────────────────────────────────────────────────────
  prayerAccentBar: {
    width: 4,
    backgroundColor: '#EDF0F7',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  prayerAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  // ── Sermons ────────────────────────────────────────────────────────────
  sermonCard: {
    width: 148,
    height: 190,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1A1A2E',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  sermonOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    paddingBottom: 12,
    gap: 4,
  },
  sermonBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
  },

  // ── Upcoming events ────────────────────────────────────────────────────
  eventListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  eventDateBlock: {
    alignItems: 'center',
    width: 44,
  },
  eventVerticalDivider: {
    width: 1,
    height: 44,
    backgroundColor: '#F0F0F5',
    marginHorizontal: 14,
  },
});

export default HomeScreenSkeleton;

