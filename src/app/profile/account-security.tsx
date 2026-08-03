import React, { useState } from 'react';
import { BounceCard } from '@/components/ui/BounceCard';
import AppModal from '@/components/ui/AppModal';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, X, ShieldAlert } from 'lucide-react-native';
import { auth, db } from '../../firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updateEmail, updatePassword, linkWithCredential } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthStore } from '@/store/useAuthStore';
import { LinearGradient } from 'expo-linear-gradient';
import { getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';

export default function AccountSecurityScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams();
  const isEmail = type === 'email';
  const isSetPassword = type === 'set_password';
  
  const currentUser = useAuthStore((s) => s.currentUser);
  const userProfile = useAuthStore((s) => s.userProfile);

  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newValue, setNewValue] = useState('');
  const [confirmValue, setConfirmValue] = useState('');

  const insets = useSafeAreaInsets();

  const handleSave = async () => {
    if (!currentUser || !currentUser.email) {
      Alert.alert('Error', 'No authenticated user found.');
      return;
    }

    if (!isSetPassword && !currentPassword) {
      Alert.alert('Required', 'Please enter your current password to verify your identity.');
      return;
    }

    if (!newValue) {
      Alert.alert('Required', `Please enter a new ${isEmail ? 'email' : 'password'}.`);
      return;
    }

    if (!isEmail && newValue !== confirmValue) {
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (isSetPassword) {
        const credential = EmailAuthProvider.credential(currentUser.email, newValue);
        await linkWithCredential(currentUser, credential);
        
        if (userProfile?.uid) {
           const userRef = doc(db, 'users', userProfile.uid);
           const currentProviders = userProfile.providers || [];
           if (!currentProviders.includes('password')) {
             await updateDoc(userRef, { providers: [...currentProviders, 'password'], updatedAt: serverTimestamp() });
           }
        }
        Alert.alert('Success', 'Password set successfully. You can now sign in using Google or email and password.');
      } else {
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);

        if (isEmail) {
          await updateEmail(currentUser, newValue);
          
          if (userProfile?.uid) {
            const userRef = doc(db, 'users', userProfile.uid);
            await updateDoc(userRef, { email: newValue, updatedAt: serverTimestamp() });
          }
          if (userProfile?.memberId && userProfile.memberId !== userProfile.uid) {
            const memberRef = doc(db, 'users', userProfile.memberId);
            await updateDoc(memberRef, { email: newValue, updatedAt: serverTimestamp() });
          }
          
          Alert.alert('Success', 'Email updated successfully.');
        } else {
          await updatePassword(currentUser, newValue);
          Alert.alert('Success', 'Password updated successfully.');
        }
      }
      
      router.back();
    } catch (error: any) {
      console.error('Security update failed:', error);
      let msg = 'Failed to update. Please try again.';
      if (error.code === 'auth/wrong-password') msg = 'Incorrect current password.';
      if (error.code === 'auth/invalid-email') msg = 'The new email is invalid.';
      if (error.code === 'auth/email-already-in-use') msg = 'The new email is already in use.';
      if (error.code === 'auth/weak-password') msg = 'The new password is too weak.';
      if (error.code === 'auth/credential-already-in-use') msg = 'This credential is already in use.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppModal
      isOpen={true}
      onClose={() => router.back()}
      title={isEmail ? 'Change Email' : (isSetPassword ? 'Set Password' : 'Change Password')}
      hideHeader={true}
      hideDragHandle={true}
      heightRatio={0.85}
      dynamicHeight={false}
      containerStyle={{ paddingHorizontal: 0, paddingBottom: 0, backgroundColor: '#FFFFFF' }}
    >
      <LinearGradient colors={['#FFF5F5', '#FFFFFF']} style={StyleSheet.absoluteFill} />
      
      <View style={[styles.headerContainer, { paddingTop: 12 }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
        <View style={styles.dragHandle} />
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.headerSaveBtn} hitSlop={8}>
            {loading ? <ActivityIndicator size="small" color="#EF4444" /> : <Text style={styles.headerSaveText}>Update</Text>}
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEmail ? 'Change Email' : (isSetPassword ? 'Set Password' : 'Change Password')}</Text>
          <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={() => router.back()} hitSlop={8} activeOpacity={0.8}>
            <X size={24} color="#111827" strokeWidth={2} />
          </BounceCard>
        </View>
      </View>
      
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: 80 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            
            {!isSetPassword && (
              <>
                <View style={styles.alertCard}>
                  <View style={styles.alertIcon}>
                    <ShieldAlert size={24} color="#EF4444" />
                  </View>
                  <Text style={styles.description}>
                    For your security, please enter your current password to verify your identity before making this change.
                  </Text>
                </View>

                <View style={styles.cardGroup}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Current Password</Text>
                    <TextInput
                      style={styles.input}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder="Enter current password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </>
            )}

            <View style={styles.cardGroup}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{isEmail ? 'New Email' : 'New Password'}</Text>
                <TextInput
                  style={styles.input}
                  value={newValue}
                  onChangeText={setNewValue}
                  placeholder={isEmail ? "Enter new email address" : "Enter new password"}
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!isEmail}
                  autoCapitalize="none"
                  keyboardType={isEmail ? 'email-address' : 'default'}
                />
              </View>

              {!isEmail && (
                <View style={[styles.formGroup, { marginBottom: 0 }]}>
                  <Text style={styles.label}>Confirm New Password</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmValue}
                    onChangeText={setConfirmValue}
                    placeholder="Confirm your new password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              )}
            </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
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
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#d1d5db',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
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
  headerSaveBtn: { width: 50, alignItems: 'flex-start', justifyContent: 'center', height: 40 },
  headerSaveText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },
  
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 24,
    gap: 16,
    marginTop: 8
  },
  alertIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: { flex: 1, fontSize: 14, color: '#991B1B', lineHeight: 20, fontWeight: '500' },

  cardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16,
    fontSize: 16, color: '#111827', fontWeight: '500'
  }
});
