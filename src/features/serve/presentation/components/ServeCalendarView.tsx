import DebouncedTouchable from '@/components/DebouncedTouchable';
import type { MinistryAssignment } from '@/features/ministry/domain/ministry.types';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo, useState, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, PanResponder, Animated, Dimensions } from 'react-native';

interface ServeCalendarViewProps {
  assignments: MinistryAssignment[];
  onPressAssignment: (assignment: MinistryAssignment) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function parseAssignmentDate(s: string): string {
  if (!s) return '';
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export function ServeCalendarView({ assignments, onPressAssignment }: ServeCalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(toDateKey(today));
  const [viewMode, setViewMode] = useState<'month' | 'week'>('week');

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

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    
    // Group into rows of 7 to avoid flexWrap precision issues
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [year, month]);

  const weekDays = useMemo(() => {
    const [sY, sM, sD] = selectedDay.split('-').map(Number);
    const date = new Date(sY, sM - 1, sD);
    const dayOfWeek = date.getDay();
    const sunday = new Date(date);
    sunday.setDate(date.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [selectedDay]);

  const prevAction = () => {
    if (viewMode === 'month') {
      if (month === 0) { setMonth(11); setYear(y => y - 1); }
      else setMonth(m => m - 1);
    } else {
      const [sY, sM, sD] = selectedDay.split('-').map(Number);
      const d = new Date(sY, sM - 1, sD - 7);
      setSelectedDay(toDateKey(d));
      setMonth(d.getMonth());
      setYear(d.getFullYear());
    }
  };

  const nextAction = () => {
    if (viewMode === 'month') {
      if (month === 11) { setMonth(0); setYear(y => y + 1); }
      else setMonth(m => m + 1);
    } else {
      const [sY, sM, sD] = selectedDay.split('-').map(Number);
      const d = new Date(sY, sM - 1, sD + 7);
      setSelectedDay(toDateKey(d));
      setMonth(d.getMonth());
      setYear(d.getFullYear());
    }
  };

  const actionsRef = useRef({ prevAction, nextAction });
  actionsRef.current = { prevAction, nextAction };

  const slideAnim = useRef(new Animated.Value(0)).current;

  const handlePrev = () => {
    Animated.timing(slideAnim, { toValue: Dimensions.get('window').width, duration: 200, useNativeDriver: true }).start(() => {
      actionsRef.current.prevAction();
      slideAnim.setValue(-Dimensions.get('window').width);
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 13, useNativeDriver: true }).start();
    });
  };

  const handleNext = () => {
    Animated.timing(slideAnim, { toValue: -Dimensions.get('window').width, duration: 200, useNativeDriver: true }).start(() => {
      actionsRef.current.nextAction();
      slideAnim.setValue(Dimensions.get('window').width);
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 13, useNativeDriver: true }).start();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        slideAnim.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          handlePrev();
        } else if (gestureState.dx < -50) {
          handleNext();
        } else {
          Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 13, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const todayKey = toDateKey(today);
  const selectedAssignments = assignmentsByDate[selectedDay] ?? [];

  return (
    <View style={cs.container}>
      {/* Month navigation and View Mode Toggle */}
      <View style={cs.headerTop}>
        <View style={cs.monthNav}>
          <DebouncedTouchable onPress={handlePrev} style={cs.navBtn} activeOpacity={0.7}>
            <ChevronLeft size={18} color="#FF6596" strokeWidth={2.5} />
          </DebouncedTouchable>
          <View style={cs.monthCenter}>
            <Text style={cs.monthTitle}>{MONTHS[month]} {year}</Text>
          </View>
          <DebouncedTouchable onPress={handleNext} style={cs.navBtn} activeOpacity={0.7}>
            <ChevronRight size={18} color="#FF6596" strokeWidth={2.5} />
          </DebouncedTouchable>
        </View>

        <View style={cs.modeToggle}>
          <DebouncedTouchable onPress={() => setViewMode('week')} style={[cs.modeBtn, viewMode === 'week' && cs.modeBtnActive]}>
            <Text style={[cs.modeBtnText, viewMode === 'week' && cs.modeBtnTextActive]}>W</Text>
          </DebouncedTouchable>
          <DebouncedTouchable onPress={() => setViewMode('month')} style={[cs.modeBtn, viewMode === 'month' && cs.modeBtnActive]}>
            <Text style={[cs.modeBtnText, viewMode === 'month' && cs.modeBtnTextActive]}>M</Text>
          </DebouncedTouchable>
        </View>
      </View>

      {/* Weekday labels */}
      <View style={cs.weekdayRow}>
        {WEEKDAYS.map((wd, i) => (
          <Text key={wd} style={[cs.weekdayLabel, i === 0 && cs.weekdaySun]}>{wd}</Text>
        ))}
      </View>

      {/* Day grid */}
      <View style={{ overflow: 'hidden' }} {...panResponder.panHandlers}>
        <Animated.View style={[cs.grid, { transform: [{ translateX: slideAnim }] }]}>
          {viewMode === 'month' ? (
          calendarDays.map((row, rIndex) => (
            <View key={rIndex} style={cs.weekRow}>
              {row.map((day, i) => {
                if (day === null) return <View key={'e' + i} style={cs.dayCell} />;
                const m2 = String(month + 1).padStart(2, '0');
                const d2 = String(day).padStart(2, '0');
                const key = year + '-' + m2 + '-' + d2;
                const count = assignmentsByDate[key]?.length ?? 0;
                const isToday = key === todayKey;
                const isSel = key === selectedDay;
                return (
                  <DebouncedTouchable key={key} style={cs.dayCell} onPress={() => setSelectedDay(key)} activeOpacity={0.8}>
                    {isSel ? (
                      <LinearGradient
                        colors={['#FF6596', '#B66DFF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={cs.dayCellGradient}
                      >
                        <Text style={[cs.dayText, cs.dayTextSel]}>{day}</Text>
                      </LinearGradient>
                    ) : isToday ? (
                      <View style={cs.dayCellToday}>
                        <Text style={[cs.dayText, cs.dayTextToday]}>{day}</Text>
                      </View>
                    ) : (
                      <Text style={cs.dayText}>{day}</Text>
                    )}
                    {count > 0 && (
                      <View style={cs.dotRow}>
                        {Array.from({ length: Math.min(count, 3) }).map((_, di) => (
                          <View key={di} style={[cs.dot, isSel && cs.dotSel]} />
                        ))}
                      </View>
                    )}
                  </DebouncedTouchable>
                );
              })}
            </View>
          ))
        ) : (
          <View style={cs.weekRow}>
            {weekDays.map((dateObj, i) => {
              const key = toDateKey(dateObj);
              const day = dateObj.getDate();
              const count = assignmentsByDate[key]?.length ?? 0;
              const isToday = key === todayKey;
              const isSel = key === selectedDay;
              return (
                <DebouncedTouchable key={key} style={cs.dayCell} onPress={() => { setSelectedDay(key); setMonth(dateObj.getMonth()); setYear(dateObj.getFullYear()); }} activeOpacity={0.8}>
                  {isSel ? (
                    <LinearGradient
                      colors={['#FF6596', '#B66DFF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={cs.dayCellGradient}
                    >
                      <Text style={[cs.dayText, cs.dayTextSel]}>{day}</Text>
                    </LinearGradient>
                  ) : isToday ? (
                    <View style={cs.dayCellToday}>
                      <Text style={[cs.dayText, cs.dayTextToday]}>{day}</Text>
                    </View>
                  ) : (
                    <Text style={cs.dayText}>{day}</Text>
                  )}
                  {count > 0 && (
                    <View style={cs.dotRow}>
                      {Array.from({ length: Math.min(count, 3) }).map((_, di) => (
                        <View key={di} style={[cs.dot, isSel && cs.dotSel]} />
                      ))}
                    </View>
                  )}
                </DebouncedTouchable>
              );
            })}
          </View>
        )}
        </Animated.View>
      </View>

      {/* Selected day section */}
      <View style={cs.sectionCard}>
        <LinearGradient
          colors={['#FF6596', '#B66DFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={cs.sectionLine}
        />
        <View style={cs.sectionHeader}>
          <View>
            <Text style={cs.sectionOverline}>SCHEDULE</Text>
            <Text style={cs.sectionDate}>
              {(() => {
                try {
                  const d = new Date(selectedDay + 'T00:00:00');
                  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                } catch {
                  return selectedDay;
                }
              })()}
            </Text>
          </View>
          {selectedAssignments.length > 0 && (
            <LinearGradient
              colors={['#FF6596', '#B66DFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={cs.countPill}
            >
              <Text style={cs.countText}>{selectedAssignments.length}</Text>
            </LinearGradient>
          )}
        </View>
      </View>

      <View style={cs.list}>
        {selectedAssignments.length === 0 ? (
          <View style={cs.empty}>
            <Text style={cs.emptyText}>No assignments on this day</Text>
          </View>
        ) : (
          selectedAssignments.map(a => (
            <DebouncedTouchable key={a.id} onPress={() => onPressAssignment(a)} style={cs.eventCard} activeOpacity={0.85}>
              <View style={cs.accentBar}>
                <LinearGradient
                  colors={['#FF6596', '#B66DFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>
              <View style={cs.eventInfo}>
                <Text style={cs.eventTitle} numberOfLines={1}>{a.eventName}</Text>
                <Text style={cs.eventRole} numberOfLines={1}>{a.roleName} · {a.ministryName}</Text>
              </View>
              <View style={[cs.statusPill, { backgroundColor: getStatusBg(a.status) }]}>
                <View style={[cs.statusDot, { backgroundColor: getStatusColor(a.status) }]} />
                <Text style={[cs.statusText, { color: getStatusColor(a.status) }]}>
                  {normalizeStatus(a.status)}
                </Text>
              </View>
            </DebouncedTouchable>
          ))
        )}
        <View style={{ height: 20 }} />
      </View>
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
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 4 },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,101,150,0.08)', alignItems: 'center', justifyContent: 'center' },
  monthCenter: { alignItems: 'center', minWidth: 100 },
  monthTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.3 },
  modeToggle: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 20, padding: 2 },
  modeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18 },
  modeBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  modeBtnText: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  modeBtnTextActive: { color: '#1a1a1a' },
  weekdayRow: { flexDirection: 'row', marginBottom: 6 },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.3 },
  weekdaySun: { color: '#FF6596' },
  grid: { marginBottom: 4 },
  weekRow: { flexDirection: 'row', width: '100%' },
  dayCell: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center' },
  dayCellGradient: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', shadowColor: '#FF6596', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  dayCellToday: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FF6596' },
  dayText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  dayTextToday: { color: '#FF6596', fontWeight: '800' },
  dayTextSel: { color: '#fff', fontWeight: '800' },
  dotRow: { flexDirection: 'row', gap: 2, position: 'absolute', bottom: 3 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FF6596' },
  dotSel: { backgroundColor: 'rgba(255,255,255,0.9)' },
  sectionCard: { marginTop: 4, marginBottom: 8, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  sectionLine: { height: 3 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  sectionOverline: { fontSize: 10, fontWeight: '800', color: '#FF6596', letterSpacing: 1.2, marginBottom: 2 },
  sectionDate: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  countPill: { borderRadius: 12, minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  countText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  list: { flex: 1 },
  empty: { paddingVertical: 28, alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#9CA3AF' },
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 8, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  accentBar: { width: 4, alignSelf: 'stretch' },
  eventInfo: { flex: 1, paddingVertical: 13, paddingHorizontal: 12 },
  eventTitle: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  eventRole: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginRight: 12 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
});
