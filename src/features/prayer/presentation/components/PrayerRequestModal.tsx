import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, Switch, TouchableOpacity, 
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert 
} from 'react-native';
import AppModal from '@/components/ui/AppModal';
import { useAuthStore } from '@/store/useAuthStore';
import { prayerRepository } from '../../data/prayer.repository';
import type { PrayerCategory, PrayerVisibility, PrayerStatus } from '../../domain/prayer.types';
import { LinearGradient } from 'expo-linear-gradient';

interface PrayerRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: { label: string; value: PrayerCategory }[] = [
  { label: 'Healing', value: 'healing' },
  { label: 'Family', value: 'family' },
  { label: 'Spiritual Growth', value: 'spiritual_growth' },
  { label: 'Provision', value: 'provision' },
  { label: 'Thanksgiving', value: 'thanksgiving' },
  { label: 'Other', value: 'other' },
];

export default function PrayerRequestModal({ isOpen, onClose }: PrayerRequestModalProps) {
  const { userProfile, currentUser } = useAuthStore();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PrayerCategory | null>(null);
  const [visibility, setVisibility] = useState<PrayerVisibility>('church_members_only');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [error, setError] = useState('');

  const resetForm = () => {
    setTitle('');
    setContent('');
    setCategory(null);
    setVisibility('church_members_only');
    setIsAnonymous(false);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = () => {
    if (!title.trim()) return 'Title is required.';
    if (!content.trim()) return 'Prayer request content is required.';
    if (content.trim().length < 10) return 'Prayer request must be at least 10 characters.';
    if (!category) return 'Category is required.';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError('');

    const churchId = userProfile?.churchId;
    const userId = currentUser?.uid;
    const memberId = userProfile?.memberId;

    if (!churchId || !userId) {
      setError('Missing church or user information.');
      return;
    }

    setIsSubmitting(true);
    try {
      const status: PrayerStatus = visibility === 'church_members_only' ? 'pending' : 'approved';

      await prayerRepository.submitPrayerRequest({
        churchId,
        userId,
        memberId: memberId || undefined,
        title: title.trim(),
        content: content.trim(),
        category: category!,
        visibility,
        isAnonymous,
        status,
        name: (userProfile?.name as string) || (currentUser?.displayName as string) || 'Anonymous',
        createdBy: userId,
      });

      Alert.alert(
        'Request Submitted',
        'Prayer request submitted. Our church family will pray with you.',
        [{ text: 'OK', onPress: handleClose }]
      );
    } catch (e: any) {
      console.error(e);
      setError('Failed to submit prayer request. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppModal isOpen={isOpen} onClose={handleClose} title="Submit Prayer Request" headerTitleAlign="center">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scrollContainer} contentContainerStyle={{ paddingBottom: 40 }}>
          
          <Text style={styles.subtitle}>How can we pray for you?</Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Title <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Pray for my mother's health"
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={(text) => { setTitle(text); setError(''); }}
              maxLength={100}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Request Details <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Share your prayer request here..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={content}
              onChangeText={(text) => { setContent(text); setError(''); }}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Category <Text style={styles.required}>*</Text></Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  activeOpacity={0.7}
                  onPress={() => setCategory(cat.value)}
                  style={[styles.categoryPill, category === cat.value && styles.categoryPillActive]}
                >
                  <Text style={[styles.categoryPillText, category === cat.value && styles.categoryPillTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Visibility</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={styles.radioOption}
                activeOpacity={0.8}
                onPress={() => setVisibility('church_members_only')}
              >
                <View style={[styles.radioDot, visibility === 'church_members_only' && styles.radioDotActive]}>
                  {visibility === 'church_members_only' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioLabel}>Share with Church</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.radioOption}
                activeOpacity={0.8}
                onPress={() => setVisibility('leaders_only')}
              >
                <View style={[styles.radioDot, visibility === 'leaders_only' && styles.radioDotActive]}>
                  {visibility === 'leaders_only' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioLabel}>Private to Pastors/Admins</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.label}>Post anonymously</Text>
              <Text style={styles.helperText}>Hide your name from other members</Text>
            </View>
            <Switch
              value={isAnonymous}
              onValueChange={setIsAnonymous}
              trackColor={{ false: '#E5E7EB', true: '#FFB6D0' }}
              thumbColor={isAnonymous ? '#FF6596' : '#f4f3f4'}
            />
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={isSubmitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.submitBtnContainer, isSubmitting && { opacity: 0.7 }]} 
              activeOpacity={0.8} 
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={['#FF6596', '#FF8AAB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtn}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Prayer Request</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 16,
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  categoryScroll: {
    flexDirection: 'row',
    overflow: 'visible',
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryPillActive: {
    backgroundColor: '#FFF0F5',
    borderColor: '#FFB6D0',
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryPillTextActive: {
    color: '#FF6596',
  },
  radioGroup: {
    gap: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioDotActive: {
    borderColor: '#FF6596',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6596',
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#4B5563',
    fontSize: 15,
    fontWeight: '700',
  },
  submitBtnContainer: {
    flex: 2,
    borderRadius: 24,
    overflow: 'hidden',
  },
  submitBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
