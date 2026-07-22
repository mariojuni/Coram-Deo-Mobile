import React, { useRef } from 'react';
import { BounceCard } from '@/components/ui/BounceCard';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { ChevronLeft, History, Heart, Globe, Building2, Wallet, Users, Church } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { useGiving } from '@/features/giving/presentation/hooks/useGiving';
import { CampaignCard } from '@/features/giving/presentation/components/CampaignCard';
import { useAuthStore } from '@/store/useAuthStore';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SoftCard, getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';

export default function GivingScreen() {
  const router = useRouter();
  const { campaigns, funds, isLoading } = useGiving();
  const { userProfile } = useAuthStore();
  const hasChurchId = !!userProfile?.churchId;
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  if (!hasChurchId) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#FFE8F1', '#F9FAFB']} style={StyleSheet.absoluteFill} />
        <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 24) }]}>
          <View style={styles.headerContent}>
            <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={() => router.back()}>
              <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
            </BounceCard>
            <Text style={styles.headerTitle} numberOfLines={1}>Giving</Text>
            <View style={[styles.headerCircle, { backgroundColor: 'transparent', borderWidth: 0, elevation: 0 }]} />
          </View>
        </View>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Heart size={40} color="#FF6596" fill="#FF6596" />
          </View>
          <Text style={styles.errorTitle}>Church Not Linked</Text>
          <Text style={styles.errorText}>
            Your account isn&apos;t linked to a church yet. Please contact your church admin to get linked so you can access giving features.
          </Text>
        </View>
      </View>
    );
  }

  const handleQuickGive = (fundType: string, fundId?: string) => {
    router.push({ pathname: '/giving-form', params: { fundType, fundId } });
  };

  const getFundTheme = (type?: string, name?: string) => {
    const key = ((type || '') + ' ' + (name || '')).toLowerCase();
    if (key.includes('tithe')) {
      return { colors: ['#FFF0F5', '#FFE8F1'], iconColor: '#FF6596', IconComponent: Wallet };
    }
    if (key.includes('offering')) {
      return { colors: ['#F0F5FF', '#E5EDFF'], iconColor: '#4D7FFF', IconComponent: Heart };
    }
    if (key.includes('mission')) {
      return { colors: ['#F5F0FF', '#EDE4FF'], iconColor: '#8B6FE8', IconComponent: Globe };
    }
    if (key.includes('building')) {
      return { colors: ['#F0FDF4', '#E1F9E8'], iconColor: '#22C55E', IconComponent: Building2 };
    }
    if (key.includes('ministry') || key.includes('youth') || key.includes('children') || key.includes('outreach')) {
      return { colors: ['#FFF7ED', '#FFEDD5'], iconColor: '#F97316', IconComponent: Users };
    }
    return { colors: ['#F5F3FF', '#EDE9FE'], iconColor: '#7C3AED', IconComponent: Church };
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const activeFunds = funds.filter(f => f.isActive !== false && (f as any).status !== 'archived' && f.visibility !== 'admin_only' && (f.visibility as string) !== 'finance_only');

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FFE8F1', '#F5F2FF', '#FAFAFA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.3 }} style={StyleSheet.absoluteFill} />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 24) }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: headerOpacity }]} pointerEvents="none">
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} />
        </Animated.View>
        <View style={styles.headerContent}>
          <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={() => router.back()}>
            <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
          </BounceCard>
          <Animated.Text style={[styles.headerTitle, { opacity: headerOpacity }]} numberOfLines={1}>
            Giving
          </Animated.Text>
          <TouchableOpacity style={styles.headerCircle} onPress={() => router.push('/my-giving')}>
            <History size={20} color="#1a1a1a" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>
      
      <Animated.ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: insets.top + 70, paddingBottom: 40 }}
      >
        
        <View style={styles.quickGiveSection}>
          <Text style={styles.sectionTitle}>Support this Ministry</Text>
          <View style={styles.quickGiveGrid}>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <SoftCard key={`fund-skel-${index}`} style={{ width: '48%', marginBottom: 12, borderRadius: 16 }} innerStyle={{ borderRadius: 15 }}>
                  <View style={[styles.quickGiveCard, { paddingVertical: 14, alignItems: 'center' }]}>
                    <ShimmerSkeleton width={40} height={40} borderRadius={20} style={{ marginBottom: 8 }} />
                    <ShimmerSkeleton width={60} height={16} borderRadius={4} />
                  </View>
                </SoftCard>
              ))
            ) : activeFunds.length > 0 ? (
              activeFunds.map((fund) => {
                const theme = getFundTheme(fund.type, fund.name);
                const IconComponent = theme.IconComponent;
                return (
                  <SoftCard key={fund.id} style={{ width: '48%', marginBottom: 12, borderRadius: 16 }} innerStyle={{ borderRadius: 15 }}>
                    <TouchableOpacity activeOpacity={0.8} style={styles.quickGiveCard} onPress={() => handleQuickGive(fund.type, fund.id)}>
                      <LinearGradient colors={theme.colors as [string, string]} style={styles.quickGiveIconWrap}>
                        <IconComponent size={20} color={theme.iconColor} />
                      </LinearGradient>
                      <Text style={styles.quickGiveText} numberOfLines={1}>{fund.name}</Text>
                    </TouchableOpacity>
                  </SoftCard>
                );
              })
            ) : (
              // Fallback to standard 4 default options if no funds returned
              [
                { type: 'tithe', label: 'Tithe', icon: Wallet, colors: ['#FFF0F5', '#FFE8F1'], iconColor: '#FF6596' },
                { type: 'offering', label: 'Offering', icon: Heart, colors: ['#F0F5FF', '#E5EDFF'], iconColor: '#4D7FFF' },
                { type: 'missions', label: 'Missions', icon: Globe, colors: ['#F5F0FF', '#EDE4FF'], iconColor: '#8B6FE8' },
                { type: 'building', label: 'Building', icon: Building2, colors: ['#F0FDF4', '#E1F9E8'], iconColor: '#22C55E' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <SoftCard key={item.type} style={{ width: '48%', marginBottom: 12, borderRadius: 16 }} innerStyle={{ borderRadius: 15 }}>
                    <TouchableOpacity activeOpacity={0.8} style={styles.quickGiveCard} onPress={() => handleQuickGive(item.type)}>
                      <LinearGradient colors={item.colors as [string, string]} style={styles.quickGiveIconWrap}>
                        <Icon size={20} color={item.iconColor} />
                      </LinearGradient>
                      <Text style={styles.quickGiveText}>{item.label}</Text>
                    </TouchableOpacity>
                  </SoftCard>
                );
              })
            )}
          </View>
        </View>

        <View style={styles.campaignsSection}>
          <Text style={styles.sectionTitle}>Active Campaigns</Text>
          
          {isLoading ? (
            Array.from({ length: 2 }).map((_, index) => (
              <View key={`camp-skel-${index}`} style={styles.campaignWrapper}>
                <SoftCard innerStyle={{ padding: 12, flexDirection: 'row', alignItems: 'center' }}>
                  <ShimmerSkeleton width={60} height={60} borderRadius={12} style={{ marginRight: 14 }} />
                  <View style={{ flex: 1 }}>
                    <ShimmerSkeleton width="40%" height={12} borderRadius={4} style={{ marginBottom: 6 }} />
                    <ShimmerSkeleton width="70%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                    <ShimmerSkeleton width="90%" height={12} borderRadius={4} style={{ marginBottom: 8 }} />
                    <ShimmerSkeleton width="100%" height={6} borderRadius={3} />
                  </View>
                </SoftCard>
              </View>
            ))
          ) : campaigns.length > 0 ? (
            campaigns.map((campaign) => (
              <View key={campaign.id} style={styles.campaignWrapper}>
                <CampaignCard 
                  campaign={campaign} 
                  onPress={() => router.push({ pathname: '/giving-campaign-detail', params: { id: campaign.id } })}
                />
              </View>
            ))
          ) : (
            <View style={styles.emptyCampaigns}>
              <Heart size={32} color="#D1D5DB" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyCampaignsText}>No active campaigns right now</Text>
            </View>
          )}
        </View>
        
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  headerContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  headerCircle: {
    ...getTopBarButtonShadowStyle(20),
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18, fontWeight: '700', color: '#111827',
    flex: 1, textAlign: 'center', marginHorizontal: 12,
  },
  content: { flex: 1, paddingHorizontal: 24 },
  
  quickGiveSection: {
    marginTop: 0,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  quickGiveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickGiveCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  quickGiveIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickGiveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  
  campaignsSection: {
    marginBottom: 24,
  },
  campaignWrapper: {
    marginBottom: 16,
  },
  emptyCampaigns: {
    padding: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    borderStyle: 'dashed',
  },
  emptyCampaignsText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 17,
    color: '#666',
    textAlign: 'center',
    lineHeight: 26,
  },
});

