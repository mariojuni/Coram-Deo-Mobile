import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  LayoutAnimation,
  Animated,
  Dimensions,
  Keyboard,
} from 'react-native';
import { Music, Plus, ListMusic, Calendar, ChevronRight, AlertCircle, X, Check, Trash2, Hash, Clock, ArrowRight, ChevronDown, CalendarDays, ChevronLeft, Search, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import AppModal, { ModalDragArea } from '@/components/ui/AppModal';
import { useAuthStore } from '../../store/useAuthStore';
import { useMinistryStore } from '../../store/useMinistryStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useWorshipStore } from '../../store/useWorshipStore';
import { canViewMobileWorshipSetlists, canCreateMobileWorshipSetlists, canViewMobileWorshipSetlist } from '../../permissions/mobileWorshipPermissions';
import { SoftCard, getTopBarButtonShadowStyle, getSoftShadowStyle } from '@/components/ui/SoftCard';
import type { WorshipSetlist } from '../../features/worship/domain/worship.types';

export default function WorshipTab() {
  const router = useRouter();
  const userProfile = useAuthStore((s) => s.userProfile);
  const ministries = useMinistryStore((state) => state.ministries);
  const schedules = useScheduleStore((state) => state.schedules);

  const userMinistries = useMemo(() => ministries.filter((m) =>
    m.members?.some((mem) => mem.memberId === userProfile?.memberId)
  ), [ministries, userProfile?.memberId]);

  const hasAccess = canViewMobileWorshipSetlists(userProfile, userMinistries);
  const canCreate = canCreateMobileWorshipSetlists(userProfile, userMinistries);

  const rawSetlists = useWorshipStore((state) => state.setlists);
  const setlistsLoading = useWorshipStore((state) => state.setlistsLoading);
  const initializeSetlistsListener = useWorshipStore((state) => state.initializeSetlistsListener);

  const [refreshing, setRefreshing] = useState(false);
  const [tabFilter, setTabFilter] = useState<'upcoming' | 'this_month' | 'past'>('upcoming');

  const setlists = useMemo(() => {
    if (!userProfile?.churchId || !hasAccess) return [];
    const allowed = rawSetlists.filter((setlist) =>
      canViewMobileWorshipSetlist(userProfile, setlist, userMinistries)
    );
    return allowed.sort((a, b) => {
      const dateA = a.serviceDate ? new Date(a.serviceDate).getTime() : 0;
      const dateB = b.serviceDate ? new Date(b.serviceDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [rawSetlists, userProfile, hasAccess, userMinistries]);

  const loading = setlistsLoading;

  useEffect(() => {
    if (!userProfile?.churchId || !hasAccess) return;
    const unsubscribe = initializeSetlistsListener(userProfile.churchId);
    return () => unsubscribe();
  }, [userProfile?.churchId, hasAccess, initializeSetlistsListener]);

  const openCreateModal = () => {
    router.push('/create-setlist' as any);
  };

  const initializeSchedulesListener = useScheduleStore(state => state.initializeSchedulesListener);

  useEffect(() => {
    if (!userProfile?.churchId) return;
    const unsubscribe = initializeSchedulesListener();
    return () => unsubscribe();
  }, [userProfile?.churchId, initializeSchedulesListener]);

  const onRefresh = () => {
    setRefreshing(true);
    // Since we use real-time listeners, refreshing just re-triggers a small delay for UX
    setTimeout(() => setRefreshing(false), 800);
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
                  onPress={openCreateModal}
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
                onPress={openCreateModal}
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
  modalContainer: { flex: 1, backgroundColor: '#FAFAFA' },
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
    zIndex: 10,
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




