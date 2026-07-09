import DebouncedTouchable from '@/components/DebouncedTouchable';
import { PrayingHands } from '@/components/ui/icons/PrayingHands';
import type { MinistryAssignment } from '@/features/ministry/domain/ministry.types';
import { useMinistryStore } from '@/store/useMinistryStore';
import { LinearGradient } from 'expo-linear-gradient';
import {
    BookOpen,
    CalendarDays,
    Check,
    ChevronRight,
    Clock,
    Drum,
    GraduationCap,
    Guitar,
    Hand,
    HandCoins,
    Heart,
    MapPin,
    Mic,
    Monitor,
    Music,
    Piano,
    Settings,
    Shield,
    Star,
    Users,
} from 'lucide-react-native';
import { useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

// ─── Role identity ────────────────────────────────────────────────────────────

const ROLE_COLOR: Record<string, string> = {
  openingprayer: '#818CF8',
  tithesofferingprayer: '#4D8BFF',
  techaudio: '#6B7280',
  tech: '#6B7280',
  audio: '#6B7280',
  presider: '#FF6596',
  scripturereading: '#F59E0B',
  preacher: '#FF6596',
  vocalist: '#8B6FE8',
  bassguitar: '#4D8BFF',
  drummer: '#EF4444',
  piano: '#10B981',
  electricguitar: '#F59E0B',
  sundayschoolkids: '#F59E0B',
  sundayschoolyouth: '#4D8BFF',
  sundayschooladults: '#10B981',
  kids: '#F59E0B',
  youth: '#4D8BFF',
  adults: '#10B981',
};

const ROLE_ICON_BG: Record<string, string> = {
  openingprayer: '#E0E7FF',
  tithesofferingprayer: '#E8F0FF',
  techaudio: '#F3F4F6',
  tech: '#F3F4F6',
  audio: '#F3F4F6',
  presider: '#FFE8F0',
  scripturereading: '#FEF3C7',
  preacher: '#FFE8F0',
  vocalist: '#F3EEFF',
  bassguitar: '#E8F0FF',
  drummer: '#FEE2E2',
  piano: '#D1FAE5',
  electricguitar: '#FEF3C7',
  kids: '#FEF3C7',
  youth: '#E8F0FF',
  adults: '#D1FAE5',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  openingprayer: <PrayingHands size={20} color="#818CF8" />,
  tithesofferingprayer: <HandCoins size={20} color="#4D8BFF" />,
  techaudio: <Monitor size={20} color="#6B7280" />,
  tech: <Monitor size={20} color="#6B7280" />,
  audio: <Monitor size={20} color="#6B7280" />,
  presider: <Users size={20} color="#FF6596" />,
  scripturereading: <BookOpen size={20} color="#F59E0B" />,
  preacher: <Mic size={20} color="#FF6596" />,
  vocalist: <Mic size={20} color="#8B6FE8" />,
  bassguitar: <Guitar size={20} color="#4D8BFF" />,
  drummer: <Drum size={20} color="#EF4444" />,
  piano: <Piano size={20} color="#10B981" />,
  electricguitar: <Guitar size={20} color="#F59E0B" />,
  kids: <GraduationCap size={20} color="#F59E0B" />,
  youth: <GraduationCap size={20} color="#4D8BFF" />,
  adults: <GraduationCap size={20} color="#10B981" />,
};

// Keep unused icon imports available for roleDetails lookup
const _UNUSED = { BookOpen, Hand, HandCoins, Heart, Star, Settings, Shield, Music, Mic, Monitor, Guitar, Drum, Piano, GraduationCap, Users };
void _UNUSED;

const ICON_COMPONENTS: Record<string, any> = {
  Users, Shield, Mic, Monitor, BookOpen, Guitar, Drum, Piano,
  GraduationCap, Music, Heart, Star, Settings, Hand, HandCoins, PrayingHands,
};

// Maps icon background tint → icon accent color (mirrors AssignMinistriesModal logic)
const ICON_COLORS: Record<string, string> = {
  '#E0E7FF': '#818CF8',
  '#E8F0FF': '#4D8BFF',
  '#F3F4F6': '#6B7280',
  '#FFE8F0': '#FF6596',
  '#FEF3C7': '#F59E0B',
  '#FEE2E2': '#EF4444',
  '#D1FAE5': '#10B981',
  '#F3EEFF': '#8B6FE8',
};

export interface AssignmentCardProps {
  assignment: MinistryAssignment;
  onPress: () => void;
}

export function AssignmentCard({ assignment, onPress }: AssignmentCardProps) {
  const roleId = assignment.roleName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Look up ministry to get roleDetails — same approach as MinistryDutyCard
  const ministries = useMinistryStore((s) => s.ministries);
  const ministry = ministries.find((m) => m.id === assignment.ministryId);
  const customDetails = ministry?.roleDetails?.[assignment.roleName];

  // customDetails.color is the BG tint; derive accent from ICON_COLORS map
  const iconBg = customDetails?.color || ROLE_ICON_BG[roleId] || '#F3F4F6';
  const color  = ICON_COLORS[iconBg] || ROLE_COLOR[roleId] || '#6B7280';

  let iconNode: React.ReactNode;
  const iconName = customDetails?.icon;
  if (iconName && ICON_COMPONENTS[iconName]) {
    const Comp = ICON_COMPONENTS[iconName];
    iconNode = <Comp size={20} color={color} />;
  } else {
    iconNode = ROLE_ICONS[roleId] ?? <Users size={20} color="#999" />;
  }

  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 15, bounciness: 12 }).start();

  const statusNorm = (assignment.status ?? '').toLowerCase();
  const isPending = statusNorm === 'pending';
  const isConfirmed = statusNorm === 'confirmed';
  const isDeclined = statusNorm === 'declined';
  const isCompleted = statusNorm === 'completed';
  const isCancelled = statusNorm === 'cancelled';

  const statusLabel = isPending
    ? 'Awaiting Response'
    : isConfirmed
    ? 'Confirmed'
    : isDeclined
    ? 'Declined'
    : isCompleted
    ? 'Completed'
    : isCancelled
    ? 'Cancelled'
    : assignment.status;

  const statusColor = isPending
    ? '#F59E0B'
    : isConfirmed
    ? '#22C55E'
    : isDeclined
    ? '#EF4444'
    : isCompleted
    ? '#6B7280'
    : isCancelled
    ? '#9CA3AF'
    : '#6B7280';

  const statusBg = isPending
    ? '#FFF8E7'
    : isConfirmed
    ? '#ECFDF5'
    : isDeclined
    ? '#FEF2F2'
    : '#F3F4F6';

  const formattedDate = (() => {
    try {
      const raw = assignment.eventDate;
      const d = raw?.length === 10 ? new Date(`${raw}T00:00:00`) : new Date(raw);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return assignment.eventDate ?? '';
    }
  })();

  return (
    <DebouncedTouchable onPress={onPress} activeOpacity={1} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View style={[cs.card, (isDeclined || isCancelled) && cs.cardMuted, { transform: [{ scale }] }]}>
      <LinearGradient
        colors={[`${color}18`, `${color}06`] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={cs.header}
      >
        <View style={[cs.iconBox, { backgroundColor: iconBg }]}>{iconNode}</View>
        <View style={cs.headerInfo}>
          <Text style={cs.roleLabel} numberOfLines={1}>
            {assignment.roleName}
          </Text>
          <View style={[cs.statusPill, { backgroundColor: statusBg }]}>
            <View style={[cs.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[cs.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        {isPending && (
          <View style={cs.pendingBadge}>
            <Text style={cs.pendingBadgeText}>Action needed</Text>
          </View>
        )}
        <ChevronRight size={16} color="#9CA3AF" />
      </LinearGradient>

      <View style={cs.body}>
        <Text style={cs.eventName} numberOfLines={1}>
          {assignment.eventName}
        </Text>
        <Text style={cs.ministryName} numberOfLines={1}>
          {assignment.ministryName}
        </Text>
        <View style={cs.metaRow}>
          <CalendarDays size={11} color="#9CA3AF" />
          <Text style={cs.metaText}>{formattedDate}</Text>
          {assignment.callTime ? (
            <>
              <View style={cs.metaDot} />
              <Clock size={11} color="#9CA3AF" />
              <Text style={cs.metaText}>Call: {assignment.callTime}</Text>
            </>
          ) : null}
          {assignment.eventLocation ? (
            <>
              <View style={cs.metaDot} />
              <MapPin size={11} color="#9CA3AF" />
              <Text style={cs.metaText} numberOfLines={1}>
                {assignment.eventLocation}
              </Text>
            </>
          ) : null}
        </View>
      </View>

      {isConfirmed && (
        <View style={cs.confirmedBanner}>
          <Check size={12} color="#22C55E" strokeWidth={3} />
          <Text style={cs.confirmedBannerText}>You confirmed this assignment</Text>
        </View>
      )}
      </Animated.View>
    </DebouncedTouchable>
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
  },
  cardMuted: { opacity: 0.65 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerInfo: { flex: 1, gap: 5 },
  roleLabel: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: '#1F2937',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.1 },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  pendingBadgeText: { fontSize: 9, fontWeight: '700', color: '#D97706' },
  body: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 3,
  },
  eventName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.1,
  },
  ministryName: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  metaText: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D5DB',
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#D1FAE5',
  },
  confirmedBannerText: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600',
  },
});
