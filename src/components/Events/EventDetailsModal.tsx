import React, { useState, useEffect } from 'react';
import { BounceCard } from '@/components/ui/BounceCard';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CalendarDays, CheckCircle2, HelpCircle, XCircle, X } from 'lucide-react-native';
import { Platform, ScrollView } from 'react-native';
import AppModal, { ModalDragArea } from '@/components/ui/AppModal';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { PublicEventSetlist } from '@/components/Events/PublicEventSetlist';
import type { Schedule } from '@/features/schedule/domain/schedule.types';
import { getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';

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
  const currentRsvp = (currentUser && event) ? getUserRsvpStatus(event, currentUser.uid) : null;
  const [localRsvp, setLocalRsvp] = useState<string | null>(currentRsvp);

  useEffect(() => {
    setLocalRsvp(currentRsvp);
  }, [currentRsvp]);

  const onRsvpPress = (status: 'going' | 'maybe' | 'not_going') => {
    setLocalRsvp(status);
    if (event) {
      handleRsvp(event.id, status);
    }
  };

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



  return (
    <AppModal
      isOpen={!!event}
      onClose={onClose}
      title={event.title || 'Event Details'}
      hideHeader={true}
      hideDragHandle={true}
      containerStyle={{ paddingHorizontal: 0, paddingBottom: 0, backgroundColor: '#FAFAFA' }}
      heightRatio={0.85}
      dynamicHeight={true}
    >
      <View style={styles.modalContainer}>
        {/* ─── Header ─────────────────────────────────────────────────────── */}
        <ModalDragArea style={[styles.headerContainer, { paddingTop: 12 }]}>
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
          <View style={styles.dragHandle} />
          <View style={styles.headerContent}>
            <View style={styles.headerCirclePlaceholder} />
            <Text style={styles.headerTitle}>{event.title || 'Event Details'}</Text>
            <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={onClose} hitSlop={8} activeOpacity={0.8}>
              <X size={24} color="#111827" strokeWidth={2} />
            </BounceCard>
          </View>
        </ModalDragArea>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: 70 }]} showsVerticalScrollIndicator={false}>
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
        {event.setlistStatus !== 'draft' && (
          <PublicEventSetlist 
            eventId={event.id} 
            title={isToday(event.date) ? "Today's Songs" : "Event Songs"} 
            onCloseModal={onClose} 
            preloadedSongList={event.songList}
          />
        )}

        {event.enableRSVP === true && (
          <View style={styles.rsvpSection}>
            <Text style={styles.rsvpTitle}>Your Response</Text>
            <View style={styles.rsvpRow}>
              <RsvpButton
                active={localRsvp === 'going'}
                label="Going"
                icon={<CheckCircle2 size={14} color={localRsvp === 'going' ? '#fff' : '#FF6596'} />}
                onPress={() => onRsvpPress('going')}
                activeColor="#FF6596"
              />
              <RsvpButton
                active={localRsvp === 'maybe'}
                label="Maybe"
                icon={<HelpCircle size={14} color={localRsvp === 'maybe' ? '#fff' : '#F59E0B'} />}
                onPress={() => onRsvpPress('maybe')}
                activeColor="#F59E0B"
              />
              <RsvpButton
                active={localRsvp === 'not_going'}
                label="Can't Go"
                icon={<XCircle size={14} color={localRsvp === 'not_going' ? '#fff' : '#EF4444'} />}
                onPress={() => onRsvpPress('not_going')}
                activeColor="#EF4444"
              />
            </View>
          </View>
        )}
        </View>
        </ScrollView>
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
  modalContainer: { backgroundColor: '#FAFAFA' },
  scrollContent: { paddingBottom: 40 },
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
  headerCirclePlaceholder: { width: 40, height: 40 },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginHorizontal: 12,
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
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.03)',
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
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.02)',
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
