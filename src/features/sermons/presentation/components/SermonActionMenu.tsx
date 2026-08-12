import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ScrollView } from 'react-native';
import { Share2, Download, Trash2, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import AppModal, { ModalDragArea } from '@/components/ui/AppModal';
import { BlurView } from 'expo-blur';
import { BounceCard } from '@/components/ui/BounceCard';
import { getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';

interface SermonActionMenuProps {
  visible: boolean;
  onClose: () => void;
  onShare: () => void;
  onDownload: () => void;
  onRemoveDownload: () => void;
  isDownloaded: boolean;
  isDownloading: boolean;
}

export function SermonActionMenu({
  visible,
  onClose,
  onShare,
  onDownload,
  onRemoveDownload,
  isDownloaded,
  isDownloading,
}: SermonActionMenuProps) {
  const colors = useTheme();
  const colorScheme = useColorScheme();

  const handleAction = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
    onClose();
  };

  return (
    <AppModal
      isOpen={visible}
      onClose={onClose}
      title="Actions"
      hideHeader={true}
      hideDragHandle={true}
      containerStyle={{ paddingHorizontal: 0, paddingBottom: 0, backgroundColor: '#FAFAFA' }}
      heightRatio={0.4}
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
            <Text style={styles.headerTitle}>Actions</Text>
            <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={onClose} hitSlop={8} activeOpacity={0.8}>
              <X size={24} color="#111827" strokeWidth={2} />
            </BounceCard>
          </View>
        </ModalDragArea>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: 70 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.contentWrap}>
            {/* Share Option */}
            <TouchableOpacity
              onPress={() => handleAction(onShare)}
              style={styles.option}
              activeOpacity={0.7}
            >
              <Share2 size={22} color={colors.text} />
              <Text style={[styles.optionText, { color: colors.text }]}>Share</Text>
            </TouchableOpacity>

            {/* Download Option */}
            {!isDownloaded ? (
              <TouchableOpacity
                onPress={() => {
                  if (!isDownloading) handleAction(onDownload);
                }}
                style={[styles.option, isDownloading && { opacity: 0.5 }]}
                activeOpacity={0.7}
                disabled={isDownloading}
              >
                <Download size={22} color={colors.text} />
                <Text style={[styles.optionText, { color: colors.text }]}>
                  {isDownloading ? 'Downloading...' : 'Download for Offline'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => handleAction(onRemoveDownload)}
                style={styles.option}
                activeOpacity={0.7}
              >
                <Trash2 size={22} color="#EF4444" />
                <Text style={[styles.optionText, { color: '#EF4444' }]}>Remove Download</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </AppModal>
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
  contentWrap: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: 18,
    borderRadius: 20,
    marginBottom: Spacing.three,
    gap: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.03)',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
