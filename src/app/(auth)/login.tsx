import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { AlertCircle, Lock, Mail, Eye, EyeOff } from 'lucide-react-native';
import { useState, useRef } from 'react';
import {
  ActivityIndicator,
  DevSettings,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore, clearAllCachesAndReset } from '../../store/useAuthStore';
import EnvironmentSwitcherModal from '../../components/EnvironmentSwitcherModal';
import {
  BUILD_ENV,
  AppEnvironment,
  setSavedEnvironment,
} from '../../config/environments';
import { currentActiveFirebaseEnv, reinitFirebaseForEnv } from '../../firebase';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);

  const tapTimesRef = useRef<number[]>([]);
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);

  const handleScreenTap = () => {
    // In production build, triple tap does nothing
    if (BUILD_ENV === 'production') return;

    const now = Date.now();
    // Keep taps occurring within ~900ms window
    const recentTaps = [...tapTimesRef.current, now].filter((t) => now - t <= 900);
    tapTimesRef.current = recentTaps;

    if (recentTaps.length >= 3) {
      tapTimesRef.current = [];
      setIsEnvModalOpen(true);
    }
  };

  const handleApplyEnvironment = async (targetEnv: AppEnvironment) => {
    await clearAllCachesAndReset();
    await setSavedEnvironment(targetEnv);
    await reinitFirebaseForEnv(targetEnv);

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
    } else {
      try {
        DevSettings.reload();
      } catch (e) {
        console.warn('DevSettings reload failed, navigating', e);
        router.replace('/(auth)/login');
      }
    }
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      setErrorMsg('Please enter your email/username and password');
      return;
    }
    
    setErrorMsg('');
    setIsLoading(true);
    try {
      await login(identifier, password);
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      const errorMessage = error?.message?.toLowerCase() || '';
      if (!errorMessage.includes('no id token found')) {
        setErrorMsg(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback accessibilityRole="none" onPress={handleScreenTap}>
      <View style={styles.container}>


        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              
              <View style={[styles.spacer, { justifyContent: 'center', alignItems: 'center' }]}>
                <Image 
                  source={require('../../../assets/images/logo.png')} 
                  style={{ width: 100, height: 100 }} 
                  contentFit="contain"
                />
              </View>

              <View style={styles.authHeader}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Please enter your information below to sign in.</Text>
              </View>

              {!!errorMsg && (
                  <View style={styles.errorContainer}>
                    <AlertCircle size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
              )}

              <View style={styles.formGroup}>
                <View style={styles.inputWrapper}>
                  <Mail size={18} color="#888" style={styles.inputIcon} />
                  <TextInput
                    accessibilityRole="text"
                    style={styles.input}
                    placeholder="Email or Username"
                    placeholderTextColor="#888"
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color="#888" style={styles.inputIcon} />
                  <TextInput
                    accessibilityRole="text"
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#888"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={{ padding: 8 }}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                  >
                    {showPassword ? <EyeOff size={20} color="#888" /> : <Eye size={20} color="#888" />}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.forgotPasswordContainer}>
                <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} activeOpacity={0.8} accessibilityRole="button">
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleLogin} disabled={isLoading} activeOpacity={0.8} style={{ marginTop: 8 }} accessibilityRole="button">
                <LinearGradient colors={['#FF6596', '#B66DFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButton}>
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or sign in with</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialButtonsRow}>
                <TouchableOpacity style={styles.socialIconBtn} onPress={handleGoogleLogin} disabled={isLoading} activeOpacity={0.8} accessibilityRole="button">
                  <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/120px-Google_%22G%22_logo.svg.png' }} style={styles.socialIcon} contentFit="contain" />
                </TouchableOpacity>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Don&apos;t have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/register')} activeOpacity={0.8} accessibilityRole="button">
                  <Text style={styles.footerLink}>Register</Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>

        <EnvironmentSwitcherModal
          isOpen={isEnvModalOpen}
          onClose={() => setIsEnvModalOpen(false)}
          onApplyEnv={handleApplyEnvironment}
          currentActiveEnv={currentActiveFirebaseEnv}
        />
      </View>
    </TouchableWithoutFeedback>
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
    height: 180,
  },
  authHeader: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1a1a1a',
    marginBottom: 8,
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
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#B66DFF',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#B66DFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  socialButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 40,
  },
  socialIconBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialIcon: {
    width: 24,
    height: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  footerLink: {
    color: '#B66DFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

