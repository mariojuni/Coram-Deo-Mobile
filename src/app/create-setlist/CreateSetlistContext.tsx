import React, { createContext, useContext, useState, useMemo } from 'react';
import { Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useMinistryStore } from '@/store/useMinistryStore';
import { useScheduleStore } from '@/store/useScheduleStore';
import { worshipSetlistService } from '@/features/worship/services/worshipSetlistService';
import type { Schedule } from '@/store/useScheduleStore';
import type { SetlistStatus } from '@/components/Worship/SetlistForm';

interface CreateSetlistContextType {
  newTitle: string;
  setNewTitle: (val: string) => void;
  newDate: string;
  setNewDate: (val: string) => void;
  newStatus: SetlistStatus;
  setNewStatus: (val: SetlistStatus) => void;
  selectedMinistryId: string;
  setSelectedMinistryId: (val: string) => void;
  selectedEventId: string;
  setSelectedEventId: (val: string) => void;
  creating: boolean;
  handleCreateSetlist: () => Promise<void>;
  handleDeleteSetlist: () => void;
  selectedEvent: Schedule | undefined;
  eventSearchQuery: string;
  setEventSearchQuery: (val: string) => void;
  closeModal: () => void;
  isEditing: boolean;
}

const CreateSetlistContext = createContext<CreateSetlistContextType | null>(null);

export function CreateSetlistProvider({ children, onSuccess }: { children: React.ReactNode, onSuccess: () => void }) {
  const router = useRouter();
  const { setlistId, initialTitle, initialEventId, initialStatus, initialDate } = useLocalSearchParams<{
    setlistId?: string;
    initialTitle?: string;
    initialEventId?: string;
    initialStatus?: SetlistStatus;
    initialDate?: string;
  }>();

  const isEditing = !!setlistId;

  const userProfile = useAuthStore((s) => s.userProfile);
  const ministries = useMinistryStore((state) => state.ministries);
  const schedules = useScheduleStore((state) => state.schedules);

  const [newTitle, setNewTitle] = useState(initialTitle || '');
  const [newDate, setNewDate] = useState(() => initialDate || new Date().toISOString().split('T')[0]);
  const [newStatus, setNewStatus] = useState<SetlistStatus>(initialStatus || 'published');
  const [selectedMinistryId, setSelectedMinistryId] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId || '');
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);

  const selectedEvent = useMemo(() => schedules.find((s) => s.id === selectedEventId), [schedules, selectedEventId]);

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

      if (isEditing && setlistId) {
        await worshipSetlistService.updateWorshipSetlist(setlistId, {
          eventId: selectedEventId || '',
          title: newTitle.trim(),
          serviceDate: selectedEvent?.date || newDate,
          status: newStatus,
        });
        setCreating(false);
        onSuccess();
      } else {
        const newId = await worshipSetlistService.createWorshipSetlist({
          churchId: userProfile.churchId,
          eventId: selectedEventId || '',
          ministryId: targetMinistryId,
          title: newTitle.trim(),
          serviceDate: selectedEvent?.date || newDate,
          status: newStatus,
          worshipLeaderId: userProfile.memberId || userProfile.uid,
        });
        setCreating(false);
        onSuccess();
        router.replace(`/(tabs)/serve/worship-setlist/${newId}` as any);
      }
    } catch (err: any) {
      setCreating(false);
      Alert.alert('Error', err.message || `Failed to ${isEditing ? 'update' : 'create'} setlist.`);
      console.error(err);
    }
  };

  const handleDeleteSetlist = () => {
    if (!setlistId) return;
    Alert.alert('Delete Setlist', 'Are you sure you want to delete this setlist?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await worshipSetlistService.deleteWorshipSetlist(setlistId);
            onSuccess();
            // Since this is a transparent modal over the detail view, closing it brings us back to the detail view.
            // But the setlist is deleted! The detail view should handle the missing data or we can navigate back again.
            // Wait, we need to push them back to the list.
            router.replace('/(tabs)/serve' as any);
          } catch (err) {
            console.error('Failed to delete setlist:', err);
            Alert.alert('Error', 'Failed to delete setlist.');
          }
        },
      },
    ]);
  };

  return (
    <CreateSetlistContext.Provider
      value={{
        newTitle,
        setNewTitle,
        newDate,
        setNewDate,
        newStatus,
        setNewStatus,
        selectedMinistryId,
        setSelectedMinistryId,
        selectedEventId,
        setSelectedEventId,
        creating,
        handleCreateSetlist,
        handleDeleteSetlist,
        selectedEvent,
        eventSearchQuery,
        setEventSearchQuery,
        closeModal: onSuccess,
        isEditing,
      }}
    >
      {children}
    </CreateSetlistContext.Provider>
  );
}

export function useCreateSetlistContext() {
  const ctx = useContext(CreateSetlistContext);
  if (!ctx) throw new Error('useCreateSetlistContext must be used within CreateSetlistProvider');
  return ctx;
}
