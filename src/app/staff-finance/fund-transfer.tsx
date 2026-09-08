import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, ChevronLeft, Calendar, ArrowRightLeft, Check, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppModal, { ModalDragArea } from '../../components/ui/AppModal';
import CustomDatePicker from '../../components/CustomDatePicker';
import { ModernDropdown, DropdownOption } from '../../components/ui/ModernDropdown';
import { getTopBarButtonShadowStyle, SoftCard } from '../../components/ui/SoftCard';
import { BounceCard } from '../../components/ui/BounceCard';
import ShimmerSkeleton from '../../components/ui/ShimmerSkeleton';

import { useAuthStore } from '../../store/useAuthStore';
import { createFundTransfer, getRecentFundTransfers } from '../../features/giving/data/financeAdmin.service';
import { useGiving } from '../../features/giving/presentation/hooks/useGiving';
import { FundTransfer } from '../../features/giving/domain/giving.types';

export default function FundTransferScreen() {
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const { funds } = useGiving();
  const insets = useSafeAreaInsets();
  
  const fundOptions: DropdownOption[] = useMemo(() => {
    return funds.map(f => ({
      label: f.name,
      value: f.id
    }));
  }, [funds]);
  
  const [transfers, setTransfers] = useState<FundTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [adding, setAdding] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  
  const [form, setForm] = useState({
    amount: '',
    date: new Date(),
    sourceFundId: '',
    destinationFundId: '',
    notes: '',
  });

  useEffect(() => {
    fetchTransfers();
  }, [userProfile?.churchId]);

  const fetchTransfers = async () => {
    if (!userProfile?.churchId) return;
    setLoading(true);
    try {
      const transfersData = await getRecentFundTransfers(userProfile.churchId);
      setTransfers(transfersData as FundTransfer[]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransfer = async () => {
    if (!userProfile?.churchId || !userProfile.uid) return;
    
    if (!form.sourceFundId || !form.destinationFundId) {
      Alert.alert('Validation Error', 'Please select both source and destination funds.');
      return;
    }
    
    if (form.sourceFundId === form.destinationFundId) {
      Alert.alert('Validation Error', 'Source and destination funds cannot be the same.');
      return;
    }

    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount greater than 0.');
      return;
    }
    
    setAdding(true);
    try {
      await createFundTransfer(userProfile.churchId, {
        sourceFundId: form.sourceFundId,
        destinationFundId: form.destinationFundId,
        amount: Number(form.amount),
        date: form.date.toISOString().split('T')[0],
        notes: form.notes,
      }, userProfile.uid);
      
      setAddModalVisible(false);
      setForm({ 
        amount: '', 
        date: new Date(), 
        sourceFundId: '',
        destinationFundId: '',
        notes: ''
      });
      fetchTransfers(); // refresh list
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add transfer.');
    } finally {
      setAdding(false);
    }
  };

  const getFundName = (id: string) => {
    return funds.find(f => f.id === id)?.name || 'Unknown Fund';
  };

  const renderItem = ({ item }: { item: FundTransfer }) => {
    const transferDate = item.date || new Date().toISOString();
    
    return (
      <SoftCard style={{ marginBottom: 16, borderRadius: 24 }} innerStyle={{ borderRadius: 23 }}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.transferTitle} numberOfLines={1}>
                {getFundName(item.sourceFundId)} → {getFundName(item.destinationFundId)}
              </Text>
              <Text style={styles.subText}>
                {new Date(transferDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
            <Text style={styles.amount}>PHP {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
          {item.notes ? (
            <Text style={styles.notesText} numberOfLines={2}>Notes: {item.notes}</Text>
          ) : null}
        </View>
      </SoftCard>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 24) }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
        <View style={styles.headerContent}>
          <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
          </BounceCard>
          <Text style={styles.headerTitle} numberOfLines={1}>Fund Transfer</Text>
          <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={() => setAddModalVisible(true)} hitSlop={8}>
            <Plus size={24} color="#1a1a1a" strokeWidth={2} />
          </BounceCard>
        </View>
      </View>

      {loading ? (
        <View style={[styles.list, { paddingTop: Math.max(insets.top, 24) + 70 }]}>
          {Array.from({ length: 4 }).map((_, index) => (
            <SoftCard key={`skel-transfer-${index}`} style={{ marginBottom: 16, borderRadius: 24 }} innerStyle={{ borderRadius: 23, padding: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                <View style={{ gap: 6 }}>
                  <ShimmerSkeleton width={160} height={20} borderRadius={6} />
                  <ShimmerSkeleton width={110} height={14} borderRadius={4} />
                </View>
                <ShimmerSkeleton width={90} height={22} borderRadius={6} />
              </View>
            </SoftCard>
          ))}
        </View>
      ) : transfers.length === 0 ? (
        <View style={styles.center}>
          <ArrowRightLeft size={48} color="#4ADE80" style={{ marginBottom: 16, opacity: 0.8 }} />
          <Text style={styles.emptyText}>No transfers yet</Text>
          <Text style={styles.emptySubText}>Tap the + button to create a fund transfer.</Text>
        </View>
      ) : (
        <FlatList
          data={transfers}
          keyExtractor={(item, index) => item.id || `transfer-${index}`}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingTop: Math.max(insets.top, 24) + 70 }]}
        />
      )}

      {/* Add Transfer Modal */}
      <AppModal 
        isOpen={addModalVisible} 
        onClose={() => setAddModalVisible(false)} 
        title="Add Transfer"
        hideHeader={true}
        hideDragHandle={true}
        heightRatio={0.85}
        containerStyle={{ paddingHorizontal: 0, paddingBottom: 0 }}
        avoidKeyboard={false}
      >
        <View style={styles.modalContainer}>
          <ModalDragArea style={[styles.modalHeaderContainer, { paddingTop: 12 }]}>
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
            <View style={styles.modalDragHandle} />
            <View style={styles.modalHeaderContent}>
              <View style={styles.headerCirclePlaceholder} />
              <Text style={styles.modalHeaderTitle} numberOfLines={1}>Transfer Funds</Text>
              <BounceCard bounceScale={0.85} style={styles.modalCloseCircle} onPress={() => setAddModalVisible(false)} hitSlop={8} activeOpacity={0.8}>
                <X size={24} color="#111827" strokeWidth={2} />
              </BounceCard>
            </View>
          </ModalDragArea>

          <ScrollView ref={scrollRef} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.contentWrap}>
              <View style={[styles.inputGroup, { zIndex: 1000 }]}>
                <ModernDropdown
                  label="From Fund *"
                  options={fundOptions}
                  value={form.sourceFundId}
                  onSelect={(val) => setForm({ ...form, sourceFundId: val || '' })}
                  placeholder="Select source fund"
                  searchable
                  disableDarkMode
                />
              </View>

              <View style={[styles.inputGroup, { zIndex: 900 }]}>
                <ModernDropdown
                  label="To Fund *"
                  options={fundOptions}
                  value={form.destinationFundId}
                  onSelect={(val) => setForm({ ...form, destinationFundId: val || '' })}
                  placeholder="Select destination fund"
                  searchable
                  disableDarkMode
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Amount (₱) *</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={form.amount}
                  onChangeText={(text) => setForm({ ...form, amount: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date *</Text>
                <TouchableOpacity 
                  style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} 
                  activeOpacity={0.7}
                  onPress={() => setDatePickerVisible(true)}
                >
                  <Text style={{ fontSize: 16, color: form.date ? '#1a1a1a' : '#888' }}>
                    {form.date ? form.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'MM/DD/YYYY'}
                  </Text>
                  <Calendar size={20} color="#888" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput 
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Reason for transfer..."
                multiline
                value={form.notes}
                onChangeText={(text) => setForm({ ...form, notes: text })}
                onFocus={() => {
                  setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  }, 150);
                }}
              />

              <TouchableOpacity 
                style={[styles.submitBtnContainer, adding && styles.submitBtnDisabled]} 
                onPress={handleAddTransfer}
                activeOpacity={0.8}
                disabled={adding}
              >
                <LinearGradient
                  colors={['#FF6596', '#C084FC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitBtn}
                >
                  {adding ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Check size={20} color="#fff" />
                      <Text style={styles.submitBtnText}>Execute Transfer</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <CustomDatePicker
            visible={isDatePickerVisible}
            date={form.date || new Date()}
            onConfirm={(d) => {
              setForm({ ...form, date: d });
              setDatePickerVisible(false);
            }}
            onCancel={() => setDatePickerVisible(false)}
          />
        </View>
      </AppModal>
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
    marginBottom: 4,
  },
  transferTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  amount: { fontSize: 18, fontWeight: '800', color: '#10B981', letterSpacing: -0.5 },
  subText: { fontSize: 13, color: '#888', fontWeight: '500' },
  notesText: { fontSize: 13, color: '#666', marginTop: 8, fontStyle: 'italic' },
  
  modalContainer: { flex: 1, backgroundColor: '#FAFAFA' },
  modalHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  modalDragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#d1d5db',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 4,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerCirclePlaceholder: { width: 40, height: 40 },
  modalCloseCircle: {
    ...getTopBarButtonShadowStyle(20),
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  modalScrollContent: {
    paddingTop: 86,
    paddingBottom: 40,
  },
  contentWrap: {
    paddingHorizontal: 20,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  inputGroup: { marginBottom: 20 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1a1a1a',
  },
  submitBtnContainer: {
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 20,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 32,
    gap: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
});
