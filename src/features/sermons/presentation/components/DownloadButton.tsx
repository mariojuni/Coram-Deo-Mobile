import { TouchableOpacity, StyleSheet, Text, View, Alert, ActivityIndicator } from 'react-native';
import { Download, Check } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { useSermonStore } from '@/store/useSermonStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect, useState } from 'react';
import type { Sermon } from '../../domain/sermon.types';

interface DownloadButtonProps {
  sermon: Sermon;
  variant?: 'default' | 'icon-only';
}

export function DownloadButton({ sermon, variant = 'default' }: DownloadButtonProps) {
  const colors = useTheme();
  const currentUser = useAuthStore((state) => state.currentUser);
  
  const {
    downloads,
    downloadSermon,
    deleteDownload,
    checkIfDownloaded,
    loadDownloadedSermons,
  } = useSermonStore();

  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkDownloadStatus = async () => {
    if (!currentUser) return;
    setIsChecking(true);
    const downloaded = await checkIfDownloaded(currentUser.uid, sermon.id);
    setIsDownloaded(downloaded);
    setIsChecking(false);
  };

  useEffect(() => {
    if (currentUser) {
      loadDownloadedSermons(currentUser.uid);
      checkDownloadStatus();
    }
  }, [currentUser, sermon.id]);

  const downloadKey = `${sermon.id}_${sermon.mediaType === 'video' ? 'video' : 'audio'}`;
  const downloadProgress = downloads.get(downloadKey);
  const isDownloading = downloadProgress?.isDownloading || false;
  const progress = downloadProgress?.progress || 0;

  const handleDownload = async () => {
    if (!currentUser) return;

    if (isDownloaded) {
      // Show delete confirmation
      Alert.alert(
        'Delete Download',
        'Remove this downloaded sermon from your device?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await deleteDownload(currentUser.uid, sermon.id);
              setIsDownloaded(false);
            },
          },
        ]
      );
    } else {
      // Start download
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await downloadSermon(currentUser.uid, sermon);
        setIsDownloaded(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        Alert.alert('Download Failed', 'Unable to download sermon. Please try again.');
      }
    }
  };

  if (!currentUser || isChecking) {
    return null;
  }

  if (variant === 'icon-only') {
    return (
      <TouchableOpacity
        onPress={handleDownload}
        disabled={isDownloading}
        style={styles.iconButton}
        activeOpacity={0.7}
      >
        {isDownloading ? (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color="#FF6596" />
            <Text style={[styles.progressText, { color: colors.text }]}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
        ) : isDownloaded ? (
          <Check size={20} color="#00C853" strokeWidth={2.5} />
        ) : (
          <Download size={20} color={colors.text} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handleDownload}
      disabled={isDownloading}
      style={[
        styles.button,
        {
          backgroundColor: isDownloaded ? 'rgba(0, 200, 83, 0.15)' : colors.backgroundElement,
        },
      ]}
      activeOpacity={0.7}
    >
      {isDownloading ? (
        <>
          <ActivityIndicator size="small" color="#FF6596" />
          <Text style={[styles.buttonText, { color: colors.text }]}>
            {Math.round(progress * 100)}%
          </Text>
        </>
      ) : isDownloaded ? (
        <>
          <Check size={20} color="#00C853" strokeWidth={2.5} />
          <Text style={[styles.buttonText, { color: '#00C853' }]}>Downloaded</Text>
        </>
      ) : (
        <>
          <Download size={20} color={colors.text} />
          <Text style={[styles.buttonText, { color: colors.text }]}>Download</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: 12,
    gap: 8,
    minWidth: 130,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    alignItems: 'center',
    gap: 2,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
