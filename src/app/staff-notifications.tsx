import { BlurView } from 'expo-blur';
import { Stack, useRouter } from 'expo-router';
import { AlertCircle, BellOff, CheckCircle2, ChevronLeft, X } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStaffNotifications } from '@/features/staff/presentation/hooks/useStaffNotifications';

export default function StaffNotificationsScreen() {
  const router = useRouter();
  const { dismissNotification, notifications } = useStaffNotifications();

  const handleDismiss = (scheduleId: string, userId: string, status: 'accepted' | 'declined', assignmentId: string) => {
    dismissNotification(scheduleId, userId, status, assignmentId);
  };

  const handleDismissAll = () => {
    notifications.forEach((notification) => {
      dismissNotification(notification.scheduleId, notification.userId, notification.action, notification.id);
    });
  };

  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
      <View style={[styles.frostedHeader, { paddingTop: Math.max(insets.top, 24) }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.6)' }]} pointerEvents="none" />
        
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {notifications.length > 0 ? (
          <TouchableOpacity onPress={handleDismissAll} style={styles.clearAllBtn}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 24) + 104 }]}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBg}>
              <BellOff size={32} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyDesc}>There are no new duty notifications at the moment.</Text>
          </View>
        ) : (
          notifications.map((notif, index) => {
            const isAccepted = notif.action === 'accepted';
            return (
              <TouchableOpacity 
                key={`${notif.id}-${index}`} 
                style={[
                  styles.notificationCard, 
                  isAccepted ? styles.cardAccepted : styles.cardDeclined
                ]}
                onPress={() => router.push({ pathname: '/attendance', params: { tab: 'events' } })}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    {isAccepted ? (
                      <CheckCircle2 size={18} color="#16A34A" />
                    ) : (
                      <AlertCircle size={18} color="#EF4444" />
                    )}
                    <Text style={[styles.cardTitle, isAccepted ? styles.textGreen : styles.textRed]}>
                      Duty {isAccepted ? 'Accepted' : 'Declined'}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>{notif.date}</Text>
                </View>
                
                <Text style={styles.messageText}>
                  <Text style={styles.boldText}>{notif.userName}</Text> has {isAccepted ? 'accepted' : 'declined'} the role of <Text style={styles.boldText}>{notif.role}</Text> for the {notif.title}.
                </Text>

                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={styles.dismissBtn} 
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDismiss(notif.scheduleId, notif.userId, notif.action, notif.id);
                    }}
                  >
                    <X size={14} color="#6B7280" />
                    <Text style={styles.dismissText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  clearAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 250,
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardAccepted: {
    borderLeftColor: '#16A34A',
  },
  cardDeclined: {
    borderLeftColor: '#EF4444',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  textGreen: {
    color: '#16A34A',
  },
  textRed: {
    color: '#EF4444',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  messageText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 16,
  },
  boldText: {
    fontWeight: '700',
    color: '#111827',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
});
