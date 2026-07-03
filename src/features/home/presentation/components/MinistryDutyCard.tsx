/**
 * MinistryDutyCard
 *
 * Displays a single ministerial duty assignment for the current user.
 * - Gradient header tinted by role identity color
 * - Status pill (Awaiting Response / Confirmed / Declined)
 * - Body: event name + date · time · location meta row
 * - Collapsible action row (Decline / Confirm) for pending duties only
 * - Smooth Reanimated height + opacity collapse animation
 */
import { LinearGradient } from 'expo-linear-gradient';
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Drum,
  GraduationCap,
  Guitar,
  MapPin,
  Mic,
  Monitor,
  Piano,
  Users,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { Schedule } from '../../../../features/schedule/domain/schedule.types';
import type { MinistryAssignment } from '../../../../features/ministry/domain/ministry.types';

// ─── Role identity maps ───────────────────────────────────────────────────────
// Each role has a distinct color, icon, and background used throughout the card.

const ROLE_COLOR: Record<string, string> = {
  openingPrayer:        '#8B6FE8',
  tithesOfferingPrayer: '#4D8BFF',
  techAudio:            '#6B7280',
  presider:             '#FF6596',
  scriptureReading:     '#F59E0B',
  preacher:             '#FF6596',
  vocalist:             '#8B6FE8',
  bassGuitar:           '#4D8BFF',
  drummer:              '#EF4444',
  piano:                '#10B981',
  electricGuitar:       '#F59E0B',
  sundaySchoolKids:     '#F59E0B',
  sundaySchoolYouth:    '#4D8BFF',
  sundaySchoolAdults:   '#10B981',
};

const ROLE_ICON_BG: Record<string, string> = {
  openingPrayer:        '#F3EEFF',
  tithesOfferingPrayer: '#E8F0FF',
  techAudio:            '#F3F4F6',
  presider:             '#FFE8F0',
  scriptureReading:     '#FEF3C7',
  preacher:             '#FFE8F0',
  vocalist:             '#F3EEFF',
  bassGuitar:           '#E8F0FF',
  drummer:              '#FEE2E2',
  piano:                '#D1FAE5',
  electricGuitar:       '#FEF3C7',
  sundaySchoolKids:     '#FEF3C7',
  sundaySchoolYouth:    '#E8F0FF',
  sundaySchoolAdults:   '#D1FAE5',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  openingPrayer:        <Users size={20} color="#8B6FE8" />,
  tithesOfferingPrayer: <BookOpen size={20} color="#4D8BFF" />,
  techAudio:            <Monitor size={20} color="#6B7280" />,
  presider:             <Users size={20} color="#FF6596" />,
  scriptureReading:     <BookOpen size={20} color="#F59E0B" />,
  preacher:             <Mic size={20} color="#FF6596" />,
  vocalist:             <Mic size={20} color="#8B6FE8" />,
  bassGuitar:           <Guitar size={20} color="#4D8BFF" />,
  drummer:              <Drum size={20} color="#EF4444" />,
  piano:                <Piano size={20} color="#10B981" />,
  electricGuitar:       <Guitar size={20} color="#F59E0B" />,
  sundaySchoolKids:     <GraduationCap size={20} color="#F59E0B" />,
  sundaySchoolYouth:    <GraduationCap size={20} color="#4D8BFF" />,
  sundaySchoolAdults:   <GraduationCap size={20} color="#10B981" />,
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MinistryDutyCardProps {
  assignment: MinistryAssignment;
  schedule: Schedule;
  /** Called when the user confirms their attendance. */
  onConfirm: () => Promise<void>;
  /** Called after the user confirms the decline prompt. */
  onDecline: () => Promise<void>;
  /** True while the confirm/decline action is in flight. */
  saving: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MinistryDutyCard({
  assignment,
  schedule,
  onConfirm,
  onDecline,
  saving,
}: MinistryDutyCardProps) {
  // Resolve role identity
  const roleName = assignment.roleName;
  const roleId = roleName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const roleLabel = roleName;
  const icon      = ROLE_ICONS[roleId];
  const iconBg    = ROLE_ICON_BG[roleId] ?? '#F3F4F6';
  const color     = ROLE_COLOR[roleId] ?? '#FF6596';

  // Duty status flags
  const isPending  = assignment.status === 'Pending';
  const isAccepted = assignment.status === 'Confirmed';
  const isDeclined = assignment.status === 'Declined';

  // Status display values
  const statusLabel = isPending ? 'Awaiting Response' : isAccepted ? 'Confirmed' : 'Declined';
  const statusColor = isPending ? '#F59E0B' : isAccepted ? '#22C55E' : '#EF4444';
  const statusBg    = isPending ? '#FFF8E7' : isAccepted ? '#ECFDF5' : '#FEF2F2';

  // Collapsible action row — pending cards start expanded so user notices the action needed
  const [expanded, setExpanded] = useState(isPending);
  const collapseAnim = useSharedValue(isPending ? 1 : 0);

  const toggle = () => {
    if (!isPending) return;
    const next = !expanded;
    setExpanded(next);
    collapseAnim.value = withTiming(next ? 1 : 0, { duration: 220 });
  };

  const collapseStyle = useAnimatedStyle(() => ({
    opacity: collapseAnim.value,
    maxHeight: collapseAnim.value * 200,
    overflow: 'hidden',
  }));

  // Format schedule date for display
  const formattedDate = new Date(`${schedule.date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const handleDeclinePress = () => {
    Alert.alert(
      'Decline Duty',
      `Decline "${roleLabel}" for ${schedule.title}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Decline', style: 'destructive', onPress: onDecline },
      ]
    );
  };

  return (
    <View style={[cs.card, { shadowColor: color }, isDeclined && cs.cardDeclined]}>

      {/* ── Header: tinted gradient with role icon, title, status, chevron ── */}
      <TouchableOpacity onPress={toggle} activeOpacity={isPending ? 0.8 : 1}>
        <LinearGradient
          colors={[`${color}18`, `${color}06`] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={cs.header}
        >
          <View style={[cs.iconBox, { backgroundColor: iconBg }]}>
            {icon ?? <Users size={20} color="#999" />}
          </View>

          <View style={cs.headerInfo}>
            <Text style={cs.roleLabel} numberOfLines={1}>{roleLabel}</Text>
            <View style={[cs.statusPill, { backgroundColor: statusBg }]}>
              <View style={[cs.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[cs.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          {isPending && (
            <View style={cs.chevronWrap}>
              {expanded
                ? <ChevronUp size={15} color="#9CA3AF" />
                : <ChevronDown size={15} color="#9CA3AF" />}
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* ── Body: event name + date · time · location ── */}
      <View style={cs.body}>
        <Text style={cs.eventName} numberOfLines={1}>{schedule.title}</Text>
        <View style={cs.metaRow}>
          <CalendarDays size={11} color="#9CA3AF" />
          <Text style={cs.metaText}>{formattedDate}</Text>
          <View style={cs.metaDivider} />
          <Clock size={11} color="#9CA3AF" />
          <Text style={cs.metaText}>{schedule.time}</Text>
          {schedule.location ? (
            <>
              <View style={cs.metaDivider} />
              <MapPin size={11} color="#9CA3AF" />
              <Text style={cs.metaText} numberOfLines={1}>{schedule.location}</Text>
            </>
          ) : null}
        </View>
      </View>

      {/* ── Collapsible action row: visible only for pending duties ── */}
      {isPending && (
        <Animated.View style={[cs.actionWrap, collapseStyle]}>
          <View style={cs.actionRow}>
            <TouchableOpacity
              style={cs.declineBtn}
              onPress={handleDeclinePress}
              disabled={saving}
              activeOpacity={0.7}
            >
              <X size={13} color="#F87171" strokeWidth={2.5} />
              <Text style={cs.declineBtnText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[cs.confirmBtn, saving && cs.btnDisabled]}
              onPress={onConfirm}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : (
                  <>
                    <Check size={13} color="#fff" strokeWidth={2.5} />
                    <Text style={cs.confirmBtnText}>Confirm</Text>
                  </>
                )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* ── Declined banner ── */}
      {isDeclined && (
        <View style={cs.declinedBanner}>
          <Text style={cs.declinedBannerText}>Leader notified · Replacement needed</Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cs = StyleSheet.create({
  // Card shell
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
    overflow: 'hidden',
  },
  cardDeclined: {
    opacity: 0.65,
  },

  // Header zone
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
  headerInfo: {
    flex: 1,
    gap: 5,
  },
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
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  chevronWrap: {
    alignSelf: 'center',
    flexShrink: 0,
  },

  // Body zone
  body: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 6,
  },
  eventName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 2,
  },

  // Action row (pending only, animated collapse)
  actionWrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF1F1',
  },
  declineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F87171',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  // Declined banner
  declinedBanner: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
  },
  declinedBannerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
    textAlign: 'center',
  },
});
