import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AppNotification } from '../../services/notification/NotificationRepository';
import { formatDistanceToNow } from 'date-fns';
import { BounceCard } from '../ui/BounceCard';
import { SoftCard } from '../ui/SoftCard';
import { Colors } from '../../constants/theme';
import { Image as ExpoImage } from 'expo-image';
import { 
  User, Trash2, Users, BookOpen, Drum, GraduationCap, 
  Guitar, HandCoins, Mic, Monitor, Piano, Shield, Music, Heart, Star, Settings
} from 'lucide-react-native';
import { PrayingHands } from '../ui/icons/PrayingHands';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useMinistryStore } from '../../store/useMinistryStore';

const ROLE_ICONS: Record<string, React.ReactNode> = {
  openingprayer: <PrayingHands size={24} color="#818CF8" />,
  tithesofferingprayer: <HandCoins size={24} color="#4D8BFF" />,
  techaudio: <Monitor size={24} color="#6B7280" />,
  tech: <Monitor size={24} color="#6B7280" />,
  audio: <Monitor size={24} color="#6B7280" />,
  presider: <Users size={24} color="#FF6596" />,
  scripturereading: <BookOpen size={24} color="#F59E0B" />,
  scripture: <BookOpen size={24} color="#F59E0B" />,
  preacher: <Mic size={24} color="#FF6596" />,
  vocalist: <Mic size={24} color="#8B6FE8" />,
  bassguitar: <Guitar size={24} color="#4D8BFF" />,
  drummer: <Drum size={24} color="#EF4444" />,
  piano: <Piano size={24} color="#10B981" />,
  electricguitar: <Guitar size={24} color="#F59E0B" />,
  kids: <GraduationCap size={24} color="#F59E0B" />,
  youth: <GraduationCap size={24} color="#4D8BFF" />,
  adults: <GraduationCap size={24} color="#10B981" />,
};

const ROLE_ICON_BG: Record<string, string> = {
  openingprayer: '#E0E7FF',
  tithesofferingprayer: '#E8F0FF',
  techaudio: '#F3F4F6',
  tech: '#F3F4F6',
  audio: '#F3F4F6',
  presider: '#FFE8F0',
  scripturereading: '#FEF3C7',
  scripture: '#FEF3C7',
  preacher: '#FFE8F0',
  vocalist: '#F3EEFF',
  bassguitar: '#E8F0FF',
  drummer: '#FEE2E2',
  piano: '#D1FAE5',
  electricguitar: '#FEF3C7',
  kids: '#FEF3C7',
  youth: '#E8F0FF',
  adults: '#D1FAE5',
};

const ICON_COMPONENTS: Record<string, any> = {
  Users, Shield, Mic, Monitor, BookOpen, Guitar, Drum, Piano, GraduationCap, Music, Heart, Star, Settings
};

const ICON_COLORS: Record<string, string> = {
  '#E0E7FF': '#818CF8', // Indigo
  '#E8F0FF': '#4D8BFF', // Blue
  '#F3F4F6': '#6B7280', // Gray
  '#FFE8F0': '#FF6596', // Pink
  '#FEF3C7': '#F59E0B', // Amber
  '#FEE2E2': '#EF4444', // Red
  '#D1FAE5': '#10B981', // Emerald
  '#F3EEFF': '#8B6FE8', // Purple
  '#FFEDD5': '#F97316', // Orange
  '#ECFEFF': '#06B6D4', // Cyan
  '#FCE7F3': '#EC4899', // Pink Dark
  '#FEF08A': '#EAB308', // Yellow
};

interface Props {
  notification: AppNotification;
  onPress: (notification: AppNotification) => void;
  onDelete?: (notification: AppNotification) => void;
}

export function NotificationItem({ notification, onPress, onDelete }: Props) {
  const swipeableRef = useRef<Swipeable>(null);
  const isUnread = !notification.isRead;
  const theme = Colors.light;
  
  const ministries = useMinistryStore(s => s.ministries);
  const memberAssignments = useMinistryStore(s => s.memberAssignments);
  const assignments = useMinistryStore(s => s.assignments);

  const timeAgo = notification.createdAt
    ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })
    : '';

  const a11yLabel = `${isUnread ? 'Unread.' : ''} ${notification.title}. ${timeAgo}.`;
  
  const isAssignment = notification.type === 'ministry_assignment' || notification.type === 'schedule_assignment';

  let displayTitle = notification.title;
  let displayBodyText = notification.body || '';

  if (!isAssignment) {
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

    displayTitle = displayActorName;
    displayBodyText = notification.body || fallbackText;
    if (displayTitle && displayBodyText.startsWith(displayTitle)) {
      displayBodyText = displayBodyText.substring(displayTitle.length).trim();
    }
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

  const renderAvatar = () => {
    if (isAssignment) {
      let icon: React.ReactNode = <Users size={24} color="#047857" strokeWidth={2} />;
      let bg = '#d1fae5';
      
      let targetRoleName = '';
      let targetMinistry = null;

      // 1. First try to get precise data from the assignment document using sourceId
      const assignment = memberAssignments.find(a => a.id === notification.sourceId) 
        || assignments.find(a => a.id === notification.sourceId);

      if (assignment) {
        targetRoleName = assignment.roleName;
        targetMinistry = ministries.find(m => m.id === assignment.ministryId);
      } else {
        // 2. Fallback to parsing body if assignment isn't loaded in store
        const roleMatch = notification.body?.match(/as (.*?)(?: for |\.$)/);
        if (roleMatch && roleMatch[1]) {
          targetRoleName = roleMatch[1].trim();
        }
        const ministryMatch = notification.body?.match(/assigned to (.*?) as/);
        if (ministryMatch && ministryMatch[1]) {
          const ministryName = ministryMatch[1].trim();
          targetMinistry = ministries.find(m => m.name === ministryName);
        }
      }

      if (targetRoleName) {
        const normRole = targetRoleName.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Exact logic from assign-ministries
        const customDetails = targetMinistry?.roleDetails?.[targetRoleName];
        bg = customDetails?.color || ROLE_ICON_BG[normRole] || '#d1fae5';
        
        const iconName = customDetails?.icon;
        const iconColor = ICON_COLORS[bg] || '#6B7280';
        
        if (iconName && ICON_COMPONENTS[iconName]) {
          const Comp = ICON_COMPONENTS[iconName];
          icon = <Comp size={24} color={iconColor} />;
        } else {
          icon = ROLE_ICONS[normRole] ?? <Users size={24} color="#047857" strokeWidth={2} />;
        }
      }

      return (
        <View style={[styles.avatarCircle, { backgroundColor: bg }]}>
          {icon}
        </View>
      );
    }
    return (
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
            {renderAvatar()}
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.inlineText}>
              {displayTitle ? (
                <Text style={[styles.boldText, { color: isUnread ? theme.text : '#111827' }]}>{displayTitle} </Text>
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
