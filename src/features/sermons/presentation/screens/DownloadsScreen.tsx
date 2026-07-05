import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useSermonStore } from '@/store/useSermonStore';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Download, HardDrive, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Sermon } from '../../domain/sermon.types';
import { SermonCard } from '../components/SermonCard';

export function DownloadsScreen() {
  const router = useRouter();
  const colors = useTheme();
  
  const { 
    downloadsList,
    loadDownloadedSermons,
    deleteDownload,
    fetchSermonById,
  } = useSermonStore();
  
  const currentUser = useAuthStore((state) => state.currentUser);
  const [loading, setLoading] = useState(true);
  const [sermons, setSermons] = useState<Sermon[]>([]);

  const loadDownloads = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      await loadDownloadedSermons(currentUser.uid);
      
      // Fetch sermon details for each download
      const sermonPromises = downloadsList.map(async (download) => {
        await fetchSermonById(download.sermonId);
        return useSermonStore.getState().currentSermon;
      });
      
      const fetchedSermons = await Promise.all(sermonPromises);
      setSermons(fetchedSermons.filter((s): s is Sermon => s !== null));
    } catch (error) {
      console.error('Error loading downloads:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, downloadsList, fetchSermonById, loadDownloadedSermons]);

  useEffect(() => {
    if (currentUser) {
      const timeout = setTimeout(() => {
        void loadDownloads();
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [currentUser, loadDownloads]);



  const handleSermonPress = (sermonId: string) => {
    router.push({
      pathname: '/sermon-detail',
      params: { id: sermonId }
    });
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete All Downloads',
      'Remove all downloaded sermons from your device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            if (!currentUser) return;
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            // Delete all downloads
            for (const download of downloadsList) {
              await deleteDownload(currentUser.uid, download.sermonId);
            }
            
            setSermons([]);
          },
        },
      ]
    );
  };

  const getTotalSize = () => {
    const totalBytes = downloadsList.reduce((sum, download) => sum + (download.fileSize || 0), 0);
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
    return totalMB;
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <HardDrive size={28} color="#FF6596" />
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Downloads</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {downloadsList.length} sermon{downloadsList.length !== 1 ? 's' : ''} • {getTotalSize()} MB
            </Text>
          </View>
        </View>
        {downloadsList.length > 0 && (
          <TouchableOpacity onPress={handleDeleteAll} style={styles.deleteAllButton}>
            <Trash2 size={20} color="#FF4444" />
            <Text style={styles.deleteAllText}>Delete All</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Download size={64} color={colors.textSecondary} strokeWidth={1.5} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Downloads Yet</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        Download sermons to watch or listen offline
      </Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => router.push('/(tabs)/community?tab=sermons')}
      >
        <Text style={styles.browseButtonText}>Browse Sermons</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#FF6596" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      <FlatList
        data={sermons}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SermonCard
            sermon={item}
            onPress={() => handleSermonPress(item.id)}
            onFavorite={() => {}}
            isFavorited={false}
          />
        )}
        contentContainerStyle={[
          styles.list,
          sermons.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    padding: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  deleteAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  deleteAllText: {
    color: '#FF4444',
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 22,
    fontWeight: '700',
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  browseButton: {
    backgroundColor: '#FF6596',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: 12,
  },
  browseButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
