import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Receipt, X, ChevronLeft, Upload, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppModal from '../../components/ui/AppModal';
import CustomDatePicker from '../../components/CustomDatePicker';
import { ModernDropdown, DropdownOption } from '../../components/ui/ModernDropdown';
import { SoftCard } from '../../components/ui/SoftCard';
import { useAuthStore } from '../../store/useAuthStore';
import { getRecentExpenses, createExpense } from '../../features/giving/data/financeAdmin.service';
import { GivingExpense, ExpenseCategory } from '../../features/giving/domain/giving.types';

const CATEGORY_OPTIONS: DropdownOption<ExpenseCategory>[] = [
  { label: 'Utilities', value: 'utilities' },
  { label: 'Ministry Supplies', value: 'ministry_supplies' },
  { label: 'Events & Programs', value: 'events_programs' },
  { label: 'Salaries & Stipends', value: 'salaries_stipends' },
  { label: 'Facility Maintenance', value: 'facility_maintenance' },
  { label: 'Missions & Outreach', value: 'missions_outreach' },
  { label: 'Other', value: 'other' }
];

export default function ExpenseTrackerScreen() {
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const insets = useSafeAreaInsets();
  
  const [expenses, setExpenses] = useState<GivingExpense[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [adding, setAdding] = useState(false);
  
  const [form, setForm] = useState({
    amount: '',
    date: new Date(),
    vendorName: '',
    category: 'utilities' as ExpenseCategory,
    description: '',
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

  const handleAddExpense = async () => {
    if (!userProfile?.churchId || !userProfile.uid) return;
    if (!form.vendorName.trim() || !form.amount || isNaN(Number(form.amount))) {
      Alert.alert('Error', 'Please fill in amount and payee/vendor.');
      return;
    }
    
    setAdding(true);
    try {
      const newId = await createExpense(userProfile.churchId, {
        description: form.description,
        payee: form.vendorName, // web compatibility
        amount: Number(form.amount),
        currency: 'PHP',
        category: form.category,
        visibility: 'admin_only',
        date: form.date.toISOString().split('T')[0], // web compatibility
      }, userProfile.uid);
      
      setAddModalVisible(false);
      setForm({ 
        amount: '', 
        date: new Date(), 
        vendorName: '', 
        category: 'utilities', 
        description: '' 
      });
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
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} experimentalBlurMethod="dimezisBlurView" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.headerCircle} onPress={() => router.back()}>
            <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Expense Tracker</Text>
          <TouchableOpacity style={styles.headerAction} onPress={() => setAddModalVisible(true)}>
            <Plus size={24} color="#1a1a1a" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6596" />
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
      >

          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 40 }}>
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

            <View style={[styles.inputGroup, { zIndex: 900 }]}>
              <ModernDropdown
                label="Category *"
                options={CATEGORY_OPTIONS}
                value={form.category}
                onSelect={(val) => setForm({ ...form, category: (val as ExpenseCategory) || 'utilities' })}
              />
            </View>

            <Text style={styles.label}>Description</Text>
            <TextInput 
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="What was this for?"
              multiline
              value={form.description}
              onChangeText={(text) => setForm({ ...form, description: text })}
            />

            <Text style={styles.label}>Receipt Upload (Optional)</Text>
            <TouchableOpacity style={styles.uploadBox} activeOpacity={0.7}>
              <Upload size={24} color="#6B7280" style={{ marginBottom: 8 }} />
              <Text style={styles.uploadTitle}>Upload Receipt</Text>
              <Text style={styles.uploadSub}>PNG, JPG, PDF up to 5MB</Text>
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
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
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

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  closeText: { fontSize: 16, color: '#FF6596', fontWeight: '500' },
  modalContent: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 8, marginTop: 16 },
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
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
});
