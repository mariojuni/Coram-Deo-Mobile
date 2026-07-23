import { useAuthStore } from '@/store/useAuthStore';
import { useMemberStore } from '@/store/useMemberStore';
import { BounceCard } from '@/components/ui/BounceCard';
import { SoftCard, getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import { useUIStore } from '@/store/useUIStore';
import type { ApplicationStatus, MinistryApplication } from '@/features/ministry/domain/ministry.types';
import { ministryApplicationService } from '@/features/ministry/services/ministryApplicationService';
import { MinistryApplicationDetailModal } from '@/features/ministry/presentation/components/MinistryApplicationDetailModal';
import { canReviewMobileMinistryApplication } from '@/permissions/mobileMinistryApplicationPermissions';
import { hasRole } from '@/permissions/mobilePermissions';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Filter,
  Inbox,
  Search,
  User,
  X,
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

export default function StaffMinistryApplicationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userProfile = useAuthStore((s) => s.userProfile);
  const members = useMemberStore((s) => s.members);
  const setSyncToastMessage = useUIStore((s) => s.setSyncToastMessage);

  const getApplicantName = (app: MinistryApplication) => {
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

  const [applications, setApplications] = useState<MinistryApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ApplicationStatus>('pending');
  const [selectedMinistryId, setSelectedMinistryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [targetApp, setTargetApp] = useState<MinistryApplication | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [detailModalApp, setDetailModalApp] = useState<MinistryApplication | null>(null);

  const isMinistryLeader = hasRole(userProfile, 'ministry_leader');
  const managedMinistryIds = userProfile?.managedMinistryIds || [];
  const hasNoManagedMinistries = isMinistryLeader && managedMinistryIds.length === 0;

  useEffect(() => {
    if (!userProfile) return;
    setLoading(true);
    const unsubscribe = ministryApplicationService.subscribeToStaffMinistryApplications(
      userProfile,
      (data) => {
        setApplications(data);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [userProfile]);

  // Unique list of ministries in applications for filter dropdown
  const uniqueMinistries = Array.from(
    new Set(applications.map((a) => JSON.stringify({ id: a.ministryId, name: a.ministryName })))
  ).map((str) => JSON.parse(str));

  // Filtered applications
  const filteredApps = applications.filter((app) => {
    // Tab filter
    if (activeTab === 'pending' && app.status !== 'pending') return false;
    if (activeTab === 'approved' && app.status !== 'approved') return false;
    if (activeTab === 'declined' && app.status !== 'declined') return false;

    // Ministry filter
    if (selectedMinistryId !== 'all' && app.ministryId !== selectedMinistryId) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = getApplicantName(app).toLowerCase();
      const minName = (app.ministryName || '').toLowerCase();
      if (!name.includes(q) && !minName.includes(q)) return false;
    }

    return true;
  });

  const handleApprove = async (app: MinistryApplication) => {
    if (!userProfile) return;
    const resolvedName = getApplicantName(app);
    Alert.alert('Approve Application', `Are you sure you want to approve ${resolvedName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setActionLoading(true);
          try {
            const reviewerName = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') || 'Staff';
            await ministryApplicationService.approveMinistryApplication(app, userProfile, {
              reviewedBy: reviewerName,
            });
            setSyncToastMessage('Application approved. The member has been added to the ministry.');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to approve application.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const openDeclineModal = (app: MinistryApplication) => {
    setTargetApp(app);
    setDeclineReason('');
    setDeclineModalVisible(true);
  };

  const handleDeclineSubmit = async () => {
    if (!targetApp || !userProfile) return;
    if (!declineReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for declining.');
      return;
    }
    setActionLoading(true);
    try {
      const reviewerName = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') || 'Staff';
      await ministryApplicationService.declineMinistryApplication(targetApp, userProfile, {
        reviewedBy: reviewerName,
        declineReason: declineReason.trim(),
      });
      setDeclineModalVisible(false);
      setTargetApp(null);
      setSyncToastMessage('Application declined.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to decline application.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Modern Frosted Top Bar */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 24) }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
        <View style={styles.headerContent}>
          <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
          </BounceCard>
          <Text style={styles.headerTitle} numberOfLines={1}>Ministry Applications</Text>
          <View style={[styles.headerCircle, { backgroundColor: 'transparent', borderWidth: 0, elevation: 0 }]} />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['pending', 'approved', 'declined'] as ApplicationStatus[]).map((tab) => {
          const count = applications.filter((a) => a.status === tab).length;
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search & Filter */}
      <View style={styles.filterRow}>
        <View style={styles.searchBox}>
          <Search size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Search applicant or ministry..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#FF6596" />
            <Text style={styles.loadingText}>Loading ministry applications...</Text>
          </View>
        ) : hasNoManagedMinistries ? (
          <View style={styles.emptyCard}>
            <Inbox size={40} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Managed Ministries</Text>
            <Text style={styles.emptyText}>You are not assigned to manage any ministries yet.</Text>
          </View>
        ) : filteredApps.length === 0 ? (
          <View style={styles.emptyCard}>
            <Inbox size={40} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No applications found</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'pending' ? 'No pending ministry applications.' : `No ${activeTab} applications.`}
            </Text>
          </View>
        ) : (
          filteredApps.map((app) => {
            const canReview = canReviewMobileMinistryApplication(userProfile, app);
            const applicantRealName = getApplicantName(app);
            return (
              <BounceCard
                key={app.id}
                onPress={() => setDetailModalApp(app)}
                style={styles.cardContainer}
              >
                <SoftCard innerStyle={styles.cardInner}>
                  <View style={styles.cardHeader}>
                    {app.applicantPhotoUrl ? (
                      <Image source={{ uri: app.applicantPhotoUrl }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <User size={20} color="#6B7280" />
                      </View>
                    )}
                    <View style={styles.cardHeaderInfo}>
                      <Text style={styles.applicantName}>{applicantRealName}</Text>
                      <Text style={styles.ministryName}>{app.ministryName}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        app.status === 'pending' && styles.statusPending,
                        app.status === 'approved' && styles.statusApproved,
                        app.status === 'declined' && styles.statusDeclined,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          app.status === 'pending' && styles.statusTextPending,
                          app.status === 'approved' && styles.statusTextApproved,
                          app.status === 'declined' && styles.statusTextDeclined,
                        ]}
                      >
                        {app.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.roleText} numberOfLines={1}>
                      Preferred Role:{' '}
                      <Text style={{ fontWeight: '600' }}>
                        {app.preferredRoleNames?.join(', ') || 'Any Role'}
                      </Text>
                    </Text>
                    <Text style={styles.dateText}>
                      Submitted:{' '}
                      {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.viewBtn}
                      onPress={() => setDetailModalApp(app)}
                    >
                      <Text style={styles.viewBtnText}>View</Text>
                      <ChevronRight size={14} color="#6B7280" />
                    </TouchableOpacity>

                    {app.status === 'pending' && canReview && (
                      <View style={styles.actionBtnsRow}>
                        <TouchableOpacity
                          style={styles.declineBtn}
                          onPress={() => openDeclineModal(app)}
                          disabled={actionLoading}
                        >
                          <Text style={styles.declineBtnText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.approveBtn}
                          onPress={() => handleApprove(app)}
                          disabled={actionLoading}
                        >
                          <Text style={styles.approveBtnText}>Approve</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </SoftCard>
              </BounceCard>
            );
          })
        )}
      </ScrollView>

      {/* Detail Modal */}
      <MinistryApplicationDetailModal
        application={detailModalApp}
        isOpen={!!detailModalApp}
        onClose={() => setDetailModalApp(null)}
      />

      {/* Decline Reason Modal */}
      <Modal visible={declineModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Decline Application</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a reason for declining {targetApp?.applicantName || 'this application'}.
            </Text>
            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={3}
              placeholder="Reason for declining..."
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
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerCircle: {
    ...getTopBarButtonShadowStyle(20),
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#FF6596' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  activeTabText: { color: '#FF6596' },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1F2937' },
  content: { padding: 16, gap: 12 },
  centerContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 14 },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 12 },
  emptyText: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4 },
  cardContainer: { marginBottom: 12 },
  cardInner: { padding: 16, backgroundColor: '#fff', borderRadius: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderInfo: { flex: 1 },
  applicantName: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  ministryName: { fontSize: 13, color: '#FF6596', fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusApproved: { backgroundColor: '#D1FAE5' },
  statusDeclined: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 10, fontWeight: '800' },
  statusTextPending: { color: '#D97706' },
  statusTextApproved: { color: '#059669' },
  statusTextDeclined: { color: '#DC2626' },
  cardBody: { gap: 4 },
  roleText: { fontSize: 13, color: '#4B5563' },
  dateText: { fontSize: 12, color: '#9CA3AF' },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  actionBtnsRow: { flexDirection: 'row', gap: 8 },
  declineBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  declineBtnText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
  approveBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  approveBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
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
