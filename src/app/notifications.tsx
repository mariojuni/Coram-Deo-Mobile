import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppNotification, NotificationRepository, NotificationCategory } from '../services/notification/NotificationRepository';
import { useAuthStore } from '../store/useAuthStore';
import { NotificationItem } from '../components/Notifications/NotificationItem';
import DebouncedTouchable from '../components/DebouncedTouchable';
import { CheckCheck } from 'lucide-react-native';
import { isToday, isYesterday } from 'date-fns';
import { NotificationNavigationResolver } from '../services/notification/NotificationNavigationResolver';

const CATEGORIES: { label: string; value: NotificationCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Prayer', value: 'prayer' },
  { label: 'Serve', value: 'serve' },
  { label: 'Events', value: 'event' },
  // { label: 'Discipleship', value: 'discipleship' },
  // { label: 'Worship', value: 'worship' },
  { label: 'Giving', value: 'giving' },
  { label: 'System', value: 'system' }
];

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<NotificationCategory | 'all'>('all');
  const currentUser = useAuthStore(s => s.currentUser);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadNotifications();
  }, [currentUser?.uid]);

  const loadNotifications = async () => {
    if (!currentUser?.uid) return;
    setLoading(true);
    try {
      const data = await NotificationRepository.getNotifications(currentUser.uid, 50);
      setNotifications(data);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser?.uid) return;
    
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    
    try {
      await NotificationRepository.markAllAsRead(currentUser.uid);
    } catch (e) {
      console.error(e);
      // fallback on error, reload
      loadNotifications();
    }
  };

  const handleNotificationPress = async (notification: AppNotification) => {
    // Navigate first if possible for snappiness
    const destination = NotificationNavigationResolver.resolveDestination(notification);
    if (destination) {
      if (router.canGoBack()) {
        router.back();
      }
      setTimeout(() => {
        router.push(destination as any);
      }, 50);
    }

    if (!notification.isRead && currentUser?.uid) {
      // Optimistic read
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
      await NotificationRepository.markAsRead(currentUser.uid, notification.id);
    }
  };

  const filteredData = useMemo(() => {
    if (activeCategory === 'all') return notifications;
    return notifications.filter(n => n.category === activeCategory);
  }, [notifications, activeCategory]);

  const groupedData = useMemo(() => {
    const today: AppNotification[] = [];
    const yesterday: AppNotification[] = [];
    const earlier: AppNotification[] = [];

    filteredData.forEach(n => {
      const date = n.createdAt?.toDate() || new Date();
      if (isToday(date)) today.push(n);
      else if (isYesterday(date)) yesterday.push(n);
      else earlier.push(n);
    });

    const sections = [];
    if (today.length) sections.push({ title: 'Today', data: today });
    if (yesterday.length) sections.push({ title: 'Yesterday', data: yesterday });
    if (earlier.length) sections.push({ title: 'Earlier', data: earlier });

    return sections;
  }, [filteredData]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: 'Notifications',
          headerRight: () => (
            <DebouncedTouchable 
              onPress={handleMarkAllRead} 
              style={{ marginRight: 16, flexDirection: 'row', alignItems: 'center' }}
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
            >
              <CheckCheck size={20} color="#FF6596" />
              <Text style={{ color: '#FF6596', marginLeft: 6, fontWeight: '600' }}>Mark all read</Text>
            </DebouncedTouchable>
          ),
        }}
      />

      <View style={styles.chipContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item.value}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
          renderItem={({ item }) => {
            const isActive = activeCategory === item.value;
            return (
              <DebouncedTouchable
                onPress={() => setActiveCategory(item.value)}
                style={[styles.chip, isActive && styles.chipActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {item.label}
                </Text>
              </DebouncedTouchable>
            );
          }}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6596" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : filteredData.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            {activeCategory === 'all' ? "You're all caught up." : "No notifications here yet."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedData}
          keyExtractor={(item) => item.title}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
          renderItem={({ item }) => (
            <View>
              <Text style={styles.sectionHeader}>{item.title}</Text>
              {item.data.map(notif => (
                <NotificationItem 
                  key={notif.id} 
                  notification={notif} 
                  onPress={handleNotificationPress}
                />
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  chipContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  chipActive: {
    backgroundColor: '#FF6596',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 15,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
});
