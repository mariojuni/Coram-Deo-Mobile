import { useRouter } from 'expo-router';
import { AlertCircle, ArrowLeft, CheckCircle2, User, Mail } from 'lucide-react-native';
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
import { getAuth, signInWithPhoneNumber, sendPasswordResetEmail } from '@react-native-firebase/auth';
import { PrimaryGradientButton } from '../../components/ui/PrimaryGradientButton';

export default function ForgotPasswordScreen() {
  const [identifier, setIdentifier] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const router = useRouter();

  const handleSubmit = async () => {
    const trimmed = identifier.trim();
    if (!trimmed) {
      setErrorMsg('Please enter your email address or phone number.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    const isEmail = trimmed.includes('@');
    const auth = getAuth();

    try {
      if (isEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
          throw new Error('Please enter a valid email address.');
        }
        
        try {
          await sendPasswordResetEmail(auth, trimmed);
        } catch (emailErr: any) {
          // Silently succeed for user-not-found to prevent email enumeration
          if (emailErr.code !== 'auth/user-not-found') {
            throw emailErr;
          }
        }
        
        setIsSuccess(true);
      } else {
        // Assume phone number if no '@' is present
        const phoneNoSpaces = trimmed.replace(/\s+/g, '');
        const phoneRegex = /^\+?[0-9\-]+$/;
        
        if (!phoneRegex.test(phoneNoSpaces) || phoneNoSpaces.replace(/\D/g, '').length < 7) {
          throw new Error('Please enter a valid phone number with your country code (e.g. +1234567890).');
        }
        
        // This disables the strict APNs/reCAPTCHA app verification check specifically for simulators
        // so that Test Phone Numbers can be used seamlessly!
        auth.settings.appVerificationDisabledForTesting = true;
        
        const confirmation = await signInWithPhoneNumber(auth, phoneNoSpaces);
        
        router.push({
          pathname: '/(auth)/verify-otp-reset',
          params: { verificationId: confirmation.verificationId, phoneNumber: phoneNoSpaces }
        });
      }
    } catch (error: any) {
      console.error("Caught Error:", error);
      setErrorMsg(error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.spacer} />

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              accessibilityLabel="Back to login"
              accessibilityRole="button"
            >
              <ArrowLeft size={24} color="#1a1a1a" />
            </TouchableOpacity>

            <View style={styles.authHeader}>
              <Text style={styles.title} accessibilityRole="header">
                Reset Password
              </Text>
              {!isSuccess && (
                <Text style={styles.subtitle}>
                  Enter your email address or phone number connected to your account. We'll send you a link or code to reset your password.
                </Text>
              )}
            </View>

            {isSuccess ? (
              <View
                style={styles.successContainer}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                <View style={styles.iconWrapper}>
                  <CheckCircle2 size={32} color="#10B981" />
                </View>
                <Text style={styles.successTitle}>Check your email</Text>
                <Text style={styles.successText}>
                  We've sent a password reset link to{'\n'}
                  <Text style={styles.highlightText}>{identifier}</Text>
                </Text>
                
                <PrimaryGradientButton
                  title="Back to Login"
                  onPress={() => router.push('/(auth)/login')}
                  style={{ width: '100%', marginTop: 8 }}
                />
              </View>
            ) : (
              <View>
                {!!errorMsg && (
                  <View
                    style={styles.errorContainer}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="assertive"
                  >
                    <AlertCircle size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                )}

                <View style={styles.formGroup}>
                  <View style={styles.inputWrapper}>
                    <User size={18} color="#888" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email or Phone (e.g. +1234567890)"
                      placeholderTextColor="#888"
                      value={identifier}
                      onChangeText={setIdentifier}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      accessibilityLabel="Email or Phone number"
                      accessibilityHint="Enter your email or phone number to receive a reset link or code"
                      editable={!isLoading}
                    />
                  </View>
                </View>

                <PrimaryGradientButton
                  title="Continue"
                  onPress={handleSubmit}
                  loading={isLoading}
                  style={{ marginTop: 16 }}
                />
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  spacer: {
    height: 40,
  },
  backButton: {
    marginBottom: 24,
    alignSelf: 'flex-start',
    padding: 8,
    marginLeft: -8,
  },
  authHeader: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1a1a1a',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
    lineHeight: 22,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  successText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  highlightText: {
    fontWeight: '700',
    color: '#111827',
  },
});
