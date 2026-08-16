import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Dimensions, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, Calendar, Clock, Check, X, CalendarDays } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useCreateSetlistContext } from './CreateSetlistContext';
import { useScheduleStore } from '@/store/useScheduleStore';
import { getSoftShadowStyle } from '@/components/ui/SoftCard';

export default function SelectEventScreen() {
  const router = useRouter();
  const schedules = useScheduleStore((state) => state.schedules);
  
  const {
    selectedEventId,
    setSelectedEventId,
    setNewTitle,
    setNewDate,
    eventSearchQuery,
    setEventSearchQuery,
  } = useCreateSetlistContext();

  const handleClose = () => {
    Keyboard.dismiss();
    router.back();
  };

  const filteredEvents = useMemo(() => {
    // Note: We don't have access to `setlists` here easily without bringing the store over.
    // For now, we show all available schedules and filter by query.
    // In the future, this can be optimized.
    if (!eventSearchQuery.trim()) return schedules;
    const query = eventSearchQuery.toLowerCase();
    return schedules.filter(
      (e) => (e.title || '').toLowerCase().includes(query) || (e.date || '').includes(query)
    );
  }, [schedules, eventSearchQuery]);

  return (
    <View style={{ flex: 1 }}>
      {/* Header with Frosted Glass */}
      <View style={[styles.headerContainer, { paddingTop: 12 }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
        <View style={styles.dragHandle} />
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.headerCircle} onPress={handleClose} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} activeOpacity={0.7}>
            <ArrowLeft size={24} color="#111827" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitleCenter} pointerEvents="none">Select Event</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <View style={{ flex: 1, paddingTop: 100 }}>
        {/* Search Input Bar */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FFF',
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 14,
            paddingHorizontal: 14,
            height: 48,
            marginBottom: 16,
            ...getSoftShadowStyle(8),
          }}>
            <Search size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
            <TextInput
              style={{ flex: 1, fontSize: 14, color: '#111827', fontWeight: '500' }}
              placeholder="Search events by name or date..."
              placeholderTextColor="#9CA3AF"
              value={eventSearchQuery}
              onChangeText={setEventSearchQuery}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {eventSearchQuery ? (
              <TouchableOpacity onPress={() => setEventSearchQuery('')}>
                <X size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: 10 }}>
            {filteredEvents.length > 0 ? (
              filteredEvents.map((ev) => {
                const isSelected = selectedEventId === ev.id;
                return (
                  <TouchableOpacity
                    key={ev.id}
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      backgroundColor: isSelected ? '#FFF5F8' : '#FFF',
                      borderWidth: 1,
                      borderColor: isSelected ? '#FF6596' : '#F3F4F6',
                      borderRadius: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      ...getSoftShadowStyle(10),
                    }}
                    onPress={() => {
                      setSelectedEventId(ev.id);
                      setNewTitle(ev.title || 'Worship Setlist');
                      if (ev.date) setNewDate(ev.date);
                      handleClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: isSelected ? '#FF6596' : '#FFF5F8', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                        <CalendarDays size={18} color={isSelected ? '#FFF' : '#FF6596'} />
                      </View>
                      <View style={{ flex: 1, paddingRight: 12, justifyContent: 'center' }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: isSelected ? '#FF6596' : '#111827', marginBottom: 3 }} numberOfLines={1}>
                          {ev.title}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Text style={{ fontSize: 13, color: isSelected ? '#FF6596' : '#6B7280', fontWeight: '600' }}>
                            {ev.date ? new Date(ev.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''}
                          </Text>
                          {ev.time ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Clock size={12} color={isSelected ? '#FF6596' : '#6B7280'} style={{ marginRight: 4 }} />
                              <Text style={{ fontSize: 13, color: isSelected ? '#FF6596' : '#6B7280', fontWeight: '500' }}>
                                {ev.time}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      {isSelected && <Check size={20} color="#FF6596" strokeWidth={2.5} />}
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <CalendarDays size={32} color="#9CA3AF" style={{ marginBottom: 10 }} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151' }}>No events found</Text>
                <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 4 }}>
                  Try searching with another keyword or date.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#d1d5db',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 4,
  },
  headerTitleCenter: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    transform: [{ translateY: -8 }],
  },
  headerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  eventDate: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6596',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});
