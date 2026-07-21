import { ArrowLeft, Calendar, CheckCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { attendanceRepository } from '../features/attendance/data/attendance.repository';
import type { AttendanceRecord } from '../features/attendance/domain/attendance.types';
import { useAuthStore } from '../store/useAuthStore';
import { getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';

export default function MyAttendanceScreen() {
  const router = useRouter();
  const userProfile = useAuthStore((state) => state.userProfile);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    if (!userProfile?.churchId || !userProfile?.memberId) return;
    
    const unsubscribe = attendanceRepository.subscribeMyAttendance(
      userProfile.memberId,
      userProfile.churchId,
      (data) => {
        setRecords(data);
      },
      (error) => {
        console.error("Error fetching my attendance:", error);
      }
    );

    return () => unsubscribe();
  }, [userProfile?.churchId, userProfile?.memberId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Attendance</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {records.length > 0 ? (
          records.map((record) => (
            <View key={record.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.eventTitle}>{record.eventTitle || 'Event Check-in'}</Text>
                <View style={[styles.statusBadge, record.status?.toLowerCase() === 'present' ? styles.statusPresent : styles.statusOther]}>
                   <Text style={[styles.statusText, record.status?.toLowerCase() === 'present' ? styles.statusTextPresent : styles.statusTextOther]}>
                     {record.status.toUpperCase()}
                   </Text>
                </View>
              </View>
              
              <View style={styles.detailsRow}>
                <Calendar size={14} color="#666" />
                <Text style={styles.dateText}>
                  {new Date(record.checkedInAt).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </View>

              <View style={styles.detailsRow}>
                <CheckCircle size={14} color="#666" />
                <Text style={styles.dateText}>
                  Checked in at {new Date(record.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} via {record.checkInMethod.replace('_', ' ')}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Calendar size={48} color="#ccc" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>No check-ins yet</Text>
            <Text style={styles.emptyText}>When you attend an event and check in, your history will appear here.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...getTopBarButtonShadowStyle(10) },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  content: { padding: 20, gap: 16 },
  card: { ...getTopBarButtonShadowStyle(12), backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eventTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', flex: 1, marginRight: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#f0f0f0' },
  statusPresent: { backgroundColor: '#DEF7EC' },
  statusOther: { backgroundColor: '#FEF2F2' },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', color: '#666' },
  statusTextPresent: { color: '#03543F' },
  statusTextOther: { color: '#92400E' },
  detailsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 13, color: '#666', fontWeight: '500' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 }
});
