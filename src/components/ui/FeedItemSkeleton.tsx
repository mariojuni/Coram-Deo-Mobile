import React from 'react';
import { View } from 'react-native';
import ShimmerSkeleton from './ShimmerSkeleton';
import { SoftCard } from './SoftCard';
import { BounceCard } from './BounceCard';

export function FeedItemSkeleton() {
  return (
    <BounceCard style={{ marginBottom: 12 }} disabled>
      <SoftCard innerStyle={{ padding: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <ShimmerSkeleton width={36} height={36} borderRadius={18} style={{ marginRight: 10 }} />
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <ShimmerSkeleton height={14} width="70%" style={{ marginBottom: 6 }} />
            <ShimmerSkeleton height={11} width={80} />
          </View>
        </View>

        {/* Content */}
        <ShimmerSkeleton height={14} width="100%" style={{ marginBottom: 6 }} />
        <ShimmerSkeleton height={14} width="85%" style={{ marginBottom: 6 }} />
        <ShimmerSkeleton height={14} width="60%" style={{ marginBottom: 16 }} />

        {/* Footer */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTopWidth: 1,
            borderTopColor: '#F3F4F6',
            paddingTop: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <ShimmerSkeleton width={40} height={18} borderRadius={4} />
            <ShimmerSkeleton width={40} height={18} borderRadius={4} />
          </View>
          <ShimmerSkeleton width={20} height={18} borderRadius={4} />
        </View>
      </SoftCard>
    </BounceCard>
  );
}

export function FeedListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <FeedItemSkeleton key={`feed-skeleton-${index}`} />
      ))}
    </>
  );
}
