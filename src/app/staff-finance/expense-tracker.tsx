import React, { useEffect, useState, useRef } from 'react';
import { BounceCard } from '@/components/ui/BounceCard';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Receipt, X, ChevronLeft, Upload, Calendar, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppModal, { ModalDragArea } from '../../components/ui/AppModal';
import CustomDatePicker from '../../components/CustomDatePicker';
import { ModernDropdown, DropdownOption } from '../../components/ui/ModernDropdown';
import { getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import { SoftCard } from '@/components/ui/SoftCard';
import { useAuthStore } from '../../store/useAuthStore';
import { getRecentExpenses, createExpense } from '../../features/giving/data/financeAdmin.service';
import { uploadProofOfPayment, generateGivingRecordId } from '../../features/giving/data/giving.repository';
import { GivingExpense, ExpenseCategory } from '../../features/giving/domain/giving.types';
import * as ImagePicker from 'expo-image-picker';
import { useGiving } from '../../features/giving/presentation/hooks/useGiving';
import { useMemo } from 'react';

const CATEGORY_OPTIONS: DropdownOption<ExpenseCategory>[] = [
  { label: 'Utilities', value: 'utilities' },
  { label: 'Ministry Supplies', value: 'ministry_supplies' },
  { label: 'Events & Programs', value: 'events_programs' },
  { label: 'Salaries & Stipends', value: 'salaries_stipends' },
  { label: 'Facility Maintenance', value: 'facility_maintenance' },
  { label: 'Missions & Outreach', value: 'missions_outreach' },
  { label: 'Other', value: 'other' }
];

import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';

export default function ExpenseTrackerScreen() {
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
  
  const [expenses, setExpenses] = useState<GivingExpense[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [adding, setAdding] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [proofUri, setProofUri] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    amount: '',
    date: new Date(),
    vendorName: '',
    category: 'utilities' as ExpenseCategory,
    description: '',
    fundId: '',
  });

  useEffect(() => {
    fetchExpenses();
  }, [userProfile?.churchId]);

  const fetchExpenses = async () => {
    if (!userProfile?.churchId) return;
    setLoading(true);
    try {
      const data = await getRecentExpenses(userProfile.churchId);
      setExpenses(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch expenses.');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.1,
      });

      if (!result.canceled && result.assets[0]) {
        setProofUri(result.assets[0].uri);
      }
    } catch (error) {
      console.warn('Image picker error:', error);
      Alert.alert('Error', 'Image picker is not available or failed to load.');
    }
  };

  const handleAddExpense = async () => {
    if (!userProfile?.churchId || !userProfile.uid) return;
    if (!form.vendorName.trim() || !form.amount || isNaN(Number(form.amount))) {
      Alert.alert('Validation Error', 'Please fill in amount and payee/vendor.');
      return;
    }
    if (!form.fundId) {
      Alert.alert('Validation Error', 'Please select a fund.');
      return;
    }
    
    setAdding(true);
    try {
      let uploadedProofUrl = '';
      if (proofUri) {
        const tempId = generateGivingRecordId();
        uploadedProofUrl = await uploadProofOfPayment(userProfile.churchId, tempId, proofUri);
      }

      const newId = await createExpense(userProfile.churchId, {
        description: form.description,
        payee: form.vendorName, // web compatibility
        amount: Number(form.amount),
        currency: 'PHP',
        category: form.category,
        visibility: 'admin_only',
        date: form.date.toISOString().split('T')[0], // web compatibility
        fundId: form.fundId,
        receiptUrl: uploadedProofUrl || undefined,
      }, userProfile.uid);
      
      setAddModalVisible(false);
      setForm({ 
        amount: '', 
        date: new Date(), 
        vendorName: '', 
        category: 'utilities', 
        description: '',
        fundId: ''
      });
      setProofUri(null);
      fetchExpenses(); // refresh list
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add expense.');
    } finally {
      setAdding(false);
    }
  };

  const renderItem = ({ item }: { item: GivingExpense }) => {
    const expenseDate = item.date || new Date().toISOString();
    const vendorName = item.payee || 'Unknown';
    
    return (
    <SoftCard style={{ marginBottom: 16, borderRadius: 24 }} innerStyle={{ borderRadius: 23 }}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.expenseTitle} numberOfLines={1}>{vendorName}</Text>
            <Text style={styles.subText}>
              {new Date(expenseDate).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </Text>
          </View>
          <Text style={styles.amount}>PHP {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        </View>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{CATEGORY_OPTIONS.find(c => c.value === item.category)?.label || item.category}</Text>
          </View>
          {item.visibility === 'public_summary' && (
            <View style={[styles.badge, { backgroundColor: '#E0F2FE' }]}>
              <Text style={[styles.badgeText, { color: '#0369A1' }]}>Public</Text>
            </View>
          )}
        </View>
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
          <Text style={styles.headerTitle} numberOfLines={1}>Expense Tracker</Text>
          <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={() => setAddModalVisible(true)} hitSlop={8}>
            <Plus size={24} color="#1a1a1a" strokeWidth={2} />
          </BounceCard>
        </View>
      </View>

      {loading ? (
        <View style={[styles.list, { paddingTop: Math.max(insets.top, 24) + 70 }]}>
          {Array.from({ length: 4 }).map((_, index) => (
            <SoftCard key={`skel-expense-${index}`} style={{ marginBottom: 16, borderRadius: 24 }} innerStyle={{ borderRadius: 23, padding: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                <View style={{ gap: 6 }}>
                  <ShimmerSkeleton width={140} height={20} borderRadius={6} />
                  <ShimmerSkeleton width={110} height={14} borderRadius={4} />
                </View>
                <ShimmerSkeleton width={90} height={22} borderRadius={6} />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <ShimmerSkeleton width={100} height={24} borderRadius={12} />
              </View>
            </SoftCard>
          ))}
        </View>
      ) : expenses.length === 0 ? (
        <View style={styles.center}>
          <Receipt size={48} color="#FF6596" style={{ marginBottom: 16, opacity: 0.8 }} />
          <Text style={styles.emptyText}>No expenses yet</Text>
          <Text style={styles.emptySubText}>Tap the + button to add a new expense.</Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item, index) => item.id || `expense-${index}`}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingTop: Math.max(insets.top, 24) + 70 }]}
        />
      )}

      {/* Add Expense Modal */}
      <AppModal 
        isOpen={addModalVisible} 
        onClose={() => setAddModalVisible(false)} 
        title="Add Expense"
        hideHeader={true}
        hideDragHandle={true}
        heightRatio={0.85}
        containerStyle={{ paddingHorizontal: 0, paddingBottom: 0 }}
        avoidKeyboard={false}
      >
        <View style={styles.modalContainer}>
          {/* Header matching Event Details style exactly */}
          <ModalDragArea style={[styles.modalHeaderContainer, { paddingTop: 12 }]}>
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
            <View style={styles.modalDragHandle} />
            <View style={styles.modalHeaderContent}>
              <View style={styles.headerCirclePlaceholder} />
              <Text style={styles.modalHeaderTitle} numberOfLines={1}>Add Expense</Text>
              <BounceCard bounceScale={0.85} style={styles.modalCloseCircle} onPress={() => setAddModalVisible(false)} hitSlop={8} activeOpacity={0.8}>
                <X size={24} color="#111827" strokeWidth={2} />
              </BounceCard>
            </View>
          </ModalDragArea>

          <ScrollView ref={scrollRef} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.contentWrap}>
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Payee / Vendor *</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="e.g. Meralco"
                  value={form.vendorName}
                  onChangeText={(text) => setForm({ ...form, vendorName: text })}
                />
              </View>

              <View style={[styles.inputGroup, { zIndex: 1000 }]}>
                <ModernDropdown
                  label="Fund *"
                  options={fundOptions}
                  value={form.fundId}
                  onSelect={(val) => setForm({ ...form, fundId: val || '' })}
                  placeholder="Select a fund"
                  searchable
                  disableDarkMode
                />
              </View>

              <View style={[styles.inputGroup, { zIndex: 900 }]}>
                <ModernDropdown
                  label="Category *"
                  options={CATEGORY_OPTIONS}
                  value={form.category}
                  onSelect={(val) => setForm({ ...form, category: (val as ExpenseCategory) || 'utilities' })}
                  disableDarkMode
                />
              </View>

              <Text style={styles.label}>Description</Text>
              <TextInput 
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="What was this for?"
                multiline
                value={form.description}
                onChangeText={(text) => setForm({ ...form, description: text })}
                onFocus={() => {
                  setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  }, 150);
                }}
              />

              <Text style={styles.label}>Receipt Upload (Optional)</Text>
              <TouchableOpacity style={styles.uploadBox} activeOpacity={0.7} onPress={pickImage}>
                {proofUri ? (
                  <CheckCircle2 size={24} color="#FF6596" style={{ marginBottom: 8 }} />
                ) : (
                  <Upload size={24} color="#6B7280" style={{ marginBottom: 8 }} />
                )}
                <Text style={[styles.uploadTitle, proofUri && { color: '#FF6596' }]}>
                  {proofUri ? 'Receipt Selected (Tap to change)' : 'Upload Receipt'}
                </Text>
                {!proofUri && <Text style={styles.uploadSub}>PNG, JPG, PDF up to 5MB</Text>}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.submitBtnContainer, adding && styles.submitBtnDisabled]} 
                onPress={handleAddExpense}
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
                    <Text style={styles.submitBtnText}>Save Expense</Text>
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
  headerAction: { padding: 8, marginRight: -8 },
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
  expenseTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 4, textTransform: 'capitalize' },
  amount: { fontSize: 18, fontWeight: '800', color: '#EF4444', letterSpacing: -0.5 },
  subText: { fontSize: 13, color: '#888', fontWeight: '500' },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: {
    backgroundColor: '#f8f9fb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 },
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
    paddingTop: 70,
    paddingBottom: 40,
  },
  contentWrap: {
    paddingHorizontal: 20,
  },
  formCardBlock: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 8, marginTop: 12 },
  inputGroup: { marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1a1a1a',
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    marginTop: 8,
  },
  uploadTitle: { fontSize: 14, fontWeight: '600', color: '#10B981', marginBottom: 4 },
  uploadSub: { fontSize: 12, color: '#6B7280' },
  submitBtnContainer: {
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 32,
  },
  submitBtn: {
    paddingVertical: 18,
    borderRadius: 32,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
});
