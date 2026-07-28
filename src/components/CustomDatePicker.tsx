import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CustomDatePickerProps {
  visible: boolean;
  date: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  minimumDate?: Date;
  maximumDate?: Date;
  accentColor?: string;
}

export default function CustomDatePicker({
  visible,
  date,
  onConfirm,
  onCancel,
  minimumDate,
  maximumDate,
  accentColor = '#FF6596',
}: CustomDatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(date.getFullYear(), date.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(date);
  const [viewMode, setViewMode] = useState<'days' | 'years'>('days');
  const scrollViewRef = useRef<ScrollView>(null);

  const handleShow = () => {
    setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setSelectedDate(date);
    setViewMode('days');
  };

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const minYear = minimumDate ? minimumDate.getFullYear() : 1920;
  const maxYear = maximumDate ? maximumDate.getFullYear() : new Date().getFullYear() + 10;

  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) {
    years.push(y);
  }

  useEffect(() => {
    if (viewMode === 'years') {
      const selectedYearIndex = years.indexOf(currentMonth.getFullYear());
      if (selectedYearIndex !== -1 && scrollViewRef.current) {
        const rowIndex = Math.floor(selectedYearIndex / 3);
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: Math.max(0, rowIndex * 50 - 40), animated: false });
        }, 50);
      }
    }
  }, [viewMode]);

  const changeMonth = (diff: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + diff, 1));
  };

  const selectDay = (day: number) => {
    const candidate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (minimumDate) {
      const minDay = new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate());
      if (candidate < minDay) return;
    }
    if (maximumDate) {
      const maxDay = new Date(maximumDate.getFullYear(), maximumDate.getMonth(), maximumDate.getDate(), 23, 59, 59);
      if (candidate > maxDay) return;
    }
    setSelectedDate(candidate);
  };

  const selectYear = (year: number) => {
    setCurrentMonth(new Date(year, currentMonth.getMonth(), 1));
    setViewMode('days');
  };

  const grid = [];
  for (let i = 0; i < firstDay; i++) {
    grid.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    grid.push(i);
  }

  const rows = [];
  for (let i = 0; i < grid.length; i += 7) {
    const row = grid.slice(i, i + 7);
    while (row.length < 7) row.push(null);
    rows.push(row);
  }

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onCancel} onShow={handleShow}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => changeMonth(-1)}
              style={styles.navBtn}
              disabled={viewMode === 'years'}
            >
              <ChevronLeft size={24} color={viewMode === 'years' ? '#ccc' : '#1a1a1a'} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setViewMode(viewMode === 'days' ? 'years' : 'days')}
              style={styles.monthYearSelector}
              activeOpacity={0.7}
            >
              <Text style={styles.monthText}>
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </Text>
              {viewMode === 'days' ? (
                <ChevronDown size={18} color="#1a1a1a" style={{ marginLeft: 4 }} />
              ) : (
                <ChevronUp size={18} color="#1a1a1a" style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => changeMonth(1)}
              style={styles.navBtn}
              disabled={viewMode === 'years'}
            >
              <ChevronRight size={24} color={viewMode === 'years' ? '#ccc' : '#1a1a1a'} />
            </TouchableOpacity>
          </View>

          {viewMode === 'days' ? (
            <>
              {/* Days of Week */}
              <View style={styles.daysHeader}>
                {DAYS.map((d, i) => (
                  <Text key={i} style={styles.dayLabel}>{d}</Text>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.grid}>
                {rows.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.row}>
                    {row.map((day, colIndex) => {
                      if (!day) return <View key={colIndex} style={styles.cell} />;
                      const cellDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                      const isSelected =
                        selectedDate.getDate() === day &&
                        selectedDate.getMonth() === currentMonth.getMonth() &&
                        selectedDate.getFullYear() === currentMonth.getFullYear();

                      let isDisabled = false;
                      if (minimumDate) {
                        const minDay = new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate());
                        if (cellDate < minDay) isDisabled = true;
                      }
                      if (maximumDate) {
                        const maxDay = new Date(maximumDate.getFullYear(), maximumDate.getMonth(), maximumDate.getDate(), 23, 59, 59);
                        if (cellDate > maxDay) isDisabled = true;
                      }

                      return (
                        <TouchableOpacity
                          key={colIndex}
                          style={[
                            styles.cell,
                            isSelected && { backgroundColor: accentColor },
                            isDisabled && styles.disabledCell,
                          ]}
                          onPress={() => !isDisabled && selectDay(day)}
                          disabled={isDisabled}
                        >
                          <Text
                            style={[
                              styles.cellText,
                              isSelected && styles.selectedCellText,
                              isDisabled && styles.disabledCellText,
                            ]}
                          >
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </>
          ) : (
            /* Years Grid View */
            <View style={styles.yearViewContainer}>
              <Text style={styles.yearSelectTitle}>Select Year</Text>
              <ScrollView ref={scrollViewRef} style={styles.yearScrollView} contentContainerStyle={styles.yearGrid}>
                {years.map((y) => {
                  const isSelectedYear = y === currentMonth.getFullYear();
                  return (
                    <TouchableOpacity
                      key={y}
                      style={[
                        styles.yearCell,
                        isSelectedYear && { backgroundColor: accentColor, borderColor: accentColor },
                      ]}
                      onPress={() => selectYear(y)}
                    >
                      <Text style={[styles.yearText, isSelectedYear && styles.selectedYearText]}>{y}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onConfirm(selectedDate)}
              style={[styles.confirmBtn, { backgroundColor: accentColor }]}
            >
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContainer: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  navBtn: { padding: 8, backgroundColor: '#f8f9fb', borderRadius: 12 },
  monthYearSelector: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#f8f9fb' },
  monthText: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  daysHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '600', color: '#999' },
  grid: { marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cell: { flex: 1, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 100 },
  cellText: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  selectedCellText: { color: '#fff' },
  disabledCell: { opacity: 0.3 },
  disabledCellText: { color: '#bbb' },
  yearViewContainer: { marginBottom: 20, height: 260 },
  yearSelectTitle: { fontSize: 14, fontWeight: '600', color: '#888', marginBottom: 12 },
  yearScrollView: { flex: 1 },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 10, paddingBottom: 10 },
  yearCell: { width: '30%', paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#eee', backgroundColor: '#f8f9fb' },
  yearText: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  selectedYearText: { color: '#fff', fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 12 },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#666' },
  confirmBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#fff' }
});
