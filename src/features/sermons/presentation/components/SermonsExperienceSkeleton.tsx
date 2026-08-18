import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';
import { getSoftShadowStyle } from '@/components/ui/SoftCard';

export function SermonsExperienceSkeleton({ showSearchInput = true }: { showSearchInput?: boolean }) {
  return (
    <View style={styles.root}>
      {showSearchInput && (
        <View style={styles.searchWrap}>
          <ShimmerSkeleton height={44} width="100%" borderRadius={14} />
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: 16, paddingBottom: 40 }}>
          {/* Latest Sermon Section */}
          <View style={styles.section}>
            <ShimmerSkeleton height={22} width={140} borderRadius={6} style={styles.sectionTitlePlaceholder} />
            <View style={styles.featuredCardOuter}>
              <ShimmerSkeleton height="100%" width="100%" borderRadius={24} />
            </View>
          </View>

          {/* Recent Sermons Section */}
          <View style={styles.section}>
            <ShimmerSkeleton height={22} width={150} borderRadius={6} style={styles.sectionTitlePlaceholder} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              scrollEnabled={false}
            >
              {[...Array(3)].map((_, i) => (
                <View key={i} style={styles.tileCard}>
                  <ShimmerSkeleton height={100} width="100%" borderRadius={14} />
                  <ShimmerSkeleton height={14} width="80%" style={{ marginTop: 6 }} />
                  <ShimmerSkeleton height={12} width="50%" style={{ marginTop: 4 }} />
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Series Section */}
          <View style={styles.section}>
            <ShimmerSkeleton height={22} width={80} borderRadius={6} style={styles.sectionTitlePlaceholder} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              scrollEnabled={false}
            >
              {[...Array(2)].map((_, i) => (
                <View key={i} style={styles.seriesCard}>
                  <ShimmerSkeleton height="100%" width="100%" borderRadius={16} />
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  section: {
    paddingTop: 4,
    paddingBottom: 8,
    gap: 12,
  },
  sectionTitlePlaceholder: {
    marginLeft: 20,
    marginBottom: 4,
  },
  horizontalList: {
    gap: 12,
    paddingHorizontal: 20,
  },
  featuredCardOuter: {
    marginHorizontal: 20,
    height: 320,
    borderRadius: 24,
    ...getSoftShadowStyle(24),
  },
  tileCard: {
    width: 160,
  },
  seriesCard: {
    width: 280,
    height: 160,
    borderRadius: 16,
  },
});
