import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Calendar as CalendarIcon, Clock, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../../firebase';
import type { Schedule } from '../../features/schedule/domain/schedule.types';
import CustomDatePicker from '../CustomDatePicker';
import CustomTimePicker from '../CustomTimePicker';
import AppModal from '@/components/ui/AppModal';
import { BlurView } from 'expo-blur';
import { BounceCard } from '@/components/ui/BounceCard';
import { getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';

interface AddScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: Schedule | null;
}

const parseTime = (timeStr: string): Date => {
  if (!timeStr) return new Date();
  const [t, ampm] = timeStr.split(' ');
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  const d = new Date();
  d.setHours(h, parseInt(mStr || '0', 10), 0, 0);
  return d;
};

const fmtDateUI = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
const fmtDateDB = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtTime = (d: Date) => {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m} ${ap}`;
};

export default function AddScheduleModal({ isOpen, onClose, eventToEdit }: AddScheduleModalProps) {
  const initDate = (() => {
    const d = new Date();
    if (eventToEdit?.date) {
      const [y, m, day] = eventToEdit.date.split('-');
      d.setFullYear(Number(y), Number(m) - 1, Number(day));
    }
    return d;
  })();

  const [title, setTitle] = useState(eventToEdit?.title ?? 'Sunday Worship Service');
  const [date, setDate] = useState(initDate);
  const [startTime, setStartTime] = useState(
    eventToEdit?.time ? parseTime(eventToEdit.time) : new Date(new Date().setHours(9, 0, 0, 0))
  );
  const [endTime, setEndTime] = useState(
    eventToEdit?.endTime ? parseTime(eventToEdit.endTime) : new Date(new Date().setHours(11, 0, 0, 0))
  );
  const [location, setLocation] = useState(eventToEdit?.location ?? 'Main Sanctuary');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Info', 'Please provide an event title.');
      return;
    }
    if (endTime <= startTime) {
      Alert.alert('Invalid Time', 'End time must be after start time.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        date: fmtDateDB(date),
        time: fmtTime(startTime),
        endTime: fmtTime(endTime),
        location: location.trim(),
      };
      if (eventToEdit) {
        await updateDoc(doc(db, 'events', eventToEdit.id), payload);
      } else {
        await addDoc(collection(db, 'events'), { ...payload, duties: [], createdAt: serverTimestamp() });
      }
      onClose();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={eventToEdit ? 'Edit Event' : 'New Schedule'}
      hideHeader={true}
      hideDragHandle={true}
      containerStyle={{ paddingHorizontal: 0, paddingBottom: 0 }}
    >
      <View style={s.modalContainer}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[s.headerContainer, { paddingTop: 12 }]} pointerEvents="box-none">
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
            <View style={s.dragHandle} />
            <View style={s.headerContent}>
              <BounceCard bounceScale={0.85} style={s.headerCircle} onPress={onClose} hitSlop={8} activeOpacity={0.8}>
                <X size={24} color="#111827" strokeWidth={2} />
              </BounceCard>
              <Text style={s.headerTitle}>{eventToEdit ? 'Edit Event' : 'New Schedule'}</Text>
              <TouchableOpacity onPress={handleSave} style={s.saveBtn} disabled={saving}>
                <Text style={s.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 70, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
            <Text style={s.sectionTitle}>Event Details</Text>

            <Text style={s.label}>Event Title</Text>
            <TextInput
              style={s.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Sunday Worship Service"
              placeholderTextColor="#aaa"
            />

            <Text style={s.label}>Date</Text>
            <TouchableOpacity style={s.iconField} onPress={() => setShowDatePicker(true)}>
              <CalendarIcon size={16} color="#888" />
              <Text style={s.iconFieldText}>{fmtDateUI(date)}</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Start Time</Text>
                <TouchableOpacity style={s.iconField} onPress={() => setShowStartPicker(true)}>
                  <Clock size={16} color="#888" />
                  <Text style={s.iconFieldText}>{fmtTime(startTime)}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>End Time</Text>
                <TouchableOpacity style={s.iconField} onPress={() => setShowEndPicker(true)}>
                  <Clock size={16} color="#888" />
                  <Text style={s.iconFieldText}>{fmtTime(endTime)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={s.label}>Location</Text>
            <TextInput
              style={s.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Main Sanctuary"
              placeholderTextColor="#aaa"
            />
          </ScrollView>

          <CustomDatePicker
            visible={showDatePicker}
            date={date}
            onConfirm={(d) => { setDate(d); setShowDatePicker(false); }}
            onCancel={() => setShowDatePicker(false)}
          />
          <CustomTimePicker
            visible={showStartPicker}
            time={startTime}
            onConfirm={(t) => { setStartTime(t); setShowStartPicker(false); }}
            onCancel={() => setShowStartPicker(false)}
          />
          <CustomTimePicker
            visible={showEndPicker}
            time={endTime}
            onConfirm={(t) => { setEndTime(t); setShowEndPicker(false); }}
            onCancel={() => setShowEndPicker(false)}
          />
        </KeyboardAvoidingView>
      </View>
    </AppModal>
  );
}

const s = StyleSheet.create({
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
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#d1d5db',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 4,
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
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginHorizontal: 12,
  },

  saveBtn: {
    backgroundColor: '#FF6596',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: '#f8f9fb',
    borderWidth: 1,
    borderColor: '#ebebeb',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 15,
    color: '#1a1a1a',
  },
  iconField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8f9fb',
    borderWidth: 1,
    borderColor: '#ebebeb',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  iconFieldText: { fontSize: 15, color: '#1a1a1a', flex: 1 },
});
