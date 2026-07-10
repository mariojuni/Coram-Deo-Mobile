import { AssignmentCard } from '@/features/serve/presentation/components/AssignmentCard';
import { MinistryCard } from '@/features/serve/presentation/components/MinistryCard';
import { ServeCalendarView } from '@/features/serve/presentation/components/ServeCalendarView';
import { ServeEmptyState } from '@/features/serve/presentation/components/ServeEmptyState';
import { useMyAssignments } from '@/features/serve/presentation/hooks/useMyAssignments';
import { useServeMinistries } from '@/features/serve/presentation/hooks/useServeMinistries';
import { useAuthStore } from '@/store/useAuthStore';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Handshake, UserX } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = ['My Schedule', 'All Ministries', 'Calendar'] as const;
type ServeTab = (typeof TABS)[number];

export default function ServeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userProfile = useAuthStore((s) => s.userProfile);
  const [activeTab, setActiveTab] = useState<ServeTab>('My Schedule');

  const tabLayouts = useRef<({ x: number; width: number } | null)[]>(
    Array(TABS.length).fill(null),
  );
  const indicatorX = useMemo(() => new Animated.Value(0), []);
  const indicatorWidth = useMemo(() => new Animated.Value(0), []);
  const initialised = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const screenWidth = Dimensions.get('window').width;

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, -60],
    extrapolate: 'clamp',
  });
  
  const titleOpacity = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const activeTabIndex = TABS.indexOf(activeTab);

  const handleTabLayout = (index: number, x: number, width: number) => {
    tabLayouts.current[index] = { x, width };
    if (index === activeTabIndex && !initialised.current) {
      indicatorX.setValue(x);
      indicatorWidth.setValue(width);
      initialised.current = true;
    }
  };

  const handleTabPress = (index: number) => {
    const layout = tabLayouts.current[index];
    if (layout) {
      Animated.parallel([
        Animated.spring(indicatorX, {
          toValue: layout.x,
          useNativeDriver: false,
          tension: 80,
          friction: 10,
        }),
        Animated.spring(indicatorWidth, {
          toValue: layout.width,
          useNativeDriver: false,
          tension: 80,
          friction: 10,
        }),
      ]).start();

      const centerOffsetX = layout.x + layout.width / 2 - screenWidth / 2;
      scrollViewRef.current?.scrollTo({ x: Math.max(0, centerOffsetX), animated: true });
    }
    setActiveTab(TABS[index]);
  };


  const { grouped, allAssignments, loading: assignmentsLoading } = useMyAssignments();
  const { ministries, loading: ministriesLoading } = useServeMinistries();

  const totalUpcoming = grouped
    .filter((g) => g.label !== 'Past')
    .reduce((sum, g) => sum + g.data.length, 0);

  const headerHeight = Math.max(insets.top, 24) + 118;

  const hasNoChurch =
    !userProfile?.churchId || userProfile?.status === 'pendingChurchLink';

  if (hasNoChurch) {
    return (
      <LinearGradient
        colors={['#FFE8F1', '#F5F2FF', '#EEF6FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <View style={[styles.pendingContainer, { paddingTop: Math.max(insets.top, 24) }]}>
          <View style={styles.pendingIconBox}>
            <UserX size={48} color="#FF6596" />
          </View>
          <Text style={styles.pendingTitle}>Not Linked to a Church</Text>
          <Text style={styles.pendingMessage}>
            Your account isn't linked to a church yet. Contact your church admin
            to get access to Serve.
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.screen}>
      {/* ─── Header ─── */}
      <Animated.View
        style={[
          styles.header, 
          { 
            paddingTop: Math.max(insets.top, 24),
            transform: [{ translateY: headerTranslateY }]
          }
        ]}
        pointerEvents="box-none"
      >
        <BlurView
          intensity={90}
          tint="light"
          style={[StyleSheet.absoluteFill, { top: -150 }]}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(255,255,255,0.75)', top: -150 },
          ]}
          pointerEvents="none"
        />

        {/* Gradient accent line */}
        <View style={styles.accentLine}>
          <LinearGradient
            colors={['#FF6596', '#B66DFF', '#6DC8FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Title row */}
        <Animated.View style={[styles.headerContent, { opacity: titleOpacity }]}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconWrap}>
              <LinearGradient
                colors={['#FF6596', '#B66DFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerIconGradient}
              >
                <Handshake size={16} color="#fff" strokeWidth={2} />
              </LinearGradient>
            </View>
            <View>
              <Text style={styles.headerOverline}>MINISTRY</Text>
              <Text style={styles.headerTitle}>Serve</Text>
            </View>
          </View>
          {totalUpcoming > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeNum}>{totalUpcoming}</Text>
              <Text style={styles.headerBadgeLabel}>upcoming</Text>
            </View>
          )}
        </Animated.View>

        {/* Modern Pill Tab Bar */}
        <View style={styles.tabBarWrapper}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarContent}
          >
            {/* Sliding pill indicator */}
            <Animated.View
              style={[
                styles.indicator,
                { left: indicatorX, width: indicatorWidth },
              ]}
            />

            {TABS.map((tab, index) => (
              <TouchableOpacity
                key={tab}
                onLayout={(e) => {
                  const { x, width } = e.nativeEvent.layout;
                  handleTabLayout(index, x, width);
                }}
                onPress={() => handleTabPress(index)}
                style={styles.tab}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTabIndex === index && styles.tabTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Animated.View>

      {/* ─── Content ─── */}
      {activeTab === 'My Schedule' && (
        <MyScheduleTab
          grouped={grouped}
          loading={assignmentsLoading}
          onPressAssignment={(id) =>
            router.push({ pathname: '/serve-assignment-detail', params: { id } } as any)
          }
          headerHeight={headerHeight}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
        />
      )}
      {activeTab === 'All Ministries' && (
        <AllMinistriesTab
          ministries={ministries}
          loading={ministriesLoading}
          onPressMinistry={(id) =>
            router.push({ pathname: '/serve-ministry-detail', params: { id } } as any)
          }
          headerHeight={headerHeight}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
        />
      )}
      {activeTab === 'Calendar' && (
        <CalendarTab
          assignments={allAssignments}
          onPressAssignment={(id) =>
            router.push({ pathname: '/serve-assignment-detail', params: { id } } as any)
          }
          headerHeight={headerHeight}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
        />
      )}
    </View>
  );
}

// ─── My Schedule tab ──────────────────────────────────────────────────────────

const GROUP_CONFIG = {
  'This Week': { color: '#FF6596', dot: '#FF6596' },
  Upcoming:    { color: '#8B6FE8', dot: '#8B6FE8' },
  Past:        { color: '#9CA3AF', dot: '#D1D5DB' },
} as const;

function MyScheduleTab({
  grouped, loading, onPressAssignment, headerHeight, onScroll
}: {
  grouped: ReturnType<typeof useMyAssignments>['grouped'];
  loading: boolean;
  onPressAssignment: (id: string) => void;
  headerHeight: number;
  onScroll?: any;
}) {
  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: headerHeight + 40 }]}>
        <ActivityIndicator color="#FF6596" />
      </View>
    );
  }

  if (!grouped.length) {
    return (
      <Animated.ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 16 }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <ServeEmptyState
          title="No Assignments Yet"
          message="When your ministry leader schedules you, your assignments will appear here."
        />
      </Animated.ScrollView>
    );
  }

  return (
    <Animated.ScrollView
      contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 16 }]}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {grouped.map((group) => {
        const cfg = GROUP_CONFIG[group.label] ?? { color: '#9CA3AF', dot: '#D1D5DB' };
        return (
          <View key={group.label} style={styles.group}>
            <View style={styles.groupHeader}>
              <View style={[styles.groupDot, { backgroundColor: cfg.dot }]} />
              <Text style={[styles.groupOverline, { color: cfg.color }]}>
                {group.label.toUpperCase()}
              </Text>
              <View style={[styles.groupCountBadge, { backgroundColor: `${cfg.color}18` }]}>
                <Text style={[styles.groupCountText, { color: cfg.color }]}>{group.data.length}</Text>
              </View>
            </View>
            {group.data.map((a) => (
              <AssignmentCard key={a.id} assignment={a} onPress={() => onPressAssignment(a.id)} />
            ))}
          </View>
        );
      })}
    </Animated.ScrollView>
  );
}

// ─── All Ministries tab ───────────────────────────────────────────────────────

function AllMinistriesTab({
  ministries, loading, onPressMinistry, headerHeight, onScroll
}: {
  ministries: ReturnType<typeof useServeMinistries>['ministries'];
  loading: boolean;
  onPressMinistry: (id: string) => void;
  headerHeight: number;
  onScroll?: any;
}) {
  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: headerHeight + 40 }]}>
        <ActivityIndicator color="#FF6596" />
      </View>
    );
  }

  if (!ministries.length) {
    return (
      <Animated.ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 16 }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <ServeEmptyState
          title="No Ministries Found"
          message="Your church hasn't set up any ministries yet. Check back soon."
        />
      </Animated.ScrollView>
    );
  }

  return (
    <Animated.ScrollView
      contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 16 }]}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <View style={styles.ministriesHeader}>
        <Text style={styles.ministriesOverline}>ALL MINISTRIES</Text>
        <View style={styles.ministriesCountBadge}>
          <Text style={styles.ministriesCountText}>{ministries.length}</Text>
        </View>
      </View>
      {ministries.map((m) => (
        <MinistryCard key={m.id} ministry={m} onPress={() => onPressMinistry(m.id)} />
      ))}
    </Animated.ScrollView>
  );
}

// ─── Calendar tab ─────────────────────────────────────────────────────────────

function CalendarTab({
  assignments, onPressAssignment, headerHeight, onScroll
}: {
  assignments: ReturnType<typeof useMyAssignments>['allAssignments'];
  onPressAssignment: (id: string) => void;
  headerHeight: number;
  onScroll?: any;
}) {
  return (
    <Animated.ScrollView 
      contentContainerStyle={[styles.calendarContainer, { paddingTop: headerHeight + 16 }]}
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      <ServeCalendarView
        assignments={assignments}
        onPressAssignment={(a) => onPressAssignment(a.id)}
      />
    </Animated.ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFA' },

  // Header
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  accentLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 3,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconWrap: {},
  headerIconGradient: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6596',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
    marginTop: -1,
  },
  headerBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,101,150,0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerBadgeNum: { fontSize: 18, fontWeight: '800', color: '#FF6596', lineHeight: 20 },
  headerBadgeLabel: { fontSize: 9, fontWeight: '600', color: '#FF6596', letterSpacing: 0.3 },

  // ── Tab bar ───
  tabBarWrapper: {
    paddingBottom: 12,
    paddingTop: 4,
  },
  tabBarContent: {
    paddingHorizontal: 20,
    gap: 4,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
    letterSpacing: 0.1,
  },
  tabTextActive: {
    color: '#1a1a1a',
    fontWeight: '700',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#FF6596',
  },

  // Content
  scrollContent: { paddingHorizontal: 20, paddingBottom: 110 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Group labels
  group: { marginBottom: 8 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    marginTop: 8,
  },
  groupDot: { width: 6, height: 6, borderRadius: 3 },
  groupOverline: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    flex: 1,
  },
  groupCountBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  groupCountText: { fontSize: 11, fontWeight: '700' },

  // Ministries header
  ministriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    marginTop: 4,
  },
  ministriesOverline: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6596',
    letterSpacing: 1.2,
    flex: 1,
  },
  ministriesCountBadge: {
    backgroundColor: 'rgba(255,101,150,0.1)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ministriesCountText: { fontSize: 11, fontWeight: '700', color: '#FF6596' },

  calendarContainer: { flex: 1, paddingHorizontal: 20 },

  // No church state
  pendingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  pendingIconBox: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05, shadowRadius: 20, elevation: 6,
  },
  pendingTitle: {
    fontSize: 22, fontWeight: '900', color: '#1a1a1a',
    marginBottom: 12, textAlign: 'center',
  },
  pendingMessage: {
    fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21,
  },
});
