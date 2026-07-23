import React, { useState } from 'react';
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
import { BlurView } from 'expo-blur';
import { CheckCircle2, User, X, XCircle } from 'lucide-react-native';
import AppModal from '@/components/ui/AppModal';
import { BounceCard } from '@/components/ui/BounceCard';
import { SoftCard, getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import type { MinistryApplication } from '@/features/ministry/domain/ministry.types';
import { ministryApplicationService } from '@/features/ministry/services/ministryApplicationService';
import { canReviewMobileMinistryApplication } from '@/permissions/mobileMinistryApplicationPermissions';
import { useAuthStore } from '@/store/useAuthStore';
import { useMemberStore } from '@/store/useMemberStore';
import { useUIStore } from '@/store/useUIStore';
import { formatMemberName } from '@/features/member/domain/member.utils';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MinistryApplicationDetailModalProps {
  application: MinistryApplication | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MinistryApplicationDetailModal({
  application,
  isOpen,
  onClose,
}: MinistryApplicationDetailModalProps) {
  const insets = useSafeAreaInsets();
  const userProfile = useAuthStore((s) => s.userProfile);
  const members = useMemberStore((s) => s.members);
  const setSyncToastMessage = useUIStore((s) => s.setSyncToastMessage);

  const [actionLoading, setActionLoading] = useState(false);
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  if (!application) return null;

  const canReview = canReviewMobileMinistryApplication(userProfile, application);

  const getApplicantName = () => {
    const member = members.find(
      (m) =>
        m.id === application.memberId ||
        m.accountId === application.userId ||
        m.authUid === application.userId ||
        m.id === application.userId
    );
    if (member) {
      const formatted = formatMemberName(member);
      if (formatted && formatted !== 'Unnamed Member') return formatted;
    }
    return formatMemberName({ name: application.applicantName }) || 'Applicant';
  };

  const applicantName = getApplicantName();

  const handleApprove = async () => {
    if (!userProfile) return;
    Alert.alert(
      'Approve Application',
      `Approve ${applicantName} for ${application.ministryName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setActionLoading(true);
            try {
              const reviewerName =
                [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') || 'Staff';
              await ministryApplicationService.approveMinistryApplication(application, userProfile, {
                reviewedBy: reviewerName,
              });
              setSyncToastMessage('Application approved. The member has been added to the ministry.');
              onClose();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to approve application.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeclineSubmit = async () => {
    if (!userProfile) return;
    if (!declineReason.trim()) {
      Alert.alert('Required', 'Please enter a decline reason.');
      return;
    }
    setActionLoading(true);
    try {
      const reviewerName =
        [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') || 'Staff';
      await ministryApplicationService.declineMinistryApplication(application, userProfile, {
        reviewedBy: reviewerName,
        declineReason: declineReason.trim(),
      });
      setDeclineModalVisible(false);
      setSyncToastMessage('Application declined.');
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to decline application.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <AppModal
        isOpen={isOpen}
        onClose={onClose}
        title="Application Details"
        hideHeader={true}
        hideDragHandle={true}
        containerStyle={{ paddingHorizontal: 0, paddingBottom: 0 }}
      >
        <View style={styles.modalContainer}>
          {/* ─── Header (Matching EventDetailsModal pattern) ───────────────── */}
          <View style={[styles.headerContainer, { paddingTop: 12 }]} pointerEvents="box-none">
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]}
              pointerEvents="none"
            />
            <View style={styles.dragHandle} />
            <View style={styles.headerContent}>
              <View style={styles.headerCirclePlaceholder} />
              <Text style={styles.headerTitle} numberOfLines={1}>
                Application Details
              </Text>
              <BounceCard
                bounceScale={0.85}
                style={styles.headerCircle}
                onPress={onClose}
                hitSlop={8}
                activeOpacity={0.8}
              >
                <X size={24} color="#111827" strokeWidth={2} />
              </BounceCard>
            </View>
          </View>

          {/* ─── Scroll Content ────────────────────────────────────────── */}
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingTop: 70 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.contentWrap}>
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
                  <Text style={styles.applicantName}>{applicantName}</Text>
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
                  {application.preferredRoleNames?.length
                    ? application.preferredRoleNames.join(', ')
                    : 'None specified'}
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
                  {application.submittedAt
                    ? new Date(application.submittedAt).toLocaleString()
                    : 'N/A'}
                </Text>
              </SoftCard>

              {/* Review Notes or Decline Reason if existing */}
              {application.status !== 'pending' && (
                <SoftCard innerStyle={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Review Info</Text>
                  <Text style={styles.sectionValue}>
                    Reviewed by: {application.reviewedBy || 'Staff'}
                  </Text>
                  <Text style={styles.sectionValue}>
                    Reviewed at:{' '}
                    {application.reviewedAt
                      ? new Date(application.reviewedAt).toLocaleString()
                      : 'N/A'}
                  </Text>
                  {application.status === 'declined' && application.declineReason ? (
                    <>
                      <Text style={styles.sectionTitle}>Decline Reason</Text>
                      <Text style={[styles.sectionValue, { color: '#DC2626' }]}>
                        {application.declineReason}
                      </Text>
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
                    <CheckCircle2 size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.approveBtnText}>Approve Application</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </AppModal>

      {/* Decline Reason Inner Modal */}
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
    </>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: '#FAFAFA',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: 6,
  },
  headerContent: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerCirclePlaceholder: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  headerCircle: {
    ...getTopBarButtonShadowStyle(20),
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  contentWrap: {
    padding: 16,
    gap: 16,
  },
  profileCard: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
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
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusApproved: { backgroundColor: '#D1FAE5' },
  statusDeclined: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 11, fontWeight: '800' },
  statusTextPending: { color: '#D97706' },
  statusTextApproved: { color: '#059669' },
  statusTextDeclined: { color: '#DC2626' },
  sectionCard: { padding: 16, backgroundColor: '#fff', borderRadius: 16, gap: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
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
    color: '#111827',
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  modalSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#DC2626',
  },
  modalSubmitText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
