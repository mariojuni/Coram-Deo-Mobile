import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AppNotification } from '../../services/notification/NotificationRepository';
import { formatDistanceToNow } from 'date-fns';
import { BounceCard } from '../ui/BounceCard';
import { SoftCard } from '../ui/SoftCard';
import { Colors } from '../../constants/theme';
import { Image as ExpoImage } from 'expo-image';
import { User, Trash2 } from 'lucide-react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

interface Props {
  notification: AppNotification;
  onPress: (notification: AppNotification) => void;
  onDelete?: (notification: AppNotification) => void;
}

export function NotificationItem({ notification, onPress, onDelete }: Props) {
  const swipeableRef = useRef<Swipeable>(null);
  const isUnread = !notification.isRead;
  const theme = Colors.light;
  
  const timeAgo = notification.createdAt
    ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })
    : '';

  const a11yLabel = `${isUnread ? 'Unread.' : ''} ${notification.title}. ${timeAgo}.`;
  
  // Try to extract actorName if it's not provided explicitly
  let displayActorName = notification.actorName || '';
  let fallbackText = notification.title;
  
  if (!displayActorName && notification.title) {
    // Basic heuristic: assume the first 2 or 3 words might be the name if not explicitly provided
    const parts = notification.title.split(' ');
    if (parts.length > 2) {
      displayActorName = `${parts[0]} ${parts[1]}`;
      fallbackText = notification.title.substring(displayActorName.length).trim();
    }
  } else if (displayActorName && notification.title.startsWith(displayActorName)) {
    fallbackText = notification.title.substring(displayActorName.length).trim();
  }

  let displayBodyText = notification.body || fallbackText;
  if (displayActorName && displayBodyText.startsWith(displayActorName)) {
    displayBodyText = displayBodyText.substring(displayActorName.length).trim();
  }

  const renderRightActions = () => {
    if (!onDelete) return null;
    return (
      <View style={styles.deleteActionContainer}>
        <TouchableOpacity
          style={styles.deleteActionButton}
          onPress={() => {
            swipeableRef.current?.close();
            onDelete(notification);
          }}
          activeOpacity={0.8}
        >
          <Trash2 color="#FFFFFF" size={20} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
    >
      <BounceCard
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        onPress={() => onPress(notification)}
        style={styles.container}
        activeOpacity={0.85}
      >
      <SoftCard innerStyle={[
        styles.cardInner, 
        { backgroundColor: '#FFFFFF' }
      ]}>
        <View style={styles.contentRow}>
          
          <View style={styles.avatarWrapper}>
            <View style={[styles.avatarCircle, { backgroundColor: '#E5E7EB' }]}>
              {notification.actorPhotoUrl ? (
                <ExpoImage
                  source={{ uri: notification.actorPhotoUrl }}
                  style={styles.avatarImage}
                  cachePolicy="memory-disk"
                  transition={150}
                />
              ) : (
                <User size={24} color="#6B7280" strokeWidth={2} />
              )}
            </View>
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.inlineText}>
              {displayActorName ? (
                <Text style={[styles.boldText, { color: isUnread ? theme.text : '#111827' }]}>{displayActorName} </Text>
              ) : null}
              <Text style={{ color: '#4B5563' }}>{displayBodyText}</Text>
            </Text>
            
            <Text style={[styles.metaTime, { color: '#6B7280' }]}>{timeAgo}</Text>
          </View>

          {isUnread && (
            <View style={styles.unreadIndicatorWrapper}>
              <View style={[styles.unreadDot, { backgroundColor: '#FF0000' }]} />
            </View>
          )}

        </View>
      </SoftCard>
    </BounceCard>
    </Swipeable>
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
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarWrapper: {
    marginRight: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 2,
    marginRight: 8,
  },
  inlineText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  boldText: {
    fontWeight: '700',
    color: '#111827',
  },
  metaTime: {
    fontSize: 14,
    fontWeight: '500',
  },
  unreadIndicatorWrapper: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 8, // align to the center of the first line (name)
    marginLeft: 4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deleteActionContainer: {
    marginRight: 16,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
  },
  deleteActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
