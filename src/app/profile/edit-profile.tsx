import React, { useState, useEffect } from 'react';
import { BounceCard } from '@/components/ui/BounceCard';
import AppModal from '@/components/ui/AppModal';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, Check, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useAuthStore } from '@/store/useAuthStore';
import { canEditOwnProfile } from '@/permissions/mobilePermissions';
import { LinearGradient } from 'expo-linear-gradient';
import { getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';

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
  const [formData, setFormData] = useState({
    firstName: userProfile?.firstName || defaultFirstName,
    middleName: userProfile?.middleName || '',
    lastName: userProfile?.lastName || defaultLastName,
    phoneNumber: userProfile?.phoneNumber || currentUser?.phoneNumber || '',
    birthDate: userProfile?.birthDate || userProfile?.birthday || '',
    address: userProfile?.address || '',
  });

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
      const churchId = userProfile?.churchId || 'default';
      const memberId = userProfile?.memberId || userProfile?.uid;
      
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `churches/${churchId}/members/${memberId}/avatar/profile.jpg`);
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
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
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        birthDate: formData.birthDate,
        address: formData.address,
        updatedAt: serverTimestamp(),
      };

      if (finalPhotoUrl) {
        updates.photoUrl = finalPhotoUrl;
      }

      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, updates);

      if (userProfile.memberId && userProfile.memberId !== userProfile.uid) {
        const memberRef = doc(db, 'users', userProfile.memberId);
        await updateDoc(memberRef, updates);
      }
      
      updateUserProfile({
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        birthDate: formData.birthDate,
        address: formData.address,
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
      
      <View style={[styles.headerContainer, { paddingTop: 12 }]} pointerEvents="box-none">
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
      </View>
      
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
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.firstName}
                  onChangeText={(t) => setFormData({ ...formData, firstName: t })}
                  placeholder="E.g. John"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Middle Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.middleName}
                  onChangeText={(t) => setFormData({ ...formData, middleName: t })}
                  placeholder="E.g. Smith"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.lastName}
                  onChangeText={(t) => setFormData({ ...formData, lastName: t })}
                  placeholder="E.g. Doe"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.cardGroup}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phoneNumber}
                  onChangeText={(t) => setFormData({ ...formData, phoneNumber: t })}
                  placeholder="+1 234 567 8900"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Birth Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.birthDate as string}
                  onChangeText={(t) => setFormData({ ...formData, birthDate: t })}
                  placeholder="1990-01-01"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.cardGroup}>
              <View style={[styles.formGroup, { marginBottom: 0 }]}>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.address as string}
                  onChangeText={(t) => setFormData({ ...formData, address: t })}
                  placeholder="Enter your full address"
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              </View>
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
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
    textAlignVertical: 'top'
  },
  saveBtn: {
    borderRadius: 16, marginTop: 12, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnGradient: {
    borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center'
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});
