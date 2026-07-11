import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, Alert } from 'react-native';
import { useState } from 'react';
import { FileText, Plus, Trash2, Edit3, Clock } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { NoteEditor } from './NoteEditor';
import * as Haptics from 'expo-haptics';
import type { SermonNote } from '../../domain/sermon.types';

interface NotesSheetProps {
  notes: SermonNote[];
  sermonId: string;
  userId: string;
  loading: boolean;
  onAddNote: (note: Omit<SermonNote, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateNote: (noteId: string, content: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onTimestampPress?: (timestamp: number) => void; // Jump to timestamp in video/audio
}

export function NotesSheet({
  notes,
  sermonId,
  userId,
  loading,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onTimestampPress,
}: NotesSheetProps) {
  const colors = useTheme();

  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<SermonNote | undefined>();

  const handleAddNote = () => {
    setEditingNote(undefined);
    setShowEditor(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleEditNote = (note: SermonNote) => {
    setEditingNote(note);
    setShowEditor(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDeleteNote = (noteId: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await onDeleteNote(noteId);
          },
        },
      ]
    );
  };

  const handleSaveNote = async (note: Omit<SermonNote, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingNote) {
      await onUpdateNote(editingNote.id, note.content);
    } else {
      await onAddNote(note);
    }
    setShowEditor(false);
    setEditingNote(undefined);
  };

  const formatTimestamp = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  const renderNote = ({ item }: { item: SermonNote }) => (
    <View style={[styles.noteCard, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.noteHeader}>
        {item.timestamp !== undefined && (
          <TouchableOpacity
            onPress={() => onTimestampPress?.(item.timestamp!)}
            style={styles.timestampButton}
          >
            <Clock size={14} color="#FF6596" />
            <Text style={styles.timestampText}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.noteDate, { color: colors.textSecondary }]}>
          {formatDate(item.createdAt)}
        </Text>
      </View>

      <Text style={[styles.noteContent, { color: colors.text }]}>
        {item.content}
      </Text>

      <View style={styles.noteActions}>
        <TouchableOpacity
          onPress={() => handleEditNote(item)}
          style={styles.actionButton}
        >
          <Edit3 size={16} color={colors.text} />
          <Text style={[styles.actionText, { color: colors.text }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDeleteNote(item.id)}
          style={styles.actionButton}
        >
          <Trash2 size={16} color="#FF4444" />
          <Text style={[styles.actionText, { color: '#FF4444' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <FileText size={48} color={colors.textSecondary} strokeWidth={1.5} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Notes Yet</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        Start taking notes to remember key insights
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.backgroundElement }]}>
        <View style={styles.headerLeft}>
          <FileText size={24} color="#FF6596" />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notes</Text>
          {notes.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notes.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={handleAddNote} style={styles.addButton}>
          <Plus size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Notes List */}
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={renderNote}
        contentContainerStyle={[
          styles.list,
          notes.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      {/* Editor Modal */}
      <Modal
        visible={showEditor}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditor(false)}
      >
        <NoteEditor
          note={editingNote}
          sermonId={sermonId}
          userId={userId}
          onSave={handleSaveNote}
          onClose={() => {
            setShowEditor(false);
            setEditingNote(undefined);
          }}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#FF6596',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  addButton: {
    backgroundColor: '#FF6596',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: Spacing.three,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  noteCard: {
    borderRadius: 12,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  timestampButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 101, 150, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timestampText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6596',
  },
  noteDate: {
    fontSize: 13,
  },
  noteContent: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.three,
  },
  noteActions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
