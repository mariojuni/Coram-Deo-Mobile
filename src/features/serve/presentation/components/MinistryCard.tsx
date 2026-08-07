import { BounceCard } from '@/components/ui/BounceCard';
import { SoftCard } from '@/components/ui/SoftCard';
import type { Ministry } from '@/features/ministry/domain/ministry.types';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Users } from 'lucide-react-native';
import { useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '@/store/useAuthStore';

export interface MinistryCardProps {
  ministry: Ministry;
  onPress: () => void;
}

export function MinistryCard({ ministry, onPress }: MinistryCardProps) {
  const memberCount = ministry.memberCount ?? ministry.members?.length ?? 0;
  const roleCount = ministry.roles?.length ?? 0;

  const userProfile = useAuthStore((s) => s.userProfile);
  const currentUser = useAuthStore((s) => s.currentUser);
  const memberId = userProfile?.memberId ?? currentUser?.uid ?? null;
  const isMember = !!(memberId && ministry.members?.some((m) => m.memberId === memberId));

  return (
    <BounceCard onPress={onPress} activeOpacity={1} style={{ marginBottom: 12 }}>
      <SoftCard innerStyle={cs.card}>
        {/* Left gradient accent bar */}
        <View style={cs.accentBar}>
          <LinearGradient
            colors={['#FF6596', '#B66DFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <View style={cs.inner}>
          {/* Header row */}
          <View style={cs.header}>
            <LinearGradient
              colors={['#FF6596', '#B66DFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={cs.iconBox}
            >
              <Users size={20} color="#fff" strokeWidth={2} />
            </LinearGradient>
            <View style={cs.headerInfo}>
              <Text style={cs.name} numberOfLines={1}>{ministry.name}</Text>
              {ministry.leaderName ? (
                <Text style={cs.leader} numberOfLines={1}>Led by {ministry.leaderName}</Text>
              ) : null}
            </View>
            {isMember && (
              <View style={cs.joinedBadge}>
                <Text style={cs.joinedText}>Joined</Text>
              </View>
            )}
            <ChevronRight size={16} color="#C4C9D4" />
          </View>

          {/* Description */}
          {ministry.description ? (
            <Text style={cs.description} numberOfLines={2}>{ministry.description}</Text>
          ) : null}

          {/* Footer pills */}
          {(memberCount > 0 || roleCount > 0) ? (
            <View style={cs.footer}>
              {memberCount > 0 && (
                <View style={cs.pill}>
                  <Text style={cs.pillText}>
                    {memberCount} member{memberCount !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
              {roleCount > 0 && (
                <View style={cs.pillPurple}>
                  <Text style={cs.pillTextPurple}>
                    {roleCount} role{roleCount !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
          ) : null}
        </View>
      </SoftCard>
    </BounceCard>
  );
}

const cs = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
  },
  accentBar: { width: 4 },
  inner: { flex: 1, padding: 14, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerInfo: { flex: 1 },
  name: {
    fontSize: 15, fontWeight: '800', color: '#1F2937', letterSpacing: -0.3,
  },
  leader: { fontSize: 12, color: '#9CA3AF', fontWeight: '500', marginTop: 1 },
  joinedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  joinedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  description: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  footer: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: {
    backgroundColor: '#F3F4F6', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  pillText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  pillPurple: {
    backgroundColor: '#F3EEFF', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  pillTextPurple: { fontSize: 11, fontWeight: '600', color: '#8B6FE8' },
});

