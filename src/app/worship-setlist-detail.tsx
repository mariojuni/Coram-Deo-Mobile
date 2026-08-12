import AppModal, { ModalDragArea } from '@/components/ui/AppModal';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  FileText,
  Hash,
  Music,
  Plus,
  Trash2,
  X,
  Check,
  CalendarDays,
  Search
} from 'lucide-react-native';
import { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BounceCard } from '@/components/ui/BounceCard';
import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';
import { SoftCard, getTopBarButtonShadowStyle, getSoftShadowStyle } from '@/components/ui/SoftCard';
import type { Song, WorshipSetlist, WorshipSetlistItem } from '@/features/worship/domain/worship.types';
import { worshipSetlistService } from '@/features/worship/services/worshipSetlistService';
import {
  canManageMobileWorshipSetlist,
  canViewMobileWorshipSetlist,
} from '@/permissions/mobileWorshipPermissions';
import { useAuthStore } from '@/store/useAuthStore';
import { useMinistryStore } from '@/store/useMinistryStore';
import { useWorshipStore } from '@/store/useWorshipStore';
import { useScheduleStore } from '@/store/useScheduleStore';
import { useModalKeyboard } from '@/hooks/useModalKeyboard';

export default function WorshipSetlistDetailScreen() {
  const { setlistId, viewOnly } = useLocalSearchParams<{ setlistId: string, viewOnly?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userProfile = useAuthStore((s) => s.userProfile);
  const ministries = useMinistryStore((s) => s.ministries);
  const setActiveSetlistItems = useWorshipStore((s) => s.setActiveSetlistItems);
  const schedules = useScheduleStore((state) => state.schedules);

  const userMinistries = ministries.filter((m) =>
    m.members?.some((mem) => mem.memberId === userProfile?.memberId)
  );

  const [setlist, setSetlist] = useState<WorshipSetlist | null>(null);
  const [items, setItems] = useState<WorshipSetlistItem[]>([]);
  const [availableSongs, setAvailableSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Setlist Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStatus, setEditStatus] = useState<'draft' | 'published' | 'archived'>('published');

  // Searchable Event Picker State
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [isEventPickerOpen, setIsEventPickerOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  const selectedEvent = schedules.find((s) => s.id === selectedEventId);

  const filteredEvents = useMemo(() => {
    const availableSchedules = schedules;
    if (!eventSearchQuery.trim()) return availableSchedules;
    const query = eventSearchQuery.toLowerCase();
    return availableSchedules.filter(
      (e) => (e.title || '').toLowerCase().includes(query) || (e.date || '').includes(query)
    );
  }, [schedules, eventSearchQuery]);

  const [savingSetlist, setSavingSetlist] = useState(false);

  // Add Song Modal
  const addSongKeyboard = useModalKeyboard({ heightRatio: 0.85, backgroundColor: '#FAFAFA' });
  const [addSongModalVisible, setAddSongModalVisible] = useState(false);
  const [songSearch, setSongSearch] = useState('');
  const [selectedSongKey, setSelectedSongKey] = useState('');
  const [addingSongId, setAddingSongId] = useState<string | null>(null);

  const canManage = viewOnly === 'true' ? false : canManageMobileWorshipSetlist(userProfile, setlist, userMinistries);

  const loadData = async () => {
    if (!setlistId || !userProfile?.churchId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const fetchedSetlist = await worshipSetlistService.getWorshipSetlistById(
        userProfile.churchId,
        setlistId
      );

      if (!fetchedSetlist) {
        setError('Worship setlist not found or access denied.');
        setLoading(false);
        return;
      }

      const canView = canViewMobileWorshipSetlist(userProfile, fetchedSetlist, userMinistries);
      if (!canView) {
        setError('You do not have permission to view this setlist.');
        setLoading(false);
        return;
      }

      const fetchedItems = await worshipSetlistService.getWorshipSetlistItems(
        userProfile.churchId,
        setlistId
      );

      const songs = await worshipSetlistService.getAllSongs(userProfile.churchId);

      setSetlist(fetchedSetlist);
      setEditTitle(fetchedSetlist.title || '');
      setEditDate(fetchedSetlist.serviceDate || '');
      setEditStatus(fetchedSetlist.status || 'published');
      setSelectedEventId(fetchedSetlist.eventId || '');
      setItems(fetchedItems);
      setAvailableSongs(songs);
      setActiveSetlistItems(fetchedItems);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('We could not load the worship setlist. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [setlistId, userProfile]);

  const handleUpdateSetlist = async () => {
    if (!setlist || !setlistId) return;
    try {
      setSavingSetlist(true);
      await worshipSetlistService.updateWorshipSetlist(setlistId, {
        title: editTitle.trim(),
        serviceDate: selectedEvent?.date || editDate,
        eventId: selectedEventId || '',
        status: editStatus,
      });
      setEditModalVisible(false);
      loadData();
    } catch (err) {
      console.error('Failed to update setlist:', err);
      Alert.alert('Error', 'Failed to update setlist.');
    } finally {
      setSavingSetlist(false);
    }
  };

  const handleDeleteSetlist = async () => {
    if (!setlist || !setlistId) return;
    Alert.alert('Delete Setlist', 'Are you sure you want to delete this setlist?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await worshipSetlistService.deleteWorshipSetlist(setlistId);
            router.back();
          } catch (err) {
            console.error('Failed to delete setlist:', err);
            Alert.alert('Error', 'Failed to delete setlist.');
          }
        },
      },
    ]);
  };

  const handleAddSong = async (song: Song) => {
    if (!setlist || !userProfile?.churchId) return;
    try {
      setAddingSongId(song.id);
      await worshipSetlistService.createWorshipSetlistItem({
        churchId: userProfile.churchId,
        setlistId: setlist.id,
        songId: song.id,
        order: items.length + 1,
        selectedKey: selectedSongKey || song.defaultKey || '',
        tempoBpm: song.tempoBpm,
      });

      setAddSongModalVisible(false);
      setSelectedSongKey('');
      loadData();
    } catch (err) {
      console.error('Failed to add song to setlist:', err);
      Alert.alert('Error', 'Failed to add song.');
    } finally {
      setAddingSongId(null);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    Alert.alert('Remove Song', 'Remove this song from the setlist?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await worshipSetlistService.deleteWorshipSetlistItem(itemId);
            loadData();
          } catch (err) {
            console.error('Failed to delete item:', err);
            Alert.alert('Error', 'Failed to remove song.');
          }
        },
      },
    ]);
  };

  const canChords = true;

  const getMinistryName = (ministryId?: string) => {
    if (!ministryId) return 'Worship Ministry';
    const found = ministries.find((m) => m.id === ministryId);
    return found?.name || 'Worship Ministry';
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: '#F7F8FC' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ paddingHorizontal: 20, paddingTop: Math.max(insets.top, 20) + 60, paddingBottom: 24, gap: 12 }}>
          <ShimmerSkeleton width={140} height={20} borderRadius={10} />
          <ShimmerSkeleton width="75%" height={32} borderRadius={10} />
          <ShimmerSkeleton width={180} height={18} borderRadius={6} />
        </View>
        <View style={{ paddingHorizontal: 20, gap: 16 }}>
          {[1, 2, 3].map((key) => (
            <SoftCard key={key} style={{ borderRadius: 24 }} innerStyle={{ borderRadius: 23 }}>
              <View style={{ padding: 20, gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <ShimmerSkeleton width={32} height={32} borderRadius={16} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <ShimmerSkeleton width="70%" height={20} borderRadius={6} />
                    <ShimmerSkeleton width="45%" height={14} borderRadius={6} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <ShimmerSkeleton width={70} height={22} borderRadius={11} />
                  <ShimmerSkeleton width={65} height={22} borderRadius={11} />
                  <ShimmerSkeleton width={80} height={22} borderRadius={11} />
                </View>
              </View>
            </SoftCard>
          ))}
        </View>
      </View>
    );
  }

  if (error || !setlist) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 20 }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.fixedBackBtnWrapper, { top: Math.max(insets.top, 24) }]}>
          <BounceCard bounceScale={0.85} style={styles.fixedBackBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
          </BounceCard>
        </View>
        <View style={styles.notFound}>
          <AlertCircle size={40} color="#EF4444" strokeWidth={2.5} />
          <Text style={styles.notFoundTitle}>Unavailable</Text>
          <Text style={styles.notFoundText}>{error || 'Setlist not found.'}</Text>
        </View>
      </View>
    );
  }

  const dateStr = setlist.serviceDate
    ? new Date(setlist.serviceDate + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    : 'No date set';

  const filteredSongs = availableSongs.filter(
    (s) =>
      !items.some((item) => item.songId === s.id) &&
      (s.title.toLowerCase().includes(songSearch.toLowerCase()) ||
        (s.artist && s.artist.toLowerCase().includes(songSearch.toLowerCase())))
  );

  return (
    <View style={[styles.screen, { backgroundColor: '#F7F8FC' }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <LinearGradient
        colors={['#FFE8F1', '#F5F2FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 20) + 52 }]}
      >
        <View style={styles.headerTitleContainer}>
          <View style={styles.statusRow}>
            <Text style={styles.ministryBadge}>{getMinistryName(setlist.ministryId)}</Text>
            <View
              style={[
                styles.statusBadge,
                setlist.status === 'published' ? styles.statusPublished : styles.statusDraft,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  setlist.status === 'published'
                    ? styles.statusTextPublished
                    : styles.statusTextDraft,
                ]}
              >
                {setlist.status?.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.screenTitle}>{setlist.title}</Text>
          <View style={styles.dateMeta}>
            <Calendar size={14} color="#6B7280" />
            <Text style={styles.dateMetaText}>{dateStr}</Text>
          </View>

          {/* Leader Action Buttons */}
          {canManage && (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={styles.leaderEditBtn}
                onPress={() => setEditModalVisible(true)}
              >
                <Edit2 size={14} color="#FF6596" />
                <Text style={styles.leaderEditBtnText}>Edit Setlist</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.leaderAddSongBtn}
                onPress={() => setAddSongModalVisible(true)}
              >
                <Plus size={14} color="#FFF" />
                <Text style={styles.leaderAddSongBtnText}>Add Song</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Music size={40} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>No songs added yet</Text>
            <Text style={styles.emptyStateText}>No songs in this setlist yet.</Text>
            {canManage && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnPrimary, { marginTop: 14, alignSelf: 'center' }]}
                onPress={() => setAddSongModalVisible(true)}
              >
                <Plus size={16} color="#FFF" />
                <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>Add Song</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          items.map((item, index) => {
            const keyToDisplay = item.selectedKey || item.song?.defaultKey;
            const tempoToDisplay = item.tempoBpm || item.song?.tempoBpm;

            return (
              <SoftCard key={item.id} style={{ borderRadius: 24 }} innerStyle={{ borderRadius: 23 }}>
                <View style={styles.songCard}>
                  {/* Top Row: Order & Title */}
                  <View style={styles.songHeader}>
                    <View style={styles.orderBadge}>
                      <Text style={styles.orderText}>{item.order || index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.songTitle}>{item.song?.title || 'Unknown Song'}</Text>
                      {item.song?.artist && (
                        <Text style={styles.artistText}>{item.song.artist}</Text>
                      )}
                    </View>
                    {canManage && (
                      <TouchableOpacity
                        onPress={() => handleDeleteItem(item.id)}
                        hitSlop={8}
                        style={{ padding: 4 }}
                      >
                        <Trash2 size={18} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Badges: Key, Capo, Tempo, Section */}
                  <View style={styles.badgeRow}>
                    {keyToDisplay ? (
                      <View style={styles.badge}>
                        <Hash size={12} color="#FF6596" />
                        <Text style={styles.badgeText}>Key: {keyToDisplay}</Text>
                      </View>
                    ) : null}

                    {item.capo !== undefined && item.capo > 0 ? (
                      <View style={[styles.badge, { backgroundColor: '#F0F9FF' }]}>
                        <Text style={[styles.badgeText, { color: '#0284C7' }]}>
                          Capo {item.capo}
                        </Text>
                      </View>
                    ) : null}

                    {tempoToDisplay ? (
                      <View style={[styles.badge, { backgroundColor: '#F0FDF4' }]}>
                        <Clock size={12} color="#16A34A" />
                        <Text style={[styles.badgeText, { color: '#16A34A' }]}>
                          {tempoToDisplay} BPM
                        </Text>
                      </View>
                    ) : null}

                    {item.section ? (
                      <View style={[styles.badge, { backgroundColor: '#FAF5FF' }]}>
                        <Text style={[styles.badgeText, { color: '#9333EA' }]}>
                          {item.section}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Notes if available */}
                  {item.transitionNotes ? (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesLabel}>Transition Notes:</Text>
                      <Text style={styles.notesContent}>{item.transitionNotes}</Text>
                    </View>
                  ) : null}

                  {item.musicianNotes ? (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesLabel}>Musician Notes:</Text>
                      <Text style={styles.notesContent}>{item.musicianNotes}</Text>
                    </View>
                  ) : null}

                  {/* Action Buttons */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      activeOpacity={0.8}
                      onPress={() =>
                        router.push({
                          pathname: '/serve-song-lyrics',
                          params: {
                            songId: item.songId,
                            setlistItemId: item.id,
                            hideChords: 'true',
                          },
                        } as any)
                      }
                    >
                      <FileText size={16} color="#4B5563" />
                      <Text style={styles.actionBtnText}>Lyrics</Text>
                    </TouchableOpacity>

                    {canChords && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnPrimary]}
                        activeOpacity={0.8}
                        onPress={() =>
                          router.push({
                            pathname: '/serve-song-lyrics',
                            params: {
                              songId: item.songId,
                              setlistItemId: item.id,
                              hideChords: 'false',
                            },
                          } as any)
                        }
                      >
                        <BookOpen size={16} color="#FFF" />
                        <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>
                          Chords
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </SoftCard>
            );
          })
        )}
      </ScrollView>

      {/* Fixed Back Button */}
      <View style={[styles.fixedBackBtnWrapper, { top: Math.max(insets.top, 24) }]}>
        <BounceCard
          bounceScale={0.85}
          style={styles.fixedBackBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
        </BounceCard>
      </View>

      {/* Edit Setlist Modal */}
      <AppModal
        isOpen={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        title="Edit Setlist Details"
        hideHeader={true}
        hideDragHandle={true}
        containerStyle={{ flex: 1, backgroundColor: '#FAFAFA', paddingHorizontal: 0, paddingBottom: 0 }}
        heightRatio={0.85}
        avoidKeyboard={false}
      >
        <View style={styles.modalContainer}>
          {/* Header with Frosted Glass */}
          <ModalDragArea style={[styles.headerContainer, { paddingTop: 12 }]}>
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
            <View style={styles.dragHandle} />
            <View style={styles.headerContent}>
              <TouchableOpacity
                style={[styles.createBtnModalHeader, savingSetlist && { opacity: 0.6 }]}
                disabled={savingSetlist}
                onPress={handleUpdateSetlist}
              >
                {savingSetlist ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.createBtnModalHeaderText}>Save</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.headerTitleCenter}>Edit Setlist</Text>
              <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={() => setEditModalVisible(false)} hitSlop={8} activeOpacity={0.8}>
                <X size={24} color="#111827" strokeWidth={2} />
              </BounceCard>
            </View>
          </ModalDragArea>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 20, paddingTop: 24 }}>
              <View>
                <Text style={styles.inputLabel}>Setlist Title *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Sunday Morning Service"
                  placeholderTextColor="#9CA3AF"
                  value={editTitle}
                  onChangeText={setEditTitle}
                />
              </View>

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
                    setEditModalVisible(false);
                    setTimeout(() => {
                      setEventSearchQuery('');
                      setIsEventPickerOpen(true);
                    }, 300);
                  }}
                  activeOpacity={0.8}
                >
                  <CalendarDays size={20} color="#FF6596" style={{ marginRight: 12 }} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: selectedEvent ? '#111827' : '#9CA3AF', flex: 1 }}>
                    {selectedEvent ? `${selectedEvent.title} • ${selectedEvent.date ? new Date(selectedEvent.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}` : 'Select an event'}
                  </Text>
                  <ChevronRight size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <View>
                <Text style={styles.inputLabel}>Status</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.statusOption, editStatus === 'published' && styles.statusOptionSelected]}
                    onPress={() => setEditStatus('published')}
                  >
                    <Text style={[styles.statusOptionText, editStatus === 'published' && styles.statusOptionTextSelected]}>Published</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusOption, editStatus === 'draft' && styles.statusOptionSelected]}
                    onPress={() => setEditStatus('draft')}
                  >
                    <Text style={[styles.statusOptionText, editStatus === 'draft' && styles.statusOptionTextSelected]}>Draft</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.deleteDangerBtn}
                onPress={() => {
                  setEditModalVisible(false);
                  handleDeleteSetlist();
                }}
              >
                <Trash2 size={16} color="#EF4444" />
                <Text style={styles.deleteDangerBtnText}>Delete Setlist</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </AppModal>

      {/* Add Song Modal */}
      <AppModal
        isOpen={addSongModalVisible}
        onClose={() => setAddSongModalVisible(false)}
        title="Add Song to Setlist"
        hideHeader={true}
        hideDragHandle={true}
        {...addSongKeyboard.appModalProps}
      >
        <View style={styles.modalContainer}>
          {/* Header with Frosted Glass */}
          <ModalDragArea style={[styles.headerContainer, { paddingTop: 12 }]}>
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
            <View style={styles.dragHandle} />
            <View style={styles.headerContent}>
              <View style={styles.headerCirclePlaceholder} />
              <Text style={styles.headerTitle}>Add Song to Setlist</Text>
              <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={() => setAddSongModalVisible(false)} hitSlop={8} activeOpacity={0.8}>
                <X size={24} color="#111827" strokeWidth={2} />
              </BounceCard>
            </View>
          </ModalDragArea>

          <ScrollView
            ref={addSongKeyboard.scrollViewRef}
            style={addSongKeyboard.scrollViewStyle}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ gap: 12, paddingTop: 24 }}>
              <TextInput
                style={styles.textInput}
                placeholder="Search songs by title or artist..."
                placeholderTextColor="#9CA3AF"
                value={songSearch}
                onChangeText={setSongSearch}
              />




              {filteredSongs.length === 0 ? (
                <Text style={{ textAlign: 'center', color: '#9CA3AF', marginVertical: 20 }}>
                  No matching songs found.
                </Text>
              ) : (
                filteredSongs.map((song) => (
                  <TouchableOpacity
                    key={song.id}
                    style={styles.songSelectItem}
                    disabled={addingSongId === song.id}
                    onPress={() => handleAddSong(song)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.songSelectTitle}>{song.title}</Text>
                      <Text style={styles.songSelectSub}>
                        {song.artist ? `${song.artist} • ` : ''}Default Key: {song.defaultKey || 'N/A'}
                      </Text>
                    </View>
                    {addingSongId === song.id ? (
                      <ActivityIndicator size="small" color="#FF6596" />
                    ) : (
                      <Plus size={20} color="#FF6596" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </AppModal>

      {/* Searchable Event Selection Modal */}
      <AppModal
        isOpen={isEventPickerOpen}
        onClose={() => {
          setIsEventPickerOpen(false);
          setTimeout(() => setEditModalVisible(true), 250);
        }}
        title="Select Event"
        hideHeader={true}
        hideDragHandle={true}
        containerStyle={{ flex: 1, backgroundColor: '#FAFAFA', paddingHorizontal: 0, paddingBottom: 0 }}
        heightRatio={0.85}
      >
        <View style={[styles.modalContainer, { flex: 1 }]}>
          {/* Frosted Glass Header */}
          <ModalDragArea style={[styles.headerContainer, { paddingTop: 12 }]}>
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
                  setTimeout(() => setEditModalVisible(true), 250);
                }}
                hitSlop={8}
                activeOpacity={0.8}
              >
                <X size={24} color="#111827" strokeWidth={2} />
              </BounceCard>
            </View>
          </ModalDragArea>

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
                        if (!editTitle || editTitle === 'Worship Setlist') {
                          setEditTitle(ev.title || 'Worship Setlist');
                        }
                        if (ev.date) setEditDate(ev.date);
                        setIsEventPickerOpen(false);
                        setTimeout(() => setEditModalVisible(true), 250);
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
            </ScrollView>
          </View>
        </View>
      </AppModal>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  fixedBackBtnWrapper: {
    position: 'absolute',
    left: 20,
    zIndex: 100,
  },
  fixedBackBtn: {
    ...getTopBarButtonShadowStyle(20),
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    gap: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  dateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateMetaText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  leaderEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFE8F0',
  },
  leaderEditBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6596',
  },
  leaderAddSongBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FF6596',
  },
  leaderAddSongBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  emptyStateText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  songCard: {
    backgroundColor: '#FFF',
    padding: 20,
    gap: 12,
  },
  songHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF6596',
  },
  songTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  artistText: {
    fontSize: 13,
    color: '#6B7280',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF0F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6596',
  },
  notesBox: {
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 10,
    gap: 2,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  notesContent: {
    fontSize: 12,
    color: '#374151',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  actionBtnPrimary: {
    backgroundColor: '#FF6596',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  actionBtnTextPrimary: {
    color: '#FFF',
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  notFoundText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
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
  deleteDangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    marginTop: 8,
  },
  deleteDangerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
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
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  modalContainer: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 70, paddingBottom: 30 },
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
  songSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  songSelectTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  songSelectSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});

