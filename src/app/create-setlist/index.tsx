import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, Dimensions, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { X, CalendarDays, ChevronRight, Trash2 } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { BounceCard } from '@/components/ui/BounceCard';
import { SetlistForm } from '@/components/Worship/SetlistForm';
import { useCreateSetlistContext } from './CreateSetlistContext';

export default function CreateSetlistFormScreen() {
  const router = useRouter();
  const {
    newTitle,
    setNewTitle,
    newStatus,
    setNewStatus,
    creating,
    handleCreateSetlist,
    selectedEvent,
    setEventSearchQuery,
    closeModal,
    isEditing,
    handleDeleteSetlist,
  } = useCreateSetlistContext();

  const handleClose = () => {
    Keyboard.dismiss();
    closeModal();
  };

  const goToSelectEvent = () => {
    Keyboard.dismiss();
    setEventSearchQuery('');
    router.push('/create-setlist/select-event');
  };

  return (
    <View style={{ flex: 1 }}>
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
              <Text style={styles.createBtnModalHeaderText}>{isEditing ? 'Save' : 'Create'}</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.headerTitleCenter} pointerEvents="none">{isEditing ? 'Edit Setlist' : 'Create Setlist'}</Text>
          <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={handleClose} hitSlop={8} activeOpacity={0.8}>
            <X size={24} color="#111827" strokeWidth={2} />
          </BounceCard>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingTop: 24 }}>
          <SetlistForm
            title={newTitle}
            onTitleChange={setNewTitle}
            status={newStatus}
            onStatusChange={setNewStatus}
            selectedEvent={selectedEvent}
            onPressEvent={goToSelectEvent}
            showArchived={isEditing}
          />

          {isEditing && (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 14,
                backgroundColor: '#FEF2F2',
                borderRadius: 14,
                marginTop: 20,
              }}
              onPress={handleDeleteSetlist}
            >
              <Trash2 size={16} color="#EF4444" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#EF4444' }}>Delete Setlist</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
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
  createBtnModalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FF6596',
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  createBtnModalHeaderText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 85,
  },
});
