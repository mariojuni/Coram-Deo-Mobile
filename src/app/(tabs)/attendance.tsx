import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Award, Bell, QrCode, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AttendanceTab from '../../components/Staff/AttendanceTab';
import ScheduleTab from '../../components/Staff/ScheduleTab';
import { getAttendanceStats, getTodayStr } from '../../features/attendance/domain/attendance.selectors';
import { useAttendanceByDate } from '../../features/attendance/presentation/hooks/useAttendanceByDate';
import { useAuthStore } from '../../store/useAuthStore';
import { useMemberStore } from '../../store/useMemberStore';
import { getUndismissedNotificationCount, useScheduleStore } from '../../store/useScheduleStore';

export default function AttendanceScreen() {
  const members = useMemberStore((state) => state.members);
  const userProfile = useAuthStore((state) => state.userProfile);
  const schedules = useScheduleStore((state) => state.schedules);
  const initializeSchedulesListener = useScheduleStore((state) => state.initializeSchedulesListener);
  const isStaff = userProfile?.role?.toLowerCase() === 'staff';
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('reports');
  const { checkins: todayCheckins } = useAttendanceByDate(getTodayStr());
  const { checkedInMembers, firstTimeVisitors, totalRegisteredMembers, checkedInRatio } = getAttendanceStats(
    todayCheckins,
    members.length
  );
  const unDismissedNotifications = getUndismissedNotificationCount(schedules);

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

        <View style={styles.header}>
        <View>
          <Text style={styles.title}>Staff</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.iconBtn} 
            onPress={() => router.push('/staff-notifications')}
          >
            <Bell size={22} color="#1a1a1a" />
            {unDismissedNotifications > 0 && (
              <View style={styles.badge} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/scanner')}>
            <QrCode size={22} color="#1a1a1a" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['Attendance', 'Events', 'Reports'].map((f) => (
            <TouchableOpacity 
              key={f} 
              style={[
                styles.pill, 
                activeTab === f.toLowerCase() && styles.pillActive,
                activeTab === f.toLowerCase() && styles.pillShadow
              ]}
              onPress={() => setActiveTab(f.toLowerCase())}
            >
              <Text style={[styles.pillText, activeTab === f.toLowerCase() && styles.pillTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        </View>
      </View>

      {activeTab === 'events' ? (
        <View style={[styles.content, { flex: 1, paddingTop: Math.max(insets.top, 24) + 146 }]}>
          <ScheduleTab />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 24) + 146 }]}>
          {activeTab === 'reports' && (
            <View>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: '#FFE8F0' }]}>
                    <Users size={20} color="#FF6596" />
                  </View>
                  <View>
                    <Text style={styles.statLabel}>Members</Text>
                    <Text style={styles.statValue}>{checkedInMembers.length}</Text>
                  </View>
                </View>

                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: '#E8F0FF' }]}>
                    <Award size={20} color="#4D8BFF" />
                  </View>
                  <View>
                    <Text style={styles.statLabel}>First-time Visitors</Text>
                    <Text style={styles.statValue}>{firstTimeVisitors.length}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Check-in Ratio</Text>
                <View style={styles.ratioCircle}>
                  <Text style={styles.ratioValue}>{checkedInRatio}%</Text>
                  <Text style={styles.ratioLabel}>checked in</Text>
                </View>
                <View style={styles.ratioFooter}>
                  <Text style={styles.ratioFooterText}>Present: {checkedInMembers.length}</Text>
                  <Text style={styles.ratioFooterText}>Total: {totalRegisteredMembers}</Text>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'attendance' && (
            <AttendanceTab 
              members={members} 
              showStaffFeatures={isStaff} 
            />
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
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingTop: 16, 
    paddingBottom: 16 
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
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a', letterSpacing: -0.5 },
  qrButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  filterContainer: { paddingBottom: 16 },
  filterScroll: { paddingHorizontal: 24, gap: 16 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e1e4e8' },
  pillActive: { backgroundColor: '#FF6596', borderColor: '#FF6596' },
  pillShadow: { shadowColor: '#FF6596', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 },
  pillText: { fontSize: 13, fontWeight: '600', color: '#666' },
  pillTextActive: { color: '#fff' },
  content: { paddingHorizontal: 24, paddingBottom: 100, gap: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 12, color: '#666', fontWeight: '600' },
  statValue: { fontSize: 20, color: '#1a1a1a', fontWeight: '800' },
  chartCard: { backgroundColor: '#fff', padding: 24, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 16, alignSelf: 'flex-start' },
  ratioCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 8, borderColor: '#4ADE80', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  ratioValue: { fontSize: 24, fontWeight: '900', color: '#4ADE80' },
  ratioLabel: { fontSize: 10, color: '#666' },
  ratioFooter: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 16 },
  ratioFooterText: { fontSize: 12, color: '#888' },
  placeholderCard: { backgroundColor: '#E3F2FD', padding: 24, borderRadius: 16, alignItems: 'center' },
  placeholderTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 8 },
  placeholderText: { fontSize: 14, color: '#007AFF', textAlign: 'center', opacity: 0.8 },
});
