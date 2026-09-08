import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { BounceCard } from '@/components/ui/BounceCard';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowDownRight, ArrowUpRight, Clock, PieChart, Wallet, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Bell } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { getMonthlyFinanceSummary } from '../../features/giving/data/financeAdmin.service';
import { GivingRecord, GivingExpense } from '../../features/giving/domain/giving.types';
import { getTopBarButtonShadowStyle, SoftCard } from '@/components/ui/SoftCard';
import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';

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

  const [selectedMonth, setSelectedMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const scrollViewRef = useRef<ScrollView>(null);

  const months = useMemo(() => {
    const result = [];
    const now = new Date();
    // Generate the last 12 months
    for (let i = 11; i >= 0; i--) {
      result.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
    }
    return result;
  }, []);

  const initScrollDone = useRef(false);

  const handleContentSizeChange = () => {
    if (!initScrollDone.current && scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: false });
      initScrollDone.current = true;
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [userProfile?.churchId, selectedMonth]);

  const fetchSummary = async () => {
    if (!userProfile?.churchId) return;
    setLoading(true);
    try {
      const data = await getMonthlyFinanceSummary(userProfile.churchId, selectedMonth.toISOString());
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
          <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
          </BounceCard>
          <Text style={styles.headerTitle} numberOfLines={1}>Finance Summary</Text>
          {summary.pendingCount > 0 ? (
            <BounceCard 
              bounceScale={0.85} 
              style={styles.headerCircle} 
              onPress={() => router.push('/staff-finance/pending-verification')} 
              hitSlop={8}
            >
              <Clock size={22} color="#B66DFF" strokeWidth={2} />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{summary.pendingCount > 99 ? '99+' : summary.pendingCount}</Text>
              </View>
            </BounceCard>
          ) : (
            <View style={[styles.headerCircle, { backgroundColor: 'transparent', borderWidth: 0, elevation: 0 }]} />
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 24) + 70 }]}>
        <View style={{ marginBottom: 16 }}>
          <ScrollView 
            ref={scrollViewRef}
            horizontal 
            showsHorizontalScrollIndicator={false} 
            onContentSizeChange={handleContentSizeChange}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
          >
            {months.map((month, index) => {
              const isSelected = month.getMonth() === selectedMonth.getMonth() && month.getFullYear() === selectedMonth.getFullYear();
              return (
                <TouchableOpacity 
                  key={index} 
                  onPress={() => setSelectedMonth(month)}
                  style={[styles.monthChip, isSelected && styles.monthChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.monthChipText, isSelected && styles.monthChipTextActive]}>
                    {month.toLocaleDateString('en-US', { month: 'short' })}
                    {month.getFullYear() !== new Date().getFullYear() ? ` '${month.getFullYear().toString().slice(2)}` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View>
            <ShimmerSkeleton width={100} height={20} borderRadius={6} style={{ marginBottom: 12 }} />
            <ShimmerSkeleton width="100%" height={90} borderRadius={20} style={{ marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <ShimmerSkeleton width="48%" height={90} borderRadius={20} />
              <ShimmerSkeleton width="48%" height={90} borderRadius={20} />
            </View>
            <ShimmerSkeleton width="100%" height={70} borderRadius={20} style={{ marginBottom: 24 }} />
            <ShimmerSkeleton width={120} height={18} borderRadius={6} style={{ marginBottom: 12 }} />
            <ShimmerSkeleton width="100%" height={56} borderRadius={16} style={{ marginBottom: 8 }} />
            <ShimmerSkeleton width="100%" height={56} borderRadius={16} style={{ marginBottom: 8 }} />
          </View>
        ) : (
          <>
            <View style={[styles.mainCard, { backgroundColor: balance >= 0 ? '#10B981' : '#EF4444' }]}>
              <Text style={styles.mainCardLabel}>Net Balance</Text>
              <Text style={styles.mainCardAmount}>PHP {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>

            <View style={styles.row}>
              <SoftCard style={{ flex: 1, borderRadius: 24 }} innerStyle={{ borderRadius: 23 }}>
                <View style={styles.statCard}>
                  <View style={[styles.iconWrap, { backgroundColor: '#E0F2FE' }]}>
                    <TrendingUp size={24} color="#0284C7" />
                  </View>
                  <Text style={styles.statLabel}>Total Income</Text>
                  <Text style={styles.statValue}>PHP {summary.totalGiving.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                </View>
              </SoftCard>

              <SoftCard style={{ flex: 1, borderRadius: 24 }} innerStyle={{ borderRadius: 23 }}>
                <View style={styles.statCard}>
                  <View style={[styles.iconWrap, { backgroundColor: '#FEE2E2' }]}>
                    <TrendingDown size={24} color="#DC2626" />
                  </View>
                  <Text style={styles.statLabel}>Total Expenses</Text>
                  <Text style={styles.statValue}>PHP {summary.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                </View>
              </SoftCard>
            </View>



            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Income</Text>
            </View>
            {summary.givingRecords.length === 0 ? (
              <Text style={styles.emptyListText}>No income records this month.</Text>
            ) : (
              summary.givingRecords.slice(0, 5).map(record => (
                <SoftCard key={record.id} style={{ marginBottom: 8, borderRadius: 16 }} innerStyle={{ borderRadius: 15 }}>
                  <View style={styles.listItem}>
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
                </SoftCard>
              ))
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Expenses</Text>
            </View>
            {summary.expenses.length === 0 ? (
              <Text style={styles.emptyListText}>No expenses this month.</Text>
            ) : (
              summary.expenses.slice(0, 5).map(expense => (
                <SoftCard key={expense.id} style={{ marginBottom: 8, borderRadius: 16 }} innerStyle={{ borderRadius: 15 }}>
                  <View style={styles.listItem}>
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
                </SoftCard>
              ))
            )}
          </>
        )}
      </ScrollView>
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
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 100 },
  
  monthChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  monthChipActive: {
    backgroundColor: '#1a1a1a',
    borderColor: '#1a1a1a',
  },
  monthChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  monthChipTextActive: {
    color: '#fff',
  },
  
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
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statLabel: { fontSize: 13, color: '#888', fontWeight: '500', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', letterSpacing: -0.5 },


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
