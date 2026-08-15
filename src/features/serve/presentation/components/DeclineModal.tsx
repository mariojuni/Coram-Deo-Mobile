import AppModal, { ModalDragArea } from '@/components/ui/AppModal';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BounceCard } from '@/components/ui/BounceCard';
import { getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';

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
    <AppModal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Decline Assignment"
      hideHeader={true}
      hideDragHandle={true}
      containerStyle={{ paddingHorizontal: 0, paddingBottom: 0 }}
    >
      <View style={cs.modalContainer}>
        {/* ─── Header ─────────────────────────────────────────────────────── */}
        <ModalDragArea style={[cs.headerContainer, { paddingTop: 12 }]}>
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
          <View style={cs.dragHandle} />
          <View style={cs.headerContent}>
            <View style={cs.headerCirclePlaceholder} />
            <Text style={cs.headerTitle}>Decline Assignment</Text>
            <BounceCard bounceScale={0.85} style={cs.headerCircle} onPress={handleClose} hitSlop={8} activeOpacity={0.8}>
              <X size={24} color="#111827" strokeWidth={2} />
            </BounceCard>
          </View>
        </ModalDragArea>

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
      </View>
    </AppModal>
  );
}

const cs = StyleSheet.create({
  modalContainer: {
    backgroundColor: '#FAFAFA',
    flex: 1,
  },
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
  container: {
    padding: 24,
    paddingTop: 85,
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
