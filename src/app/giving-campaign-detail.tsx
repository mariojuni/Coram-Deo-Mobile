import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useGiving } from '@/features/giving/presentation/hooks/useGiving';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCachedImage } from '@/features/files/presentation/hooks/useCachedImage';
import { getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import { BounceCard } from '@/components/ui/BounceCard';

const ShimmerSkeleton = ({ width, height, style, borderRadius = 8 }: any) => {
  const animValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(animValue, { toValue: 0, duration: 1000, useNativeDriver: true })
      ])
    ).start();
  }, [animValue]);

  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View style={[{ width, height, backgroundColor: '#E5E7EB', borderRadius, opacity }, style]} />
  );
};

export default function GivingCampaignDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { campaigns, isLoading } = useGiving();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const isDebouncing = useRef(false);
  const withDebounce = (callback: Function, delay: number = 1000) => {
    return (...args: any[]) => {
      if (isDebouncing.current) return;
      isDebouncing.current = true;
      callback(...args);
      setTimeout(() => {
        isDebouncing.current = false;
      }, delay);
    };
  };
  const campaign = campaigns.find(c => c.id === id);

  const { cachedUri } = useCachedImage(campaign?.coverImageUrl, {
    id: campaign?.id,
    churchId: campaign?.churchId,
    visibility: 'public',
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient colors={['#FFE8F1', '#F5F2FF', '#FAFAFA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.3 }} style={StyleSheet.absoluteFill} />
        
        <TouchableOpacity style={[styles.backBtn, { top: Math.max(insets.top, 24) }]} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
        </TouchableOpacity>
        
        <Animated.ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <ShimmerSkeleton width="100%" height={280} borderRadius={0} />
          <View style={styles.detailsContainer}>
            <ShimmerSkeleton width={120} height={24} borderRadius={12} style={{ marginBottom: 16 }} />
            <ShimmerSkeleton width="80%" height={34} style={{ marginBottom: 16 }} />
            <ShimmerSkeleton width="100%" height={140} borderRadius={24} style={{ marginBottom: 24 }} />
            <ShimmerSkeleton width="100%" height={20} style={{ marginBottom: 8 }} />
            <ShimmerSkeleton width="90%" height={20} style={{ marginBottom: 8 }} />
            <ShimmerSkeleton width="80%" height={20} />
          </View>
        </Animated.ScrollView>
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient colors={['#FFE8F1', '#F9FAFB']} style={StyleSheet.absoluteFill} />
        
        <TouchableOpacity style={[styles.backBtn, { top: Math.max(insets.top, 24) }]} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
        </TouchableOpacity>
        
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Campaign not found</Text>
        </View>
      </View>
    );
  }

  const progress = Math.min((campaign.raisedAmount / campaign.goalAmount) * 100, 100);
  const remaining = Math.max(campaign.goalAmount - campaign.raisedAmount, 0);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const titleTranslateY = scrollY.interpolate({
    inputRange: [100, 150],
    outputRange: [20, 0],
    extrapolate: 'clamp',
  });

  const coverScale = scrollY.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [1.2, 1, 1],
    extrapolate: 'clamp',
  });

  const coverTranslateY = scrollY.interpolate({
    inputRange: [-100, 0, 200],
    outputRange: [-50, 0, 100],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#FFE8F1', '#F5F2FF', '#FAFAFA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.3 }} style={StyleSheet.absoluteFill} />
      
      {/* Frosted Glass Header */}
      <View style={[styles.headerFloating, { paddingTop: Math.max(insets.top, 24), zIndex: 10 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: headerOpacity }]}>
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.3)' }]} />
        </Animated.View>
        <View style={styles.headerContent}>
          <BounceCard style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
          </BounceCard>
          <Animated.Text 
            style={[styles.headerTitle, { opacity: headerOpacity, transform: [{ translateY: titleTranslateY }] }]}
            pointerEvents="none"
          >
            {campaign.title}
          </Animated.Text>
        </View>
      </View>
      
      <Animated.ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <Animated.View style={{ transform: [{ scale: coverScale }, { translateY: coverTranslateY }] }}>
          {cachedUri ? (
            <Image source={{ uri: cachedUri }} style={styles.coverImage} />
          ) : (
            <LinearGradient
              colors={['#FF6596', '#FF8AAB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coverImagePlaceholder}
            />
          )}
        </Animated.View>
        
        <View style={styles.detailsContainer}>
          {campaign.phaseLabel && (
            <View style={styles.phaseLabelBadge}>
              <Text style={styles.phaseLabel}>{campaign.phaseLabel.toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.title}>{campaign.title}</Text>
          
          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Goal</Text>
              <Text style={styles.progressValue}>₱{campaign.goalAmount.toLocaleString()}</Text>
            </View>
            
            <View style={styles.progressBarBg}>
              <LinearGradient 
                colors={['#FF6596', '#FF8AAB']} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 0 }} 
                style={[styles.progressBarFill, { width: `${progress}%` }]} 
              />
            </View>
            
            <View style={styles.progressStatsRow}>
              <View>
                <Text style={styles.statLabel}>Raised</Text>
                <Text style={styles.statValueRaised}>₱{campaign.raisedAmount.toLocaleString()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.statLabel}>Remaining</Text>
                <Text style={styles.statValueRemaining}>₱{remaining.toLocaleString()}</Text>
              </View>
            </View>
          </View>
          
          <Text style={styles.description}>{campaign.description}</Text>
          
          {campaign.allowPublicExpenses && campaign.expenseAmount > 0 && (
            <View style={styles.expenseSection}>
              <Text style={styles.expenseTitle}>Project Expenses</Text>
              <Text style={styles.expenseText}>
                So far, ₱{campaign.expenseAmount.toLocaleString()} has been spent towards this project.
              </Text>
            </View>
          )}
          
          <View style={{ height: 120 + insets.bottom }} />
        </View>
      </Animated.ScrollView>

      {/* Frosted Glass Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || 24 }]}>
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.65)', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }]} pointerEvents="none" />
        
        <TouchableOpacity 
          style={styles.giveBtnContainer}
          activeOpacity={0.8}
          onPress={withDebounce(() => router.push({ pathname: '/giving-form', params: { campaignId: campaign.id, fundType: campaign.fundId } }))}
        >
          <LinearGradient
            colors={['#FF6596', '#C084FC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.giveBtn}
          >
            <Text style={styles.giveBtnText}>Give to this Project</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingBottom: 16,
    backgroundColor: 'transparent'
  },
  headerFloating: {
    position: 'absolute',
    top: 0,
    width: '100%',
    paddingBottom: 16,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 8,
    height: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: 1,
    paddingHorizontal: 60,
  },
  backBtn: {
    ...getTopBarButtonShadowStyle(20),
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  content: { flex: 1 },
  coverImage: {
    width: '100%',
    height: 280,
  },
  coverImagePlaceholder: {
    width: '100%',
    height: 280,
  },
  detailsContainer: {
    padding: 24,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    boxShadow: '0px -4px 16px rgba(0, 0, 0, 0.05)',
  },
  phaseLabelBadge: {
    backgroundColor: '#FFF0F5',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  phaseLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6596',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 16,
    lineHeight: 34,
  },
  description: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 26,
    marginBottom: 32,
  },
  progressSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 6,
  },
  statValueRaised: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FF6596',
  },
  statValueRemaining: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4B5563',
  },
  expenseSection: {
    padding: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    marginTop: 8,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  expenseText: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  giveBtnContainer: {
    width: '100%',
    borderRadius: 32,
    overflow: 'hidden',
  },
  giveBtn: {
    width: '100%',
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
