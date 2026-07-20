import React, { useEffect, useState } from 'react';
import { BounceCard } from '@/components/ui/BounceCard';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, Linking } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, CheckCircle2, ChevronRight, X, ChevronLeft, CheckCircle, XCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/useAuthStore';
import { useMemberStore } from '../../store/useMemberStore';
import { useGiving } from '../../features/giving/presentation/hooks/useGiving';
import { getPendingGivingRecords, approveGivingRecord, rejectGivingRecord } from '../../features/giving/data/financeAdmin.service';
import { GivingRecord } from '../../features/giving/domain/giving.types';
import { getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import { SoftCard } from '@/components/ui/SoftCard';

export default function PendingVerificationScreen() {
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const insets = useSafeAreaInsets();
  
  const [records, setRecords] = useState<GivingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // recordId
  
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [recordToReject, setRecordToReject] = useState<string | null>(null);

  const { funds, campaigns } = useGiving();
  const { members, initializeMembersListener } = useMemberStore();

  useEffect(() => {
    fetchRecords();
    if (userProfile?.churchId) {
      initializeMembersListener(userProfile.churchId);
    }
  }, [userProfile?.churchId]);

  const fetchRecords = async () => {
    if (!userProfile?.churchId) return;
    setLoading(true);
    try {
      const data = await getPendingGivingRecords(userProfile.churchId);
      setRecords(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch pending records.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (record: GivingRecord) => {
    if (!userProfile?.churchId || !userProfile.uid) return;
    setActionLoading(record.id);
    try {
      await approveGivingRecord(userProfile.churchId, record.id, record.campaignId, record.amount, userProfile.uid);
      setRecords(prev => prev.filter(r => r.id !== record.id));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve record.');
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (recordId: string) => {
    setRecordToReject(recordId);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!userProfile?.churchId || !userProfile.uid || !recordToReject) return;
    if (!rejectReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection.');
      return;
    }
    
    setRejectModalVisible(false);
    setActionLoading(recordToReject);
    try {
      await rejectGivingRecord(userProfile.churchId, recordToReject, rejectReason.trim(), userProfile.uid);
      setRecords(prev => prev.filter(r => r.id !== recordToReject));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject record.');
    } finally {
      setActionLoading(null);
      setRecordToReject(null);
    }
  };

  const renderItem = ({ item }: { item: GivingRecord }) => {
    const fund = funds.find(f => f.id === item.fundId);
    const campaign = campaigns.find(c => c.id === item.campaignId);
    
    // userId is usually the auth UID, memberId might be the member record ID
    const member = members.find(m => m.uid === item.userId || m.uid === item.memberId || m.id === item.memberId);
    const giverName = item.donorName || (member ? `${member.firstName} ${member.lastName}` : (item.userId ? 'Unknown Member' : 'Anonymous'));

    const submittedDate = typeof (item.submittedAt as any)?.toDate === 'function' 
      ? (item.submittedAt as any).toDate() 
      : new Date(item.submittedAt || Date.now());

    return (
    <SoftCard style={{ marginBottom: 16, borderRadius: 24 }} innerStyle={{ borderRadius: 23 }}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.amount}>PHP {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            <Text style={styles.subText}>
              {submittedDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.paymentMethod}</Text>
          </View>
        </View>
        
        <View style={styles.details}>
          <Text style={styles.detailText}><Text style={styles.bold}>Giver:</Text> {giverName}</Text>
          <Text style={styles.detailText}><Text style={styles.bold}>Fund:</Text> {fund ? fund.name : item.fundId}</Text>
          {item.campaignId && <Text style={styles.detailText}><Text style={styles.bold}>Campaign:</Text> {campaign ? campaign.title : item.campaignId}</Text>}
          {item.referenceNumber && <Text style={styles.detailText}><Text style={styles.bold}>Ref:</Text> {item.referenceNumber}</Text>}
          
          {item.proofOfPaymentUrl && (
            <TouchableOpacity 
              style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}
              onPress={() => Linking.openURL(item.proofOfPaymentUrl!)}
            >
              <Text style={{ color: '#4D8BFF', fontSize: 13, fontWeight: '600' }}>View Receipt</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.btn, styles.rejectBtn, actionLoading === item.id && styles.btnDisabled]}
          onPress={() => openRejectModal(item.id)}
          disabled={actionLoading === item.id}
        >
          <XCircle size={18} color="#EF4444" />
          <Text style={styles.rejectBtnText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.btn, styles.approveBtn, actionLoading === item.id && styles.btnDisabled]}
          onPress={() => handleApprove(item)}
          disabled={actionLoading === item.id}
        >
          {actionLoading === item.id ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <CheckCircle size={18} color="#fff" />
              <Text style={styles.approveBtnText}>Approve</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
    </SoftCard>
  );
};

  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 24) }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} experimentalBlurMethod="dimezisBlurView" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
        <View style={styles.headerContent}>
          <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={() => router.back()}>
            <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
          </BounceCard>
          <Text style={styles.headerTitle} numberOfLines={1}>Pending Verification</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#B66DFF" />
        </View>
      ) : records.length === 0 ? (
        <View style={styles.center}>
          <CheckCircle size={48} color="#10B981" style={{ marginBottom: 16, opacity: 0.8 }} />
          <Text style={styles.emptyText}>All caught up!</Text>
          <Text style={styles.emptySubText}>There are no pending records to verify.</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingTop: Math.max(insets.top, 24) + 70 }]}
        />
      )}

      {/* Rejection Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Record</Text>
            <Text style={styles.modalDesc}>Please provide a reason for rejecting this record. This cannot be undone.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Rejection reason..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setRejectModalVisible(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtnContainer} activeOpacity={0.8} onPress={confirmReject}>
                <LinearGradient
                  colors={['#FF6596', '#C084FC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalConfirmBtn}
                >
                  <Text style={styles.modalConfirmBtnText}>Reject Record</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  headerCircle: {
    ...getTopBarButtonShadowStyle(20),
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  list: { padding: 20, paddingBottom: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#888', textAlign: 'center' },
  
  card: {
    backgroundColor: '#fff',
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  amount: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.5 },
  subText: { fontSize: 13, color: '#888', marginTop: 4, fontWeight: '500' },
  badge: {
    backgroundColor: '#f8f9fb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 },
  details: {
    backgroundColor: '#f8f9fb',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    gap: 8,
  },
  detailText: { fontSize: 14, color: '#444' },
  bold: { fontWeight: '700', color: '#1a1a1a' },
  
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  btnDisabled: { opacity: 0.5 },
  rejectBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  rejectBtnText: { color: '#F43F5E', fontWeight: '700', fontSize: 15 },
  approveBtn: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  modalDesc: { fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 20 },
  modalInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: 12,
    height: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelBtnText: { fontSize: 16, fontWeight: '600', color: '#666' },
  modalConfirmBtnContainer: {
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalConfirmBtn: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 32,
    alignItems: 'center',
  },
  modalConfirmBtnText: { fontSize: 17, fontWeight: '800', letterSpacing: 0.3, color: '#fff' },
});
