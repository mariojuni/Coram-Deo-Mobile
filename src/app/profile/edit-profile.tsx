import React, { useState, useEffect } from 'react';
import { BounceCard } from '@/components/ui/BounceCard';
import AppModal, { ModalDragArea } from '@/components/ui/AppModal';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, Check, X, User, Calendar, ChevronDown, Phone, MapPin, Heart } from 'lucide-react-native';
import CustomDatePicker from '@/components/CustomDatePicker';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getActiveDb, getActiveStorage } from '../../firebase';
import { useAuthStore } from '@/store/useAuthStore';
import { canEditOwnProfile } from '@/permissions/mobilePermissions';
import { LinearGradient } from 'expo-linear-gradient';
import { getTopBarButtonShadowStyle, getSoftShadowStyle } from '@/components/ui/SoftCard';

export default function EditProfileScreen() {
  const router = useRouter();
  const userProfile = useAuthStore((s) => s.userProfile);
  const currentUser = useAuthStore((s) => s.currentUser);
  const updateUserProfile = useAuthStore((s) => s.updateUserProfile);

  const insets = useSafeAreaInsets();
  
  const dbName = [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ');
  const parts = dbName.trim().split(' ');
  const defaultFirstName = parts[0] || '';
  const defaultLastName = parts.slice(1).join(' ') || '';

  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(userProfile?.photoUrl || currentUser?.photoURL || '');
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const formatDateToMDYYYY = (date: Date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };
  
  const GENDER_OPTIONS = ['Male', 'Female'];
  const [formData, setFormData] = useState({
    firstName: userProfile?.firstName || defaultFirstName,
    middleName: userProfile?.middleName || '',
    lastName: userProfile?.lastName || defaultLastName,
    phoneNumber: userProfile?.phoneNumber || currentUser?.phoneNumber || '',
    birthDate: userProfile?.birthDate || userProfile?.birthday || '',
    address: userProfile?.address || '',
    gender: userProfile?.gender || '',
    emergencyContact: userProfile?.emergencyContact || '',
  });

  const initialDate = formData.birthDate ? new Date(formData.birthDate) : new Date(2000, 0, 1);
  const [birthdayDate, setBirthdayDate] = useState<Date>(
    isNaN(initialDate.getTime()) ? new Date(2000, 0, 1) : initialDate
  );

  useEffect(() => {
    if (!canEditOwnProfile(userProfile)) {
      Alert.alert('Access Denied', 'You do not have permission to edit this profile.');
      router.back();
    }
  }, [userProfile, router]);

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photos to update your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUrl(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string): Promise<string | null> => {
    if (!uri || uri.startsWith('http')) return null; 
    
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function() {
          resolve(xhr.response as Blob);
        };
        xhr.onerror = function(e) {
          reject(new TypeError('Network request failed'));
        };
        xhr.responseType = 'blob';
        xhr.open('GET', uri, true);
        xhr.send(null);
      });
      
      const storageRef = ref(getActiveStorage(), `user/${currentUser?.uid}/avatar`);
      await uploadBytes(storageRef, blob, { contentType: blob.type || 'image/jpeg' });
      const downloadUrl = await getDownloadURL(storageRef);
      return `${downloadUrl}&t=${Date.now()}`;
    } catch (e) {
      console.error('Upload failed:', e);
      return null;
    }
  };

  const handleSave = async () => {
    if (!currentUser || !userProfile) return;
    setLoading(true);

    try {
      let finalPhotoUrl = photoUrl;
      const uploadedUrl = await uploadAvatar(photoUrl);
      if (uploadedUrl) {
        finalPhotoUrl = uploadedUrl;
      }

      const updates: any = {
        firstName: formData.firstName ?? '',
        middleName: formData.middleName ?? '',
        lastName: formData.lastName ?? '',
        phoneNumber: formData.phoneNumber ?? '',
        birthDate: formData.birthDate ?? '',
        address: formData.address ?? '',
        gender: formData.gender ?? '',
        emergencyContact: formData.emergencyContact ?? '',
        updatedAt: serverTimestamp(),
      };
      
      // Ensure no undefined values are passed to Firestore
      Object.keys(updates).forEach(key => {
        if (updates[key] === undefined) {
          updates[key] = null;
        }
      });

      if (finalPhotoUrl) {
        updates.photoUrl = finalPhotoUrl;
      }

      const userRef = doc(getActiveDb(), 'users', userProfile.uid);
      await updateDoc(userRef, updates);

      if (userProfile.memberId && userProfile.memberId !== userProfile.uid) {
        const memberRef = doc(getActiveDb(), 'users', userProfile.memberId);
        await updateDoc(memberRef, updates);
      }
      
      updateUserProfile({
        firstName: updates.firstName,
        middleName: updates.middleName,
        lastName: updates.lastName,
        phoneNumber: updates.phoneNumber,
        birthDate: updates.birthDate,
        address: updates.address,
        gender: updates.gender,
        emergencyContact: updates.emergencyContact,
        ...(finalPhotoUrl ? { photoUrl: finalPhotoUrl } : {})
      });

      Alert.alert('Success', 'Profile updated successfully.');
      router.back();
    } catch (error) {
      console.error('Update failed:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppModal
      isOpen={true}
      onClose={() => router.back()}
      title="Edit Profile"
      hideHeader={true}
      hideDragHandle={true}
      heightRatio={0.85}
      dynamicHeight={false}
      containerStyle={{ paddingHorizontal: 0, paddingBottom: 0, backgroundColor: '#FFFFFF' }}
    >
      <LinearGradient colors={['#F3F9FF', '#FFFFFF']} style={StyleSheet.absoluteFill} />
      
      <ModalDragArea style={[styles.headerContainer, { paddingTop: 12 }]}>
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
        <View style={styles.dragHandle} />
        <View style={styles.headerContent}>
          <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={handleSave} disabled={loading} hitSlop={8} activeOpacity={0.8}>
            {loading ? <ActivityIndicator size="small" color="#007AFF" /> : <Check size={20} color="#007AFF" strokeWidth={2.5} />}
          </BounceCard>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={() => router.back()} hitSlop={8} activeOpacity={0.8}>
            <X size={24} color="#111827" strokeWidth={2} />
          </BounceCard>
        </View>
      </ModalDragArea>
      
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: 80 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            
            <View style={styles.avatarSection}>
              <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickImage} activeOpacity={0.8}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.avatar} />
                ) : (
                  <LinearGradient colors={['#FF6596', '#B66DFF']} style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>{(formData.firstName[0] || 'U').toUpperCase()}</Text>
                  </LinearGradient>
                )}
                <View style={styles.cameraIcon}>
                  <Camera size={14} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.cardGroup}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>First Name</Text>
                <View style={styles.inputWrapper}>
                  <User size={18} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.firstName}
                    onChangeText={(t) => setFormData({ ...formData, firstName: t })}
                    placeholder="E.g. John"
                    placeholderTextColor="#888"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Middle Name</Text>
                <View style={styles.inputWrapper}>
                  <User size={18} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.middleName}
                    onChangeText={(t) => setFormData({ ...formData, middleName: t })}
                    placeholder="E.g. Smith"
                    placeholderTextColor="#888"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <View style={styles.inputWrapper}>
                  <User size={18} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.lastName}
                    onChangeText={(t) => setFormData({ ...formData, lastName: t })}
                    placeholder="E.g. Doe"
                    placeholderTextColor="#888"
                  />
                </View>
              </View>
            </View>

            <View style={styles.cardGroup}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.inputWrapper}>
                  <Phone size={18} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.phoneNumber}
                    onChangeText={(t) => setFormData({ ...formData, phoneNumber: t })}
                    placeholder="+1 234 567 8900"
                    placeholderTextColor="#888"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Birth Date</Text>
                <TouchableOpacity
                  style={styles.inputWrapper}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Calendar size={18} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="M/D/YYYY"
                    placeholderTextColor="#888"
                    value={formData.birthDate as string}
                    editable={false}
                    pointerEvents="none"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.cardGroup}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Gender</Text>
                <TouchableOpacity
                  style={styles.inputWrapper}
                  onPress={() => setShowGenderModal(true)}
                  activeOpacity={0.8}
                >
                  <User size={18} color="#888" style={styles.inputIcon} />
                  <Text style={[styles.input, styles.selectInputText, !formData.gender && styles.placeholderText]}>
                    {formData.gender || 'Select Gender'}
                  </Text>
                  <ChevronDown size={18} color="#888" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Emergency Contact</Text>
                <View style={styles.inputWrapper}>
                  <Heart size={18} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.emergencyContact as string}
                    onChangeText={(t) => setFormData({ ...formData, emergencyContact: t })}
                    placeholder="Name / Phone Number"
                    placeholderTextColor="#888"
                  />
                </View>
              </View>
            </View>

            <View style={styles.cardGroup}>
              <View style={[styles.formGroup, { marginBottom: 0 }]}>
                <Text style={styles.inputLabel}>Address</Text>
                <View style={styles.inputWrapper}>
                  <MapPin size={18} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.address as string}
                    onChangeText={(t) => setFormData({ ...formData, address: t })}
                    placeholder="Enter your full address"
                    placeholderTextColor="#888"
                  />
                </View>
              </View>
            </View>



        </ScrollView>
      </KeyboardAvoidingView>
      
      <CustomDatePicker
        visible={showDatePicker}
        date={birthdayDate}
        onConfirm={(selectedDate) => {
          setBirthdayDate(selectedDate);
          setFormData({ ...formData, birthDate: formatDateToMDYYYY(selectedDate) });
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
            const isSelected = formData.gender === option;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.genderOptionCard, isSelected && styles.genderOptionCardSelected]}
                onPress={() => {
                  setFormData({ ...formData, gender: option });
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

  
  avatarSection: { alignItems: 'center', marginBottom: 32, marginTop: 12 },
  avatarWrapper: {
    width: 104, height: 104, borderRadius: 52, backgroundColor: '#fff', 
    alignItems: 'center', justifyContent: 'center', position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  avatar: { width: '100%', height: '100%', borderRadius: 52 },
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 52, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#fff', fontSize: 40, fontWeight: '800' },
  cameraIcon: {
    position: 'absolute', bottom: 0, right: 0, backgroundColor: '#111827',
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff'
  },

  cardGroup: {
    ...(getSoftShadowStyle(20) as any),
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  formGroup: { marginBottom: 20 },
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
  genderOptionsContainer: {
    gap: 12,
  },
  genderOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  genderOptionCardSelected: {
    backgroundColor: '#FDF2F8',
    borderColor: '#FF6596',
  },
  genderOptionText: {
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '500',
  },
  genderOptionTextSelected: {
    color: '#111827',
    fontWeight: '700',
  },
  saveBtn: {
    borderRadius: 16, marginTop: 12, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnGradient: {
    borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center'
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});
