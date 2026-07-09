import DebouncedTouchable from '@/components/DebouncedTouchable';
import type { Ministry } from '@/features/ministry/domain/ministry.types';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Users } from 'lucide-react-native';
import { useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export interface MinistryCardProps {
  ministry: Ministry;
  onPress: () => void;
}

export function MinistryCard({ ministry, onPress }: MinistryCardProps) {
  const memberCount = ministry.memberCount ?? ministry.members?.length ?? 0;
  const roleCount = ministry.roles?.length ?? 0;
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 15, bounciness: 12 }).start();

  return (
    <DebouncedTouchable onPress={onPress} activeOpacity={1} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View style={[cs.card, { transform: [{ scale }] }]}>
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
      </Animated.View>
    </DebouncedTouchable>
  );
}

const cs = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
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

