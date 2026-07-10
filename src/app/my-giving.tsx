import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, CheckCircle2, Clock, XCircle, FileText } from 'lucide-react-native';
import { useGiving } from '@/features/giving/presentation/hooks/useGiving';
import { GivingRecord } from '@/features/giving/domain/giving.types';

export default function MyGivingScreen() {
  const router = useRouter();
  const { myRecords, isLoading, refreshRecords } = useGiving();

  useEffect(() => {
    refreshRecords();
  }, [refreshRecords]);

  const renderStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <View style={[styles.statusPill, { backgroundColor: '#FEF3C7' }]}>
            <Clock size={12} color="#D97706" />
            <Text style={[styles.statusText, { color: '#D97706' }]}>Pending Verification</Text>
          </View>
        );
      case 'approved':
        return (
          <View style={[styles.statusPill, { backgroundColor: '#D1FAE5' }]}>
            <CheckCircle2 size={12} color="#059669" />
            <Text style={[styles.statusText, { color: '#059669' }]}>Approved</Text>
          </View>
        );
      case 'rejected':
        return (
          <View style={[styles.statusPill, { backgroundColor: '#FEE2E2' }]}>
            <XCircle size={12} color="#DC2626" />
            <Text style={[styles.statusText, { color: '#DC2626' }]}>Rejected</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#1a1a1a" />
          <Text style={styles.headerTitle}>My Giving History</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6596" />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {myRecords.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FileText size={48} color="#D1D5DB" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>You haven't made any giving records yet.</Text>
            </View>
          ) : (
            myRecords.map((record: GivingRecord) => (
              <View key={record.id} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <Text style={styles.dateText}>{formatDate(record.submittedAt)}</Text>
                  {renderStatus(record.status)}
                </View>
                
                <View style={styles.amountRow}>
                  <Text style={styles.amountText}>₱{record.amount.toLocaleString()}</Text>
                  <Text style={styles.fundText}>Fund ID: {record.fundId}</Text>
                </View>

                {record.status === 'rejected' && record.rejectionReason && (
                  <View style={styles.rejectionBox}>
                    <Text style={styles.rejectionText}>Reason: {record.rejectionReason}</Text>
                  </View>
                )}

                {record.status === 'approved' && record.receiptUrl && (
                  <TouchableOpacity style={styles.receiptBtn}>
                    <FileText size={16} color="#FF6596" />
                    <Text style={styles.receiptBtnText}>View Receipt</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 16,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginLeft: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: 24 },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  amountText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  fundText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  rejectionBox: {
    marginTop: 12,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectionText: {
    fontSize: 13,
    color: '#B91C1C',
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF0F5',
    borderRadius: 8,
    gap: 8,
  },
  receiptBtnText: {
    color: '#FF6596',
    fontSize: 14,
    fontWeight: '600',
  },
});
