import {
    CalendarDays,
    CheckCircle,
    Clock,
    Search,
    ShieldAlert,
    Trash2,
    User,
    UserPlus,
    Users,
    X
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useState } from 'react';
import {
    ActivityIndicator, Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { attendanceRepository } from '../../features/attendance/data/attendance.repository';
import { getTodayStr } from '../../features/attendance/domain/attendance.selectors';
import { useAttendanceByDate } from '../../features/attendance/presentation/hooks/useAttendanceByDate';
import CustomDatePicker from '../CustomDatePicker';
import AppModal from '../ui/AppModal';
import { getTopBarButtonShadowStyle, getSoftShadowStyle } from '@/components/ui/SoftCard';

interface AttendanceTabProps {
  members: any[];
  showStaffFeatures: boolean;
}

export default function AttendanceTab({ members, showStaffFeatures }: AttendanceTabProps) {
  const [filterDate, setFilterDate] = useState(getTodayStr());
  const [searchCheckedInQuery, setSearchCheckedInQuery] = useState('');
  const { checkins: filteredScannerCheckins } = useAttendanceByDate(filterDate, { membersOnly: true });

  // Calendar State for Date Picker
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const formatLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const openCalendar = () => {
    setIsCalendarOpen(true);
  };
  const closeCalendar = () => setIsCalendarOpen(false);

  // Modals state
  const [isManualCheckinOpen, setIsManualCheckinOpen] = useState(false);
  const [manualCheckinQuery, setManualCheckinQuery] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  const [selectedCheckinMember, setSelectedCheckinMember] = useState<any>(null);

  const handleManualCheckin = async (memberToScan: any) => {
    if (!memberToScan) return;
    setScanLoading(true);
    setScanMessage('');

    try {
      const alreadyChecked = filteredScannerCheckins.some(
        c => c.userId === memberToScan.id && c.type === 'member'
      );

      if (alreadyChecked) {
        setScanMessage(`⚠️ ${memberToScan.name} is already checked in for today.`);
        setScanLoading(false);
        return;
      }

      await attendanceRepository.createMemberCheckin({
        userId: memberToScan.id,
        name: memberToScan.name,
        role: memberToScan.role || 'Member',
        status: memberToScan.status || 'active',
        date: filterDate,
        type: 'member'
      });

      setScanMessage(`🎉 Checked in ${memberToScan.name} successfully!`);
    } catch (err) {
      console.error("Error simulating checkin scan:", err);
      Alert.alert("Error", "Could not check in member.");
    } finally {
      setScanLoading(false);
      setManualCheckinQuery('');
      setTimeout(() => {
        setIsManualCheckinOpen(false);
        setScanMessage('');
      }, 1500);
    }
  };

  const handleDeleteCheckin = async (id: string) => {
    try {
      await attendanceRepository.deleteCheckin(id);
      setSelectedCheckinMember(null);
    } catch (error) {
      console.error("Error deleting check-in:", error);
      Alert.alert("Error", "Could not undo check-in.");
    }
  };

  const formatCheckinTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const uncheckedMembers = members.filter(
    m => !filteredScannerCheckins.some(c => c.userId === m.id)
  );

  const matchingUncheckedMembers = uncheckedMembers.filter(m => 
    m.name?.toLowerCase().includes(manualCheckinQuery.toLowerCase())
  );

  const displayedCheckins = filteredScannerCheckins.filter(c => 
    c.name?.toLowerCase().includes(searchCheckedInQuery.toLowerCase())
  );

  if (!showStaffFeatures) {
    return (
      <View style={styles.restrictedCard}>
        <ShieldAlert size={48} color="#FF6596" />
        <Text style={styles.restrictedTitle}>Staff Access Restricted</Text>
        <Text style={styles.restrictedText}>
          The Attendance system is a staff-facing utility. You do not have permission to view this.
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

      {/* Header Info */}
      <View style={styles.headerInfo}>
        <View>
          <Text style={styles.headerTitle}>Checked-in</Text>
          <Text style={styles.headerSubtitle}>{displayedCheckins.length} present</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={openCalendar}
          >
            <CalendarDays size={16} color="#FF6596" />
            <Text style={styles.actionBtnText}>
              {filterDate ? new Date(Number(filterDate.split('-')[0]), Number(filterDate.split('-')[1])-1, Number(filterDate.split('-')[2])).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Today'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { paddingHorizontal: 12 }]}
            onPress={() => setIsManualCheckinOpen(true)}
          >
            <UserPlus size={16} color="#FF6596" />
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <View style={styles.listContainer}>
        {displayedCheckins.length > 0 ? (
          displayedCheckins.map(c => {
            const memberInfo = members.find(m => m.id === c.userId) || {};
            const isNew = c.status === 'new' || c.role === 'First-time Visitor';
            return (
              <TouchableOpacity 
                key={c.id} 
                style={styles.card}
                onPress={() => setSelectedCheckinMember({ ...c, memberInfo })}
                activeOpacity={0.7}
              >
                <Image 
                  source={{ uri: memberInfo.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || 'User')}&background=f0f0f0&color=999&size=150` }} 
                  style={styles.avatar} 
                />
                <View style={styles.cardContent}>
                  <Text style={styles.cardName} numberOfLines={1}>{c.name}</Text>
                  <View style={[styles.roleBadge, isNew ? styles.roleBadgeNew : null]}>
                    <Text style={[styles.roleText, isNew ? styles.roleTextNew : null]}>
                      {c.role || 'Member'}
                    </Text>
                  </View>
                </View>
                <View style={styles.timeBadge}>
                  <Text style={styles.timeText}>{formatCheckinTime(c.timestamp)}</Text>
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

      {/* Calendar Modal */}
      <CustomDatePicker
        visible={isCalendarOpen}
        date={
          filterDate
            ? new Date(Number(filterDate.split('-')[0]), Number(filterDate.split('-')[1]) - 1, Number(filterDate.split('-')[2]))
            : new Date()
        }
        onConfirm={(d) => {
          setFilterDate(formatLocal(d));
          closeCalendar();
        }}
        onCancel={closeCalendar}
      />

      {/* Manual Check-in Modal */}
      <AppModal 
        isOpen={isManualCheckinOpen} 
        onClose={() => setIsManualCheckinOpen(false)} 
        title="Manual Check-in"
        hideHeader={true}
        hideDragHandle={true}
        containerStyle={{ paddingHorizontal: 0, paddingBottom: 0 }}
      >
        <View style={styles.modalContainer}>
          {/* ─── Header ─────────────────────────────────────────────────────── */}
          <View style={[styles.headerContainer, { paddingTop: 12 }]} pointerEvents="box-none">
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
            <View style={styles.dragHandle} />
            <View style={styles.headerContent}>
              <View style={styles.headerCirclePlaceholder} />
              <Text style={styles.modalTitle}>Manual Check-in</Text>
              <TouchableOpacity style={styles.headerCircle} onPress={() => setIsManualCheckinOpen(false)} hitSlop={8} activeOpacity={0.8}>
                <X size={24} color="#111827" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ paddingHorizontal: 24, paddingTop: 90, paddingBottom: 16 }}>
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

          {scanMessage ? (
            <View style={[styles.toast, scanMessage.startsWith('⚠️') ? styles.toastWarn : styles.toastSuccess]}>
              <CheckCircle size={18} color={scanMessage.startsWith('⚠️') ? '#92400E' : '#03543F'} />
              <Text style={styles.toastText}>{scanMessage}</Text>
            </View>
          ) : null}

          <ScrollView style={styles.modalScroll}>
            {matchingUncheckedMembers.length > 0 ? (
              matchingUncheckedMembers.map(m => (
                <View key={m.id} style={styles.modalListItem}>
                  <View style={styles.modalListItemLeft}>
                    {m.avatar ? (
                      <Image source={{ uri: m.avatar }} style={styles.modalAvatar} />
                    ) : (
                      <View style={[styles.modalAvatar, { backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }]}>
                        <User size={20} color="#999" />
                      </View>
                    )}
                    <View>
                      <Text style={styles.modalMemberName}>{m.name}</Text>
                      <Text style={styles.modalMemberRole}>{m.role}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.addBtn}
                    onPress={() => handleManualCheckin(m)}
                    disabled={scanLoading}
                  >
                    <UserPlus size={14} color="#FF6596" />
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Users size={32} color="#ccc" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyText}>No members found</Text>
              </View>
            )}
          </ScrollView>
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
        containerStyle={{ paddingHorizontal: 0, paddingBottom: 0 }}
      >
        <View style={styles.modalContainer}>
          {/* ─── Header ─────────────────────────────────────────────────────── */}
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
                source={{ uri: selectedCheckinMember.memberInfo?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedCheckinMember.name || 'User')}&background=f0f0f0&color=999&size=150` }} 
                style={{ width: 64, height: 64, borderRadius: 20, marginRight: 16 }} 
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 }}>{selectedCheckinMember.name}</Text>
                <View style={[styles.roleBadge, selectedCheckinMember.status === 'new' ? styles.roleBadgeNew : null]}>
                  <Text style={[styles.roleText, selectedCheckinMember.status === 'new' ? styles.roleTextNew : null]}>
                    {selectedCheckinMember.role || 'Member'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ backgroundColor: '#f8f9fb', borderRadius: 16, padding: 16, marginBottom: 32, gap: 16, borderWidth: 1, borderColor: '#f0f0f0' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Clock size={18} color="#666" />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#666' }}>Time</Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#1a1a1a' }}>{formatCheckinTime(selectedCheckinMember.timestamp)}</Text>
              </View>
              <View style={{ height: 1, backgroundColor: '#f0f0f0' }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={18} color="#4ADE80" />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#666' }}>Status</Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#4ADE80' }}>Checked In</Text>
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
  searchWrapper: { ...getTopBarButtonShadowStyle(16), flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48, marginBottom: 24 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  loadingSpinner: { position: 'absolute', right: 16 },
  headerInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  headerSubtitle: { fontSize: 13, color: '#666', fontWeight: '500' },
  headerActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { ...getTopBarButtonShadowStyle(12), flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  listContainer: { gap: 12 },
  card: { ...getTopBarButtonShadowStyle(16), flexDirection: 'row', alignItems: 'center', padding: 16 },
  avatar: { width: 48, height: 48, borderRadius: 14, marginRight: 16 },
  cardContent: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 },
  roleBadge: { alignSelf: 'flex-start', backgroundColor: '#E8F0FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleBadgeNew: { backgroundColor: '#FFE8F0' },
  roleText: { fontSize: 10, fontWeight: '700', color: '#4D8BFF', textTransform: 'uppercase' },
  roleTextNew: { color: '#FF6596' },
  timeBadge: { backgroundColor: '#f5f5f5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  timeText: { fontSize: 12, fontWeight: '700', color: '#666' },
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
  toast: { ...getTopBarButtonShadowStyle(16), flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 16 },
  toastWarn: { backgroundColor: '#FFF9E6', borderColor: 'rgba(245,158,11,0.3)' },
  toastSuccess: { backgroundColor: '#DEF7EC', borderColor: 'rgba(49,196,141,0.3)' },
  toastText: { fontSize: 13, fontWeight: '700', flex: 1 },
  modalScroll: { marginTop: 8 },
  modalListItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalListItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalAvatar: { width: 40, height: 40, borderRadius: 12 },
  modalMemberName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  modalMemberRole: { fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: '600' },
  addBtn: { ...getTopBarButtonShadowStyle(20), backgroundColor: '#FFF0F5', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 6 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#FF6596' },
  detailsAvatar: { width: 80, height: 80, borderRadius: 24, marginBottom: 16 },
  detailsName: { fontSize: 22, fontWeight: '900', color: '#1a1a1a', letterSpacing: -0.5, marginBottom: 8 },
  timeInfoCard: { ...getTopBarButtonShadowStyle(16), flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderColor: '#e1e4e8', marginBottom: 32 },
  timeInfoText: { fontSize: 14, fontWeight: '600', color: '#666' },
  timeInfoValue: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
  secondaryBtn: { ...getTopBarButtonShadowStyle(16), width: '100%', padding: 16, backgroundColor: '#f5f5f5', alignItems: 'center' },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  dangerBtn: { ...getTopBarButtonShadowStyle(16), width: '100%', padding: 16, backgroundColor: '#FEF2F2', borderColor: '#FEE2E2', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dangerBtnText: { fontSize: 15, fontWeight: '800', color: '#EF4444' },
  calendarMonthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  calendarArrowBtn: { ...getTopBarButtonShadowStyle(20), width: 40, height: 40, borderColor: '#e1e4e8', alignItems: 'center', justifyContent: 'center' },
  calendarMonthText: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  calendarDaysRow: { flexDirection: 'row', marginBottom: 16 },
  calendarDayName: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '800', color: '#888' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  calendarCellContainer: { width: '14.28%', alignItems: 'center', justifyContent: 'center' },
  calendarCell: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  calendarCellSelected: { backgroundColor: '#FF6596', shadowColor: '#FF6596', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  calendarCellToday: { backgroundColor: '#FFE8F0', borderWidth: 1.5, borderColor: '#FF6596' },
  calendarCellText: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  calendarCellTextSelected: { color: '#fff', fontWeight: '800' },
  calendarCellTextToday: { color: '#FF6596', fontWeight: '800' },
});
