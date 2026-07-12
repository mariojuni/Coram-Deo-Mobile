import * as FileSystem from 'expo-file-system/legacy';
import { Paths } from 'expo-file-system';
import { Sermon } from '../domain/sermon.types';

// Use same cache dir as fileCacheService if possible, or a specific sermons dir.
// The new expo-file-system API uses Paths for app directories.
const CACHE_DIR = (Paths.cache.uri.endsWith('/') ? Paths.cache.uri : Paths.cache.uri + '/') + 'sermons/';

export const initSermonCacheDir = async () => {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
};

const getLocalFileName = (sermon: Sermon, mediaType: 'audio' | 'video') => {
  const fileExt = mediaType === 'video' ? 'mp4' : 'm4a';
  return `sermon_${sermon.churchId}_${sermon.id}_${mediaType}.${fileExt}`;
};

export const downloadSermonMedia = async (
  sermon: Sermon,
  downloadUrl: string,
  mediaType: 'audio' | 'video',
  onProgress?: (progress: number) => void
): Promise<string> => {
  await initSermonCacheDir();

  const localFileName = getLocalFileName(sermon, mediaType);
  const localUri = CACHE_DIR + localFileName;

  const fileInfo = await FileSystem.getInfoAsync(localUri);
  if (fileInfo.exists) {
    return localUri;
  }

  const downloadResumable = FileSystem.createDownloadResumable(
    downloadUrl,
    localUri,
    {},
    (downloadProgress) => {
      const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
      onProgress?.(progress);
    }
  );

  const result = await downloadResumable.downloadAsync();
  if (!result) {
    throw new Error('Download failed');
  }

  return result.uri;
};

export const deleteSermonMedia = async (sermon: Sermon, mediaType: 'audio' | 'video'): Promise<void> => {
  const localFileName = getLocalFileName(sermon, mediaType);
  const localUri = CACHE_DIR + localFileName;

  const fileInfo = await FileSystem.getInfoAsync(localUri);
  if (fileInfo.exists) {
    await FileSystem.deleteAsync(localUri, { idempotent: true });
  }
};

export const getLocalSermonMediaUri = async (sermon: Sermon, mediaType: 'audio' | 'video'): Promise<string | null> => {
  const localFileName = getLocalFileName(sermon, mediaType);
  const localUri = CACHE_DIR + localFileName;

  const fileInfo = await FileSystem.getInfoAsync(localUri);
  return fileInfo.exists ? localUri : null;
};
