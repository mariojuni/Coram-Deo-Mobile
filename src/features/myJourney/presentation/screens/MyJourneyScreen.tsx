import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator, TouchableOpacity, Platform, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMyJourney } from '../hooks/useMyJourney';
import { useBibleVersionStore } from '../../../../store/useBibleVersionStore';
import { SoftCard, getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import { BounceCard } from '@/components/ui/BounceCard';
import { BookOpen, Edit3, Highlighter, Map, ChevronRight, Play, ChevronLeft } from 'lucide-react-native';
import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function MyJourneyScreen() {
  const { metrics, loading } = useMyJourney();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleContinueReading = () => {
    router.replace('/(tabs)/bible');
  };



  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ─── Custom Floating Toolbar ────────────────────────────────────── */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 24) }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
        <View style={styles.headerContent}>
          <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
          </BounceCard>
          
          <Animated.Text 
            style={[styles.headerTitle, {
              opacity: scrollY.interpolate({
                inputRange: [0, 40, 80],
                outputRange: [0, 0, 1],
                extrapolate: 'clamp'
              })
            }]}
            numberOfLines={1}
          >
            My Journey
          </Animated.Text>

          {/* Invisible placeholder for right-alignment balance */}
          <View style={{ width: 40, height: 40 }} />
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 16, paddingTop: Math.max(insets.top, 24) + 60, flex: 1 }}>
          <View style={styles.screenHeader}>
            <ShimmerSkeleton width={180} height={34} borderRadius={8} style={{ marginBottom: 8 }} />
            <ShimmerSkeleton width={240} height={18} borderRadius={8} />
          </View>
          <View style={styles.cardSpacing}>
            <ShimmerSkeleton width="100%" height={92} borderRadius={24} />
          </View>
          <View style={styles.cardSpacing}>
            <ShimmerSkeleton width="100%" height={160} borderRadius={24} />
          </View>
          <View style={styles.cardSpacing}>
            <ShimmerSkeleton width="100%" height={340} borderRadius={24} />
          </View>
        </View>
      ) : (
        <Animated.ScrollView 
          style={styles.container} 
          contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 24) + 60 }]}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
        
        {/* Hero Header */}
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>My Journey</Text>
        <Text style={styles.screenSubtitle}>Reflect on your time in the Word</Text>
      </View>

      {/* Continue Reading - Moved to top for high utility */}
      <BounceCard onPress={handleContinueReading} style={styles.cardSpacing}>
        <SoftCard innerStyle={styles.continueCardInner}>
          <View style={styles.continueContent}>
            <Text style={styles.sectionOverline}>CONTINUE</Text>
            <Text style={styles.continueTitle}>Pick up where you left off</Text>
          </View>
          <View style={styles.continueBtn}>
            <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        </SoftCard>
      </BounceCard>

      {/* 7-Day Indicator */}
      <SoftCard style={styles.cardSpacing} innerStyle={styles.sectionInner}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.sectionOverline}>CONSISTENCY</Text>
            <Text style={styles.sectionTitle}>This Week</Text>
          </View>
          <View style={styles.readingDaysBadge}>
            <Text style={styles.readingDaysBadgeText}>{metrics.readingDaysCount} {metrics.readingDaysCount === 1 ? 'Day' : 'Days'}</Text>
          </View>
        </View>
        
        <View style={styles.daysContainerWrapper}>
          {/* Faint connecting timeline line */}
          <View style={styles.timelineLine} />
          
          <View style={styles.daysContainer} accessible={true} accessibilityLabel={`${metrics.readingDaysCount} Bible reading days this week.`}>
            {DAYS.map((day, index) => {
              const isActive = metrics.activityByDay[index];
              return (
                <View 
                  key={index} 
                  style={[styles.dayCircle, isActive ? styles.dayCircleActive : styles.dayCircleInactive]}
                >
                  <Text style={[styles.dayText, isActive ? styles.dayTextActive : styles.dayTextInactive]}>
                    {day}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </SoftCard>

      {/* Detailed Stats */}
      <SoftCard style={styles.cardSpacing} innerStyle={styles.statsCardInner}>
        <View style={styles.statsCardHeader}>
          <Text style={styles.sectionOverline}>ACTIVITY</Text>
          <Text style={styles.statsCardTitle}>Overview</Text>
        </View>
        
        {/* Chapters */}
        <View style={styles.statRow}>
          <View style={styles.statRowLeft}>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(255, 101, 150, 0.1)' }]}>
              <BookOpen size={20} color="#FF6596" />
            </View>
            <View>
              <Text style={styles.statRowTitle}>Chapters Read</Text>
              <Text style={styles.statRowDesc}>Total chapters completed</Text>
            </View>
          </View>
          <Text style={styles.statRowValue}>{metrics.chaptersReadCount}</Text>
        </View>

        <View style={styles.statDivider} />
        
        {/* Plan Days */}
        <View style={styles.statRow}>
          <View style={styles.statRowLeft}>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <Map size={20} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.statRowTitle}>Plan Days</Text>
              <Text style={styles.statRowDesc}>Reading plan consistency</Text>
            </View>
          </View>
          <Text style={styles.statRowValue}>{metrics.planDaysCompletedCount}</Text>
        </View>

        <View style={styles.statDivider} />
        
        {/* Highlights */}
        <View style={styles.statRow}>
          <View style={styles.statRowLeft}>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <Highlighter size={20} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.statRowTitle}>Highlights</Text>
              <Text style={styles.statRowDesc}>Verses you've saved</Text>
            </View>
          </View>
          <Text style={styles.statRowValue}>{metrics.highlightsCreatedCount}</Text>
        </View>

        <View style={styles.statDivider} />

        {/* Notes */}
        <View style={styles.statRow}>
          <View style={styles.statRowLeft}>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(182, 109, 255, 0.1)' }]}>
              <Edit3 size={20} color="#B66DFF" />
            </View>
            <View>
              <Text style={styles.statRowTitle}>Notes</Text>
              <Text style={styles.statRowDesc}>Personal reflections added</Text>
            </View>
          </View>
          <Text style={styles.statRowValue}>{metrics.notesCreatedCount}</Text>
        </View>
      </SoftCard>
      
      <View style={{ height: 40 }} />
      </Animated.ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFA' },
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
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingTop: 8,
  },
  screenHeader: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  cardSpacing: {
    marginBottom: 16,
  },
  sectionInner: {
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  sectionOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6596',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  readingDaysBadge: {
    backgroundColor: 'rgba(255, 117, 158, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100, // Pill shape
  },
  readingDaysBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FF759E',
  },
  daysContainerWrapper: {
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    top: '50%',
    left: '5%',
    right: '5%',
    height: 3,
    backgroundColor: '#F3F4F6',
    marginTop: -1.5,
    borderRadius: 2,
    zIndex: 1,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA', // Mask the timeline line if inactive
  },
  dayCircleActive: {
    backgroundColor: '#FF759E',
  },
  dayCircleInactive: {
    backgroundColor: '#F3F4F6',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '800',
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  dayTextInactive: {
    color: '#9CA3AF',
  },
  statsCardInner: {
    padding: 24,
  },
  statsCardHeader: {
    marginBottom: 20,
  },
  statsCardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  statRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statRowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  statRowDesc: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  statRowValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 60, // Align with text
  },
  continueCardInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
  },
  continueContent: {
    flex: 1,
  },
  continueTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  continueBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6596',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
