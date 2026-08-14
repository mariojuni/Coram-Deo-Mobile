import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppNotification } from '../../services/notification/NotificationRepository';
import { formatDistanceToNow } from 'date-fns';
import DebouncedTouchable from '../DebouncedTouchable';
import { SoftCard } from '../ui/SoftCard';

interface Props {
  notification: AppNotification;
  onPress: (notification: AppNotification) => void;
}

export function NotificationItem({ notification, onPress }: Props) {
  const isUnread = !notification.isRead;
  
  const timeAgo = notification.createdAt
    ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })
    : '';

  // Formatting for a11y
  const a11yLabel = `${isUnread ? 'Unread.' : ''} ${notification.title}. ${notification.category}. ${timeAgo}.`;

  return (
    <DebouncedTouchable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      onPress={() => onPress(notification)}
      style={styles.container}
      activeOpacity={0.7}
    >
      <SoftCard innerStyle={[styles.cardInner, isUnread && styles.unreadCardInner]}>
        <View style={styles.contentRow}>
          {isUnread && <View style={styles.unreadDot} />}
          <View style={styles.textContainer}>
            <Text style={[styles.title, isUnread && styles.titleUnread]} numberOfLines={2}>
              {notification.title}
            </Text>
            {!!notification.body && (
              <Text style={styles.body} numberOfLines={2}>
                {notification.body}
              </Text>
            )}
            <View style={styles.metaRow}>
              <Text style={styles.metaCategory}>
                {notification.category.charAt(0).toUpperCase() + notification.category.slice(1)}
              </Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaTime}>{timeAgo}</Text>
            </View>
          </View>
        </View>
      </SoftCard>
    </DebouncedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    marginHorizontal: 16,
  },
  cardInner: {
    padding: 16,
  },
  unreadCardInner: {
    backgroundColor: '#F9FAFB', // subtle highlight for unread
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6596', // using existing pink accent
    marginTop: 6,
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 4,
  },
  titleUnread: {
    fontWeight: '700',
    color: '#111827',
  },
  body: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaCategory: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 12,
    color: '#9CA3AF',
    marginHorizontal: 4,
  },
  metaTime: {
    fontSize: 12,
    color: '#9CA3AF',
  }
});
