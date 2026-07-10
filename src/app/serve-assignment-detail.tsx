import { ministryRepository } from '@/features/ministry/data/ministry.repository';
import { DeclineModal } from '@/features/serve/presentation/components/DeclineModal';
import { useAuthStore } from '@/store/useAuthStore';
import { useMinistryStore } from '@/store/useMinistryStore';
import { useWorshipSetlist } from '@/features/worship/presentation/hooks/useWorshipSetlist';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
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
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
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
  
  const scrollY = useRef(new Animated.Value(0)).current;

  const { setlist } = useWorshipSetlist(
    userProfile?.churchId || undefined,
    assignment?.eventId || undefined
  );

  if (!assignment) {
    return (
      <View style={[styles.screen, { backgroundColor: '#FAFAFA' }]}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#1a1a1a" />
          </TouchableOpacity>
        </View>
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

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerHeight = Math.max(insets.top, 20) + 60;

  return (
    <View style={styles.screen}>
      {/* ─── Animated Blur Header ─── */}
      <View style={[styles.header, { height: headerHeight }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: headerOpacity }]} pointerEvents="none">
          <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.75)' }]} />
          {/* Gradient accent line */}
          <View style={styles.accentLine}>
            <LinearGradient
              colors={['#FF6596', '#B66DFF', '#6DC8FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
          {/* subtle bottom border that fades in */}
          <View style={styles.headerBorder} />
        </Animated.View>

        <View style={[styles.headerContent, { paddingTop: Math.max(insets.top, 20) }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <ArrowLeft size={22} color="#1a1a1a" />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView
        contentContainerStyle={[styles.content, { paddingTop: headerHeight + 10, paddingBottom: isOwnAssignment && isPending ? insets.bottom + 120 : insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* ─── Hero Section ─── */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={['#FFE8F1', '#F5F2FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          
          <View style={styles.heroTitles}>
            <Text style={styles.heroEventName}>{assignment.eventName}</Text>
            <Text style={styles.heroMinistryName}>{assignment.ministryName}</Text>
          </View>
          
          {/* Decorative background circle */}
          <View style={styles.heroDecoCircle} />
        </View>

        {/* ─── Success banner ─── */}
        {actionSuccess && (
          <View style={styles.successBanner}>
            <Check size={20} color="#059669" strokeWidth={3} />
            <Text style={styles.successText}>{actionSuccess}</Text>
          </View>
        )}
        
        {isConfirmed && !actionSuccess && (
          <View style={styles.confirmedBanner}>
            <Check size={20} color="#059669" strokeWidth={3} />
            <Text style={styles.confirmedBannerText}>
              You've confirmed this assignment. See you there!
            </Text>
          </View>
        )}

        {isDeclined && !actionSuccess && (
          <View style={styles.declinedBanner}>
            <X size={20} color="#DC2626" strokeWidth={3} />
            <Text style={styles.declinedBannerText}>
              You've declined this assignment.
            </Text>
          </View>
        )}

        {/* ─── Info Section ─── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Role Details</Text>
          
          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: '#F3EEFF' }]}>
              <User size={20} color="#8B6FE8" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Assigned Role</Text>
              <Text style={styles.infoValue}>{assignment.roleName}</Text>
            </View>
          </View>
          
          {assignment.callTime ? (
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: '#FEF3C7' }]}>
                <Clock size={20} color="#F59E0B" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Call Time</Text>
                <Text style={styles.infoValue}>{assignment.callTime}</Text>
              </View>
            </View>
          ) : null}
          
          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: '#E8F0FF' }]}>
              <CalendarDays size={20} color="#4D8BFF" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{formattedDate}</Text>
            </View>
          </View>

          {assignment.eventLocation ? (
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: '#D1FAE5' }]}>
                <MapPin size={20} color="#10B981" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{assignment.eventLocation}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* ─── Worship Setlist Link ─── */}
        {setlist && (
          <TouchableOpacity 
            style={styles.setlistLinkBtn}
            onPress={() => router.push({ pathname: '/serve-worship-setlist', params: { eventId: assignment.eventId } } as any)}
            activeOpacity={0.8}
          >
            <View style={styles.setlistLinkContent}>
              <View style={styles.setlistIconWrap}>
                <Music size={22} color="#fff" />
              </View>
              <View style={styles.setlistTextWrap}>
                <Text style={styles.setlistLinkTitle}>Worship Setlist</Text>
                <Text style={styles.setlistLinkSub}>View songs for this event</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}

        {/* ─── Notes ─── */}
        {assignment.notes ? (
          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <FileText size={18} color="#6B7280" />
              <Text style={styles.sectionTitle}>Notes from Leader</Text>
            </View>
            <Text style={styles.notesText}>{assignment.notes}</Text>
          </View>
        ) : null}

        {/* ─── Decline reason (if declined) ─── */}
        {isDeclined && assignment.declineReason ? (
          <View style={[styles.card, styles.cardDeclined]}>
            <Text style={[styles.sectionTitle, { color: '#991B1B', marginBottom: 8 }]}>Decline Reason</Text>
            <Text style={styles.declinedText}>{assignment.declineReason}</Text>
          </View>
        ) : null}
        
      </Animated.ScrollView>

      {/* ─── Sticky Footer Actions ─── */}
      {isOwnAssignment && isPending && !actionSuccess ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.85)' }]} pointerEvents="none" />
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => setDeclineModalOpen(true)}
              disabled={confirmingSaving}
              activeOpacity={0.7}
            >
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
                    <Check size={20} color="#fff" strokeWidth={3} />
                    <Text style={styles.confirmBtnText}>Confirm</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <DeclineModal
        isOpen={declineModalOpen}
        onClose={() => setDeclineModalOpen(false)}
        onConfirm={handleDecline}
        assignmentTitle={`${assignment.roleName} — ${assignment.eventName}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFA' },
  
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
  },
  headerBorder: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  accentLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 3,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  
  content: {
    padding: 20,
    gap: 16,
  },
  
  heroCard: {
    borderRadius: 28,
    padding: 24,
    paddingBottom: 28,
    overflow: 'hidden',
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
  },
  heroDecoCircle: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  heroTitles: {
    marginTop: 16,
    gap: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  heroEventName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1a1a1a',
    letterSpacing: -1,
    lineHeight: 36,
  },
  heroMinistryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: -0.3,
  },

  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    padding: 20,
  },
  confirmedBannerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  
  declinedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    padding: 20,
  },
  declinedBannerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 2,
  },
  notesCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.3,
  },

  setlistLinkBtn: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 2,
  },
  setlistLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  setlistIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF6596',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setlistTextWrap: {
    gap: 4,
  },
  setlistLinkTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  setlistLinkSub: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  notesText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
  },

  cardDeclined: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  declinedText: {
    fontSize: 16,
    color: '#991B1B',
    lineHeight: 24,
  },

  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingTop: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actions: {
    flexDirection: 'row',
    gap: 14,
  },
  declineBtn: {
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4B5563',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 24,
    paddingVertical: 18,
  },
  confirmBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },

  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  notFoundTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1F2937',
  },
  notFoundText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});

