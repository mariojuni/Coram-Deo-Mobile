import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';

/**
 * Skeleton that mirrors DiscipleshipLessonDetailScreen layout.
 * Shown while lesson / group data is loading.
 */
export function DiscipleshipLessonSkeleton() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Back button */}
      <View style={[styles.backBtn, { top: Math.max(insets.top, 16) }]}>
        <ShimmerSkeleton width={36} height={36} borderRadius={18} />
      </View>

      <View style={[styles.content, { paddingTop: Math.max(insets.top, 16) + 56 }]}>
        {/* Hero gradient card */}
        <View style={styles.heroCard}>
          <ShimmerSkeleton height={12} width={70} borderRadius={4} style={styles.mb8} />
          <ShimmerSkeleton height={30} width="85%" borderRadius={8} style={styles.mb12} />
          <ShimmerSkeleton height={28} width={120} borderRadius={999} />
        </View>

        {/* Suggested Flow accordion card */}
        <View style={styles.accordionCard}>
          <View style={styles.accordionHeader}>
            <View style={styles.accordionHeaderLeft}>
              <ShimmerSkeleton width={32} height={32} borderRadius={16} />
              <ShimmerSkeleton height={18} width={140} borderRadius={6} />
            </View>
            <ShimmerSkeleton width={20} height={20} borderRadius={4} />
          </View>
          {/* Flow items */}
          {[...Array(6)].map((_, i) => (
            <View key={i} style={styles.flowItem}>
              <ShimmerSkeleton height={15} width={`${55 + (i % 3) * 12}%`} borderRadius={5} />
            </View>
          ))}
        </View>

        {/* Section accordion 2 */}
        <View style={styles.accordionCardCollapsed}>
          <View style={styles.accordionHeader}>
            <View style={styles.accordionHeaderLeft}>
              <ShimmerSkeleton width={32} height={32} borderRadius={16} />
              <ShimmerSkeleton height={18} width={180} borderRadius={6} />
            </View>
            <ShimmerSkeleton width={20} height={20} borderRadius={4} />
          </View>
        </View>

        {/* Section accordion 3 */}
        <View style={styles.accordionCardCollapsed}>
          <View style={styles.accordionHeader}>
            <View style={styles.accordionHeaderLeft}>
              <ShimmerSkeleton width={32} height={32} borderRadius={16} />
              <ShimmerSkeleton height={18} width={210} borderRadius={6} />
            </View>
            <ShimmerSkeleton width={20} height={20} borderRadius={4} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  backBtn: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#EFEFEF',
    borderRadius: 20,
    padding: 20,
    minHeight: 130,
    overflow: 'hidden',
  },
  accordionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 0,
  },
  accordionCardCollapsed: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flowItem: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
});
