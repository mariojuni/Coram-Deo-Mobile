import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowDownRight, ArrowUpRight, Clock, PieChart, Wallet, ChevronLeft, TrendingUp, TrendingDown } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { getMonthlyFinanceSummary } from '../../features/giving/data/financeAdmin.service';
import { GivingRecord, GivingExpense } from '../../features/giving/domain/giving.types';

export default function FinanceSummaryScreen() {
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<{
    totalGiving: number; 
    totalExpenses: number; 
    pendingCount: number;
    givingRecords: GivingRecord[];
    expenses: GivingExpense[];
  }>({ totalGiving: 0, totalExpenses: 0, pendingCount: 0, givingRecords: [], expenses: [] });

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
    }, [userProfile?.churchId])
  );

  const fetchSummary = async () => {
    if (!userProfile?.churchId) return;
    setLoading(true);
    try {
      // Get the first day of the current month in ISO format
      const date = new Date();
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
      const data = await getMonthlyFinanceSummary(userProfile.churchId, firstDay);
      setSummary(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const balance = summary.totalGiving - summary.totalExpenses;

  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 24) }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.headerCircle} onPress={() => router.back()}>
            <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Finance Summary</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FFA177" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 24) + 70 }]}>
          <Text style={styles.monthTitle}>This Month</Text>

          <View style={[styles.mainCard, { backgroundColor: balance >= 0 ? '#10B981' : '#EF4444' }]}>
            <Text style={styles.mainCardLabel}>Net Balance</Text>
            <Text style={styles.mainCardAmount}>PHP {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.statCard}>
              <View style={[styles.iconWrap, { backgroundColor: '#E0F2FE' }]}>
                <TrendingUp size={24} color="#0284C7" />
              </View>
              <Text style={styles.statLabel}>Total Income</Text>
              <Text style={styles.statValue}>PHP {summary.totalGiving.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.iconWrap, { backgroundColor: '#FEE2E2' }]}>
                <TrendingDown size={24} color="#DC2626" />
              </View>
              <Text style={styles.statLabel}>Total Expenses</Text>
              <Text style={styles.statValue}>PHP {summary.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.pendingCard} 
            onPress={() => router.push('/staff-finance/pending-verification')}
            activeOpacity={0.7}
          >
            <View style={styles.pendingContent}>
              <Clock size={24} color="#B66DFF" />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.pendingLabel}>Pending Verifications</Text>
                <Text style={styles.pendingSubText}>{summary.pendingCount} records need your attention</Text>
              </View>
            </View>
            <Text style={styles.pendingBadge}>{summary.pendingCount}</Text>
          </TouchableOpacity>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Income</Text>
          </View>
          {summary.givingRecords.length === 0 ? (
            <Text style={styles.emptyListText}>No income records this month.</Text>
          ) : (
            summary.givingRecords.slice(0, 5).map(record => (
              <View key={record.id} style={styles.listItem}>
                <View style={styles.listItemLeft}>
                  <Text style={[styles.listItemTitle, { textTransform: 'capitalize' }]} numberOfLines={1}>{record.donorName || 'Anonymous'}</Text>
                  <Text style={[styles.listItemSub, { textTransform: 'capitalize' }]}>
                    {new Date(record.date || record.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {record.fundType || 'Tithe'}
                  </Text>
                </View>
                <Text style={styles.listItemAmountIncome}>
                  +₱{record.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
            ))
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
          </View>
          {summary.expenses.length === 0 ? (
            <Text style={styles.emptyListText}>No expenses this month.</Text>
          ) : (
            summary.expenses.slice(0, 5).map(expense => (
              <View key={expense.id} style={styles.listItem}>
                <View style={styles.listItemLeft}>
                  <Text style={[styles.listItemTitle, { textTransform: 'capitalize' }]} numberOfLines={1}>{expense.payee || 'Unknown'}</Text>
                  <Text style={[styles.listItemSub, { textTransform: 'capitalize' }]}>
                    {new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {(expense.category || '').replace(/_/g, ' ')}
                  </Text>
                </View>
                <Text style={styles.listItemAmountExpense}>
                  -₱{expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
            ))
          )}

        </ScrollView>
      )}
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
    paddingBottom: 12,
  },
  headerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 100 },
  monthTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 16 },
  
  mainCard: {
    padding: 24,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  mainCardLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 8 },
  mainCardAmount: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -1 },

  row: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statLabel: { fontSize: 13, color: '#888', fontWeight: '500', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', letterSpacing: -0.5 },

  pendingCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  pendingContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  pendingLabel: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  pendingSubText: { fontSize: 13, color: '#888', marginTop: 4, fontWeight: '500' },
  pendingBadge: {
    backgroundColor: '#B66DFF',
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    marginTop: 32,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  emptyListText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    paddingVertical: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  listItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  listItemSub: {
    fontSize: 13,
    color: '#888',
  },
  listItemAmountIncome: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0284C7',
  },
  listItemAmountExpense: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
  },
});
