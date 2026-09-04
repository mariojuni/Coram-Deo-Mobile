import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircle, ArrowLeft, Key, Lock, CheckCircle2 } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth, PhoneAuthProvider, signInWithCredential, signOut } from '@react-native-firebase/auth';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { PrimaryGradientButton } from '../../components/ui/PrimaryGradientButton';

export default function VerifyOtpResetScreen() {
  const { verificationId, phoneNumber } = useLocalSearchParams<{ verificationId: string; phoneNumber: string }>();
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const router = useRouter();

  const handleVerifyAndReset = async () => {
    if (!code.trim() || newPassword.length < 6) {
      setErrorMsg('Please enter a valid OTP and a password with at least 6 characters.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      // 1. Create credential with OTP
      const credential = PhoneAuthProvider.credential(verificationId, code);
      
      // 2. Sign in temporarily with the phone credential to get a valid token
      const auth = getAuth();
      await signInWithCredential(auth, credential);

      // 3. Call the Cloud Function to update the password using the authenticated phone context
      const fns = getFunctions();
      const resetFn = httpsCallable(fns, 'resetPasswordWithPhone');
      await resetFn({ newPassword });

      // 4. Sign out the temporary phone auth session
      await signOut(auth);
      
      setIsSuccess(true);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Failed to verify OTP or reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', padding: 32 }}>
          <View style={styles.successContainer}>
            <CheckCircle2 size={48} color="#10B981" style={{ marginBottom: 16 }} />
            <Text style={styles.title}>Password Reset</Text>
            <Text style={styles.subtitle}>Your password has been updated successfully.</Text>
            <PrimaryGradientButton
              title="Back to Login"
              onPress={() => router.push('/(auth)/login')}
              style={{ marginTop: 24, width: '100%' }}
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.spacer} />
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color="#1a1a1a" />
            </TouchableOpacity>

            <View style={styles.authHeader}>
              <Text style={styles.title}>Verify OTP</Text>
              <Text style={styles.subtitle}>Enter the code sent to {phoneNumber} and your new password.</Text>
            </View>

            {!!errorMsg && (
              <View style={styles.errorContainer}>
                <AlertCircle size={16} color="#EF4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <View style={styles.inputWrapper}>
                <Key size={18} color="#888" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="6-digit OTP Code"
                  placeholderTextColor="#888"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.inputWrapper}>
                <Lock size={18} color="#888" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  placeholderTextColor="#888"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>
            </View>

            <PrimaryGradientButton
              title="Reset Password"
              onPress={handleVerifyAndReset}
              loading={isLoading}
              style={{ marginTop: 16 }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 32, paddingBottom: 40 },
  spacer: { height: 40 },
  backButton: { marginBottom: 24, alignSelf: 'flex-start', padding: 8, marginLeft: -8 },
  authHeader: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '900', color: '#1a1a1a', marginBottom: 12, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#666', fontWeight: '500', lineHeight: 22 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12, marginBottom: 20, gap: 8 },
  errorText: { color: '#991B1B', fontSize: 14, fontWeight: '500', flex: 1 },
  formGroup: { marginBottom: 16 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 16, paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 56, fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  successContainer: { alignItems: 'center' },
});
