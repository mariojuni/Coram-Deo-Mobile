import AppModal from '@/components/ui/AppModal';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface DeclineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
  assignmentTitle: string;
}

export function DeclineModal({ isOpen, onClose, onConfirm, assignmentTitle }: DeclineModalProps) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleDecline = async () => {
    setSaving(true);
    try {
      await onConfirm(reason.trim() || undefined);
      setReason('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    setReason('');
    onClose();
  };

  return (
    <AppModal isOpen={isOpen} onClose={handleClose} title="Decline Assignment">
      <View style={cs.container}>
        <Text style={cs.subtitle}>
          You&apos;re about to decline your assignment for:
        </Text>
        <View style={cs.assignmentBox}>
          <Text style={cs.assignmentTitle}>{assignmentTitle}</Text>
        </View>
        <Text style={cs.label}>Reason (optional)</Text>
        <TextInput
          style={cs.input}
          placeholder="Let your ministry leader know why…"
          placeholderTextColor="#9CA3AF"
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
          editable={!saving}
          textAlignVertical="top"
        />
        <Text style={cs.hint}>
          Your leader will be notified and can arrange a replacement.
        </Text>

        <View style={cs.actions}>
          <TouchableOpacity
            style={cs.cancelBtn}
            onPress={handleClose}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Text style={cs.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDecline}
            disabled={saving}
            activeOpacity={0.85}
            style={{ flex: 1 }}
          >
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={cs.declineBtn}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={cs.declineText}>Decline Assignment</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </AppModal>
  );
}

const cs = StyleSheet.create({
  container: {
    padding: 24,
    gap: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  assignmentBox: {
    backgroundColor: '#FFF5F7',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  assignmentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: -4,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 80,
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  declineBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
