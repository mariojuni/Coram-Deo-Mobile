import React from 'react';
import { useRouter } from 'expo-router';
import { BounceCard } from '@/components/ui/BounceCard';
import { ChevronLeft } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import { LinearGradient } from 'expo-linear-gradient';
import { useProfileDashboardData } from '@/features/profile/presentation/hooks/useProfileDashboardData';
import { ProfileHeaderCard } from '@/features/profile/presentation/components/ProfileHeaderCard';
import { MyAffiliationsSection } from '@/features/profile/presentation/components/MyAffiliationsSection';
import { ProfileActivityTabs } from '@/features/profile/presentation/components/ProfileActivityTabs';

const { width } = Dimensions.get('window');
const BACKGROUND_GRADIENT = ['#F9FAFB', '#F3F4F6'] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    userProfile,
    currentUser,
    roleChips,
    groups,
    groupsLoading,
    currentLessons,
    groupLessons,
    userMinistries,
    ministriesLoading,
    highlights,
    highlightsLoading,
    notes,
    notesLoading,
    activePlans,
    plans,
    plansLoading,
    stats,
    removeHighlight,
  } = useProfileDashboardData();

  const fullName =
    [userProfile?.firstName, userProfile?.middleName, userProfile?.lastName].filter(Boolean).join(' ') ||
    currentUser?.displayName ||
    'Member';
  const photoUrl = userProfile?.photoUrl || currentUser?.photoURL;
  const status = userProfile?.status || 'Active';
  const churchName = (userProfile as any)?.churchName;

  return (
    <View style={styles.container}>
      {/* Soft Modern Background */}
      <LinearGradient colors={BACKGROUND_GRADIENT} style={StyleSheet.absoluteFill} />

      {/* ─── Top Toolbar Navigation ─────────────────────────────────────── */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 24) }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.7)' }]} pointerEvents="none" />
        <View style={styles.headerContent}>
          <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={() => router.back()} hitSlop={8} activeOpacity={0.8}>
            <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
          </BounceCard>

          <Text style={styles.headerTitle} numberOfLines={1}>Personal Dashboard</Text>

          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 24) + 70 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Hero Profile Card */}
        <ProfileHeaderCard
          fullName={fullName}
          photoUrl={photoUrl}
          churchName={churchName}
          roleChips={roleChips}
          status={status}
          stats={stats}
          onEditAvatar={() => router.push('/profile/edit-profile')}
          onSettingsPress={() => router.push('/profile/settings')}
        />

        {/* 3. My Affiliations */}
        <MyAffiliationsSection
          groups={groups}
          groupsLoading={groupsLoading}
          currentLessons={currentLessons}
          groupLessons={groupLessons}
          userMinistries={userMinistries}
          ministriesLoading={ministriesLoading}
          roleChips={roleChips}
          memberId={userProfile?.memberId}
          userId={currentUser?.uid}
        />

        {/* 4. Activity Tabs Feed */}
        <ProfileActivityTabs
          highlights={highlights}
          highlightsLoading={highlightsLoading}
          notes={notes}
          notesLoading={notesLoading}
          activePlans={activePlans}
          plansMeta={plans}
          plansLoading={plansLoading}
          onRemoveHighlight={removeHighlight}
        />

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
});
