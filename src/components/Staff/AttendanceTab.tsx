import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarDays,
  CheckCircle,
  Clock,
  Search,
  ShieldAlert,
  Trash2,
  User,
  Users,
  UserCheck,
  Plus,
  X,
  ChevronDown
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import {
  ActivityIndicator, Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList
} from 'react-native';
import { attendanceRepository } from '../../features/attendance/data/attendance.repository';
import type { AttendanceRecord, CreateAttendanceRecordInput } from '../../features/attendance/domain/attendance.types';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useUIStore } from '../../store/useUIStore';

const formatTime12Hr = (timeStr?: string) => {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  if (!hours || !minutes) return timeStr;
  let h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h}:${minutes} ${ampm}`;
};

import { formatMemberName } from '@/features/member/domain/member.utils';
import AppModal from '../ui/AppModal';
import { getTopBarButtonShadowStyle, getSoftShadowStyle } from '@/components/ui/SoftCard';
import { BounceCard } from '@/components/ui/BounceCard';
import { useAuthStore } from '../../store/useAuthStore';
import { useModalKeyboard } from '@/hooks/useModalKeyboard';
import { useScheduleStore } from '../../store/useScheduleStore';
import { canManageAttendance } from '../../permissions/attendancePermissions';
import { useRouter } from 'expo-router';

interface AttendanceTabProps {
  members: any[];
  showStaffFeatures: boolean; // Keep for fallback, but we'll use canManageAttendance
}

export default function AttendanceTab({ members, showStaffFeatures }: AttendanceTabProps) {
  const userProfile = useAuthStore((state) => state.userProfile);
  const setSyncToastMessage = useUIStore((state) => state.setSyncToastMessage);
  const { schedules } = useScheduleStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchCheckedInQuery, setSearchCheckedInQuery] = useState('');
  
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

  // Events for selected date
  const eventsForDate = schedules.filter(s => normalizeDateToYmd(s.date) === filterDate);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Automatically select the first event if none is selected for the date
  useEffect(() => {
    if (eventsForDate.length > 0) {
      if (!selectedEventId || !eventsForDate.find(e => e.id === selectedEventId)) {
        setSelectedEventId(eventsForDate[0].id);
      }
    } else {
      setSelectedEventId(null);
    }
  }, [filterDate, schedules, selectedEventId, eventsForDate]);

  const selectedEvent = eventsForDate.find(e => e.id === selectedEventId);
  const hasAccess = canManageAttendance(userProfile, selectedEvent as any) || showStaffFeatures;

  const [checkins, setCheckins] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    if (!selectedEventId || !userProfile?.churchId || !hasAccess) {
      setCheckins([]);
      return;
    }
    const unsubscribe = attendanceRepository.subscribeByEventId(
      selectedEventId,
      userProfile.churchId,
      (records) => {
        setCheckins(records);
      },
      (error) => {
        console.error("Error fetching checkins:", error);
      }
    );
    return () => unsubscribe();
  }, [selectedEventId, userProfile?.churchId, hasAccess]);

  // Calendar Modal state
  const [modalCurrentMonth, setModalCurrentMonth] = useState(new Date());
  const [modalSelectedDate, setModalSelectedDate] = useState(filterDate);

  const daysInMonth = new Date(modalCurrentMonth.getFullYear(), modalCurrentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(modalCurrentMonth.getFullYear(), modalCurrentMonth.getMonth(), 1).getDay();

  const changeMonth = (diff: number) => {
    setModalCurrentMonth(new Date(modalCurrentMonth.getFullYear(), modalCurrentMonth.getMonth() + diff, 1));
  };

  const calendarGrid = [];
  for (let i = 0; i < firstDay; i++) calendarGrid.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarGrid.push(i);

  const calendarRows = [];
  for (let i = 0; i < calendarGrid.length; i += 7) {
    const row = calendarGrid.slice(i, i + 7);
    while (row.length < 7) row.push(null);
    calendarRows.push(row);
  }
  
  const todayDateStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const handleOpenEventPicker = () => {
    // Parse filterDate correctly (YYYY-MM-DD)
    const [y, m, d] = filterDate.split('-').map(Number);
    setModalCurrentMonth(new Date(y, m - 1, 1));
    setModalSelectedDate(filterDate);
    setIsEventPickerOpen(true);
  };

  // Modals state
  const [isEventPickerOpen, setIsEventPickerOpen] = useState(false);
  const [isManualCheckinOpen, setIsManualCheckinOpen] = useState(false);
  const [manualCheckinQuery, setManualCheckinQuery] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  const [selectedCheckinMember, setSelectedCheckinMember] = useState<any>(null);
  const [pendingCheckins, setPendingCheckins] = useState<CreateAttendanceRecordInput[]>([]);

  const handleManualCheckin = (memberToScan: any) => {
    if (!memberToScan || !selectedEvent || !userProfile?.churchId) return;

    const newRecord: CreateAttendanceRecordInput = {
      churchId: userProfile.churchId,
      eventId: selectedEvent.id,
      eventTitle: selectedEvent.title,
      eventDate: selectedEvent.date,
      memberId: memberToScan.id,
      status: 'Present',
      checkInMethod: 'manual_mobile',
      checkedInAt: new Date().toISOString(),
      checkedInBy: userProfile.uid,
      source: 'mobile',
      memberName: formatMemberName(memberToScan),
      type: memberToScan.status === 'new' ? 'Visitor' : (memberToScan.role || 'Member')
    };

    setPendingCheckins(prev => [...prev, newRecord]);
    setScanMessage(`🎉 Checked in ${formatMemberName(memberToScan)} successfully!`);
    
    setTimeout(() => {
      setScanMessage('');
    }, 1500);
  };

  const handleManualCheckinModalClose = async () => {
    setIsManualCheckinOpen(false);
    
    if (pendingCheckins.length > 0) {
      setSyncToastMessage(`Syncing ${pendingCheckins.length} check-ins...`);
      const payload = [...pendingCheckins]; // Copy to prevent mutation issues
      try {
        await attendanceRepository.bulkCreateAttendanceRecords(payload);
        setPendingCheckins([]);
        setSyncToastMessage('Successfully synced!');
        setTimeout(() => setSyncToastMessage(''), 2500);
      } catch (error) {
        console.error("Bulk sync error:", error);
        Alert.alert("Sync Failed", "Could not sync all check-ins. Please try again.");
        setSyncToastMessage('');
      }
    }
  };

  const handleDeleteCheckin = async (id: string) => {
    setSelectedCheckinMember(null);
    try {
      await attendanceRepository.deleteAttendanceRecord(id);
    } catch (error) {
      console.error("Error deleting check-in:", error);
      Alert.alert("Error", "Could not undo check-in.");
    }
  };

  const formatCheckinTime = (timestampString: string) => {
    if (!timestampString) return 'Just now';
    const date = new Date(timestampString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const uncheckedMembers = members.filter(
    m => !checkins.some(c => c.memberId === m.id) && !pendingCheckins.some(p => p.memberId === m.id)
  );

  const matchingUncheckedMembers = uncheckedMembers.filter(m => 
    (m.name || m.firstName || '').toLowerCase().includes(manualCheckinQuery.toLowerCase())
  );

  const allCheckins = [
    ...checkins,
    ...pendingCheckins.map(p => ({
      id: p.memberId,
      churchId: p.churchId,
      eventId: p.eventId,
      memberId: p.memberId,
      status: p.status as AttendanceRecord['status'],
      checkInMethod: p.checkInMethod as AttendanceRecord['checkInMethod'],
      checkedInAt: p.checkedInAt,
      checkedInBy: p.checkedInBy,
      source: p.source as AttendanceRecord['source']
    }))
  ] as AttendanceRecord[];

  const displayedCheckins = allCheckins.filter(c => {
    const mem = members.find(m => m.id === c.memberId);
    return (mem?.name || mem?.firstName || '').toLowerCase().includes(searchCheckedInQuery.toLowerCase());
  });

  if (!hasAccess) {
    return (
      <View style={styles.restrictedCard}>
        <ShieldAlert size={48} color="#FF6596" />
        <Text style={styles.restrictedTitle}>Staff Access Restricted</Text>
        <Text style={styles.restrictedText}>
          You do not have permission to manage attendance for this event or church.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <Search size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search checked-in..."
          value={searchCheckedInQuery}
          onChangeText={setSearchCheckedInQuery}
          placeholderTextColor="#888"
        />
      </View>

      {/* Compact Card-Based Header */}
      <View style={{ marginBottom: 20, paddingHorizontal: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Event Selector Card */}
          <TouchableOpacity 
            style={{ flex: 1, height: 48, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0', ...getSoftShadowStyle(8), marginRight: 10 }}
            onPress={handleOpenEventPicker}
            activeOpacity={0.7}
          >
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF5F8', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <CalendarDays size={14} color="#FF6596" />
            </View>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1a1a1a', marginBottom: 0 }} numberOfLines={1}>
                {selectedEvent ? selectedEvent.title : 'Select an Event'}
              </Text>
              {selectedEvent ? (
                <Text style={{ fontSize: 11, color: '#666', fontWeight: '600' }} numberOfLines={1}>
                  {new Date(selectedEvent.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {formatTime12Hr(selectedEvent.time) || 'No time'}
                </Text>
              ) : (
                <Text style={{ fontSize: 11, color: '#FF6596', fontWeight: '700' }}>
                  Tap to choose
                </Text>
              )}
            </View>
            <ChevronDown size={16} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Manual Check-in Button */}
          <TouchableOpacity 
            style={{ ...getSoftShadowStyle(14), width: 48, height: 48, backgroundColor: '#FF6596', alignItems: 'center', justifyContent: 'center' }}
            onPress={() => {
              if (selectedEventId) {
                setIsManualCheckinOpen(true);
              } else {
                Alert.alert("Select Event", "Please select an event first.");
              }
            }}
            activeOpacity={0.8}
          >
            <UserCheck size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Present Count */}
        {selectedEventId && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 }}>
            <Users size={14} color="#666" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 13, color: '#666', fontWeight: '500' }}>
              <Text style={{ color: '#1a1a1a', fontWeight: '800' }}>{allCheckins.length} / {members.length}</Text> people present
            </Text>
          </View>
        )}
      </View>

      {/* List */}
      <View style={styles.listContainer}>
        {displayedCheckins.length > 0 ? (
          displayedCheckins.map(c => {
            const memberInfo = members.find(m => m.id === c.memberId) || {};
            const isNew = memberInfo.status === 'new' || memberInfo.role === 'First-time Visitor';
            const memberName = formatMemberName(memberInfo);
            return (
              <TouchableOpacity 
                key={c.id} 
                style={styles.card}
                onPress={() => setSelectedCheckinMember({ ...c, memberInfo })}
                activeOpacity={0.7}
              >
                <Image 
                  source={{ uri: memberInfo.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(memberName)}&background=f0f0f0&color=999&size=150` }} 
                  style={styles.avatar} 
                />
                <View style={styles.cardContent}>
                  <Text style={styles.cardName} numberOfLines={1}>{memberName}</Text>
                </View>
                <View style={styles.timeBadge}>
                  <Text style={styles.timeText}>{formatCheckinTime(c.checkedInAt)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <Users size={32} color="#aaa" />
            </View>
            <Text style={styles.emptyTitle}>No check-ins found</Text>
            <Text style={styles.emptyText}>When members scan in or are marked present, they will appear here.</Text>
          </View>
        )}
      </View>

      {/* Event Picker Modal */}
      <AppModal 
        isOpen={isEventPickerOpen} 
        onClose={() => setIsEventPickerOpen(false)} 
        title="Select Event"
        hideHeader={true}
        hideDragHandle={true}
        containerStyle={{ flex: 1, backgroundColor: '#FAFAFA', paddingHorizontal: 0, paddingBottom: 0 }}
        heightRatio={0.85}
      >
        <View style={[styles.modalContainer, { flex: 1 }]}>
          <View style={[styles.headerContainer, { paddingTop: 12 }]} pointerEvents="box-none">
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
            <View style={styles.dragHandle} />
            <View style={styles.headerContent}>
              <View style={styles.headerCirclePlaceholder} />
              <Text style={styles.modalTitle}>Select Event</Text>
              <TouchableOpacity style={styles.headerCircle} onPress={() => setIsEventPickerOpen(false)} hitSlop={8} activeOpacity={0.8}>
                <X size={24} color="#111827" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={{ paddingHorizontal: 24, paddingTop: 90, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
            {/* Calendar UI */}
            <View style={styles.calendarWrap}>
              <View style={styles.calendarHeaderTop}>
                <View style={styles.calendarMonthNav}>
                  <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.calendarNavBtn}>
                    <ChevronLeft size={18} color="#FF6596" strokeWidth={2.5} />
                  </TouchableOpacity>
                  <View style={styles.calendarMonthCenter}>
                    <Text style={styles.calendarMonthTitle}>
                      {modalCurrentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => changeMonth(1)} style={styles.calendarNavBtn}>
                    <ChevronRight size={18} color="#FF6596" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.calendarWeekdayRow}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                  <Text key={i} style={[styles.calendarWeekdayLabel, i === 0 && styles.calendarWeekdaySun]}>{d}</Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {calendarRows.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.calendarWeekRow}>
                    {row.map((day, colIndex) => {
                      if (!day) return <View key={colIndex} style={styles.calendarDayCell} />;
                      
                      const dateStr = `${modalCurrentMonth.getFullYear()}-${String(modalCurrentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isSelected = modalSelectedDate === dateStr;
                      const isToday = todayDateStr === dateStr;
                      const count = schedules.filter(s => normalizeDateToYmd(s.date) === dateStr).length;

                      return (
                        <TouchableOpacity 
                          key={colIndex} 
                          style={styles.calendarDayCell}
                          onPress={() => setModalSelectedDate(dateStr)}
                          activeOpacity={0.8}
                        >
                          {isSelected ? (
                            <LinearGradient
                              colors={['#FF6596', '#B66DFF']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.calendarDayCellGradient}
                            >
                              <Text style={[styles.calendarDayText, styles.calendarDayTextSel]}>{day}</Text>
                            </LinearGradient>
                          ) : isToday ? (
                            <View style={styles.calendarDayCellToday}>
                              <Text style={[styles.calendarDayText, styles.calendarDayTextToday]}>{day}</Text>
                            </View>
                          ) : (
                            <Text style={styles.calendarDayText}>{day}</Text>
                          )}
                          {count > 0 && (
                            <View style={styles.calendarDotRow}>
                              {Array.from({ length: Math.min(count, 3) }).map((_, di) => (
                                <View key={di} style={[styles.calendarDot, isSelected && styles.calendarDotSel]} />
                              ))}
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
            
            <View style={styles.eventListHeader}>
              <Text style={styles.eventListTitle}>
                Events on {new Date(Number(modalSelectedDate.split('-')[0]), Number(modalSelectedDate.split('-')[1])-1, Number(modalSelectedDate.split('-')[2])).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </Text>
            </View>

            {schedules.filter(s => normalizeDateToYmd(s.date) === modalSelectedDate).length > 0 ? (
              schedules.filter(s => normalizeDateToYmd(s.date) === modalSelectedDate).map(ev => (
                <TouchableOpacity 
                  key={ev.id} 
                  style={{ 
                    ...getSoftShadowStyle(14),
                    paddingVertical: 14, 
                    paddingHorizontal: 16,
                    marginBottom: 12,
                    backgroundColor: ev.id === selectedEventId ? '#FFF5F8' : '#fff',
                    borderWidth: 1, 
                    borderColor: ev.id === selectedEventId ? '#FF6596' : 'rgba(255,255,255,0.8)',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onPress={() => {
                    setSelectedEventId(ev.id);
                    setFilterDate(modalSelectedDate);
                    setIsEventPickerOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: ev.id === selectedEventId ? '#FF6596' : '#f8f9fb', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                      <CalendarDays size={16} color={ev.id === selectedEventId ? '#fff' : '#1a1a1a'} />
                    </View>
                    <View style={{ flex: 1, paddingRight: 12, justifyContent: 'center' }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: ev.id === selectedEventId ? '#FF6596' : '#1a1a1a', marginBottom: 3 }} numberOfLines={1}>
                        {ev.title}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Clock size={12} color={ev.id === selectedEventId ? '#FF6596' : '#666'} style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 13, color: ev.id === selectedEventId ? '#FF6596' : '#666', fontWeight: '500' }}>
                          {formatTime12Hr(ev.time)} {ev.endTime ? `- ${formatTime12Hr(ev.endTime)}` : ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View>
                    {ev.id === selectedEventId ? (
                      <CheckCircle size={22} color="#FF6596" />
                    ) : (
                      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#e5e7eb' }} />
                    )}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={[styles.emptyContainer, { padding: 32 }]}>
                <CalendarDays size={32} color="#ccc" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyText}>No events found on this date.</Text>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </AppModal>

      {/* Manual Check-in Modal */}
      <AppModal 
        isOpen={isManualCheckinOpen} 
        onClose={handleManualCheckinModalClose} 
        title="Manual Check-in"
        hideHeader={true}
        hideDragHandle={true}
        containerStyle={{ flex: 1, backgroundColor: '#FAFAFA', paddingHorizontal: 0, paddingBottom: 0 }}
        heightRatio={0.85}
      >
        <View style={[styles.modalContainer, { flex: 1 }]}>
          <View style={[styles.headerContainer, { paddingTop: 12 }]} pointerEvents="box-none">
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
            <View style={styles.dragHandle} />
            <View style={styles.headerContent}>
              <View style={styles.headerCirclePlaceholder} />
              <Text style={styles.modalTitle}>Manual Check-in</Text>
              <TouchableOpacity style={styles.headerCircle} onPress={handleManualCheckinModalClose} hitSlop={8} activeOpacity={0.8}>
                <X size={24} color="#111827" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 90, paddingBottom: 16 }}>
            <View style={styles.searchWrapper}>
              <Search size={20} color="#888" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search member to check in..."
                value={manualCheckinQuery}
                onChangeText={setManualCheckinQuery}
              />
              {scanLoading && <ActivityIndicator size="small" color="#FF6596" style={styles.loadingSpinner} />}
            </View>

          <FlatList 
            style={styles.modalScroll}
            contentContainerStyle={{ paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            data={matchingUncheckedMembers}
            keyExtractor={m => m.id}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={5}
            renderItem={({ item: m }) => (
                <View style={styles.modalListItem}>
                  <View style={[styles.modalListItemLeft, { flex: 1 }]}>
                    {m.avatar ? (
                      <Image source={{ uri: m.avatar }} style={styles.modalAvatar} />
                    ) : (
                      <View style={[styles.modalAvatar, { backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }]}>
                        <User size={20} color="#999" />
                      </View>
                    )}
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.modalMemberName} numberOfLines={1} ellipsizeMode="tail">
                        {formatMemberName(m)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.addBtn}
                    onPress={() => handleManualCheckin(m)}
                    disabled={scanLoading}
                  >
                    <Plus size={14} color="#FF6596" />
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Users size={32} color="#ccc" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyText}>No members found</Text>
              </View>
            }
          />
          </View>
        </View>
      </AppModal>

      {/* Details Modal */}
      <AppModal 
        isOpen={!!selectedCheckinMember} 
        onClose={() => setSelectedCheckinMember(null)} 
        title="Check-in Details"
        hideHeader={true}
        hideDragHandle={true}
        containerStyle={{ flex: 1, backgroundColor: '#FAFAFA', paddingHorizontal: 0, paddingBottom: 0 }}
      >
        <View style={[styles.modalContainer, { flex: 1 }]}>
          <View style={[styles.headerContainer, { paddingTop: 12 }]} pointerEvents="box-none">
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
            <View style={styles.dragHandle} />
            <View style={styles.headerContent}>
              <View style={styles.headerCirclePlaceholder} />
              <Text style={styles.modalTitle}>Check-in Details</Text>
              <TouchableOpacity style={styles.headerCircle} onPress={() => setSelectedCheckinMember(null)} hitSlop={8} activeOpacity={0.8}>
                <X size={24} color="#111827" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

        {selectedCheckinMember && (
          <View style={{ paddingHorizontal: 24, paddingTop: 90, paddingBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
              <Image 
                source={{ uri: selectedCheckinMember.memberInfo?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formatMemberName(selectedCheckinMember.memberInfo))}&background=f0f0f0&color=999&size=150` }} 
                style={{ width: 48, height: 48, borderRadius: 16, marginRight: 14 }} 
              />
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#1a1a1a' }}>{formatMemberName(selectedCheckinMember.memberInfo)}</Text>
              </View>
            </View>

            <View style={{ ...getSoftShadowStyle(14), backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 32, gap: 16, borderWidth: 1, borderColor: '#f0f0f0' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Clock size={18} color="#666" />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#666' }}>Time</Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#1a1a1a' }}>{formatCheckinTime(selectedCheckinMember.checkedInAt)}</Text>
              </View>
              <View style={{ height: 1, backgroundColor: '#f0f0f0' }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={18} color="#4ADE80" />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#666' }}>Status</Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#4ADE80' }}>Checked In</Text>
              </View>
              <View style={{ height: 1, backgroundColor: '#f0f0f0' }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Search size={18} color="#666" />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#666' }}>Method</Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#666' }}>{selectedCheckinMember.checkInMethod}</Text>
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <TouchableOpacity 
                style={[styles.dangerBtn, { backgroundColor: '#fff', borderColor: '#EF4444' }]}
                onPress={() => handleDeleteCheckin(selectedCheckinMember.id)}
              >
                <Trash2 size={18} color="#EF4444" />
                <Text style={styles.dangerBtnText}>Undo Check-in</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.secondaryBtn}
                onPress={() => setSelectedCheckinMember(null)}
              >
                <Text style={styles.secondaryBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        </View>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: 24 },
  restrictedCard: { ...getTopBarButtonShadowStyle(16), margin: 24, padding: 32, alignItems: 'center', borderColor: '#FF6596', borderStyle: 'dashed' },
  restrictedTitle: { fontSize: 16, fontWeight: '700', marginTop: 16, marginBottom: 8, color: '#1a1a1a' },
  restrictedText: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20 },
  searchWrapper: { ...getSoftShadowStyle(16), backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f0f0f0', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48, marginBottom: 24 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  loadingSpinner: { position: 'absolute', right: 16 },
  headerInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  headerSubtitle: { fontSize: 13, color: '#666', fontWeight: '500' },
  headerActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { ...getTopBarButtonShadowStyle(12), flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  listContainer: { gap: 10 },
  card: { ...getSoftShadowStyle(14), backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#f0f0f0', flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  cardContent: { flex: 1, paddingRight: 8, justifyContent: 'center' },
  cardName: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  roleBadge: { alignSelf: 'flex-start', backgroundColor: '#E8F0FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleBadgeNew: { backgroundColor: '#FFE8F0' },
  roleText: { fontSize: 10, fontWeight: '700', color: '#4D8BFF', textTransform: 'uppercase' },
  roleTextNew: { color: '#FF6596' },
  timeBadge: { backgroundColor: '#f5f5f5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  timeText: { fontSize: 11, fontWeight: '700', color: '#666' },
  emptyContainer: { ...getTopBarButtonShadowStyle(24), alignItems: 'center', padding: 40, borderColor: '#e1e4e8', borderStyle: 'dashed' },
  emptyIconWrapper: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#F8F9FB', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#888', textAlign: 'center' },
  modalContainer: { backgroundColor: '#FAFAFA' },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerCircle: {
    ...getTopBarButtonShadowStyle(20),
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCirclePlaceholder: { width: 40, height: 40 },
  dragHandle: { width: 40, height: 5, backgroundColor: '#d1d5db', borderRadius: 10, alignSelf: 'center', marginBottom: 4 },
  modalTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginHorizontal: 12 },

  modalScroll: { marginTop: 8 },
  modalListItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalListItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalAvatar: { width: 40, height: 40, borderRadius: 12 },
  modalMemberName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  modalMemberRole: { fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: '600' },
  addBtn: { ...getTopBarButtonShadowStyle(20), backgroundColor: '#FFF0F5', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 6 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#FF6596' },
  secondaryBtn: { ...getTopBarButtonShadowStyle(16), width: '100%', padding: 16, backgroundColor: '#f5f5f5', alignItems: 'center', borderRadius: 16 },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  dangerBtn: { ...getTopBarButtonShadowStyle(16), width: '100%', padding: 16, backgroundColor: '#FEF2F2', borderColor: '#FEE2E2', borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16 },
  dangerBtnText: { fontSize: 15, fontWeight: '800', color: '#EF4444' },
  
  calendarWrap: { paddingBottom: 16, marginBottom: 16 },
  calendarHeaderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  calendarMonthNav: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  calendarNavBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,101,150,0.08)', alignItems: 'center', justifyContent: 'center' },
  calendarMonthCenter: { alignItems: 'center', minWidth: 120 },
  calendarMonthTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.3 },
  calendarWeekdayRow: { flexDirection: 'row', marginBottom: 6 },
  calendarWeekdayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.3 },
  calendarWeekdaySun: { color: '#FF6596' },
  calendarGrid: { marginBottom: 4 },
  calendarWeekRow: { flexDirection: 'row', width: '100%' },
  calendarDayCell: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center' },
  calendarDayCellGradient: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', shadowColor: '#FF6596', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  calendarDayCellToday: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FF6596' },
  calendarDayText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  calendarDayTextToday: { color: '#FF6596', fontWeight: '800' },
  calendarDayTextSel: { color: '#fff', fontWeight: '800' },
  calendarDotRow: { flexDirection: 'row', gap: 2, position: 'absolute', bottom: 3 },
  calendarDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FF6596' },
  calendarDotSel: { backgroundColor: 'rgba(255,255,255,0.9)' },
  eventListHeader: { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  eventListTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
});
