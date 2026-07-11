import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import type { SermonNote } from '../../domain/sermon.types';

interface NoteEditorProps {
  note?: SermonNote;
  sermonId: string;
  userId: string;
  timestamp?: number; // Optional timestamp in seconds
  onSave: (note: Omit<SermonNote, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onClose: () => void;
}

export function NoteEditor({ note, sermonId, userId, timestamp, onSave, onClose }: NoteEditorProps) {
  const colors = useTheme();

  const [content, setContent] = useState(note?.content || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (note) {
      const frame = requestAnimationFrame(() => {
        setContent(note.content);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [note]);

  const handleSave = async () => {
    if (!content.trim()) {
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await onSave({
        sermonId,
        userId,
        content: content.trim(),
        timestamp: timestamp || note?.timestamp,
      });
      onClose();
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatTimestamp = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          {note ? 'Edit Note' : 'New Note'}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!content.trim() || saving}
          style={[
            styles.saveButton,
            (!content.trim() || saving) && styles.saveButtonDisabled,
          ]}
        >
          <Save size={20} color={content.trim() && !saving ? '#FF6596' : colors.textSecondary} />
          <Text
            style={[
              styles.saveText,
              { color: content.trim() && !saving ? '#FF6596' : colors.textSecondary },
            ]}
          >
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Timestamp Badge */}
      {timestamp !== undefined && (
        <View style={styles.timestampContainer}>
          <View style={styles.timestampBadge}>
            <Text style={styles.timestampText}>
              Note at {formatTimestamp(timestamp)}
            </Text>
          </View>
        </View>
      )}

      {/* Content Input */}
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="Write your note here..."
        placeholderTextColor={colors.textSecondary}
        multiline
        autoFocus
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.backgroundElement,
          },
        ]}
        textAlignVertical="top"
      />
    </KeyboardAvoidingView>
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
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    padding: Spacing.one,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: Spacing.one,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  timestampContainer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  timestampBadge: {
    backgroundColor: 'rgba(255, 101, 150, 0.15)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  timestampText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6596',
  },
  input: {
    flex: 1,
    padding: Spacing.three,
    fontSize: 16,
    lineHeight: 24,
    marginTop: Spacing.three,
    marginHorizontal: Spacing.three,
    borderRadius: 12,
  },
});
