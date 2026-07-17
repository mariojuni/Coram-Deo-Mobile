import { useRouter } from 'expo-router';
import { ChevronRight, LogOut, Shield, User, BookOpen, Activity, Settings, Camera, ChevronLeft } from 'lucide-react-native';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert, Dimensions, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '@/store/useAuthStore';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';

const { width } = Dimensions.get('window');

const BACKGROUND_GRADIENT = ['#F9FAFB', '#F3F4F6'] as const;

function ModernRow({ icon, label, onPress, isDestructive = false }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
    >
      <Animated.View style={[styles.row, { transform: [{ scale }] }]}>
        <View style={styles.rowLeft}>
          <View style={[styles.iconContainer, isDestructive && { backgroundColor: '#FEE2E2' }]}>
            {icon}
          </View>
          <Text style={[styles.rowLabel, isDestructive && { color: '#EF4444' }]}>{label}</Text>
        </View>
        {!isDestructive && <ChevronRight size={18} color="#C1C7D0" />}
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userProfile = useAuthStore((state) => state.userProfile);
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Sign Out', 
        style: 'destructive', 
        onPress: async () => {
          try {
            await logout();
            router.replace('/(auth)/login');
          } catch (error) {
            console.error('Logout failed:', error);
          }
        }
      }
    ]);
  };

  const dbName = [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ');
  const fullName = dbName || currentUser?.displayName || 'Member';
  const firstName = userProfile?.firstName || fullName.split(' ')[0] || 'U';
  const initials = firstName.charAt(0).toUpperCase();
  const photoUrl = userProfile?.photoUrl || currentUser?.photoURL;
  const status = userProfile?.status || 'Active';
  const primaryRole = userProfile?.primaryRole || userProfile?.role || 'Member';

  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Soft Modern Background */}
      <LinearGradient colors={BACKGROUND_GRADIENT} style={StyleSheet.absoluteFill} />

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 24) }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.7)' }]} pointerEvents="none" />
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.headerCircle} onPress={() => router.back()} hitSlop={8} activeOpacity={0.8}>
            <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Profile</Text>
          <View style={[styles.headerCircle, { backgroundColor: 'transparent', borderWidth: 0, elevation: 0 }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 24) + 80 }]} showsVerticalScrollIndicator={false}>

        {/* Profile Header Card */}
          <LinearGradient
            colors={['#FFFFFF', '#FFFFFF']}
            style={styles.profileCard}
          >
            <View style={styles.avatarContainer}>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.avatar} />
              ) : (
                <LinearGradient colors={['#A78BFA', '#F472B6']} style={styles.avatarInitials}>
                  <Text style={styles.avatarInitialsText}>{initials}</Text>
                </LinearGradient>
              )}
              <TouchableOpacity style={styles.editAvatarBtn} onPress={() => router.push('/profile/edit-profile')} activeOpacity={0.8}>
                <Camera size={14} color="#FFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.name}>{fullName}</Text>
            <View style={styles.badges}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{primaryRole}</Text>
              </View>
              {status === 'active' && (
                <View style={[styles.badge, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={[styles.badgeText, { color: '#059669' }]}>Active Member</Text>
                </View>
              )}
            </View>
          </LinearGradient>

          {/* Settings Sections */}
          <View style={styles.section}>
            {renderSectionHeader('Personal Information')}
            <View style={styles.cardGroup}>
              <ModernRow 
                icon={<User size={18} color="#007AFF" />} 
                label="Edit Profile" 
                onPress={() => router.push('/profile/edit-profile')} 
              />
              <View style={styles.divider} />
              <ModernRow 
                icon={<Activity size={18} color="#8B5CF6" />} 
                label="My QR Pass" 
                onPress={() => router.push('/my-qr')} 
              />
            </View>
          </View>

          <View style={styles.section}>
            {renderSectionHeader('Account Security')}
            <View style={styles.cardGroup}>
              <ModernRow 
                icon={<Shield size={18} color="#10B981" />} 
                label="Change Email" 
                onPress={() => router.push({ pathname: '/profile/account-security', params: { type: 'email' } })} 
              />
              <View style={styles.divider} />
              <ModernRow 
                icon={<Shield size={18} color="#F59E0B" />} 
                label="Change Password" 
                onPress={() => router.push({ pathname: '/profile/account-security', params: { type: 'password' } })} 
              />
            </View>
          </View>

          <View style={styles.section}>
            {renderSectionHeader('My Activity')}
            <View style={styles.cardGroup}>
              <ModernRow 
                icon={<BookOpen size={18} color="#EC4899" />} 
                label="Highlighted Verses" 
                onPress={() => router.push('/profile/highlighted-verses')} 
              />
            </View>
          </View>

          <View style={styles.section}>
            {renderSectionHeader('Preferences')}
            <View style={styles.cardGroup}>
              <ModernRow 
                icon={<LogOut size={18} color="#EF4444" />} 
                label="Sign Out" 
                onPress={handleLogout}
                isDestructive
              />
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginHorizontal: 12,
  },

  profileCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    backgroundColor: '#fff',
    position: 'relative'
  },
  avatar: { width: '100%', height: '100%', borderRadius: 48 },
  avatarInitials: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: { color: '#fff', fontSize: 36, fontWeight: '800' },
  editAvatarBtn: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#111827',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  name: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12, letterSpacing: -0.5 },
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  badge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  badgeText: { fontSize: 13, fontWeight: '600', color: '#4B5563', textTransform: 'capitalize' },

  section: { marginBottom: 28 },
  sectionHeader: { marginBottom: 12, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  cardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontSize: 16, fontWeight: '600', color: '#111827' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 72 },
});
