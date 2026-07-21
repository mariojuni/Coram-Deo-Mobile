import React, { useEffect } from 'react';
import { BounceCard } from '@/components/ui/BounceCard';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, CheckCircle2, Clock, XCircle, FileText, X } from 'lucide-react-native';
import { useGiving } from '@/features/giving/presentation/hooks/useGiving';
import { GivingRecord } from '@/features/giving/domain/giving.types';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';

export default function MyGivingScreen() {
  const router = useRouter();
  const { fromSuccess } = useLocalSearchParams();
  const { myRecords, funds, campaigns, isLoading, refreshRecords } = useGiving();
  const insets = useSafeAreaInsets();

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

  const getFundName = (fundId: string, campaignId?: string) => {
    if (campaignId) {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (campaign) return campaign.title;
    }
    const fund = funds.find(f => f.id === fundId);
    return fund ? fund.name : 'General Fund';
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#FFE8F1', '#F5F2FF', '#FAFAFA']} style={StyleSheet.absoluteFill} />
      
      <BlurView intensity={80} tint="light" style={[styles.header, { paddingTop: Math.max(insets.top, 24) }]}>
        <View style={styles.headerInner}>
          <BounceCard bounceScale={0.85} 
            style={styles.backBtnCircle} 
            onPress={() => {
              if (fromSuccess) {
                router.dismissAll();
              } else {
                router.back();
              }
            }}
          >
            {fromSuccess ? (
              <X size={24} color="#1a1a1a" strokeWidth={2} />
            ) : (
              <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
            )}
          </BounceCard>
          <Text style={styles.headerTitle}>My Giving History</Text>
          <View style={{ width: 40 }} />
        </View>
      </BlurView>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6596" />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={{ height: 24 }} />
          {myRecords.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <FileText size={32} color="#FF6596" />
              </View>
              <Text style={styles.emptyTitle}>No giving records yet</Text>
              <Text style={styles.emptyText}>Your giving history will appear here once you make a contribution.</Text>
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
                  <Text style={styles.fundText}>{getFundName(record.fundId, record.campaignId)}</Text>
                </View>

                {record.status === 'rejected' && record.rejectionReason && (
                  <View style={styles.rejectionBox}>
                    <Text style={styles.rejectionText}>Reason: {record.rejectionReason}</Text>
                  </View>
                )}

                {record.status === 'approved' && record.receiptUrl && (
                  <TouchableOpacity style={styles.receiptBtn}>
                    <LinearGradient colors={['#FFF0F5', '#FFE8F1']} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} />
                    <FileText size={16} color="#FF6596" />
                    <Text style={styles.receiptBtnText}>View Receipt</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { 
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
    paddingBottom: 16,
  },
  headerInner: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 20, 
    marginTop: 8,
  },
  backBtnCircle: {
    ...getTopBarButtonShadowStyle(20),
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.5 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 20 },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 101, 150, 0.1)',
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 101, 150, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  recordCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 0.5,
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
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  fundText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FF6596',
  },
  rejectionBox: {
    marginTop: 16,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectionText: {
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '500',
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    overflow: 'hidden',
  },
  receiptBtnText: {
    color: '#FF6596',
    fontSize: 15,
    fontWeight: '700',
  },
});
