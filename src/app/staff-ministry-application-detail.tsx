import { useAuthStore } from '@/store/useAuthStore';
import { useMemberStore } from '@/store/useMemberStore';
import { BounceCard } from '@/components/ui/BounceCard';
import { SoftCard } from '@/components/ui/SoftCard';
import { useUIStore } from '@/store/useUIStore';
import type { MinistryApplication } from '@/features/ministry/domain/ministry.types';
import { ministryApplicationService } from '@/features/ministry/services/ministryApplicationService';
import { canReviewMobileMinistryApplication } from '@/permissions/mobileMinistryApplicationPermissions';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  User,
  XCircle,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatMemberName } from '@/features/member/domain/member.utils';

export default function StaffMinistryApplicationDetailScreen() {
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userProfile = useAuthStore((s) => s.userProfile);
  const members = useMemberStore((s) => s.members);
  const setSyncToastMessage = useUIStore((s) => s.setSyncToastMessage);

  const [application, setApplication] = useState<MinistryApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const getApplicantName = (app: MinistryApplication | null) => {
    if (!app) return 'Applicant';
    const member = members.find(
      (m) =>
        m.id === app.memberId ||
        m.accountId === app.userId ||
        m.authUid === app.userId ||
        m.id === app.userId
    );
    if (member) {
      const formatted = formatMemberName(member);
      if (formatted && formatted !== 'Unnamed Member') return formatted;
    }
    return formatMemberName({ name: app.applicantName }) || 'Applicant';
  };

  useEffect(() => {
    if (!userProfile || !applicationId) return;
    setLoading(true);
    const unsubscribe = ministryApplicationService.subscribeToStaffMinistryApplications(
      userProfile,
      (apps) => {
        const found = apps.find((a) => a.id === applicationId);
        setApplication(found || null);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [userProfile, applicationId]);

  const canReview = canReviewMobileMinistryApplication(userProfile, application);

  const handleApprove = async () => {
    if (!application || !userProfile) return;
    Alert.alert('Approve Application', `Approve ${application.applicantName || 'applicant'} for ${application.ministryName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setActionLoading(true);
          try {
            const reviewerName = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') || 'Staff';
            await ministryApplicationService.approveMinistryApplication(application, userProfile, {
              reviewedBy: reviewerName,
            });
            setSyncToastMessage('Application approved. The member has been added to the ministry.');
            router.back();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to approve application.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleDeclineSubmit = async () => {
    if (!application || !userProfile) return;
    if (!declineReason.trim()) {
      Alert.alert('Required', 'Please enter a decline reason.');
      return;
    }
    setActionLoading(true);
    try {
      const reviewerName = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') || 'Staff';
      await ministryApplicationService.declineMinistryApplication(application, userProfile, {
        reviewedBy: reviewerName,
        declineReason: declineReason.trim(),
      });
      setDeclineModalVisible(false);
      setSyncToastMessage('Application declined.');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to decline application.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color="#FF6596" />
      </View>
    );
  }

  if (!application) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.errorText}>Application not found or access denied.</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <LinearGradient
        colors={['#FFE8F1', '#F5F2FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}
      >
        <BounceCard bounceScale={0.85} style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#1a1a1a" />
        </BounceCard>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Application Details</Text>
          <Text style={styles.headerSubtitle}>{application.ministryName}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Applicant Header Card */}
        <SoftCard innerStyle={styles.profileCard}>
          {application.applicantPhotoUrl ? (
            <Image source={{ uri: application.applicantPhotoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <User size={32} color="#6B7280" />
            </View>
          )}
          <View style={styles.profileDetails}>
            <Text style={styles.applicantName}>{getApplicantName(application)}</Text>
            <Text style={styles.ministryText}>Applied for: {application.ministryName}</Text>
            <View
              style={[
                styles.statusBadge,
                application.status === 'pending' && styles.statusPending,
                application.status === 'approved' && styles.statusApproved,
                application.status === 'declined' && styles.statusDeclined,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  application.status === 'pending' && styles.statusTextPending,
                  application.status === 'approved' && styles.statusTextApproved,
                  application.status === 'declined' && styles.statusTextDeclined,
                ]}
              >
                {application.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </SoftCard>

        {/* Application Details */}
        <SoftCard innerStyle={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Preferred Roles</Text>
          <Text style={styles.sectionValue}>
            {application.preferredRoleNames?.length ? application.preferredRoleNames.join(', ') : 'None specified'}
          </Text>

          <Text style={styles.sectionTitle}>Reason for Joining</Text>
          <Text style={styles.sectionValue}>{application.reasonForJoining || 'N/A'}</Text>

          <Text style={styles.sectionTitle}>Experience</Text>
          <Text style={styles.sectionValue}>{application.experience || 'N/A'}</Text>

          <Text style={styles.sectionTitle}>Availability</Text>
          <Text style={styles.sectionValue}>{application.availability || 'N/A'}</Text>

          {application.note ? (
            <>
              <Text style={styles.sectionTitle}>Additional Note</Text>
              <Text style={styles.sectionValue}>{application.note}</Text>
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Submitted Date</Text>
          <Text style={styles.sectionValue}>
            {application.submittedAt ? new Date(application.submittedAt).toLocaleString() : 'N/A'}
          </Text>
        </SoftCard>

        {/* Review Notes or Decline Reason if existing */}
        {application.status !== 'pending' && (
          <SoftCard innerStyle={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Review Info</Text>
            <Text style={styles.sectionValue}>Reviewed by: {application.reviewedBy || 'Staff'}</Text>
            <Text style={styles.sectionValue}>
              Reviewed at: {application.reviewedAt ? new Date(application.reviewedAt).toLocaleString() : 'N/A'}
            </Text>
            {application.status === 'declined' && application.declineReason ? (
              <>
                <Text style={styles.sectionTitle}>Decline Reason</Text>
                <Text style={[styles.sectionValue, { color: '#DC2626' }]}>{application.declineReason}</Text>
              </>
            ) : null}
            {application.reviewNote ? (
              <>
                <Text style={styles.sectionTitle}>Review Note</Text>
                <Text style={styles.sectionValue}>{application.reviewNote}</Text>
              </>
            ) : null}
          </SoftCard>
        )}

        {/* Action Buttons */}
        {application.status === 'pending' && canReview && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => {
                setDeclineReason('');
                setDeclineModalVisible(true);
              }}
              disabled={actionLoading}
            >
              <XCircle size={18} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.declineBtnText}>Decline Application</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.approveBtn}
              onPress={handleApprove}
              disabled={actionLoading}
            >
              <CheckCircle size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.approveBtnText}>Approve Application</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Decline Reason Modal */}
      <Modal visible={declineModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Decline Application</Text>
            <Text style={styles.modalSubtitle}>
              Please state why this application is being declined.
            </Text>
            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={3}
              placeholder="Decline reason..."
              placeholderTextColor="#9CA3AF"
              value={declineReason}
              onChangeText={setDeclineReason}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeclineModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleDeclineSubmit}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Decline</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  content: { padding: 16, gap: 16 },
  errorText: { fontSize: 16, color: '#6B7280', textAlign: 'center' },
  backLink: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#FF6596', borderRadius: 8 },
  backLinkText: { color: '#fff', fontWeight: '700' },
  profileCard: { padding: 16, backgroundColor: '#fff', borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDetails: { flex: 1, gap: 4 },
  applicantName: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  ministryText: { fontSize: 13, color: '#FF6596', fontWeight: '600' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusApproved: { backgroundColor: '#D1FAE5' },
  statusDeclined: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 11, fontWeight: '800' },
  statusTextPending: { color: '#D97706' },
  statusTextApproved: { color: '#059669' },
  statusTextDeclined: { color: '#DC2626' },
  sectionCard: { padding: 16, backgroundColor: '#fff', borderRadius: 16, gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  sectionValue: { fontSize: 14, color: '#1F2937', fontWeight: '500' },
  actionsRow: { gap: 12, marginTop: 8 },
  declineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 12,
  },
  declineBtnText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
  },
  approveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  modalSubtitle: { fontSize: 13, color: '#4B5563' },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  modalCancelBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  modalSubmitBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalSubmitText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
