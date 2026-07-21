import React from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';

/**
 * Skeleton placeholder that mirrors the HomeScreen layout.
 * It is displayed while the home data is loading to give users a sense of the final UI.
 */
const HomeScreenSkeleton = () => {
  const { width } = Dimensions.get('window');
  const cardWidth = Math.min(width - 40, 320);

  return (
    <View style={styles.container}>
      {/* Header Placeholder */}
      <ShimmerSkeleton height={80} style={styles.shimmerHeader} />

      {/* Carousel Placeholder (horizontal scroll) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carouselWrapper}>
        {[...Array(3)].map((_, i) => (
          <ShimmerSkeleton
            key={i}
            height={150}
            style={[styles.shimmerCard, { width: cardWidth, marginRight: i === 2 ? 0 : 12 }]}
          />
        ))}
      </ScrollView>

      {/* Ministries Placeholder */}
      <View style={styles.section}>
        <ShimmerSkeleton height={100} style={styles.shimmerMinistry} />
        <ShimmerSkeleton height={100} style={styles.shimmerMinistry} />
        <ShimmerSkeleton height={100} style={styles.shimmerMinistry} />
      </View>

      {/* Prayers Placeholder */}
      <View style={styles.section}>
        {[...Array(3)].map((_, i) => (
          <View key={i} style={styles.prayerRow}>
            <ShimmerSkeleton height={40} style={styles.avatarPlaceholder} />
            <View style={styles.prayerTextWrapper}>
              <ShimmerSkeleton height={12} style={styles.prayerLine} />
              <ShimmerSkeleton height={12} style={styles.prayerLine} />
            </View>
          </View>
        ))}
      </View>

      {/* Sermons Placeholder */}
      <View style={styles.section}>
        {[...Array(3)].map((_, i) => (
          <ShimmerSkeleton
            key={i}
            height={120}
            style={styles.shimmerSermon}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  shimmerHeader: {
    marginBottom: 16,
  },
  carouselWrapper: {
    marginBottom: 16,
  },
  shimmerCard: {
    borderRadius: 20,
  },
  section: {
    marginBottom: 24,
  },
  shimmerMinistry: {
    marginBottom: 12,
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  prayerTextWrapper: {
    flex: 1,
  },
  prayerLine: {
    marginBottom: 6,
  },
  shimmerSermon: {
    marginBottom: 12,
  },
});

export default HomeScreenSkeleton;
