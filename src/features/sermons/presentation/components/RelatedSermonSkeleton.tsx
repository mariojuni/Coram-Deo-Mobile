import React from 'react';
import { View, StyleSheet } from 'react-native';
import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';

export function RelatedSermonSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.thumbContainer}>
        <ShimmerSkeleton width="100%" height="100%" borderRadius={0} />
      </View>

      <View style={styles.info}>
        <ShimmerSkeleton height={14} width="85%" borderRadius={4} style={{ marginBottom: 4 }} />
        <ShimmerSkeleton height={14} width="60%" borderRadius={4} style={{ marginBottom: 8 }} />
        <ShimmerSkeleton height={12} width="40%" borderRadius={4} style={{ marginBottom: 4 }} />
        <View style={styles.dateRow}>
          <ShimmerSkeleton width={12} height={12} borderRadius={6} />
          <ShimmerSkeleton height={10} width="30%" borderRadius={3} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  thumbContainer: {
    width: 112,
    height: 80,
  },
  info: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
});
