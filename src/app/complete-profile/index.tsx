import { useRouter } from 'expo-router';
import { AlertCircle, Calendar, Heart, Mail, MapPin, Phone, User, ArrowRight, ChevronDown, Check } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomDatePicker from '@/components/CustomDatePicker';
import AppModal from '@/components/ui/AppModal';
import { useAuthStore } from '../../store/useAuthStore';
import { PrimaryGradientButton } from '../../components/ui/PrimaryGradientButton';
import { getActiveFunctions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';

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

const GENDER_OPTIONS = ['Male', 'Female'];

export default function CompleteProfileScreen() {
  const [step, setStep] = useState(1);

  // Prefill values from existing user profile if any
  const userProfile = useAuthStore((state) => state.userProfile);
  
  // Personal Details
  const [firstName, setFirstName] = useState(userProfile?.firstName || '');
  const [middleName, setMiddleName] = useState(userProfile?.middleName || '');
  const [lastName, setLastName] = useState(userProfile?.lastName || '');
  const [birthday, setBirthday] = useState(userProfile?.birthday || '');
  const [birthdayDate, setBirthdayDate] = useState<Date>(
    userProfile?.birthday ? new Date(userProfile.birthday) : new Date(2000, 0, 1)
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState(userProfile?.gender || '');
  const [showGenderModal, setShowGenderModal] = useState(false);
  
  // Contact Info
  const [phoneNumber, setPhoneNumber] = useState(userProfile?.phoneNumber ? `+63 ${userProfile.phoneNumber}` : '+63 ');
  const [address, setAddress] = useState(userProfile?.address || '');
  const [emergencyContact, setEmergencyContact] = useState(userProfile?.emergencyContact || '');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const router = useRouter();
  const refreshUserProfile = useAuthStore((state) => state.refreshUserProfile);

  const handleNext = async () => {
    setErrorMsg('');
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) {
        setErrorMsg('Please fill in all required fields (*)');
        return;
      }
      setStep(2);
    }
  };

  const handleCompleteProfile = async () => {
    setErrorMsg('');
    setIsLoading(true);

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const finalPhone = cleanPhone === '63' || cleanPhone === '' ? '' : phoneNumber.replace(/\s+/g, '').trim();

    try {
      const completeOAuthProfile = httpsCallable(getActiveFunctions(), 'completeOAuthProfile');
      await completeOAuthProfile({
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        birthDate: birthday,
        gender,
        phoneNumber: finalPhone,
        address: address.trim(),
        emergencyContact: emergencyContact.trim(),
      });
      
      // Refresh profile so auth router will pick up the updated onboardingStatus
      if (refreshUserProfile) {
         await refreshUserProfile();
      }
      
      // The _layout.tsx will auto redirect us since onboardingStatus is now COMPLETED
    } catch (error: any) {
      const msg = error?.message || 'Failed to complete profile. Please check your details and try again.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => {
    return (
      <View style={styles.stepContainer}>
        {[1, 2].map((i) => (
          <View key={i} style={[styles.stepDot, step >= i && styles.stepDotActive]} />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            
            <View style={styles.spacer} />

            <View style={styles.authHeader}>
              <Text style={styles.title}>Complete Your Profile</Text>
              <Text style={styles.subtitle}>
                {step === 1 ? 'Step 1: Personal Details' : 'Step 2: Contact Information'}
              </Text>
              <Text style={styles.description}>
                Please complete your profile to continue using the application.
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

            {step === 2 && (
              <View style={styles.section}>
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
              {step === 2 && (
                <View style={{ flex: 1 }}>
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: '#F3F4F6' }]}
                    onPress={() => setStep(1)}
                    disabled={isLoading}
                  >
                    <Text style={[styles.primaryButtonText, { color: '#666' }]}>Back</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ flex: step === 2 ? 1 : undefined, width: step === 1 ? '100%' : undefined }}>
                <PrimaryGradientButton
                  title={step === 2 ? 'Complete' : 'Next Step'}
                  onPress={step === 2 ? handleCompleteProfile : handleNext}
                  loading={isLoading}
                  iconRight={step !== 2 ? <ArrowRight size={20} color="#fff" /> : undefined}
                />
              </View>
            </View>
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
  description: {
    fontSize: 13,
    color: '#888',
    marginTop: 8,
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
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  genderOptionsContainer: {
    gap: 12,
  },
  genderOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genderOptionCardSelected: {
    backgroundColor: '#F5F3FF',
    borderColor: '#B66DFF',
  },
  genderOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  genderOptionTextSelected: {
    color: '#B66DFF',
  }
});
