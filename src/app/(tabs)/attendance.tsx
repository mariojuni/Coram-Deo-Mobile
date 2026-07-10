import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Award, Bell, QrCode, Users, Shield } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import { useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AttendanceTab from '../../components/Staff/AttendanceTab';
import ScheduleTab from '../../components/Staff/ScheduleTab';
import { getAttendanceStats, getTodayStr } from '../../features/attendance/domain/attendance.selectors';
import { useAttendanceByDate } from '../../features/attendance/presentation/hooks/useAttendanceByDate';
import WorshipTab from '../../components/Staff/WorshipTab';
import { useAuthStore } from '../../store/useAuthStore';
import { useMemberStore } from '../../store/useMemberStore';
import { useMinistryStore } from '../../store/useMinistryStore';
import { getUndismissedNotificationCount, useScheduleStore } from '../../store/useScheduleStore';

export default function AttendanceScreen() {
  const members = useMemberStore((state) => state.members);
  const userProfile = useAuthStore((state) => state.userProfile);
  const schedules = useScheduleStore((state) => state.schedules);
  const initializeSchedulesListener = useScheduleStore((state) => state.initializeSchedulesListener);
  const isStaff = ['super_admin', 'church_admin', 'ministry_leader'].includes(userProfile?.role?.toLowerCase() || '');
  const router = useRouter();
  const TABS = [
    { key: 'attendance', label: 'Attendance' },
    { key: 'events', label: 'Events' },
    { key: 'worship', label: 'Worship' },
  ];
  const [activeTab, setActiveTab] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const tabLayouts = useRef<{ x: number; width: number }[]>([]);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;

  const handleTabLayout = (index: number, x: number, width: number) => {
    tabLayouts.current[index] = { x, width };
    if (activeTab === index) {
      indicatorX.setValue(x);
      indicatorWidth.setValue(width);
    }
  };

  const handleTabPress = (index: number) => {
    setActiveTab(index);
    const layout = tabLayouts.current[index];
    if (layout) {
      Animated.parallel([
        Animated.spring(indicatorX, {
          toValue: layout.x,
          useNativeDriver: false,
          friction: 8,
          tension: 50,
        }),
        Animated.spring(indicatorWidth, {
          toValue: layout.width,
          useNativeDriver: false,
          friction: 8,
          tension: 50,
        }),
      ]).start();
    }
  };
  const { checkins: todayCheckins } = useAttendanceByDate(getTodayStr());
  const { checkedInMembers, firstTimeVisitors, totalRegisteredMembers, checkedInRatio } = getAttendanceStats(
    todayCheckins,
    members.length
  );
  const { assignments } = useMinistryStore();
  const unDismissedNotifications = getUndismissedNotificationCount(assignments);

  // Keep the real-time schedule listener alive for the entire Staff tab session,
  // regardless of which sub-tab (Attendance / Events / Reports) is active.
  useEffect(() => {
    const unsubscribe = initializeSchedulesListener();
    return () => unsubscribe();
  }, [initializeSchedulesListener]);

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.frostedHeader, { paddingTop: Math.max(insets.top, 24) }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.6)' }]} pointerEvents="none" />

        {/* Gradient accent line */}
        <View style={styles.accentLine}>
          <LinearGradient
            colors={['#FF6596', '#B66DFF', '#6DC8FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconWrap}>
              <LinearGradient
                colors={['#FF6596', '#B66DFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerIconGradient}
              >
                <Shield size={16} color="#fff" strokeWidth={2} />
              </LinearGradient>
            </View>
            <View>
              <Text style={styles.headerOverline}>MANAGEMENT</Text>
              <Text style={styles.headerTitle}>Staff</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.iconBtn} 
              onPress={() => router.push('/staff-notifications')}
            >
              <Bell size={20} color="#1a1a1a" />
              {unDismissedNotifications > 0 && (
                <View style={styles.badge} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/scanner')}>
              <QrCode size={20} color="#1a1a1a" />
            </TouchableOpacity>
          </View>
        </View>

      <View style={styles.tabBarWrapper}>
        <ScrollView 
          ref={scrollViewRef}
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.tabBarContent}
        >
          <Animated.View
            style={[
              styles.indicator,
              { left: indicatorX, width: indicatorWidth },
            ]}
          />

          {TABS.map(({ key, label }, index) => (
            <TouchableOpacity 
              key={key} 
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                handleTabLayout(index, x, width);
              }}
              style={styles.tab}
              activeOpacity={0.75}
              onPress={() => handleTabPress(index)}
            >
              <Text style={[styles.tabText, activeTab === index && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        </View>
      </View>

      {activeTab === 1 ? (
        <View style={[styles.content, { flex: 1, paddingTop: Math.max(insets.top, 24) + 146 }]}>
          <ScheduleTab />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 24) + 146 }]}>

          {activeTab === 0 && (
            <AttendanceTab 
              members={members} 
              showStaffFeatures={isStaff} 
            />
          )}

          {activeTab === 2 && (
            <WorshipTab />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  frostedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  headerIconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6596',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#fff',
  },

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
  content: { paddingHorizontal: 24, paddingBottom: 100, gap: 16 },
  placeholderCard: { backgroundColor: '#E3F2FD', padding: 24, borderRadius: 16, alignItems: 'center' },
  placeholderTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 8 },
  placeholderText: { fontSize: 14, color: '#007AFF', textAlign: 'center', opacity: 0.8 },
});
