import React, { useState } from 'react';
import { BounceCard } from '@/components/ui/BounceCard';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import { useRouter } from 'expo-router';
import { Check, ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/useAuthStore';
import { useMemberStore } from '../../store/useMemberStore';
import { useGiving } from '../../features/giving/presentation/hooks/useGiving';
import { createManualGivingRecord } from '../../features/giving/data/financeAdmin.service';
import { PaymentMethodType } from '../../features/giving/domain/giving.types';
import { ModernDropdown, DropdownOption } from '../../components/ui/ModernDropdown';
import { useEffect, useMemo } from 'react';
import { formatMemberName } from '../../features/member/domain/member.utils';

export default function GivingInputScreen() {
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const { members, households, initializeMembersListener, initializeHouseholdsListener } = useMemberStore();
  const { funds, campaigns } = useGiving();
  const [loading, setLoading] = useState(false);

  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    giverType: 'member', // member, household, non_member, or anonymous
    memberId: '',
    householdId: '',
    donorName: '',
    fundId: '',
    campaignId: '',
    amount: '',
    method: 'cash' as string | PaymentMethodType,
    referenceNumber: '',
    notes: '',
  });

  useEffect(() => {
    if (userProfile?.churchId) {
      initializeMembersListener(userProfile.churchId);
      initializeHouseholdsListener(userProfile.churchId);
    }
  }, [userProfile?.churchId, initializeMembersListener, initializeHouseholdsListener]);

  const memberOptions: DropdownOption[] = useMemo(() => {
    return members.map(m => {
      const name = formatMemberName(m);
      return {
        label: name,
        value: m.id,
        icon: (
          <Image
            source={{ uri: m.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f0f0f0&color=999` }}
            style={{ width: 28, height: 28, borderRadius: 14 }}
          />
        )
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
  }, [members]);

  const householdOptions: DropdownOption[] = useMemo(() => {
    return households.map(h => ({
      label: h.name,
      value: h.id,
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [households]);

  const fundOptions: DropdownOption[] = useMemo(() => {
    return funds.map(f => ({
      label: f.name,
      value: f.id
    }));
  }, [funds]);

  const campaignOptions: DropdownOption[] = useMemo(() => {
    return campaigns.map(c => ({
      label: c.title,
      value: c.id
    }));
  }, [campaigns]);

  const handleSubmit = async () => {
    if (!userProfile?.churchId) {
      Alert.alert('Error', 'No church association found.');
      return;
    }
    if (!form.amount || isNaN(Number(form.amount))) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }
    if (!form.fundId) {
      Alert.alert('Error', 'Please enter a fund ID.');
      return;
    }

    setLoading(true);
    try {
      const selectedFund = funds.find(f => f.id === form.fundId);
      const selectedHousehold = households.find(h => h.id === form.householdId);
      
      const userId = form.giverType === 'member' ? form.memberId : form.giverType === 'household' ? (selectedHousehold?.primaryMemberId || '') : null as any;
      const donorName = form.giverType === 'household' 
        ? selectedHousehold?.name 
        : form.giverType === 'non_member' ? form.donorName : form.giverType === 'anonymous' ? 'Anonymous' : undefined;

      await createManualGivingRecord(userProfile.churchId, {
        userId,
        householdId: form.giverType === 'household' ? form.householdId : undefined,
        giverEntityType: form.giverType === 'household' ? 'household' : 'individual',
        donorName,
        fundId: form.fundId,
        fundType: selectedFund?.name || 'Others',
        campaignId: form.campaignId || undefined,
        amount: Number(form.amount),
        currency: 'PHP',
        method: form.method,
        referenceNumber: form.referenceNumber,
        notes: form.notes,
      }, userProfile.uid);
      
      Alert.alert('Success', 'Giving record created and approved automatically.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create record.');
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.headerTitle} numberOfLines={1}>Giving Input</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 24) + 70 }]}>
        <Text style={styles.label}>Giver Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {['member', 'household', 'non_member', 'anonymous'].map(type => (
            <TouchableOpacity 
              key={type} 
              style={[styles.chip, form.giverType === type && styles.chipActive]}
              onPress={() => setForm({ ...form, giverType: type })}
            >
              <Text style={[styles.chipText, form.giverType === type && styles.chipTextActive]}>
                {type === 'non_member' ? 'Not Member' : type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {form.giverType === 'household' && (
          <View style={[styles.inputGroup, { zIndex: 1000 }]}>
            <ModernDropdown
              label="Household"
              options={householdOptions}
              value={form.householdId}
              onSelect={(val) => setForm({ ...form, householdId: val || '' })}
              placeholder="Search and select household"
              searchable
              disableDarkMode
            />
          </View>
        )}

        {form.giverType === 'member' && (
          <View style={[styles.inputGroup, { zIndex: 1000 }]}>
            <ModernDropdown
              label="Member"
              options={memberOptions}
              value={form.memberId}
              onSelect={(val) => setForm({ ...form, memberId: val || '' })}
              placeholder="Search and select member"
              searchable
              disableDarkMode
            />
          </View>
        )}

        {form.giverType === 'non_member' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Donor Name</Text>
            <TextInput 
              style={styles.input}
              placeholder="Enter donor's name"
              value={form.donorName}
              onChangeText={(text) => setForm({ ...form, donorName: text })}
              autoCapitalize="words"
            />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount (PHP)</Text>
          <TextInput 
            style={styles.input}
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={form.amount}
            onChangeText={(text) => setForm({ ...form, amount: text })}
            autoCorrect={false}
            spellCheck={false}
          />
        </View>

        <View style={[styles.inputGroup, { zIndex: 900 }]}>
          <ModernDropdown
            label="Fund (Required)"
            options={fundOptions}
            value={form.fundId}
            onSelect={(val) => setForm({ ...form, fundId: val || '' })}
            placeholder="Select a fund"
            searchable
            disableDarkMode
          />
        </View>

        <View style={[styles.inputGroup, { zIndex: 800 }]}>
          <ModernDropdown
            label="Campaign (Optional)"
            options={campaignOptions}
            value={form.campaignId}
            onSelect={(val) => setForm({ ...form, campaignId: val || '' })}
            placeholder="Select a campaign"
            clearable
            disableDarkMode
          />
        </View>

        <Text style={styles.label}>Payment Method</Text>
        <View style={[styles.row, { flexWrap: 'wrap' }]}>
          {['cash', 'gcash', 'bank_transfer', 'check'].map(method => (
            <TouchableOpacity 
              key={method} 
              style={[styles.chip, form.method === method && styles.chipActive]}
              onPress={() => setForm({ ...form, method: method as any })}
            >
              <Text style={[styles.chipText, form.method === method && styles.chipTextActive]}>
                {method.replace('_', ' ').toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.inputGroup, { marginTop: 16 }]}>
          <Text style={styles.label}>Reference Number (Optional)</Text>
          <TextInput 
            style={styles.input}
            placeholder="Transaction ID / Check #"
            value={form.referenceNumber}
            onChangeText={(text) => setForm({ ...form, referenceNumber: text })}
            autoCorrect={false}
            spellCheck={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Note (Optional)</Text>
          <TextInput 
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Add any notes here..."
            multiline
            value={form.notes}
            onChangeText={(text) => setForm({ ...form, notes: text })}
            autoCorrect={false}
            spellCheck={false}
          />
        </View>

        <TouchableOpacity 
          style={[styles.submitBtnContainer, loading && styles.submitBtnDisabled]} 
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={loading}
        >
          <LinearGradient
            colors={['#FF6596', '#C084FC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitBtn}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Check size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Save & Approve</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
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
  content: { padding: 24, paddingBottom: 100 },
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
  row: { flexDirection: 'row', gap: 12 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: '#6DC8FF15',
    borderColor: '#6DC8FF',
  },
  chipText: { fontSize: 14, fontWeight: '500', color: '#666' },
  chipTextActive: { color: '#6DC8FF', fontWeight: '600' },
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
