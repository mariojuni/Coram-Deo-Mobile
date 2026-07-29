import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';

/**
 * Skeleton that mirrors DiscipleshipGroupDetailScreen layout.
 * Shown while group data is loading.
 */
export function DiscipleshipGroupDetailSkeleton() {
  const insets = useSafeAreaInsets();
  const headerTop = Math.max(insets.top, 16);

  return (
    <View style={styles.container}>
      {/* Frosted header bar shimmer */}
      <View style={[styles.headerBar, { paddingTop: headerTop }]}>
        <ShimmerSkeleton width={34} height={34} borderRadius={17} />
        <View style={styles.headerCenter}>
          <ShimmerSkeleton height={10} width={100} borderRadius={4} style={styles.mb4} />
          <ShimmerSkeleton height={16} width={160} borderRadius={6} />
        </View>
        <ShimmerSkeleton width={72} height={30} borderRadius={999} />
      </View>

      {/* Scroll content — starts below the header */}
      <View style={[styles.content, { paddingTop: headerTop + 60 + 16 }]}>

        {/* Hero banner card */}
        <View style={styles.heroCard}>
          <ShimmerSkeleton height={10} width={80} borderRadius={4} style={styles.mb8} />
          <ShimmerSkeleton height={28} width="80%" borderRadius={8} style={styles.mb8} />
          <ShimmerSkeleton height={13} width="60%" borderRadius={5} style={styles.mb12} />
          <View style={styles.metaRow}>
            <ShimmerSkeleton height={24} width={110} borderRadius={999} />
            <ShimmerSkeleton height={24} width={130} borderRadius={999} />
          </View>
        </View>

        {/* Discipleship Plan section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <ShimmerSkeleton height={20} width={160} borderRadius={6} />
            <ShimmerSkeleton height={14} width={80} borderRadius={5} />
          </View>

          <View style={styles.planCard}>
            {/* Plan header row */}
            <View style={styles.planHeaderRow}>
              <ShimmerSkeleton width={40} height={40} borderRadius={20} />
              <View style={styles.planTextCol}>
                <ShimmerSkeleton height={16} width="55%" borderRadius={6} style={styles.mb4} />
                <ShimmerSkeleton height={12} width="40%" borderRadius={4} />
              </View>
              <ShimmerSkeleton width={18} height={18} borderRadius={4} />
            </View>

            {/* Current lesson box */}
            <View style={styles.lessonBox}>
              <ShimmerSkeleton height={10} width={100} borderRadius={4} style={styles.mb6} />
              <ShimmerSkeleton height={16} width="80%" borderRadius={6} style={styles.mb4} />
              <ShimmerSkeleton height={12} width="50%" borderRadius={4} />
            </View>

            {/* Progress bar */}
            <ShimmerSkeleton height={6} borderRadius={3} style={styles.mt4} />

            {/* Action button */}
            <View style={styles.actionRow}>
              <ShimmerSkeleton height={34} width={150} borderRadius={999} />
            </View>
          </View>
        </View>

        {/* Group Members section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <ShimmerSkeleton height={20} width={130} borderRadius={6} />
            <ShimmerSkeleton height={14} width={80} borderRadius={5} />
          </View>

          <View style={styles.membersRow}>
            {[...Array(4)].map((_, i) => (
              <View key={i} style={styles.memberWrap}>
                <ShimmerSkeleton width={48} height={48} borderRadius={24} style={styles.mb6} />
                <ShimmerSkeleton height={10} width={40} borderRadius={4} />
              </View>
            ))}
          </View>
        </View>

        {/* Announcements section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <ShimmerSkeleton height={20} width={180} borderRadius={6} />
            <ShimmerSkeleton height={30} width={70} borderRadius={999} />
          </View>

          <View style={styles.postCard}>
            <ShimmerSkeleton height={14} width="90%" borderRadius={5} style={styles.mb6} />
            <ShimmerSkeleton height={14} width="70%" borderRadius={5} />
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
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerCenter: {
    flex: 1,
  },
  content: {
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
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  section: {
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planTextCol: {
    flex: 1,
  },
  lessonBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  membersRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  memberWrap: {
    alignItems: 'center',
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  mb4: { marginBottom: 4 },
  mb6: { marginBottom: 6 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mt4: { marginTop: 4 },
});
