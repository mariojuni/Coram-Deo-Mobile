import { ministryRepository } from '@/features/ministry/data/ministry.repository';
import { DeclineModal } from '@/features/serve/presentation/components/DeclineModal';
import { useAuthStore } from '@/store/useAuthStore';
import { useMinistryStore } from '@/store/useMinistryStore';
import { useWorshipSetlist } from '@/features/worship/presentation/hooks/useWorshipSetlist';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    AlertCircle,
    ArrowLeft,
    CalendarDays,
    Check,
    Clock,
    FileText,
    MapPin,
    User,
    X,
    Music,
    ChevronRight
} from 'lucide-react-native';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ServeAssignmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userProfile = useAuthStore((s) => s.userProfile);
  const memberAssignments = useMinistryStore((s) => s.memberAssignments);

  const assignment = memberAssignments.find((a) => a.id === id);

  const [confirmingSaving, setConfirmingSaving] = useState(false);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { setlist, loading: setlistLoading } = useWorshipSetlist(
    userProfile?.churchId,
    assignment?.eventId
  );

  if (!assignment) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.notFound}>
          <AlertCircle size={48} color="#EF4444" />
          <Text style={styles.notFoundTitle}>Assignment not found</Text>
          <Text style={styles.notFoundText}>
            This assignment may have been removed or is no longer available.
          </Text>
        </View>
      </View>
    );
  }

  // Security: member can only act on their own assignment
  const isOwnAssignment = assignment.memberId === userProfile?.memberId;

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
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return assignment.eventDate ?? '';
    }
  })();

  const handleConfirm = async () => {
    if (!isOwnAssignment) {
      Alert.alert('Not Allowed', 'You can only confirm your own assignments.');
      return;
    }
    setConfirmingSaving(true);
    try {
      await ministryRepository.updateAssignment(assignment.id, {
        status: 'Confirmed',
        confirmedAt: new Date().toISOString(),
        confirmedBy: userProfile?.uid ?? userProfile?.memberId ?? '',
      });
      setActionSuccess('Assignment confirmed.');
    } catch (e) {
      Alert.alert('Error', 'Could not confirm assignment. Please try again.');
    } finally {
      setConfirmingSaving(false);
    }
  };

  const handleDecline = async (reason?: string) => {
    if (!isOwnAssignment) {
      Alert.alert('Not Allowed', 'You can only decline your own assignments.');
      return;
    }
    await ministryRepository.updateAssignment(assignment.id, {
      status: 'Declined',
      declinedAt: new Date().toISOString(),
      ...(reason ? { declineReason: reason } : {}),
    });
    setActionSuccess('Assignment declined.');
  };

  return (
    <View style={[styles.screen, { backgroundColor: '#F7F8FC' }]}>
      {/* ─── Header ─── */}
      <LinearGradient
        colors={['#FFE8F1', '#F5F2FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 20) }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Assignment</Text>

        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Success banner ─── */}
        {actionSuccess ? (
          <View style={styles.successBanner}>
            <Check size={16} color="#22C55E" strokeWidth={3} />
            <Text style={styles.successText}>{actionSuccess}</Text>
          </View>
        ) : null}

        {/* ─── Event info ─── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Event</Text>
          <Text style={styles.cardValue}>{assignment.eventName}</Text>
          <Row icon={<CalendarDays size={14} color="#6B7280" />} text={formattedDate} />
          {assignment.eventLocation ? (
            <Row icon={<MapPin size={14} color="#6B7280" />} text={assignment.eventLocation} />
          ) : null}
          
          {setlist && (
            <TouchableOpacity 
              style={styles.setlistLinkBtn}
              onPress={() => router.push({ pathname: '/serve-worship-setlist', params: { eventId: assignment.eventId } } as any)}
            >
              <View style={styles.setlistLinkContent}>
                <Music size={16} color="#FF6596" />
                <Text style={styles.setlistLinkText}>View Worship Setlist</Text>
              </View>
              <ChevronRight size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* ─── Ministry & Role ─── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Ministry & Role</Text>
          <Text style={styles.cardValue}>{assignment.ministryName}</Text>
          <Row icon={<User size={14} color="#6B7280" />} text={`Role: ${assignment.roleName}`} />
          {assignment.callTime ? (
            <Row icon={<Clock size={14} color="#6B7280" />} text={`Call time: ${assignment.callTime}`} />
          ) : null}
        </View>

        {/* ─── Notes ─── */}
        {assignment.notes ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Notes from Leader</Text>
            <Row icon={<FileText size={14} color="#6B7280" />} text={assignment.notes} />
          </View>
        ) : null}

        {/* ─── Decline reason (if declined) ─── */}
        {isDeclined && assignment.declineReason ? (
          <View style={[styles.card, styles.cardDeclined]}>
            <Text style={styles.cardLabel}>Decline Reason</Text>
            <Text style={styles.cardBodyText}>{assignment.declineReason}</Text>
          </View>
        ) : null}

        {/* ─── Actions ─── */}
        {isOwnAssignment && isPending && !actionSuccess ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => setDeclineModalOpen(true)}
              disabled={confirmingSaving}
              activeOpacity={0.7}
            >
              <X size={16} color="#EF4444" strokeWidth={2.5} />
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              disabled={confirmingSaving}
              activeOpacity={0.85}
              style={{ flex: 1 }}
            >
              <LinearGradient
                colors={['#FF6596', '#B66DFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmBtn}
              >
                {confirmingSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Check size={16} color="#fff" strokeWidth={2.5} />
                    <Text style={styles.confirmBtnText}>Confirm</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : null}

        {isConfirmed && !actionSuccess ? (
          <View style={styles.confirmedState}>
            <Check size={20} color="#22C55E" strokeWidth={3} />
            <Text style={styles.confirmedStateText}>
              You've confirmed this assignment. See you there!
            </Text>
          </View>
        ) : null}

        {isDeclined && !actionSuccess ? (
          <View style={styles.declinedState}>
            <X size={20} color="#EF4444" strokeWidth={2.5} />
            <Text style={styles.declinedStateText}>
              You've declined this assignment. Your leader has been notified.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <DeclineModal
        isOpen={declineModalOpen}
        onClose={() => setDeclineModalOpen(false)}
        onConfirm={handleDecline}
        assignmentTitle={`${assignment.roleName} — ${assignment.eventName}`}
      />
    </View>
  );
}

function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.row}>
      {icon}
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 6,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },

  content: {
    padding: 24,
    gap: 12,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  successText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16A34A',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  setlistLinkBtn: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  setlistLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setlistLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6596',
  },
  cardDeclined: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  cardBodyText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  rowText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  declineBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 16,
    paddingVertical: 16,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  confirmedState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  confirmedStateText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#16A34A',
    lineHeight: 20,
  },
  declinedState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  declinedStateText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    lineHeight: 20,
  },

  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  notFoundText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
