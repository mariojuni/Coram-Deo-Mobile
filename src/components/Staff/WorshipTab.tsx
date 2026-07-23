import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { Music, Plus, ListMusic, Calendar, ChevronRight, AlertCircle, X, Check, Trash2, Hash, Clock, ArrowRight, ChevronDown, CalendarDays, ChevronLeft, Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import AppModal from '@/components/ui/AppModal';
import { useAuthStore } from '../../store/useAuthStore';
import { useMinistryStore } from '../../store/useMinistryStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { worshipSetlistService } from '../../features/worship/services/worshipSetlistService';
import { canViewMobileWorshipSetlists, canCreateMobileWorshipSetlists } from '../../permissions/mobileWorshipPermissions';
import { SoftCard, getTopBarButtonShadowStyle, getSoftShadowStyle } from '@/components/ui/SoftCard';
import { BounceCard } from '@/components/ui/BounceCard';
import type { WorshipSetlist } from '../../features/worship/domain/worship.types';

export default function WorshipTab() {
  const router = useRouter();
  const userProfile = useAuthStore((s) => s.userProfile);
  const ministries = useMinistryStore((state) => state.ministries);
  const schedules = useScheduleStore((state) => state.schedules);

  const userMinistries = ministries.filter((m) =>
    m.members?.some((mem) => mem.memberId === userProfile?.memberId)
  );

  const [setlists, setSetlists] = useState<WorshipSetlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tabFilter, setTabFilter] = useState<'upcoming' | 'this_month' | 'past'>('upcoming');

  // Create Setlist Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newStatus, setNewStatus] = useState<'draft' | 'published'>('published');
  const [selectedMinistryId, setSelectedMinistryId] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [creating, setCreating] = useState(false);

  // Searchable Event Picker State
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [isEventPickerOpen, setIsEventPickerOpen] = useState(false);



  const selectedEvent = schedules.find((s) => s.id === selectedEventId);

  const filteredEvents = useMemo(() => {
    if (!eventSearchQuery.trim()) return schedules;
    const query = eventSearchQuery.toLowerCase();
    return schedules.filter(
      (e) => (e.title || '').toLowerCase().includes(query) || (e.date || '').includes(query)
    );
  }, [schedules, eventSearchQuery]);






  const hasAccess = canViewMobileWorshipSetlists(userProfile, userMinistries);
  const canCreate = canCreateMobileWorshipSetlists(userProfile, userMinistries);

  const fetchSetlists = useCallback(async () => {
    if (!userProfile?.churchId || !hasAccess) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await worshipSetlistService.getUpcomingWorshipSetlistsForUser(userProfile, userMinistries);
      setSetlists(data);
    } catch (err) {
      console.error('Error loading worship setlists:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userProfile, hasAccess, userMinistries]);

  useEffect(() => {
    fetchSetlists();
  }, [fetchSetlists]);

  const initializeSchedulesListener = useScheduleStore(state => state.initializeSchedulesListener);

  useEffect(() => {
    if (!userProfile?.churchId) return;
    const unsubscribe = initializeSchedulesListener();
    return () => unsubscribe();
  }, [userProfile?.churchId, initializeSchedulesListener]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSetlists();
  };

  const handleCreateSetlist = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Required', 'Please enter a setlist title.');
      return;
    }
    if (!userProfile?.churchId) return;

    try {
      setCreating(true);
      const worshipMinistry = ministries.find(m => m.features?.songListEnabled || m.name.toLowerCase().includes('worship'));
      const targetMinistryId = selectedMinistryId || worshipMinistry?.id || ministries[0]?.id || '';

      const newId = await worshipSetlistService.createWorshipSetlist({
        churchId: userProfile.churchId,
        eventId: selectedEventId || '',
        ministryId: targetMinistryId,
        title: newTitle.trim(),
        serviceDate: selectedEvent?.date || newDate,
        status: newStatus,
        worshipLeaderId: userProfile.memberId || userProfile.uid,
      });

      setCreateModalVisible(false);
      setNewTitle('');
      setSelectedEventId('');
      fetchSetlists();


      router.push({
        pathname: '/worship-setlist-detail',
        params: { setlistId: newId },
      } as any);
    } catch (err) {
      console.error('Failed to create setlist:', err);
      Alert.alert('Error', 'Failed to create setlist. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const filteredSetlists = setlists.filter((item) => {
    if (!item.serviceDate) return tabFilter === 'upcoming';
    const itemDate = new Date(item.serviceDate + 'T00:00:00');
    const itemTime = itemDate.getTime();

    if (tabFilter === 'upcoming') {
      return itemTime >= startOfToday;
    } else if (tabFilter === 'this_month') {
      return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
    } else if (tabFilter === 'past') {
      return itemTime < startOfToday;
    }
    return true;
  });

  const getMinistryName = (ministryId?: string) => {
    if (!ministryId) return 'Worship Ministry';
    const found = ministries.find((m) => m.id === ministryId);
    return found?.name || 'Worship Ministry';
  };

  if (!hasAccess) {
    return (
      <SoftCard style={{ borderRadius: 20 }} innerStyle={{ borderRadius: 19 }}>
        <View style={styles.cardPadding}>
          <View style={styles.iconCircle}>
            <Music size={28} color="#FF6596" />
          </View>
          <Text style={styles.cardTitle}>Worship Setlists</Text>
          <Text style={styles.cardSubtitle}>
            You do not have permission to view worship setlists.
          </Text>
        </View>
      </SoftCard>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <SoftCard style={{ borderRadius: 24, marginBottom: 16 }} innerStyle={{ borderRadius: 23 }}>
        <View style={styles.cardPadding}>
          <View style={styles.headerRow}>
            <View style={styles.iconBadge}>
              <ListMusic size={24} color="#FF6596" />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{setlists.length} Setlists</Text>
              </View>
              {canCreate && (
                <TouchableOpacity
                  style={styles.createBtnHeader}
                  activeOpacity={0.8}
                  onPress={() => setCreateModalVisible(true)}
                >
                  <Plus size={16} color="#FFF" strokeWidth={2.5} />
                  <Text style={styles.createBtnHeaderText}>New</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Text style={styles.cardTitle}>Worship Setlists</Text>
          <Text style={styles.cardSubtitle}>
            Manage & view setlist songs, keys, lyrics, chords, and musician notes.
          </Text>

          {/* Filter Sub-Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, tabFilter === 'upcoming' && styles.tabItemActive]}
              onPress={() => setTabFilter('upcoming')}
            >
              <Text style={[styles.tabText, tabFilter === 'upcoming' && styles.tabTextActive]}>Upcoming</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabItem, tabFilter === 'this_month' && styles.tabItemActive]}
              onPress={() => setTabFilter('this_month')}
            >
              <Text style={[styles.tabText, tabFilter === 'this_month' && styles.tabTextActive]}>This Month</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabItem, tabFilter === 'past' && styles.tabItemActive]}
              onPress={() => setTabFilter('past')}
            >
              <Text style={[styles.tabText, tabFilter === 'past' && styles.tabTextActive]}>Past</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SoftCard>

      {/* Setlists List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color="#FF6596" />
          <Text style={styles.loadingText}>Loading worship setlists...</Text>
        </View>
      ) : filteredSetlists.length === 0 ? (
        <SoftCard style={{ borderRadius: 20 }} innerStyle={{ borderRadius: 19 }}>
          <View style={styles.emptyContainer}>
            <Music size={36} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No setlists found</Text>
            <Text style={styles.emptySub}>No worship setlists available for this filter.</Text>
            {canCreate && (
              <TouchableOpacity
                style={[styles.openBtn, { marginTop: 12 }]}
                onPress={() => setCreateModalVisible(true)}
              >
                <Plus size={18} color="#FFF" />
                <Text style={styles.openBtnText}>Create First Setlist</Text>
              </TouchableOpacity>
            )}
          </View>
        </SoftCard>
      ) : (
        filteredSetlists.map((item) => {
          const dateStr = item.serviceDate
            ? new Date(item.serviceDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'No date';

          return (
            <SoftCard key={item.id} style={{ borderRadius: 20, marginBottom: 12 }} innerStyle={{ borderRadius: 19 }}>
              <TouchableOpacity
                style={styles.setlistCard}
                activeOpacity={0.75}
                onPress={() =>
                  router.push({
                    pathname: '/worship-setlist-detail',
                    params: { setlistId: item.id },
                  } as any)
                }
              >
                <View style={styles.setlistCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.statusRow}>
                      <Text style={styles.ministryBadge}>{getMinistryName(item.ministryId)}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          item.status === 'published' ? styles.statusPublished : styles.statusDraft,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            item.status === 'published'
                              ? styles.statusTextPublished
                              : styles.statusTextDraft,
                          ]}
                        >
                          {item.status?.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.setlistTitle}>{item.title}</Text>
                  </View>
                  <ChevronRight size={20} color="#9CA3AF" />
                </View>

                <View style={styles.setlistCardMeta}>
                  <View style={styles.metaItem}>
                    <Calendar size={14} color="#6B7280" />
                    <Text style={styles.metaText}>{dateStr}</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.viewBtnText}>View / Edit Setlist</Text>
                  <ArrowRight size={16} color="#FF6596" />
                </View>
              </TouchableOpacity>
            </SoftCard>
          );
        })
      )}

      {/* Create Setlist Modal */}
      <AppModal
        isOpen={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        title="Create Setlist"
        hideHeader={true}
        hideDragHandle={true}
        containerStyle={{ backgroundColor: '#FAFAFA', paddingHorizontal: 0, paddingBottom: 0 }}
      >
        <View style={[styles.modalContainer, { flex: 1 }]}>

          {/* Header with Frosted Glass */}
          <View style={[styles.headerContainer, { paddingTop: 12 }]} pointerEvents="box-none">
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
            <View style={styles.dragHandle} />
            <View style={styles.headerContent}>
              <TouchableOpacity
                style={[styles.createBtnModalHeader, creating && { opacity: 0.6 }]}
                disabled={creating}
                onPress={handleCreateSetlist}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.createBtnModalHeaderText}>Create</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.headerTitleCenter}>Create Setlist</Text>
              <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={() => setCreateModalVisible(false)} hitSlop={8} activeOpacity={0.8}>
                <X size={24} color="#111827" strokeWidth={2} />
              </BounceCard>

            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 20, paddingTop: 24 }}>
              {/* Link Event Button */}
              <View>
                <Text style={styles.inputLabel}>Event</Text>
                <TouchableOpacity
                  style={{
                    height: 52,
                    backgroundColor: '#F9FAFB',
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    marginTop: 4,
                  }}
                  onPress={() => {
                    setCreateModalVisible(false);
                    setTimeout(() => {
                      setEventSearchQuery('');
                      setIsEventPickerOpen(true);
                    }, 300);
                  }}
                  activeOpacity={0.8}
                >
                  <CalendarDays size={20} color="#FF6596" style={{ marginRight: 12 }} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: selectedEvent ? '#111827' : '#9CA3AF', flex: 1 }}>
                    {selectedEvent ? selectedEvent.title : 'Select an event'}
                  </Text>
                  <ChevronRight size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {/* 2. Setlist Title Input */}
              <View>
                <Text style={styles.inputLabel}>Setlist Title *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Sunday Morning Service"
                  placeholderTextColor="#9CA3AF"
                  value={newTitle}
                  onChangeText={setNewTitle}
                />
              </View>

              {/* 3. Status Options */}
              <View>
                <Text style={styles.inputLabel}>Status</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.statusOption, newStatus === 'published' && styles.statusOptionSelected]}
                    onPress={() => setNewStatus('published')}
                  >
                    <Text style={[styles.statusOptionText, newStatus === 'published' && styles.statusOptionTextSelected]}>Published</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusOption, newStatus === 'draft' && styles.statusOptionSelected]}
                    onPress={() => setNewStatus('draft')}
                  >
                    <Text style={[styles.statusOptionText, newStatus === 'draft' && styles.statusOptionTextSelected]}>Draft</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </AppModal>

      {/* Searchable Event Selection Modal */}
      <AppModal
        isOpen={isEventPickerOpen}
        onClose={() => {
          setIsEventPickerOpen(false);
          setTimeout(() => setCreateModalVisible(true), 250);
        }}
        title="Select Event"
        hideHeader={true}
        hideDragHandle={true}
        containerStyle={{ flex: 1, backgroundColor: '#FAFAFA', paddingHorizontal: 0, paddingBottom: 0 }}
      >
        <View style={[styles.modalContainer, { flex: 1 }]}>
          {/* Frosted Glass Header */}
          <View style={[styles.headerContainer, { paddingTop: 12 }]} pointerEvents="box-none">
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
            <View style={styles.dragHandle} />
            <View style={styles.headerContent}>
              <View style={styles.headerCirclePlaceholder} />
              <Text style={styles.headerTitleCenter}>Select Event</Text>
              <BounceCard
                bounceScale={0.85}
                style={styles.headerCircle}
                onPress={() => {
                  setIsEventPickerOpen(false);
                  setTimeout(() => setCreateModalVisible(true), 250);
                }}
                hitSlop={8}
                activeOpacity={0.8}
              >
                <X size={24} color="#111827" strokeWidth={2} />
              </BounceCard>
            </View>
          </View>

          <View style={{ flex: 1, paddingTop: 90, paddingHorizontal: 20 }}>

            {/* Search Input Bar */}
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
              />
              {eventSearchQuery ? (
                <TouchableOpacity onPress={() => setEventSearchQuery('')}>
                  <X size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* List of Available Events */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {filteredEvents.length > 0 ? (
                filteredEvents.map((ev) => {
                  const isSelected = selectedEventId === ev.id;
                  return (
                    <TouchableOpacity
                      key={ev.id}
                      style={{
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        marginBottom: 10,
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
                        setIsEventPickerOpen(false);
                        setTimeout(() => setCreateModalVisible(true), 250);
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
                              {ev.date}
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
            </ScrollView>
          </View>
        </View>
      </AppModal>










    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  center: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  cardPadding: {
    backgroundColor: '#FFF',
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFE8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  countBadge: {
    backgroundColor: '#FFF0F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFD0E0',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6596',
  },
  createBtnHeader: {
    backgroundColor: '#FF6596',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  createBtnHeaderText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 3,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabItemActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FF6596',
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  emptySub: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  setlistCard: {
    backgroundColor: '#FFF',
    padding: 16,
  },
  setlistCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  ministryBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusPublished: {
    backgroundColor: '#DCFCE7',
  },
  statusDraft: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextPublished: {
    color: '#15803D',
  },
  statusTextDraft: {
    color: '#B45309',
  },
  setlistTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  setlistCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    marginTop: 4,
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6596',
  },
  openBtn: {
    backgroundColor: '#FF6596',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  openBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },
  statusOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  statusOptionSelected: {
    borderColor: '#FF6596',
    backgroundColor: '#FFE8F0',
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusOptionTextSelected: {
    color: '#FF6596',
    fontWeight: '800',
  },
  modalContainer: { backgroundColor: '#FAFAFA' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 70, paddingBottom: 32 },


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
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    flex: 1,
  },
  headerCirclePlaceholder: {
    width: 40,
  },
  headerCircle: {
    ...getTopBarButtonShadowStyle(20),
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnModalHeader: {
    backgroundColor: '#FF6596',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnModalHeaderText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  headerTitleCenter: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    transform: [{ translateY: -8 }],
  },
  formCardSection: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  formCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  formCardIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF5F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  formCardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 1,
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  dropdownSelectorText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  dropdownMenu: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginTop: 6,
    maxHeight: 180,
    overflow: 'hidden',
  },
  dropdownMenuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownMenuItemText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  submitBtn: {
    flex: 1,
    backgroundColor: '#FF6596',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
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
  eventListHeader: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', marginBottom: 12 },
  eventListTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
});




