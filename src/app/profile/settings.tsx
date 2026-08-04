import React, { useRef } from 'react';
import { useRouter } from 'expo-router';
import { BounceCard } from '@/components/ui/BounceCard';
import { ChevronRight, LogOut, Shield, User, Activity, ChevronLeft, Lock } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { getSoftShadowStyle, getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import { useAuthStore } from '@/store/useAuthStore';
import { LinearGradient } from 'expo-linear-gradient';

const BACKGROUND_GRADIENT = ['#F9FAFB', '#F3F4F6'] as const;

function ModernSettingRow({ icon, label, subtitle, onPress, isDestructive = false }: any) {
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
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, isDestructive && { color: '#EF4444' }]}>{label}</Text>
            {!!subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
          </View>
        </View>
        {!isDestructive && <ChevronRight size={18} color="#C1C7D0" />}
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function AccountSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userProfile = useAuthStore((state) => state.userProfile);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of your account?', [
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
        },
      },
    ]);
  };

  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={BACKGROUND_GRADIENT} style={StyleSheet.absoluteFill} />

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 24) }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.7)' }]} pointerEvents="none" />
        <View style={styles.headerContent}>
          <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={() => router.back()} hitSlop={8} activeOpacity={0.8}>
            <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
          </BounceCard>
          <Text style={styles.headerTitle} numberOfLines={1}>Account Settings</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 24) + 70 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Personal Information */}
        <View style={styles.section}>
          {renderSectionHeader('Personal Information')}
          <View style={styles.cardGroup}>
            <ModernSettingRow
              icon={<User size={18} color="#007AFF" />}
              label="Edit Personal Details"
              subtitle="Name, phone number, bio, and avatar"
              onPress={() => router.push('/profile/edit-profile')}
            />
            <View style={styles.divider} />
            <ModernSettingRow
              icon={<Activity size={18} color="#8B5CF6" />}
              label="My Check-in QR Pass"
              subtitle="Scan for attendance check-ins"
              onPress={() => router.push('/my-qr')}
            />
          </View>
        </View>

        {/* Account Security */}
        <View style={styles.section}>
          {renderSectionHeader('Account Security')}
          <View style={styles.cardGroup}>
            <ModernSettingRow
              icon={<Shield size={18} color="#10B981" />}
              label="Update Email Address"
              subtitle={userProfile?.email || 'Manage account email'}
              onPress={() => router.push({ pathname: '/profile/account-security', params: { type: 'email' } })}
            />
            <View style={styles.divider} />

            {userProfile?.providers?.includes('password') ? (
              <ModernSettingRow
                icon={<Lock size={18} color="#F59E0B" />}
                label="Change Password"
                subtitle="Update your account password"
                onPress={() => router.push({ pathname: '/profile/account-security', params: { type: 'password' } })}
              />
            ) : (
              <ModernSettingRow
                icon={<Lock size={18} color="#EF4444" />}
                label="Set Password"
                subtitle="Create a password for email login"
                onPress={() => router.push({ pathname: '/profile/account-security', params: { type: 'set_password' } })}
              />
            )}
          </View>
        </View>

        {/* Session Management */}
        <View style={styles.section}>
          {renderSectionHeader('Session & Security')}
          <View style={styles.cardGroup}>
            <ModernSettingRow
              icon={<LogOut size={18} color="#EF4444" />}
              label="Sign Out"
              subtitle="Safely sign out of this device"
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

  section: { marginBottom: 24 },
  sectionHeader: { marginBottom: 10, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },

  cardGroup: {
    ...(getSoftShadowStyle(20) as any),
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    marginRight: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  rowSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 70 },
});
