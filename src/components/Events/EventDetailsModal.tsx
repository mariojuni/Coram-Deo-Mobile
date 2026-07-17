import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CalendarDays, CheckCircle2, HelpCircle, XCircle } from 'lucide-react-native';
import AppModal from '@/components/ui/AppModal';
import { PublicEventSetlist } from '@/components/Events/PublicEventSetlist';
import type { Schedule } from '@/features/schedule/domain/schedule.types';

const isToday = (dateString?: string) => {
  if (!dateString) return false;
  const today = new Date();
  const eventDate = new Date(dateString);
  return eventDate.getDate() === today.getDate() &&
         eventDate.getMonth() === today.getMonth() &&
         eventDate.getFullYear() === today.getFullYear();
};

interface EventDetailsModalProps {
  event: Schedule | null;
  onClose: () => void;
  currentUser: any;
  getUserRsvpStatus: (event: Schedule, uid: string) => string | null;
  handleRsvp: (eventId: string, status: 'going' | 'maybe' | 'not_going') => void;
}

export function EventDetailsModal({
  event,
  onClose,
  currentUser,
  getUserRsvpStatus,
  handleRsvp,
}: EventDetailsModalProps) {
  if (!event) return null;

  const formatEventDate = (event: Schedule): string => {
    // Normalize date function inline for safety if date format varies
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

    const normalized = normalizeDateToYmd(event.date);
    const dateValue = normalized ? new Date(`${normalized}T00:00:00`) : new Date();

    return dateValue.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const currentRsvp = currentUser ? getUserRsvpStatus(event, currentUser.uid) : null;

  return (
    <AppModal
      isOpen={!!event}
      onClose={onClose}
      title={event.title || 'Event Details'}
      headerLeft={<View style={styles.modalHeaderIcon}><CalendarDays size={16} color="#FF6596" /></View>}
      headerTitleAlign="center"
      containerStyle={styles.container}
    >
      <View style={styles.contentWrap}>
        <View style={styles.titleBlock}>
          {event.description ? (
            <Text style={styles.eventDescription}>{event.description}</Text>
          ) : null}
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatEventDate(event)}</Text>
            </View>

            <View style={styles.detailRowWrapper}>
              <View style={[styles.detailItem, { flex: 1 }]}>
                <Text style={styles.detailLabel}>Start Time</Text>
                <Text style={styles.detailValue}>{event.time || '9:00 AM'}</Text>
              </View>
              {event.endTime && (
                <View style={[styles.detailItem, { flex: 1 }]}>
                  <Text style={styles.detailLabel}>End Time</Text>
                  <Text style={styles.detailValue}>{event.endTime}</Text>
                </View>
              )}
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue} numberOfLines={2}>{event.location || 'Main Sanctuary'}</Text>
            </View>
          </View>
        </View>

        {/* Public Worship Setlist */}
        <PublicEventSetlist 
          eventId={event.id} 
          title={isToday(event.date) ? "Today's Songs" : "Event Songs"} 
          onCloseModal={onClose} 
          preloadedSongList={event.songList}
        />

        <View style={styles.rsvpSection}>
          <Text style={styles.rsvpTitle}>Your Response</Text>
          <View style={styles.rsvpRow}>
            <RsvpButton
              active={currentRsvp === 'going'}
              label="Going"
              icon={<CheckCircle2 size={14} color={currentRsvp === 'going' ? '#fff' : '#FF6596'} />}
              onPress={() => handleRsvp(event.id, 'going')}
              activeColor="#FF6596"
            />
            <RsvpButton
              active={currentRsvp === 'maybe'}
              label="Maybe"
              icon={<HelpCircle size={14} color={currentRsvp === 'maybe' ? '#fff' : '#F59E0B'} />}
              onPress={() => handleRsvp(event.id, 'maybe')}
              activeColor="#F59E0B"
            />
            <RsvpButton
              active={currentRsvp === 'not_going'}
              label="Can't Go"
              icon={<XCircle size={14} color={currentRsvp === 'not_going' ? '#fff' : '#EF4444'} />}
              onPress={() => handleRsvp(event.id, 'not_going')}
              activeColor="#EF4444"
            />
          </View>
        </View>
      </View>
    </AppModal>
  );
}

function RsvpButton({ active, label, icon, onPress, activeColor }: any) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.rsvpBtn, 
        active && { backgroundColor: activeColor, borderColor: activeColor }
      ]}
    >
      {icon}
      <Text style={[styles.rsvpBtnText, active && styles.rsvpBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  modalHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 101, 150, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrap: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  titleBlock: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  eventName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  eventDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 16,
  },
  detailsGrid: {
    gap: 14,
  },
  detailRowWrapper: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'column',
    gap: 4,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  rsvpSection: {
    marginTop: 10,
  },
  rsvpTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rsvpRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rsvpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  rsvpBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  rsvpBtnTextActive: {
    color: '#FFFFFF',
  },
});
