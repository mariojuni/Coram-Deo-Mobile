import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { AlertCircle, Calendar, Heart, Lock, Mail, MapPin, Phone, User, ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/useAuthStore';


export default function RegisterScreen() {
  const [step, setStep] = useState(1);

  // Account Info
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Personal Details
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('');
  
  // Contact Info
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const router = useRouter();
  const signup = useAuthStore((state) => state.signup);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);

  const handleNext = () => {
    setErrorMsg('');
    if (step === 1) {
      if (!username || !password || !confirmPassword) {
        setErrorMsg('Please fill in all required fields (*)');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!firstName || !lastName) {
        setErrorMsg('Please fill in all required fields (*)');
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    setErrorMsg('');
    if (step > 1) {
      setStep(step - 1);
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(auth)/login');
      }
    }
  };

  const handleRegister = async () => {
    setErrorMsg('');
    setIsLoading(true);

    try {
      await signup({
        username,
        password,
        firstName,
        middleName,
        lastName,
        birthday,
        gender,
        email,
        phoneNumber,
        address,
        emergencyContact,
      });
      // Will auto redirect in layout if auth state changes
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
      setErrorMsg(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => {
    return (
      <View style={styles.stepContainer}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.stepDot, step >= i && styles.stepDotActive]} />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* <AuthGeometricHeader /> */}
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            
            <View style={styles.topNav}>
              <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
                <ArrowLeft size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            <View style={styles.spacer} />

            <View style={styles.authHeader}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                {step === 1 ? 'Step 1: Account Information' : step === 2 ? 'Step 2: Personal Details' : 'Step 3: Contact Information'}
              </Text>
            </View>

            {renderStepIndicator()}

            {!!errorMsg && (
              <View style={styles.errorContainer}>
                <AlertCircle size={16} color="#EF4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {step === 1 && (
              <View style={styles.section}>
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Username *</Text>
                  <View style={styles.inputWrapper}>
                    <User size={18} color="#888" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Username" placeholderTextColor="#888" value={username} onChangeText={setUsername} autoCapitalize="none" />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Password *</Text>
                  <View style={styles.inputWrapper}>
                    <Lock size={18} color="#888" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#888" value={password} onChangeText={setPassword} secureTextEntry />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Confirm Password *</Text>
                  <View style={styles.inputWrapper}>
                    <Lock size={18} color="#888" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Confirm Password" placeholderTextColor="#888" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
                  </View>
                </View>
              </View>
            )}

            {step === 2 && (
              <View style={styles.section}>
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>First Name *</Text>
                  <View style={styles.inputWrapper}>
                    <User size={18} color="#888" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="First Name" placeholderTextColor="#888" value={firstName} onChangeText={setFirstName} />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Middle Name</Text>
                  <View style={styles.inputWrapper}>
                    <User size={18} color="#888" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Middle Name" placeholderTextColor="#888" value={middleName} onChangeText={setMiddleName} />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Last Name *</Text>
                  <View style={styles.inputWrapper}>
                    <User size={18} color="#888" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Last Name" placeholderTextColor="#888" value={lastName} onChangeText={setLastName} />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Birthday</Text>
                  <View style={styles.inputWrapper}>
                    <Calendar size={18} color="#888" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#888" value={birthday} onChangeText={setBirthday} />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Gender</Text>
                  <View style={styles.inputWrapper}>
                    <User size={18} color="#888" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Male/Female" placeholderTextColor="#888" value={gender} onChangeText={setGender} />
                  </View>
                </View>
              </View>
            )}

            {step === 3 && (
              <View style={styles.section}>
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Email *</Text>
                  <View style={styles.inputWrapper}>
                    <Mail size={18} color="#888" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#888" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={styles.inputWrapper}>
                    <Phone size={18} color="#888" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Phone Number" placeholderTextColor="#888" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Full Address</Text>
                  <View style={styles.inputWrapper}>
                    <MapPin size={18} color="#888" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Full Address" placeholderTextColor="#888" value={address} onChangeText={setAddress} />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Emergency Contact</Text>
                  <View style={styles.inputWrapper}>
                    <Heart size={18} color="#888" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Emergency Contact Name/Number" placeholderTextColor="#888" value={emergencyContact} onChangeText={setEmergencyContact} />
                  </View>
                </View>
              </View>
            )}

            <View style={styles.buttonContainer}>
              <View style={{ flex: 1 }}>
                <TouchableOpacity onPress={step === 3 ? handleRegister : handleNext} disabled={isLoading} activeOpacity={0.8}>
                  <LinearGradient colors={['#FF6596', '#B66DFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButton}>
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={styles.primaryButtonText}>{step === 3 ? 'Register' : 'Next Step'}</Text>
                        {step !== 3 && <ArrowRight size={20} color="#fff" style={{ marginLeft: 8 }} />}
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {step === 1 && (
              <>
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or sign up with</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialButtonsRow}>
                  <TouchableOpacity style={styles.socialIconBtn} onPress={handleGoogleLogin} disabled={isLoading} activeOpacity={0.8}>
                    <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/120px-Google_%22G%22_logo.svg.png' }} style={styles.socialIcon} contentFit="contain" />
                  </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                  <Text style={styles.footerText}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => router.push('/(auth)/login')} activeOpacity={0.8}>
                    <Text style={styles.footerLink}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </>
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
  topNav: {
    marginBottom: 16,
    marginTop: 16,
    alignSelf: 'flex-start',
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  spacer: {
    height: 60, 
  },
  authHeader: {
    marginBottom: 24,
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
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E1E4E8',
  },
  stepDotActive: {
    backgroundColor: '#FF6596',
    width: 24,
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
  section: {
    marginBottom: 8,
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginLeft: 4,
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
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
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
    marginBottom: 32,
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
