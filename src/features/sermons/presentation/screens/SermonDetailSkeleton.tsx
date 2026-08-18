import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';

export function SermonDetailSkeleton() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: '#F7F8FC' }]}>
      <View style={{ paddingTop: Math.max(insets.top, 24) }}>
        {/* Top Back Button Area */}
        <View style={styles.headerArea}>
          <ShimmerSkeleton width={40} height={40} borderRadius={20} />
        </View>

        {/* Video / Thumbnail Area */}
        <ShimmerSkeleton height={240} width="100%" borderRadius={0} />

        {/* Content Area */}
        <View style={styles.content}>
          <ShimmerSkeleton height={28} width="80%" borderRadius={8} style={{ marginBottom: 12 }} />
          <ShimmerSkeleton height={16} width="40%" borderRadius={6} style={{ marginBottom: 24 }} />
          
          <View style={styles.buttonRow}>
             <ShimmerSkeleton height={48} width="48%" borderRadius={24} />
             <ShimmerSkeleton height={48} width="48%" borderRadius={24} />
          </View>

          <View style={{ marginTop: 32 }}>
            <ShimmerSkeleton height={20} width="30%" borderRadius={6} style={{ marginBottom: 16 }} />
            <ShimmerSkeleton height={14} width="100%" borderRadius={4} style={{ marginBottom: 8 }} />
            <ShimmerSkeleton height={14} width="100%" borderRadius={4} style={{ marginBottom: 8 }} />
            <ShimmerSkeleton height={14} width="85%" borderRadius={4} style={{ marginBottom: 8 }} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerArea: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  content: {
    padding: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  }
});
