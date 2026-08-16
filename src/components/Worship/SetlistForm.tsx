import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { CalendarDays, ChevronRight } from 'lucide-react-native';
import type { Schedule } from '@/features/schedule/domain/schedule.types';

export type SetlistStatus = 'draft' | 'published' | 'archived';

interface SetlistFormProps {
  title: string;
  onTitleChange: (title: string) => void;
  status: SetlistStatus;
  onStatusChange: (status: SetlistStatus) => void;
  selectedEvent: Schedule | undefined;
  onPressEvent: () => void;
  showArchived?: boolean;
}

export function SetlistForm({
  title,
  onTitleChange,
  status,
  onStatusChange,
  selectedEvent,
  onPressEvent,
  showArchived = false,
}: SetlistFormProps) {
  return (
    <View style={{ gap: 20 }}>
      {/* Link Event Button */}
      <View>
        <Text style={styles.inputLabel}>Event</Text>
        <TouchableOpacity
          style={styles.eventButton}
          onPress={onPressEvent}
          activeOpacity={0.8}
        >
          <CalendarDays size={20} color="#FF6596" style={{ marginRight: 12 }} />
          <Text style={[styles.eventButtonText, { color: selectedEvent ? '#111827' : '#9CA3AF' }]}>
            {selectedEvent
              ? `${selectedEvent.title} • ${selectedEvent.date ? new Date(selectedEvent.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}`
              : 'Select an event'}
          </Text>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Setlist Title Input */}
      <View>
        <Text style={styles.inputLabel}>Setlist Title *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Sunday Morning Service"
          placeholderTextColor="#9CA3AF"
          value={title}
          onChangeText={onTitleChange}
        />
      </View>

      {/* Status Options */}
      <View>
        <Text style={styles.inputLabel}>Status</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={[styles.statusOption, status === 'published' && styles.statusOptionSelected]}
            onPress={() => onStatusChange('published')}
          >
            <Text style={[styles.statusOptionText, status === 'published' && styles.statusOptionTextSelected]}>Published</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statusOption, status === 'draft' && styles.statusOptionSelected]}
            onPress={() => onStatusChange('draft')}
          >
            <Text style={[styles.statusOptionText, status === 'draft' && styles.statusOptionTextSelected]}>Draft</Text>
          </TouchableOpacity>
          {showArchived && (
            <TouchableOpacity
              style={[styles.statusOption, status === 'archived' && styles.statusOptionSelected]}
              onPress={() => onStatusChange('archived')}
            >
              <Text style={[styles.statusOptionText, status === 'archived' && styles.statusOptionTextSelected]}>Archived</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginLeft: 2,
  },
  textInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#111827',
  },
  eventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 4,
  },
  eventButtonText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusOptionSelected: {
    backgroundColor: '#FFF0F5',
    borderColor: '#FF6596',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusOptionTextSelected: {
    color: '#FF6596',
  },
});
