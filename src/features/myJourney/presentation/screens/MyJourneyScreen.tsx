import React, { useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform, Pressable, ScrollView, Animated } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMyJourney } from '../hooks/useMyJourney';
import { useBibleVersionStore } from '../../../../store/useBibleVersionStore';
import { SoftCard, getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import { BounceCard } from '@/components/ui/BounceCard';
import { BookOpen, Edit3, Highlighter, Map, ChevronRight, Play, ChevronLeft, Activity, Calendar, Award, Bookmark, TrendingUp } from 'lucide-react-native';
import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';
import { LinearGradient } from 'expo-linear-gradient';
import { MonthView } from '../components/MonthView';
import { MilestonesView } from '../components/MilestonesView';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function MyJourneyScreen() {
  const { 
    metrics, 
    loading, 
    monthlyMetrics, 
    prevMonthlyMetrics, 
    currentMonthDate, 
    loadingMonth, 
    goToPreviousMonth, 
    goToNextMonth 
  } = useMyJourney();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = React.useState<'week' | 'month' | 'milestones'>('week');
  const [tabWidth, setTabWidth] = React.useState(0);
  const tabSlideAnim = useRef(new Animated.Value(0)).current;

  // Animate tab slide when activeTab changes
  React.useEffect(() => {
    let toValue = 0;
    if (activeTab === 'month') toValue = 1;
    if (activeTab === 'milestones') toValue = 2;
    
    Animated.spring(tabSlideAnim, {
      toValue,
      useNativeDriver: true,
      friction: 9,
      tension: 65,
    }).start();
  }, [activeTab, tabSlideAnim]);

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
          
          <Text style={styles.headerTitle} numberOfLines={1}>
            My Journey
          </Text>

          {/* Invisible placeholder for right-alignment balance */}
          <View style={{ width: 40, height: 40 }} />
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 16, paddingTop: Math.max(insets.top, 24) + 60, flex: 1 }}>
          {/* Hero Card Shimmer */}
          <View style={styles.cardSpacing}>
            <ShimmerSkeleton width="100%" height={175} borderRadius={24} />
          </View>
          {/* Tabs Shimmer */}
          <View style={{ marginBottom: 24 }}>
            <ShimmerSkeleton width="100%" height={48} borderRadius={16} />
          </View>
          {/* Continue Card Shimmer */}
          <View style={styles.cardSpacing}>
            <ShimmerSkeleton width="100%" height={92} borderRadius={24} />
          </View>
          {/* Content Shimmer */}
          <View style={styles.cardSpacing}>
            <ShimmerSkeleton width="100%" height={200} borderRadius={24} />
          </View>
        </View>
      ) : (
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 24) + 60, paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
        >
        
        {/* ─── Hero card ─────────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={['#FFE8F0', '#F5E8FF', '#E8EEFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <TrendingUp size={26} color="#E091B4" strokeWidth={1.5} style={styles.heroIcon} />
            <Text
              style={styles.heroFaded}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.45}
            >
              MY JOURNEY
            </Text>
            <Text style={styles.heroSubtitle}>Reflect on your time in the Word</Text>
            <View style={styles.heroLine} />
          </LinearGradient>
        </View>

      {/* Modern Segmented Tabs */}
      <View style={styles.tabsContainerOuter}>
        <View 
          style={styles.tabsContainerInner}
          onLayout={(e) => setTabWidth(e.nativeEvent.layout.width / 3)}
        >
          {/* Animated Background Indicator */}
          {tabWidth > 0 && (
            <Animated.View 
              style={[
                styles.tabIndicator,
                {
                  width: tabWidth,
                  transform: [{
                    translateX: tabSlideAnim.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [0, tabWidth, tabWidth * 2]
                    })
                  }]
                }
              ]} 
            />
          )}
          
          <TouchableOpacity 
            style={styles.tab} 
            onPress={() => setActiveTab('week')}
            activeOpacity={0.7}
          >
            <Activity size={15} color={activeTab === 'week' ? '#FF6596' : '#8B95A5'} style={styles.tabIcon} />
            <Text style={[styles.tabText, activeTab === 'week' && styles.tabTextActive]}>This Week</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tab} 
            onPress={() => setActiveTab('month')}
            activeOpacity={0.7}
          >
            <Calendar size={15} color={activeTab === 'month' ? '#FF6596' : '#8B95A5'} style={styles.tabIcon} />
            <Text style={[styles.tabText, activeTab === 'month' && styles.tabTextActive]}>Month</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tab} 
            onPress={() => setActiveTab('milestones')}
            activeOpacity={0.7}
          >
            <Award size={15} color={activeTab === 'milestones' ? '#FF6596' : '#8B95A5'} style={styles.tabIcon} />
            <Text style={[styles.tabText, activeTab === 'milestones' && styles.tabTextActive]}>Milestones</Text>
          </TouchableOpacity>
        </View>
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

      {activeTab === 'week' && (
        <View>

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
      </View>
      )}

      {activeTab === 'month' && (
        <MonthView 
          metrics={monthlyMetrics}
          prevMetrics={prevMonthlyMetrics}
          currentMonthDate={currentMonthDate}
          loading={loadingMonth}
          onPrevMonth={goToPreviousMonth}
          onNextMonth={goToNextMonth}
        />
      )}

      {activeTab === 'milestones' && (
        <MilestonesView />
      )}
      
      </ScrollView>
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
  heroCard: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  heroGradient: {
    height: 175,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: { marginBottom: 14 },
  heroFaded: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 5,
    color: 'rgba(190, 110, 150, 0.45)',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(190, 110, 150, 0.65)',
    fontWeight: '500',
    marginTop: 4,
  },
  heroLine: {
    width: 32,
    height: 2,
    backgroundColor: 'rgba(255, 101, 150, 0.4)',
    borderRadius: 1,
    marginTop: 14,
  },
  tabsContainerOuter: {
    backgroundColor: '#F5F6FA',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  tabsContainerInner: {
    flexDirection: 'row',
    position: 'relative',
    borderRadius: 12,
  },
  tabIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1, // ensure text is above indicator
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B95A5',
  },
  tabTextActive: {
    color: '#FF6596',
    fontWeight: '700',
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
