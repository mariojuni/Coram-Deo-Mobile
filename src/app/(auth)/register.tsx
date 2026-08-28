import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { AlertCircle, Calendar, Heart, Lock, Mail, MapPin, Phone, User, ArrowLeft, ArrowRight, Eye, EyeOff, ChevronDown, Check } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import CustomDatePicker from '@/components/CustomDatePicker';
import AppModal from '@/components/ui/AppModal';
import { useAuthStore } from '../../store/useAuthStore';
import { authRepository } from '../../features/auth/data/auth.repository';
import { PrimaryGradientButton } from '../../components/ui/PrimaryGradientButton';

function formatDateToMDYYYY(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function formatPHPhoneNumber(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('63')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);

  if (digits.length === 0) return '+63 ';
  if (digits.length <= 3) return `+63 ${digits}`;
  if (digits.length <= 6) return `+63 ${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

function validatePasswordRequirements(pwd: string): string | null {
  if (pwd.length < 6) {
    return 'Password must be at least 6 characters long';
  }
  if (!/[A-Z]/.test(pwd)) {
    return 'Password must contain at least one uppercase letter (A-Z)';
  }
  if (!/[a-z]/.test(pwd)) {
    return 'Password must contain at least one lowercase letter (a-z)';
  }
  if (!/[0-9]/.test(pwd)) {
    return 'Password must contain at least one numeric character (0-9)';
  }
  if (!/[^A-Za-z0-9]/.test(pwd)) {
    return 'Password must contain at least one special character (!@#$%^&* etc.)';
  }
  return null;
}

const GENDER_OPTIONS = ['Male', 'Female'];

export default function RegisterScreen() {
  const [step, setStep] = useState(1);

  // Account Info
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Personal Details
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [birthdayDate, setBirthdayDate] = useState<Date>(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('');
  const [showGenderModal, setShowGenderModal] = useState(false);
  
  // Contact Info
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+63 ');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const router = useRouter();
  const signup = useAuthStore((state) => state.signup);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);

  const handleNext = async () => {
    setErrorMsg('');
    if (step === 1) {
      if (!username.trim() || !password || !confirmPassword) {
        setErrorMsg('Please fill in all required fields (*)');
        return;
      }
      const pwdError = validatePasswordRequirements(password);
      if (pwdError) {
        setErrorMsg(pwdError);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match');
        return;
      }

      setIsLoading(true);
      try {
        const isTaken = await authRepository.checkUsernameTaken(username);
        if (isTaken) {
          setErrorMsg('Username is already taken. Please choose another username.');
          return;
        }
      } catch (err) {
        // proceed
      } finally {
        setIsLoading(false);
      }

      setStep(2);
    } else if (step === 2) {
      if (!firstName.trim() || !lastName.trim()) {
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

    if (email.trim()) {
      try {
        const isEmailTaken = await authRepository.checkEmailTaken(email);
        if (isEmailTaken) {
          setErrorMsg('An account with this email already exists. Please log in instead.');
          setIsLoading(false);
          return;
        }
      } catch (err) {
        // proceed
      }
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const finalPhone = cleanPhone === '63' || cleanPhone === '' ? '' : phoneNumber.replace(/\s+/g, '').trim();

    try {
      await signup({
        username,
        password,
        firstName,
        middleName,
        lastName,
        birthDate: birthday,
        birthday,
        gender,
        email,
        phoneNumber: finalPhone,
        address,
        emergencyContact,
      });
      // Show success modal upon registration completion
      setShowSuccessModal(true);
    } catch (error: any) {
      const msg = error?.message || 'Registration failed. Please check your details.';
      setErrorMsg(msg);
      // Automatically redirect user back to Step 1 if error is password or username related
      const lower = msg.toLowerCase();
      if (lower.includes('password') || lower.includes('username')) {
        setStep(1);
      }
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
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor="#888"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIconBtn}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      {showPassword ? <EyeOff size={20} color="#888" /> : <Eye size={20} color="#888" />}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.passwordRequirementsBox}>
                    <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                    <View style={styles.requirementRow}>
                      <Check size={14} color={password.length >= 6 ? '#10B981' : '#9CA3AF'} />
                      <Text style={[styles.requirementText, password.length >= 6 && styles.requirementMet]}>
                        At least 6 characters
                      </Text>
                    </View>
                    <View style={styles.requirementRow}>
                      <Check size={14} color={/[A-Z]/.test(password) ? '#10B981' : '#9CA3AF'} />
                      <Text style={[styles.requirementText, /[A-Z]/.test(password) && styles.requirementMet]}>
                        One uppercase letter (A-Z)
                      </Text>
                    </View>
                    <View style={styles.requirementRow}>
                      <Check size={14} color={/[a-z]/.test(password) ? '#10B981' : '#9CA3AF'} />
                      <Text style={[styles.requirementText, /[a-z]/.test(password) && styles.requirementMet]}>
                        One lowercase letter (a-z)
                      </Text>
                    </View>
                    <View style={styles.requirementRow}>
                      <Check size={14} color={/[0-9]/.test(password) ? '#10B981' : '#9CA3AF'} />
                      <Text style={[styles.requirementText, /[0-9]/.test(password) && styles.requirementMet]}>
                        One numeric character (0-9)
                      </Text>
                    </View>
                    <View style={styles.requirementRow}>
                      <Check size={14} color={/[^A-Za-z0-9]/.test(password) ? '#10B981' : '#9CA3AF'} />
                      <Text style={[styles.requirementText, /[^A-Za-z0-9]/.test(password) && styles.requirementMet]}>
                        One special character (!@#$%^&* etc.)
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Confirm Password *</Text>
                  <View style={styles.inputWrapper}>
                    <Lock size={18} color="#888" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm Password"
                      placeholderTextColor="#888"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeIconBtn}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      {showPassword ? <EyeOff size={20} color="#888" /> : <Eye size={20} color="#888" />}
                    </TouchableOpacity>
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
                  <TouchableOpacity
                    style={styles.inputWrapper}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.8}
                  >
                    <Calendar size={18} color="#888" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="M/D/YYYY (e.g. 6/17/1996)"
                      placeholderTextColor="#888"
                      value={birthday}
                      editable={false}
                      pointerEvents="none"
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Gender</Text>
                  <TouchableOpacity
                    style={styles.inputWrapper}
                    onPress={() => setShowGenderModal(true)}
                    activeOpacity={0.8}
                  >
                    <User size={18} color="#888" style={styles.inputIcon} />
                    <Text style={[styles.input, styles.selectInputText, !gender && styles.placeholderText]}>
                      {gender || 'Select Gender'}
                    </Text>
                    <ChevronDown size={18} color="#888" />
                  </TouchableOpacity>
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
                    <TextInput
                      style={styles.input}
                      placeholder="+63 9XX XXX XXXX"
                      placeholderTextColor="#888"
                      value={phoneNumber}
                      onChangeText={(text) => setPhoneNumber(formatPHPhoneNumber(text))}
                      keyboardType="phone-pad"
                    />
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
                <PrimaryGradientButton
                  title={step === 3 ? 'Register' : 'Next Step'}
                  onPress={step === 3 ? handleRegister : handleNext}
                  loading={isLoading}
                  iconRight={step !== 3 ? <ArrowRight size={20} color="#fff" /> : undefined}
                />
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

        <CustomDatePicker
          visible={showDatePicker}
          date={birthdayDate}
          onConfirm={(selectedDate) => {
            setBirthdayDate(selectedDate);
            setBirthday(formatDateToMDYYYY(selectedDate));
            setShowDatePicker(false);
          }}
          onCancel={() => setShowDatePicker(false)}
          minimumDate={new Date(1920, 0, 1)}
          maximumDate={new Date()}
          accentColor="#B66DFF"
        />

        {/* Gender Selection Modal using standard AppModal */}
        <AppModal
          isOpen={showGenderModal}
          onClose={() => setShowGenderModal(false)}
          title="Select Gender"
          dynamicHeight={true}
          heightRatio={0.35}
          containerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        >
          <View style={styles.genderOptionsContainer}>
            {GENDER_OPTIONS.map((option) => {
              const isSelected = gender === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.genderOptionCard, isSelected && styles.genderOptionCardSelected]}
                  onPress={() => {
                    setGender(option);
                    setShowGenderModal(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.genderOptionText, isSelected && styles.genderOptionTextSelected]}>
                    {option}
                  </Text>
                  {isSelected && <Check size={20} color="#B66DFF" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </AppModal>

        {/* Registration Success Confirmation Modal */}
        <Modal
          visible={showSuccessModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowSuccessModal(false);
            router.replace('/(auth)/login');
          }}
        >
          <View style={styles.successModalOverlay}>
            <View style={styles.successModalCard}>
              <View style={styles.successIconCircle}>
                <Check size={36} color="#FFFFFF" strokeWidth={3} />
              </View>
              <Text style={styles.successModalTitle}>Registration Successful!</Text>
              <Text style={styles.successModalSubtitle}>
                Your account has been created successfully. Please log in with your credentials to continue.
              </Text>
              <TouchableOpacity
                style={styles.successModalButton}
                activeOpacity={0.85}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.replace('/(auth)/login');
                }}
              >
                <Text style={styles.successModalButtonText}>Go to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  selectInputText: {
    lineHeight: 56,
  },
  placeholderText: {
    color: '#888888',
  },
  eyeIconBtn: {
    padding: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalHeaderBtn: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  genderOptionsContainer: {
    paddingVertical: 12,
    gap: 12,
  },
  genderOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  genderOptionCardSelected: {
    backgroundColor: '#F5F3FF',
    borderColor: '#B66DFF',
  },
  genderOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  genderOptionTextSelected: {
    color: '#B66DFF',
    fontWeight: '700',
  },
  passwordRequirementsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  requirementMet: {
    color: '#10B981',
    fontWeight: '700',
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  successModalSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  successModalButton: {
    width: '100%',
    backgroundColor: '#B66DFF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  successModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
