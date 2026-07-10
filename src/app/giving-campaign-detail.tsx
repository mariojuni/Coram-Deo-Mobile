import React, { useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useGiving } from '@/features/giving/presentation/hooks/useGiving';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GivingCampaignDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { campaigns, isLoading } = useGiving();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const campaign = campaigns.find(c => c.id === id);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient colors={['#FFE8F1', '#F9FAFB']} style={StyleSheet.absoluteFill} />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
        </View>
        <ActivityIndicator size="large" color="#FF6596" style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient colors={['#FFE8F1', '#F9FAFB']} style={StyleSheet.absoluteFill} />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
        </View>
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

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#FFE8F1', '#F5F2FF', '#FAFAFA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.3 }} style={StyleSheet.absoluteFill} />
      
      {/* Frosted Glass Header */}
      <View style={[styles.headerFloating, { paddingTop: insets.top + 10 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: headerOpacity }]}>
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.3)' }]} />
        </Animated.View>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Animated.Text style={[styles.headerTitle, { opacity: headerOpacity }]}>
          {campaign.title}
        </Animated.Text>
      </View>
      
      <Animated.ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {campaign.coverImageUrl ? (
          <Image source={{ uri: campaign.coverImageUrl }} style={styles.coverImage} />
        ) : (
          <LinearGradient
            colors={['#FF6596', '#B66DFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.coverImagePlaceholder}
          />
        )}
        
        <View style={styles.detailsContainer}>
          {campaign.phaseLabel && (
            <View style={styles.phaseLabelBadge}>
              <Text style={styles.phaseLabel}>{campaign.phaseLabel.toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.title}>{campaign.title}</Text>
          <Text style={styles.description}>{campaign.description}</Text>
          
          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Goal</Text>
              <Text style={styles.progressValue}>₱{campaign.goalAmount.toLocaleString()}</Text>
            </View>
            
            <View style={styles.progressBarBg}>
              <LinearGradient 
                colors={['#FF6596', '#B66DFF']} 
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
        <TouchableOpacity 
          style={styles.giveBtnContainer}
          activeOpacity={0.8}
          onPress={() => router.push({ pathname: '/giving-form', params: { campaignId: campaign.id, fundType: campaign.fundId } })}
        >
          <LinearGradient
            colors={['#FF6596', '#FF8AAB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    zIndex: -1,
    paddingHorizontal: 60,
  },
  backBtn: { 
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 8,
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
    padding: 24,
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#FFF0F5',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a1a',
  },
  progressBarBg: {
    height: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
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
    fontSize: 18,
    fontWeight: '800',
    color: '#FF6596',
  },
  statValueRemaining: {
    fontSize: 18,
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
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.4)',
  },
  giveBtnContainer: {
    width: '100%',
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  giveBtn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  giveBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
