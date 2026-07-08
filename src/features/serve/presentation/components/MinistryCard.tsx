import type { Ministry } from '@/features/ministry/domain/ministry.types';
import { ChevronRight, Users } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface MinistryCardProps {
  ministry: Ministry;
  onPress: () => void;
}

export function MinistryCard({ ministry, onPress }: MinistryCardProps) {
  const memberCount = ministry.memberCount ?? ministry.members?.length ?? 0;
  const roleCount = ministry.roles?.length ?? 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={cs.card}>
      <View style={cs.header}>
        <View style={cs.iconBox}>
          <Users size={22} color="#FF6596" />
        </View>
        <View style={cs.headerInfo}>
          <Text style={cs.name} numberOfLines={1}>
            {ministry.name}
          </Text>
          {ministry.leaderName ? (
            <Text style={cs.leader} numberOfLines={1}>
              Led by {ministry.leaderName}
            </Text>
          ) : null}
        </View>
        <ChevronRight size={16} color="#9CA3AF" />
      </View>

      {ministry.description ? (
        <Text style={cs.description} numberOfLines={2}>
          {ministry.description}
        </Text>
      ) : null}

      <View style={cs.footer}>
        {memberCount > 0 ? (
          <View style={cs.pill}>
            <Text style={cs.pillText}>{memberCount} member{memberCount !== 1 ? 's' : ''}</Text>
          </View>
        ) : null}
        {roleCount > 0 ? (
          <View style={[cs.pill, cs.pillPurple]}>
            <Text style={[cs.pillText, cs.pillTextPurple]}>
              {roleCount} role{roleCount !== 1 ? 's' : ''}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const cs = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
    padding: 16,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFE8F0',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerInfo: { flex: 1 },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  leader: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillPurple: { backgroundColor: '#F3EEFF' },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  pillTextPurple: { color: '#8B6FE8' },
});
