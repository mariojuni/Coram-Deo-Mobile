import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Animated } from 'react-native';
import { ChevronLeft, History, Heart, Globe, Building2, Wallet } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { useGiving } from '@/features/giving/presentation/hooks/useGiving';
import { CampaignCard } from '@/features/giving/presentation/components/CampaignCard';
import { useAuthStore } from '@/store/useAuthStore';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GivingScreen() {
  const router = useRouter();
  const { campaigns, isLoading } = useGiving();
  const { userProfile } = useAuthStore();
  const hasChurchId = !!userProfile?.churchId;
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  if (!hasChurchId) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#FFE8F1', '#F9FAFB']} style={StyleSheet.absoluteFill} />
        <View style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 16, backgroundColor: 'transparent' }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color="#1a1a1a" />
            <Text style={styles.title}>Giving</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Heart size={40} color="#FF6596" fill="#FF6596" />
          </View>
          <Text style={styles.errorTitle}>Church Not Linked</Text>
          <Text style={styles.errorText}>
            Your account isn't linked to a church yet. Please contact your church admin to get linked so you can access giving features.
          </Text>
        </View>
      </View>
    );
  }

  const handleQuickGive = (fundType: string) => {
    router.push({ pathname: '/giving-form', params: { fundType } });
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FFE8F1', '#F5F2FF', '#FAFAFA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.3 }} style={StyleSheet.absoluteFill} />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 16, position: 'absolute', width: '100%', zIndex: 10 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: headerOpacity }]}>
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.3)' }]} />
        </Animated.View>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#1a1a1a" />
          <Text style={styles.title}>Giving</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/my-giving')}>
          <History size={24} color="#1a1a1a" />
        </TouchableOpacity>
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
            <TouchableOpacity activeOpacity={0.8} style={styles.quickGiveCard} onPress={() => handleQuickGive('tithe')}>
              <LinearGradient colors={['#FFF0F5', '#FFE8F1']} style={styles.quickGiveIconWrap}>
                <Wallet size={20} color="#FF6596" />
              </LinearGradient>
              <Text style={styles.quickGiveText}>Tithe</Text>
            </TouchableOpacity>
            
            <TouchableOpacity activeOpacity={0.8} style={styles.quickGiveCard} onPress={() => handleQuickGive('offering')}>
              <LinearGradient colors={['#F0F5FF', '#E5EDFF']} style={styles.quickGiveIconWrap}>
                <Heart size={20} color="#4D7FFF" />
              </LinearGradient>
              <Text style={styles.quickGiveText}>Offering</Text>
            </TouchableOpacity>
            
            <TouchableOpacity activeOpacity={0.8} style={styles.quickGiveCard} onPress={() => handleQuickGive('missions')}>
              <LinearGradient colors={['#F5F0FF', '#EDE4FF']} style={styles.quickGiveIconWrap}>
                <Globe size={20} color="#8B6FE8" />
              </LinearGradient>
              <Text style={styles.quickGiveText}>Missions</Text>
            </TouchableOpacity>
            
            <TouchableOpacity activeOpacity={0.8} style={styles.quickGiveCard} onPress={() => handleQuickGive('building')}>
              <LinearGradient colors={['#F0FDF4', '#E1F9E8']} style={styles.quickGiveIconWrap}>
                <Building2 size={20} color="#22C55E" />
              </LinearGradient>
              <Text style={styles.quickGiveText}>Building</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.campaignsSection}>
          <Text style={styles.sectionTitle}>Active Campaigns</Text>
          
          {isLoading ? (
            <ActivityIndicator size="large" color="#FF6596" style={{ marginTop: 40 }} />
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
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#1a1a1a', marginLeft: 8 },
  iconBtn: { 
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 20,
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
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
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

