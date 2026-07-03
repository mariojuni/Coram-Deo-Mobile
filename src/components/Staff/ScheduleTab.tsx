import { CalendarPlus, Clock, MapPin, Pencil } from 'lucide-react-native';
import { useEffect, useCallback, useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMemberStore } from '../../store/useMemberStore';
import { useMinistryStore } from '../../store/useMinistryStore';
import { getMinisterialTeam, type Schedule, useScheduleStore } from '../../store/useScheduleStore';
import AddScheduleModal from './AddScheduleModal';
import AssignMinistriesModal from './AssignMinistriesModal';
import { useAuthStore } from '../../store/useAuthStore';

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
};

export default function ScheduleTab() {
  const schedules = useScheduleStore((state) => state.schedules);
  const { assignments, initializeAssignmentsListener } = useMinistryStore();
  const userProfile = useAuthStore((s) => s.userProfile);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<Schedule | null>(null);
  const [assignSchedule, setAssignSchedule] = useState<Schedule | null>(null);
  const members = useMemberStore((state) => state.members);
  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return {
      month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      day: d.getDate(),
      weekday: d.toLocaleDateString('en-US', { weekday: 'long' })
    };
  };

  useEffect(() => {
    const churchId = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
    const unsubscribe = initializeAssignmentsListener(churchId as string);
    return () => unsubscribe();
  }, [initializeAssignmentsListener, userProfile?.churchId]);

  const scheduleItems = useMemo<ScheduleCardItem[]>(
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
                member.avatar ||
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
        };
      }),
    [memberById, schedules, assignments]
  );

  const renderScheduleItem = useCallback(
    ({ item }: { item: ScheduleCardItem }) => (
      <TouchableOpacity
        style={[styles.card, item.team.length === 0 && styles.cardWithoutTeam]}
        activeOpacity={0.7}
        onPress={() => setAssignSchedule(item.schedule)}
        onLongPress={() => {
          setEventToEdit(item.schedule);
          setIsAddModalOpen(true);
        }}
        delayLongPress={400}
      >
        <View style={styles.cardContent}>
          <View style={styles.dateBlock}>
            <Text style={styles.dateMonth}>{item.month}</Text>
            <Text style={styles.dateDay}>{item.day}</Text>
          </View>

          <View style={styles.detailsBlock}>
            <View style={styles.titleRow}>
              <Text style={styles.eventTitle} numberOfLines={1}>
                {item.schedule.title}
              </Text>
              <TouchableOpacity
                style={styles.editBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => {
                  setEventToEdit(item.schedule);
                  setIsAddModalOpen(true);
                }}
              >
                <Pencil size={14} color="#aaa" />
              </TouchableOpacity>
            </View>

            <View style={[styles.roleRow, item.team.length === 0 && styles.roleRowWithoutTeam]}>
              <Text style={styles.weekdayText}>{item.weekday}</Text>
              <Text style={styles.dotSeparator}>•</Text>
              <View style={styles.timeRow}>
                <Clock size={12} color="#888" style={styles.timeIcon} />
                <Text style={styles.infoText}>
                  {item.schedule.time}
                  {item.schedule.endTime ? ` - ${item.schedule.endTime}` : ''}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <MapPin size={14} color="#888" style={styles.locationIcon} />
              <Text style={styles.infoText}>{item.schedule.location}</Text>
            </View>

            {item.team.length > 0 && (
              <View style={styles.teamRow}>
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
                      <Image source={{ uri: member.avatar }} style={styles.teamAvatar} />
                    </View>
                  ))}
                </View>
                <Text style={styles.tapHint}>Tap to assign →</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    ),
    []
  );

  const renderSeparator = useCallback(() => <View style={styles.listSeparator} />, []);

  return (
    <View style={styles.container}>
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

      {scheduleItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No upcoming schedules found.</Text>
        </View>
      ) : (
        <FlatList
          data={scheduleItems}
          renderItem={renderScheduleItem}
          keyExtractor={(item) => item.schedule.id}
          ItemSeparatorComponent={renderSeparator}
          contentContainerStyle={styles.listContainer}
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

      {assignSchedule && (
        <AssignMinistriesModal
          schedule={assignSchedule}
          onClose={() => setAssignSchedule(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  title: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  addIconBtn: { padding: 8, backgroundColor: '#fff', borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 15 },
  listContainer: { paddingBottom: 8 },
  listSeparator: { height: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.02)' },
  cardWithoutTeam: { paddingBottom: 12 },
  cardContent: { flexDirection: 'row' },
  dateBlock: { width: 60, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#f0f0f0', paddingRight: 16, marginRight: 16 },
  dateMonth: { fontSize: 13, fontWeight: '800', color: '#FF6596', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  dateDay: { fontSize: 28, fontWeight: '900', color: '#1a1a1a', lineHeight: 32 },
  detailsBlock: { flex: 1, paddingLeft: 4 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  eventTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: '#1a1a1a', marginRight: 8 },
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
  teamAvatars: { flexDirection: 'row', paddingRight: 10, minHeight: 32 },
  avatarWrapper: { position: 'relative' },
  stackedAvatar: { marginLeft: -12 },
  teamAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#fff' },
  tapHint: { fontSize: 11, color: '#FF6596', fontWeight: '600' },
  editBtn: { padding: 4, marginLeft: 4 },
});
