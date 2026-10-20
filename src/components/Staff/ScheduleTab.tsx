import { CalendarPlus, Clock, MapPin, Pencil, CalendarDays, CheckCircle2, Bell, Send, XCircle } from 'lucide-react-native';
import React, { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View, Animated, Alert } from 'react-native';
import { Image } from 'expo-image';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';
import { useMemberStore } from '../../store/useMemberStore';
import { useMinistryStore } from '../../store/useMinistryStore';
import { getMinisterialTeam, type Schedule, useScheduleStore, isScheduleCompleted } from '../../store/useScheduleStore';
import AddScheduleModal from './AddScheduleModal';
import { useAuthStore } from '../../store/useAuthStore';
import { createMemberIdMap } from '../../features/member/domain/member.utils';
import { SoftCard, getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import { useRouter } from 'expo-router';
import { doc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { getActiveDb } from '../../firebase';

type TeamMemberCard = {
  avatar: string;
  id: string;
  role: string;
};

type ScheduleCardItem = {
  day: number;
  month: string;
  schedule: Schedule;
  team: TeamMemberCard[];
  weekday: string;
  weekdayShort: string;
};

const formatReminderTime = (minutes?: number | null) => {
  const mins = minutes !== undefined && minutes !== null ? minutes : 30;
  if (mins === 1440) return '1d';
  if (mins >= 60 && mins % 60 === 0) return `${mins / 60}h`;
  return `${mins}m`;
};

interface EventScheduleCardProps {
  item: ScheduleCardItem;
  onEdit: (schedule: Schedule) => void;
  onPublish: (schedule: Schedule) => void;
  onComplete: (schedule: Schedule) => void;
  onCancel: (schedule: Schedule) => void;
  onSwipeOpen: (ref: Swipeable) => void;
  onSwipeClose: (ref: Swipeable) => void;
}

const EventScheduleCard = React.memo(function EventScheduleCard({
  item,
  onEdit,
  onPublish,
  onComplete,
  onCancel,
  onSwipeOpen,
  onSwipeClose,
}: EventScheduleCardProps) {
  const router = useRouter();
  const swipeableRef = useRef<Swipeable>(null);
  const swipeStateRef = useRef<'closed' | 'swiping' | 'open'>('closed');

  const isCompleted = isScheduleCompleted(item.schedule);
  const currentStatus = item.schedule.status?.toLowerCase();
  const isCancelled = currentStatus === 'cancelled';
  const isPublished = !isCompleted && currentStatus === 'published';

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    _dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const opacity = progress.interpolate({
      inputRange: [0, 0.4, 1],
      outputRange: [0.2, 0.7, 1],
      extrapolate: 'clamp',
    });
    const transPublish = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [45, 0],
      extrapolate: 'clamp',
    });
    const transComplete = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [30, 0],
      extrapolate: 'clamp',
    });
    const transCancel = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [15, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.rightActionsRow}>
        {/* Publish Action */}
        <Animated.View
          style={[
            styles.actionItemWrapper,
            { opacity, transform: [{ translateX: transPublish }] },
          ]}
        >
          <TouchableOpacity
            style={styles.actionTouchable}
            activeOpacity={0.75}
            onPress={() => {
              swipeableRef.current?.close();
              if (isPublished) {
                Alert.alert('Event Published', `"${item.schedule.title}" is currently active and published.`);
                return;
              }
              onPublish(item.schedule);
            }}
            accessibilityLabel="Publish event"
          >
            <View style={[styles.actionSquircle, styles.actionSquirclePublish, isPublished && styles.actionSquircleCurrent]}>
              <Send size={16} color={isPublished ? '#9CA3AF' : '#15803D'} strokeWidth={2.4} />
            </View>
            <Text
              style={[styles.actionLabel, styles.actionTextPublish, isPublished && styles.actionLabelCurrent]}
              numberOfLines={1}
            >
              {isPublished ? 'Published' : 'Publish'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Complete Action */}
        <Animated.View
          style={[
            styles.actionItemWrapper,
            { opacity, transform: [{ translateX: transComplete }] },
          ]}
        >
          <TouchableOpacity
            style={styles.actionTouchable}
            activeOpacity={0.75}
            onPress={() => {
              swipeableRef.current?.close();
              if (isCompleted) {
                Alert.alert('Event Completed', `"${item.schedule.title}" is already marked completed.`);
                return;
              }
              onComplete(item.schedule);
            }}
            accessibilityLabel="Complete event"
          >
            <View style={[styles.actionSquircle, styles.actionSquircleComplete, isCompleted && styles.actionSquircleCurrent]}>
              <CheckCircle2 size={17} color={isCompleted ? '#9CA3AF' : '#4338CA'} strokeWidth={2.4} />
            </View>
            <Text
              style={[styles.actionLabel, styles.actionTextComplete, isCompleted && styles.actionLabelCurrent]}
              numberOfLines={1}
            >
              {isCompleted ? 'Completed' : 'Complete'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Cancel Action */}
        <Animated.View
          style={[
            styles.actionItemWrapper,
            { opacity, transform: [{ translateX: transCancel }] },
          ]}
        >
          <TouchableOpacity
            style={styles.actionTouchable}
            activeOpacity={0.75}
            onPress={() => {
              swipeableRef.current?.close();
              if (isCancelled) {
                Alert.alert('Event Cancelled', `"${item.schedule.title}" is already cancelled.`);
                return;
              }
              onCancel(item.schedule);
            }}
            accessibilityLabel="Cancel event"
          >
            <View style={[styles.actionSquircle, styles.actionSquircleCancel, isCancelled && styles.actionSquircleCurrent]}>
              <XCircle size={17} color={isCancelled ? '#9CA3AF' : '#B91C1C'} strokeWidth={2.4} />
            </View>
            <Text
              style={[styles.actionLabel, styles.actionTextCancel, isCancelled && styles.actionLabelCurrent]}
              numberOfLines={1}
            >
              {isCancelled ? 'Cancelled' : 'Cancel'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
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
      onSwipeableWillOpen={() => {
        if (swipeableRef.current) {
          onSwipeOpen(swipeableRef.current);
        }
        swipeStateRef.current = 'swiping';
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onSwipeableOpen={() => {
        swipeStateRef.current = 'open';
      }}
      onSwipeableWillClose={() => {
        swipeStateRef.current = 'swiping';
      }}
      onSwipeableClose={() => {
        if (swipeableRef.current) {
          onSwipeClose(swipeableRef.current);
        }
        swipeStateRef.current = 'closed';
      }}
    >
      <SoftCard style={{ marginBottom: 0, borderRadius: 16 }} innerStyle={{ borderRadius: 15 }}>
        <TouchableOpacity
          style={[styles.card, item.team.length === 0 && styles.cardWithoutTeam]}
          activeOpacity={0.7}
          onPress={() => {
            if (swipeStateRef.current !== 'closed') {
              if (swipeStateRef.current === 'open') {
                swipeableRef.current?.close();
              }
              return;
            }
            router.push({ pathname: '/assign-ministries', params: { scheduleId: item.schedule.id } });
          }}
          onLongPress={() => {
            if (swipeStateRef.current !== 'closed') return;
            onEdit(item.schedule);
          }}
          delayLongPress={400}
        >
          <View style={styles.cardContent}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateMonth}>{item.month}</Text>
              <Text style={styles.dateDay}>{item.day}</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', marginTop: 2, letterSpacing: 0.5 }}>
                {item.weekdayShort}
              </Text>
            </View>

            <View style={styles.detailsBlock}>
              {(item.schedule.status || isCompleted || (item.schedule.reminderMinutesBefore !== 0 && item.schedule.reminderMinutesBefore !== null)) && (
                <View style={styles.badgeRow}>
                  {(item.schedule.status || isCompleted) ? (
                    <View
                      style={[
                        styles.statusBadge,
                        isCancelled
                          ? styles.statusCancelled
                          : isCompleted
                          ? styles.statusCompleted
                          : currentStatus === 'published'
                          ? styles.statusPublished
                          : styles.statusDraft,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          isCancelled
                            ? styles.statusTextCancelled
                            : isCompleted
                            ? styles.statusTextCompleted
                            : currentStatus === 'published'
                            ? styles.statusTextPublished
                            : styles.statusTextDraft,
                        ]}
                      >
                        {isCancelled
                          ? 'CANCELLED'
                          : isCompleted
                          ? 'COMPLETED'
                          : item.schedule.status?.toUpperCase()}
                      </Text>
                    </View>
                  ) : (
                    <View />
                  )}
                  {item.schedule.reminderMinutesBefore !== 0 && item.schedule.reminderMinutesBefore !== null && (
                    <View
                      style={[
                        styles.reminderBadge,
                        item.schedule.notificationSent && styles.reminderBadgeSent,
                      ]}
                    >
                      <Bell
                        size={10}
                        color={item.schedule.notificationSent ? '#059669' : '#FF6596'}
                        style={{ marginRight: 3 }}
                      />
                      <Text
                        style={[
                          styles.reminderText,
                          item.schedule.notificationSent && styles.reminderTextSent,
                        ]}
                      >
                        {item.schedule.notificationSent ? 'Sent' : formatReminderTime(item.schedule.reminderMinutesBefore)}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              <View style={styles.titleRow}>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {item.schedule.title}
                </Text>
                <TouchableOpacity
                  style={styles.editBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => onEdit(item.schedule)}
                  accessibilityLabel="Edit Event"
                >
                  <Pencil size={14} color="#aaa" />
                </TouchableOpacity>
              </View>

              <View style={[styles.roleRow, item.team.length === 0 && styles.roleRowWithoutTeam]}>
                <View style={styles.timeRow}>
                  <Clock size={12} color="#888" style={styles.timeIcon} />
                  <Text style={styles.infoText}>
                    {item.schedule.time || '9:00 AM'}
                    {item.schedule.endTime ? ` - ${item.schedule.endTime}` : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <MapPin size={14} color="#888" style={styles.locationIcon} />
                <Text style={styles.infoText}>{item.schedule.location || 'Main Sanctuary'}</Text>
              </View>

              {item.team.length > 0 && (
                <View style={styles.teamRow}>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.teamScrollContent}
                    style={styles.teamScrollView}
                  >
                    <View style={styles.teamAvatars}>
                      {item.team.map((member, index) => (
                        <View
                          key={`${member.id}-${index}`}
                          style={[
                            styles.avatarWrapper,
                            { zIndex: 10 - index },
                            index > 0 && styles.stackedAvatar,
                          ]}
                        >
                          <Image source={{ uri: member.avatar }} style={styles.teamAvatar} transition={200} cachePolicy="memory-disk" contentFit="cover" />
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                  <Text style={styles.tapHint}>Tap to assign →</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </SoftCard>
    </Swipeable>
  );
});

export default function ScheduleTab({ 
  onScroll, 
  headerHeight = 0 
}: { 
  onScroll?: any; 
  headerHeight?: number; 
}) {
  const schedules = useScheduleStore((state) => state.schedules);
  const { assignments, initializeAssignmentsListener } = useMinistryStore();
  const userProfile = useAuthStore((s) => s.userProfile);
  const [filterTab, setFilterTab] = useState<'active' | 'completed'>('active');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<Schedule | null>(null);
  const members = useMemberStore((state) => state.members);
  const memberById = useMemo(() => createMemberIdMap(members), [members]);
  const openSwipeableRef = useRef<Swipeable | null>(null);

  const handleSwipeOpen = useCallback((ref: Swipeable) => {
    if (openSwipeableRef.current && openSwipeableRef.current !== ref) {
      openSwipeableRef.current.close();
    }
    openSwipeableRef.current = ref;
  }, []);

  const handleSwipeClose = useCallback((ref: Swipeable) => {
    if (openSwipeableRef.current === ref) {
      openSwipeableRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (openSwipeableRef.current) {
      openSwipeableRef.current.close();
      openSwipeableRef.current = null;
    }
  }, [filterTab]);

  const formatDate = (dateStr: string) => {
    const normalizeDateToYmd = (value: string): string | null => {
      if (!value) return null;
      const ymd = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (ymd) {
        const [, y, m, d] = ymd;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      const mdy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (mdy) {
        const [, m, d, y] = mdy;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      return null;
    };

    const normalized = normalizeDateToYmd(dateStr);
    const d = normalized ? new Date(`${normalized}T00:00:00`) : new Date(dateStr);

    return {
      month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      day: d.getDate(),
      weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
      weekdayShort: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    };
  };

  useEffect(() => {
    const churchId = userProfile?.churchId;
    if (!churchId) return;
    const unsubscribe = initializeAssignmentsListener(churchId);
    return () => unsubscribe();
  }, [initializeAssignmentsListener, userProfile?.churchId]);

  const allScheduleItems = useMemo<ScheduleCardItem[]>(
    () =>
      schedules.map((schedule) => {
        const { month, day, weekday } = formatDate(schedule.date);
        const team = getMinisterialTeam(schedule.id, assignments)
          .map((assignment) => {
            const member = memberById.get(assignment.memberId);
            if (!member) return null;
            return {
              id: assignment.memberId,
              role: assignment.roleName,
              avatar:
                (member as any).photoUrl || member.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'User')}&background=f0f0f0&color=999`,
            };
          })
          .filter((member): member is TeamMemberCard => member !== null);

        return {
          day,
          month,
          schedule,
          team,
          weekday,
          weekdayShort: formatDate(schedule.date).weekdayShort,
        };
      }),
    [memberById, schedules, assignments]
  );

  const activeItems = useMemo(
    () => allScheduleItems.filter((item) => !isScheduleCompleted(item.schedule)),
    [allScheduleItems]
  );

  const completedItems = useMemo(
    () => allScheduleItems.filter((item) => isScheduleCompleted(item.schedule)),
    [allScheduleItems]
  );

  const displayedItems = filterTab === 'active' ? activeItems : completedItems;

  const handleComplete = useCallback((schedule: Schedule) => {
    Alert.alert(
      'Mark Completed',
      `Are you sure you want to mark "${schedule.title}" as completed?\n\nIt will be moved to completed events.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Completed',
          style: 'default',
          onPress: async () => {
            try {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await updateDoc(doc(getActiveDb(), 'events', schedule.id), {
                status: 'completed',
                completedAt: new Date().toISOString(),
              });

              // Close attendance sessions if any
              const sessionsQ = query(
                collection(getActiveDb(), 'attendance_sessions'),
                where('eventId', '==', schedule.id)
              );
              const sessionsSnap = await getDocs(sessionsQ);
              if (!sessionsSnap.empty) {
                const batch = writeBatch(getActiveDb());
                sessionsSnap.forEach((sDoc) => {
                  batch.update(doc(getActiveDb(), 'attendance_sessions', sDoc.id), { status: 'Closed' });
                });
                await batch.commit();
              }
            } catch (e) {
              console.error('Error completing event:', e);
              Alert.alert('Error', 'Failed to mark event as completed.');
            }
          },
        },
      ]
    );
  }, []);

  const handlePublish = useCallback((schedule: Schedule) => {
    Alert.alert(
      'Publish Event',
      `Publish "${schedule.title}" to make it active and visible?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          style: 'default',
          onPress: async () => {
            try {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await updateDoc(doc(getActiveDb(), 'events', schedule.id), {
                status: 'published',
                completedAt: null,
              });
            } catch (e) {
              console.error('Error publishing event:', e);
              Alert.alert('Error', 'Failed to publish event.');
            }
          },
        },
      ]
    );
  }, []);

  const handleCancel = useCallback((schedule: Schedule) => {
    Alert.alert(
      'Cancel Event',
      `Are you sure you want to cancel "${schedule.title}"?\n\nThis will mark the event status as cancelled.`,
      [
        { text: 'Keep Event', style: 'cancel' },
        {
          text: 'Cancel Event',
          style: 'destructive',
          onPress: async () => {
            try {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await updateDoc(doc(getActiveDb(), 'events', schedule.id), {
                status: 'cancelled',
              });

              const sessionsQ = query(
                collection(getActiveDb(), 'attendance_sessions'),
                where('eventId', '==', schedule.id)
              );
              const sessionsSnap = await getDocs(sessionsQ);
              if (!sessionsSnap.empty) {
                const batch = writeBatch(getActiveDb());
                sessionsSnap.forEach((sDoc) => {
                  batch.update(doc(getActiveDb(), 'attendance_sessions', sDoc.id), { status: 'Closed' });
                });
                await batch.commit();
              }
            } catch (e) {
              console.error('Error cancelling event:', e);
              Alert.alert('Error', 'Failed to cancel event.');
            }
          },
        },
      ]
    );
  }, []);

  const handleEdit = useCallback((schedule: Schedule) => {
    setEventToEdit(schedule);
    setIsAddModalOpen(true);
  }, []);

  const renderScheduleItem = useCallback(
    ({ item }: { item: ScheduleCardItem }) => (
      <EventScheduleCard
        item={item}
        onEdit={handleEdit}
        onPublish={handlePublish}
        onComplete={handleComplete}
        onCancel={handleCancel}
        onSwipeOpen={handleSwipeOpen}
        onSwipeClose={handleSwipeClose}
      />
    ),
    [handleEdit, handlePublish, handleComplete, handleCancel, handleSwipeOpen, handleSwipeClose]
  );

  const renderSeparator = useCallback(() => <View style={styles.listSeparator} />, []);

  return (
    <View style={styles.container}>
      {displayedItems.length === 0 ? (
        <Animated.ScrollView 
          onScroll={onScroll} 
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingTop: headerHeight + 16, flexGrow: 1, paddingHorizontal: 20 }}
        >
          <View style={styles.headerRow}>
            <Text style={styles.title}>Event Schedules</Text>
            <TouchableOpacity 
              style={styles.addIconBtn} 
              onPress={() => {
                setEventToEdit(null);
                setIsAddModalOpen(true);
              }}
            >
              <CalendarPlus size={24} color="#FF6596" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterPillsRow}>
            <TouchableOpacity
              style={[styles.filterPill, filterTab === 'active' && styles.filterPillActive]}
              onPress={() => setFilterTab('active')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterPillText, filterTab === 'active' && styles.filterPillTextActive]}>
                Upcoming ({activeItems.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPill, filterTab === 'completed' && styles.filterPillActive]}
              onPress={() => setFilterTab('completed')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterPillText, filterTab === 'completed' && styles.filterPillTextActive]}>
                Completed ({completedItems.length})
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
            {filterTab === 'active' ? (
              <>
                <CalendarDays size={56} color="#FF6596" strokeWidth={1.5} />
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#1F2937', textAlign: 'center', marginBottom: 4 }}>
                  No Upcoming Events
                </Text>
                <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 }}>
                  All events are completed or none have been scheduled yet.{'\n'}Tap the + icon above to create one.
                </Text>
                {completedItems.length > 0 && (
                  <TouchableOpacity
                    style={styles.switchFilterBtn}
                    onPress={() => setFilterTab('completed')}
                  >
                    <Text style={styles.switchFilterBtnText}>
                      View Completed Events ({completedItems.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <CheckCircle2 size={56} color="#10B981" strokeWidth={1.5} />
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#1F2937', textAlign: 'center', marginBottom: 4 }}>
                  No Completed Events
                </Text>
                <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 }}>
                  Events that have ended or been marked completed will automatically appear here.
                </Text>
              </>
            )}
          </View>
        </Animated.ScrollView>
      ) : (
        <Animated.FlatList
          data={displayedItems}
          extraData={schedules}
          renderItem={renderScheduleItem}
          keyExtractor={(item: any) => item.schedule.id}
          ItemSeparatorComponent={renderSeparator}
          contentContainerStyle={[styles.listContainer, { paddingTop: headerHeight + 16 }]}
          onScroll={onScroll}
          onScrollBeginDrag={() => {
            if (openSwipeableRef.current) {
              openSwipeableRef.current.close();
              openSwipeableRef.current = null;
            }
          }}
          scrollEventThrottle={16}
          ListHeaderComponent={
            <View>
              <View style={styles.headerRow}>
                <Text style={styles.title}>Event Schedules</Text>
                <TouchableOpacity 
                  style={styles.addIconBtn} 
                  onPress={() => {
                    setEventToEdit(null);
                    setIsAddModalOpen(true);
                  }}
                >
                  <CalendarPlus size={24} color="#FF6596" />
                </TouchableOpacity>
              </View>

              <View style={styles.filterPillsRow}>
                <TouchableOpacity
                  style={[styles.filterPill, filterTab === 'active' && styles.filterPillActive]}
                  onPress={() => setFilterTab('active')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterPillText, filterTab === 'active' && styles.filterPillTextActive]}>
                    Upcoming ({activeItems.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterPill, filterTab === 'completed' && styles.filterPillActive]}
                  onPress={() => setFilterTab('completed')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterPillText, filterTab === 'completed' && styles.filterPillTextActive]}>
                    Completed ({completedItems.length})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={32}
          windowSize={7}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
        />
      )}

      <AddScheduleModal
        key={eventToEdit?.id ?? `new-${isAddModalOpen ? 'open' : 'closed'}`}
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEventToEdit(null);
        }}
        eventToEdit={eventToEdit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  title: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  addIconBtn: { ...getTopBarButtonShadowStyle(24), padding: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterPillActive: {
    backgroundColor: '#FF6596',
    borderColor: '#FF6596',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  switchFilterBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  switchFilterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6596',
  },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 15 },
  listContainer: { paddingBottom: 8, paddingHorizontal: 20 },
  listSeparator: { height: 16 },
  card: { backgroundColor: '#fff', padding: 16 },
  cardWithoutTeam: { paddingBottom: 12 },
  cardContent: { flexDirection: 'row' },
  dateBlock: { width: 60, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#f0f0f0', paddingRight: 16, marginRight: 16 },
  dateMonth: { fontSize: 13, fontWeight: '800', color: '#FF6596', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  dateDay: { fontSize: 28, fontWeight: '900', color: '#1a1a1a', lineHeight: 32 },
  detailsBlock: { flex: 1, paddingLeft: 4 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  eventTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: '#1a1a1a', marginRight: 8 },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'center',
  },
  statusPublished: { backgroundColor: '#DCFCE7' },
  statusDraft: { backgroundColor: '#FEF3C7' },
  statusCancelled: { backgroundColor: '#FEE2E2' },
  statusCompleted: { backgroundColor: '#E0E7FF' },
  statusText: { fontSize: 10, fontWeight: '800' },
  statusTextPublished: { color: '#15803D' },
  statusTextDraft: { color: '#B45309' },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#FFE8F0',
    borderWidth: 1,
    borderColor: '#FFD1E0',
  },
  reminderBadgeSent: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  reminderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6596',
  },
  reminderTextSent: {
    color: '#059669',
  },
  statusTextCancelled: { color: '#B91C1C' },
  statusTextCompleted: { color: '#4338CA' },
  roleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  roleRowWithoutTeam: { marginBottom: 2 },
  dotSeparator: { color: '#ccc', marginHorizontal: 6, fontSize: 14 },
  weekdayText: { fontSize: 13, fontWeight: '600', color: '#888' },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  timeIcon: { marginRight: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  locationIcon: { marginRight: 4 },
  infoText: { fontSize: 13, color: '#666', fontWeight: '500' },
  teamRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  teamScrollView: { flex: 1, marginRight: 8 },
  teamScrollContent: { alignItems: 'center', paddingRight: 8 },
  teamAvatars: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  avatarWrapper: { position: 'relative', flexShrink: 0 },
  stackedAvatar: { marginLeft: -12 },
  teamAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#fff', flexShrink: 0 },
  tapHint: { fontSize: 11, color: '#FF6596', fontWeight: '600', flexShrink: 0 },
  editBtn: { padding: 4, marginLeft: 2 },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 196,
    paddingLeft: 8,
    paddingRight: 4,
    gap: 6,
    height: '100%',
  },
  actionItemWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
  },
  actionTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 6,
  },
  actionSquircle: {
    width: 48,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionSquirclePublish: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  actionSquircleComplete: {
    backgroundColor: '#E0E7FF',
    borderColor: '#C7D2FE',
  },
  actionSquircleCancel: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  actionSquircleCurrent: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  actionTextPublish: {
    color: '#15803D',
  },
  actionTextComplete: {
    color: '#4338CA',
  },
  actionTextCancel: {
    color: '#B91C1C',
  },
  actionLabelCurrent: {
    color: '#9CA3AF',
  },
});
