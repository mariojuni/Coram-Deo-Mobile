import type { MinistryAssignment } from '@/features/ministry/domain/ministry.types';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface ServeCalendarViewProps {
  assignments: MinistryAssignment[];
  onPressAssignment: (assignment: MinistryAssignment) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseAssignmentDate(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.length >= 10) return dateStr.slice(0, 10);
  return dateStr;
}

export function ServeCalendarView({
  assignments,
  onPressAssignment,
}: ServeCalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<string>(toDateKey(today));

  // Build assignment map by date key
  const assignmentsByDate = useMemo(() => {
    const map: Record<string, MinistryAssignment[]> = {};
    for (const a of assignments) {
      const key = parseAssignmentDate(a.eventDate);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    return map;
  }, [assignments]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // Pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const todayKey = toDateKey(today);

  const selectedAssignments = assignmentsByDate[selectedDay] ?? [];

  return (
    <View style={cs.container}>
      {/* ─── Month header ─── */}
      <View style={cs.monthHeader}>
        <TouchableOpacity onPress={prevMonth} style={cs.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronLeft size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={cs.monthTitle}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={cs.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronRight size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* ─── Weekday labels ─── */}
      <View style={cs.weekdayRow}>
        {WEEKDAYS.map(wd => (
          <Text key={wd} style={cs.weekdayLabel}>{wd}</Text>
        ))}
      </View>

      {/* ─── Day grid ─── */}
      <View style={cs.grid}>
        {calendarDays.map((day, i) => {
          if (day === null) {
            return <View key={`empty-${i}`} style={cs.dayCell} />;
          }
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const hasAssignments = !!assignmentsByDate[key]?.length;
          const isToday = key === todayKey;
          const isSelected = key === selectedDay;

          return (
            <TouchableOpacity
              key={key}
              style={[
                cs.dayCell,
                isSelected && cs.dayCellSelected,
                isToday && !isSelected && cs.dayCellToday,
              ]}
              onPress={() => setSelectedDay(key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  cs.dayText,
                  isSelected && cs.dayTextSelected,
                  isToday && !isSelected && cs.dayTextToday,
                ]}
              >
                {day}
              </Text>
              {hasAssignments && (
                <View style={[cs.dot, isSelected && cs.dotSelected]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ─── Selected day assignments ─── */}
      <View style={cs.divider} />
      <View style={cs.selectedHeader}>
        <Text style={cs.selectedDateLabel}>
          {(() => {
            try {
              const d = new Date(`${selectedDay}T00:00:00`);
              return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
            } catch { return selectedDay; }
          })()}
        </Text>
        {selectedAssignments.length > 0 && (
          <View style={cs.countPill}>
            <Text style={cs.countPillText}>{selectedAssignments.length}</Text>
          </View>
        )}
      </View>

      <ScrollView style={cs.dayList} showsVerticalScrollIndicator={false}>
        {selectedAssignments.length === 0 ? (
          <Text style={cs.noDayText}>No assignments on this day.</Text>
        ) : (
          selectedAssignments.map(a => (
            <TouchableOpacity
              key={a.id}
              onPress={() => onPressAssignment(a)}
              style={cs.dayEventCard}
              activeOpacity={0.8}
            >
              <View style={cs.dayEventDot} />
              <View style={cs.dayEventInfo}>
                <Text style={cs.dayEventTitle} numberOfLines={1}>{a.eventName}</Text>
                <Text style={cs.dayEventRole} numberOfLines={1}>{a.roleName} · {a.ministryName}</Text>
              </View>
              <View style={[cs.dayEventStatus, { backgroundColor: getStatusBg(a.status) }]}>
                <Text style={[cs.dayEventStatusText, { color: getStatusColor(a.status) }]}>
                  {normalizeStatus(a.status)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function normalizeStatus(status: string) {
  const s = (status ?? '').toLowerCase();
  if (s === 'pending') return 'Pending';
  if (s === 'confirmed') return 'Confirmed';
  if (s === 'declined') return 'Declined';
  if (s === 'completed') return 'Completed';
  if (s === 'cancelled') return 'Cancelled';
  return status;
}

function getStatusColor(status: string) {
  const s = (status ?? '').toLowerCase();
  if (s === 'confirmed') return '#22C55E';
  if (s === 'declined') return '#EF4444';
  if (s === 'pending') return '#F59E0B';
  return '#6B7280';
}

function getStatusBg(status: string) {
  const s = (status ?? '').toLowerCase();
  if (s === 'confirmed') return '#ECFDF5';
  if (s === 'declined') return '#FEF2F2';
  if (s === 'pending') return '#FFF8E7';
  return '#F3F4F6';
}

const cs = StyleSheet.create({
  container: { flex: 1 },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  navBtn: { padding: 4 },
  monthTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    position: 'relative',
  },
  dayCellToday: {
    backgroundColor: '#FFE8F0',
  },
  dayCellSelected: {
    backgroundColor: '#FF6596',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  dayTextToday: {
    color: '#FF6596',
    fontWeight: '800',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '800',
  },
  dot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF6596',
  },
  dotSelected: {
    backgroundColor: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 16,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  selectedDateLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    flex: 1,
  },
  countPill: {
    backgroundColor: '#FF6596',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  noDayText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  dayList: { flex: 1 },
  dayEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  dayEventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6596',
    flexShrink: 0,
  },
  dayEventInfo: { flex: 1 },
  dayEventTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  dayEventRole: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  dayEventStatus: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dayEventStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
