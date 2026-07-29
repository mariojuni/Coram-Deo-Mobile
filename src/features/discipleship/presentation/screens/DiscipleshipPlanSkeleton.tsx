import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';

/**
 * Skeleton placeholder that mirrors the DiscipleshipPlanScreen layout.
 * Displayed while plan data and weeks are loading.
 */
export function DiscipleshipPlanSkeleton() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Cover image placeholder — same height as real screen */}
      <ShimmerSkeleton height={260} borderRadius={0} width="100%" />

      {/* Back button placeholder — mirrors the absolute back button */}
      <View
        style={[
          styles.backButtonPlaceholder,
          { top: Math.max(insets.top, 20) },
        ]}
      >
        <ShimmerSkeleton width={44} height={44} borderRadius={22} />
      </View>

      {/* Content scrolls below the cover with the same -40 overlap */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        {/* Title block */}
        <View style={styles.headerContent}>
          <ShimmerSkeleton height={32} width="75%" borderRadius={8} style={styles.mb8} />
          <ShimmerSkeleton height={18} width="50%" borderRadius={6} style={styles.mb16} />
          <ShimmerSkeleton height={14} borderRadius={6} style={styles.mb6} />
          <ShimmerSkeleton height={14} borderRadius={6} width="90%" style={styles.mb6} />
          <ShimmerSkeleton height={14} borderRadius={6} width="70%" style={styles.mb24} />

          {/* Progress card */}
          <View style={styles.progressCard}>
            <View style={styles.progressRow}>
              <ShimmerSkeleton height={14} width={90} borderRadius={6} />
              <ShimmerSkeleton height={36} width={90} borderRadius={999} />
            </View>
            <ShimmerSkeleton height={28} width={60} borderRadius={6} style={styles.mt10} />
            <View style={styles.barRow}>
              <ShimmerSkeleton height={8} borderRadius={4} style={styles.barFlex} />
              <ShimmerSkeleton height={14} width={36} borderRadius={4} />
            </View>
          </View>
        </View>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <View>
            <ShimmerSkeleton height={10} width={80} borderRadius={4} style={styles.mb6} />
            <ShimmerSkeleton height={20} width={130} borderRadius={6} />
          </View>
          <ShimmerSkeleton height={28} width={36} borderRadius={999} />
        </View>

        {/* Week cards */}
        {[...Array(5)].map((_, i) => (
          <View key={i} style={styles.weekCard}>
            <ShimmerSkeleton width={44} height={44} borderRadius={12} style={styles.weekBadge} />
            <View style={styles.weekContent}>
              <ShimmerSkeleton height={16} width="60%" borderRadius={6} style={styles.mb8} />
              <ShimmerSkeleton height={13} width="40%" borderRadius={5} />
            </View>
            <ShimmerSkeleton width={22} height={22} borderRadius={11} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  backButtonPlaceholder: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
  },
  scroll: {
    flex: 1,
    marginTop: -40,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 8,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F5F6FA',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  barFlex: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
    marginTop: 8,
  },
  weekCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F5F6FA',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  weekBadge: {
    marginRight: 16,
  },
  weekContent: {
    flex: 1,
  },
  mb6: { marginBottom: 6 },
  mb8: { marginBottom: 8 },
  mb16: { marginBottom: 16 },
  mb24: { marginBottom: 24 },
  mt10: { marginTop: 10 },
});
